import httpStatus from "http-status";
import ApiError from "../../Common/Utils/ApiError";
import { logger } from "../../Common/Utils/logger";
import { APICodes } from "../../Common/Constants";
import { MoveOutRequests } from "../../Entities/MoveOutRequests.entity";
import { getPaginationInfo } from "../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../Common/Utils/adminAccess";
import { Units, getUnitInformation, getCurrentOccupancyRoleForUnit } from "../../Entities/Units.entity";
import { UnitBookings } from "../../Entities/UnitBookings.entity";
import { MOVE_IN_AND_OUT_REQUEST_STATUS, MOVE_IN_USER_TYPES, MOVE_REQUEST_STATUS, OccupancyStatus } from "../../Entities/EntityTypes";
import { addNotification, addAdminNotification } from "../../Common/Utils/notification";
import { UserRoles } from "../../Entities/UserRoles.entity";
import { MoveInRequests } from "../../Entities/MoveInRequests.entity";
import { AccountRenewalRequests } from "../../Entities/AccountRenewalRequests.entity";
import { executeInTransaction } from "../../Common/Utils/transactionUtil";
import { EntityManager } from "typeorm";
import { MoveOutHistories } from "../../Entities/MoveOutHistories.entity";
import { TransitionRequestActionByTypes } from "../../Entities/EntityTypes";
import { OccupancyRequestEmailRecipients } from "../../Entities/OccupancyRequestEmailRecipients.entity";
import { EmailService } from "../Email/email.service";

export class MoveOutService {
    private emailService = new EmailService();

    // Find MOP recipients by hierarchy: tower -> community -> master community
    private async getMopRecipients(masterCommunityId: number, communityId: number, towerId?: number | null): Promise<string[]> {
        try {
            const repo = OccupancyRequestEmailRecipients.getRepository();

            // 1) Tower-specific
            if (towerId) {
                const towerRec = await repo.createQueryBuilder('r')
                    .leftJoin('r.masterCommunity', 'mc')
                    .leftJoin('r.community', 'c')
                    .leftJoin('r.tower', 't')
                    .where('mc.id = :mcId AND c.id = :cId AND t.id = :tId AND r.isActive = true', { mcId: masterCommunityId, cId: communityId, tId: towerId })
                    .getOne();
                if (towerRec?.mopRecipients) {
                    return towerRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
                }
            }

            // 2) Community-level
            const commRec = await repo.createQueryBuilder('r')
                .leftJoin('r.masterCommunity', 'mc')
                .leftJoin('r.community', 'c')
                .where('mc.id = :mcId AND c.id = :cId AND r.tower IS NULL AND r.isActive = true', { mcId: masterCommunityId, cId: communityId })
                .getOne();
            if (commRec?.mopRecipients) {
                return commRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
            }

            // 3) Master community-level
            const mcRec = await repo.createQueryBuilder('r')
                .leftJoin('r.masterCommunity', 'mc')
                .where('mc.id = :mcId AND r.community IS NULL AND r.tower IS NULL AND r.isActive = true', { mcId: masterCommunityId })
                .getOne();
            if (mcRec?.mopRecipients) {
                return mcRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
            }
        } catch (e) { }
        return [];
    }
    // Build common details payload for notifications from unit info
    private async buildMoveOutDetailsPayload(unitId: number, requestNo: string, moveOutDate: any, residentType?: string) {
        const unit: any = await getUnitInformation(unitId);
        const towerName = unit?.tower?.name || '';
        const communityName = unit?.community?.name || '';
        const masterCommunityName = unit?.masterCommunity?.name || '';
        const unitNumber = unit?.unitNumber || '';
        const propertyAddress = [unit?.unitName, unitNumber].filter(Boolean).join(', ');
        return {
            "<request_ID>": requestNo,
            "<request_id>": requestNo,
            "<request_no>": requestNo,
            "<reference_id>": requestNo,
            "<move_out_date>": moveOutDate,
            "<resident_type>": residentType || '',
            "<unit_number>": unitNumber,
            "<unitNumber>": unitNumber,
            "<tower_name>": towerName,
            "<community_name>": communityName,
            "<master_community_name>": masterCommunityName,
            "<property_Address>": propertyAddress,
        };
    }
    private async ensureUnitHandoverCompleted(unitId: number): Promise<void> {
        try {
            const handover = await UnitBookings.getRepository()
                .createQueryBuilder('ub')
                .innerJoin('ub.unit', 'u', 'u.isActive = true')
                .where('ub.isActive = true')
                .andWhere('u.id = :unitId', { unitId })
                .andWhere('ub.actualHandoverDate IS NOT NULL')
                .getOne();

            if (!handover) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.NO_HANDOVER_DATE.message, APICodes.NO_HANDOVER_DATE.code);
            }
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error(`Error in ensureUnitHandoverCompleted : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getAllMoveOutListAdmin(query: any, user: any) {
        try {
            const { page = 1, per_page = 20, requestId, moveOutType, masterCommunity, community, tower, unit, createdDate, createdStartDate, createdEndDate, moveOutDate, requestStatus, moveOutRequestNo } = query
            let qb = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "mor.moveOutRequestNo",
                    "mor.requestType",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "unit.unitName",
                    "unit.unitNumber",
                    "mor.createdBy",
                    "mor.moveOutDate",
                    "mor.status",
                    "mor.createdAt",
                    "mor.updatedAt",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true")

            const isSecurity = await checkIsSecurity(user);
            qb = checkAdminPermission(qb, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);

            if (isSecurity) {
                qb.andWhere("mor.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
            }

            // Clone a base query for counts (not affected by filter params)
            const countBaseQb = qb.clone();

            if (requestId) qb.andWhere("mor.id = :requestId", { requestId });
            if (moveOutType) qb.andWhere("mor.requestType = :moveOutType", { moveOutType });
            if (masterCommunity) qb.andWhere("masterCommunity.id = :masterCommunity", { masterCommunity });
            if (community) qb.andWhere("community.id = :community", { community });
            if (tower) qb.andWhere("tower.id = :tower", { tower });
            if (unit) qb.andWhere("unit.id = :unit", { unit });
            if (requestStatus) qb.andWhere("mor.status = :requestStatus", { requestStatus });
            if (moveOutRequestNo) qb.andWhere("mor.moveOutRequestNo = :moveOutRequestNo", { moveOutRequestNo });
            if (createdDate) qb.andWhere("DATE(mor.createdAt) = :createdDate", { createdDate });
            if (createdStartDate) qb.andWhere("DATE(mor.createdAt) >= :createdStartDate", { createdStartDate });
            if (createdEndDate) qb.andWhere("DATE(mor.createdAt) <= :createdEndDate", { createdEndDate });
            if (moveOutDate) qb.andWhere("DATE(mor.moveOutDate) = :moveOutDate", { moveOutDate });

            qb.orderBy("mor.createdAt", "DESC")
                .offset((page - 1) * per_page)
                .limit(per_page);
            const count = await qb.getCount();
            const list = await qb.getMany();
            const pagination = getPaginationInfo(page, per_page, count);
            // Counts not based on filters/params (but respecting permission scope)
            const totalCount = await countBaseQb.getCount();
            const approvedCount = await countBaseQb.clone().andWhere("mor.status = :approvedStatus", { approvedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED }).getCount();
            const closedCount = await countBaseQb.clone().andWhere("mor.status = :closedStatus", { closedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED }).getCount();

            return { allMoveOutRequests: list, pagination, counts: { totalCount, approvedCount, closedCount } };
        } catch (error) {
            logger.error('Error in getAllMoveOutListAdmin : ' + JSON.stringify(error));
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async adminApproveOrCancelRequest(user: any, params: any, body: any) {
        try {
            let moveOutRequest = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id as id",
                    "user.id as userId",
                    "unit.id as unitId",
                    "unit.occupancyStatus as occupancyStatus",
                    "mor.moveOutRequestNo as moveOutRequestNo",
                    "mor.moveOutDate as moveOutDate",
                    "mor.createdAt as createdAt",
                    "mor.status as status",
                    "unit.unitName as unitName",
                    "unit.unitNumber as unitNumber",
                    "user.firstName as firstName",
                    "user.lastName as lastName",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.id = :requestId", { requestId: params?.requestId })
                .andWhere("mor.isActive = true")
            moveOutRequest = checkAdminPermission(moveOutRequest, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);
            const result = await moveOutRequest.getRawOne();

            if (!result) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            const action = params?.action;
            if (!['approve', 'cancel'].includes(action)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_ACTION_ERROR.message, APICodes.INVALID_ACTION_ERROR.code);
            }

            if (action === 'approve') {
                // moveOutDate required for approval
                if (!body?.moveOutDate) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                // Unit must be occupied (not VACANT)
                if (result.occupancyStatus === OccupancyStatus.VACANT) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                // Move-out date must be within 1 month of submission and not in the past
                try {
                    const createdAt = new Date(result.createdAt);
                    const moveOutDate = new Date(body.moveOutDate);
                    const today = new Date();
                    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const maxDate = new Date(createdAt);
                    maxDate.setMonth(maxDate.getMonth() + 1);
                    if (moveOutDate < startOfToday || moveOutDate > maxDate) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                    }
                } catch (e) {
                    if (e instanceof ApiError) throw e;
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_APPROVED.message, APICodes.ALREADY_APPROVED.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
            } else if (action === 'cancel') {
                // cancellation remarks required
                if (!body?.reason || String(body.reason).trim() === '') {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELLATION_REMARKS_REQUIRED.message, APICodes.CANCELLATION_REMARKS_REQUIRED.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CANCELLED_ERROR.message, APICodes.ALREADY_CANCELLED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELATION_NOT_POSSIBLE.message, APICodes.CANCELATION_NOT_POSSIBLE.code);
                }
            }

            const updateData: any = {
                status: action === 'approve' ? MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED : MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
                updatedBy: user.id,
                moveOutDate: body?.moveOutDate,
                comments: body?.reason
            };

            await MoveOutRequests.getRepository().update({ id: result.id }, updateData);

            const userId = result?.userId
            const unitId = result?.unitId

            const userRole = UserRoles.getRepository()
                .createQueryBuilder("ur")
                .innerJoin("ur.user", "user", "user.isActive = true")
                .innerJoin("ur.unit", "unit", "unit.isActive = true")
                .innerJoinAndSelect("ur.role", "role", "role.isActive = true")
                .where("user.id = :userId", { userId })
                .andWhere("unit.id = :unitId", { unitId })
                .select(["role.slug as slug"]);

            const userRoleResult = await userRole.getRawOne();

            if (action === 'approve') {

                const permitDate = new Date().toISOString().slice(0, 10);
                const payload = {
                    "<request_no>": result.moveOutRequestNo,
                    "<reference_id>": result.moveOutRequestNo,
                    "<request_id>": result.moveOutRequestNo,
                    "<user_type>": userRoleResult?.slug,
                    "<property_details>": `${result.unitName}, ${result.unitNumber}`,
                    "<occupant_name>": `${result?.firstName} ${result?.lastName}`,
                    "<move_out_date>": body?.moveOutDate || result?.moveOutDate,
                    "<end_date>": '',
                    "<permit_date>": permitDate
                }
                // Push/app notification (align to existing templates)
                addNotification(userId, 'move_out_request_approved', { "<request_no>": result.moveOutRequestNo, "<reference_id>": result.moveOutRequestNo, "<request_id>": result.moveOutRequestNo })
                // Email notification
                addNotification(userId, 'move_out_approval_email_to_user', payload)
                // Notify Security Team on approval (non-blocking)
                try {
                    await addAdminNotification(
                        user.id,
                        'move_out_request_approved_security',
                        { "<request_no>": result.moveOutRequestNo, "<move_out_date>": result.moveOutDate },
                        { unit_id: unitId }
                    );
                } catch (e) { }
                // Attach simple permit info to additionalInfo JSON
                try {
                    await MoveOutRequests.getRepository().update({ id: result.id }, {
                        additionalInfo: JSON.stringify({ permit: { permitNumber: result.moveOutRequestNo, permitDate, validUntil: body?.moveOutDate || result?.moveOutDate } })
                    });
                } catch (e) { }

                // Email official recipients (MOP Approved)
                try {
                    const unitInfo: any = await getUnitInformation(result.unitId);
                    const emails = await this.getMopRecipients(
                        Number(unitInfo?.masterCommunity?.id),
                        Number(unitInfo?.community?.id),
                        unitInfo?.tower?.id ? Number(unitInfo?.tower?.id) : null
                    );

                    if (emails.length > 0) {
                        const uniqueEmails = Array.from(new Set(
                            emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
                        ));

                        if (uniqueEmails.length > 0) {
                            const propertyDetails = [
                                unitInfo?.unitName,
                                unitInfo?.unitNumber,
                                unitInfo?.tower?.name,
                                unitInfo?.community?.name,
                                unitInfo?.masterCommunity?.name,
                            ].filter(Boolean).join(', ');

                            const userType = userRoleResult?.slug || '';
                            const occupantName = `${result?.firstName || ''} ${result?.lastName || ''}`.trim();
                            const moveOutDateDisp = (body?.moveOutDate || result?.moveOutDate) ? new Date(body?.moveOutDate || result?.moveOutDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '';
                            const endDateLease = '';
                            const dateOfIssueDisp = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });

                            const subject = `Move Out Permit Issued - ${result.moveOutRequestNo}`;
                            const html = [
                                'Dear Team,',
                                'This is to notify you that a Move Out Permit has been issued.',
                                '',
                                `Move Out Permit reference no. - ${result.moveOutRequestNo}`,
                                `User type - ${userType}`,
                                `Property details - ${propertyDetails}`,
                                `Occupant name - ${occupantName}`,
                                `Move out date - ${moveOutDateDisp}`,
                                `End date (lease) - ${endDateLease}`,
                                `Move Out Permit date of issue - ${dateOfIssueDisp}`,
                                '',
                                'Kind regards,',
                                'Sobha Community Management'
                            ].map(l => `<div>${l}</div>`).join('');

                            await this.emailService.sendEmail(uniqueEmails, subject, html);
                        }
                    }
                } catch (e) { }
                // History
                try {
                    const hist = new MoveOutHistories();
                    (hist as any).request = { id: result.id };
                    hist.action = 'approved';
                    hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                    hist.remarks = body?.reason || '';
                    hist.createdBy = user.id;
                    await hist.save();
                } catch (e) { }
            } else {
                try {
                    const details = await this.buildMoveOutDetailsPayload(result.unitId, result.moveOutRequestNo, result.moveOutDate, result.requestType);
                    await addNotification(userId, 'move_out_admin_cancelled_to_user', { ...details, "<comment_from_admin>": body?.reason || '' });
                } catch (e) { }
                try {
                    const hist = new MoveOutHistories();
                    (hist as any).request = { id: result.id };
                    hist.action = 'cancelled';
                    hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                    hist.remarks = body?.reason || '';
                    hist.createdBy = user.id;
                    await hist.save();
                } catch (e) { }
            }

            return result;
        } catch (error) {
            logger.error(`Error in adminApproveOrCancelRequest : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutList(query: any, user: any) {
        try {
            const { page = 1, per_page = 20, status, unitIds } = query
            let qb = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "mor.moveOutRequestNo",
                    "mor.requestType",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "unit.unitName",
                    "unit.unitNumber",
                    "mor.createdBy",
                    "mor.moveOutDate",
                    "mor.status",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true");

            // Restrict to current user's requests for mobile listing
            if (user?.id) {
                qb.andWhere("user.id = :userId", { userId: Number(user.id) });
            }

            if (status) qb.andWhere("mor.status = :status", { status });
            if (unitIds) qb.andWhere("unit.id IN (:...unitIds)", { unitIds: unitIds.split(',').filter((e: any) => e) });

            qb.orderBy("mor.createdAt", "DESC")
                .offset((page - 1) * per_page)
                .limit(per_page);

            const count = await qb.getCount();
            const list = await qb.getMany();
            const pagination = getPaginationInfo(page, per_page, count);
            return { moveOutList: list, pagination };
        } catch (error) {
            logger.error(`Error in getMoveOutList : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }

    }

    async getMoveOutRequestById(requestId: number, user: any) {
        try {
            let moveOutRequest = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    "unit.unitName",
                    "unit.unitNumber",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "user.firstName",
                    "user.middleName",
                    "user.lastName",
                    "user.email",
                    "user.mobile",
                    "mor.requestType",
                    "mor.moveOutDate",
                    "mor.comments",
                    "mor.moveOutRequestNo",
                    "mor.createdBy",
                    "mor.status",
                    "mor.createdAt",
                    "mor.updatedAt",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true AND mor.id = :requestId", { requestId })
            moveOutRequest = checkAdminPermission(moveOutRequest, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);
            moveOutRequest.getOne();
            const result = await moveOutRequest.getOne();
            if (!result) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }
            return result;
        } catch (error) {
            logger.error(`Error in getMoveOutRequestById : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async cancelMoveOutRequestByUser(body: any, userId: number, requestId: number) {
        try {
            const moveOutRequest = await MoveOutRequests.getRepository().findOne({
                where: { id: requestId, user: { id: userId } }
            });

            if (!moveOutRequest) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELATION_NOT_POSSIBLE.message, APICodes.CANCELATION_NOT_POSSIBLE.code);
            }
            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
            }
            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CANCELLED_ERROR.message, APICodes.ALREADY_CANCELLED_ERROR.code);
            }

            moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED;
            moveOutRequest.comments = body.reason;
            moveOutRequest.updatedBy = userId;
            await moveOutRequest.save();
            // Notify user and admin on cancellation
            try {
                const details = await this.buildMoveOutDetailsPayload(moveOutRequest.unit.id, moveOutRequest.moveOutRequestNo, moveOutRequest.moveOutDate, moveOutRequest.requestType);
                await addNotification(userId, 'move_out_customer_cancelled_to_user', details);
            } catch (e) { }
            try {
                await addAdminNotification(userId, 'move_out_request_cancelled_by_user_to_admin', { "<request_no>": moveOutRequest.moveOutRequestNo, "<move_out_date>": moveOutRequest.moveOutDate }, { unit_id: moveOutRequest.unit.id });
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in cancelMoveOutRequestByUser : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async closeMoveOutRequestBySecurity(body: any, requestId: number, user: any) {
        try {
            const isSecurity = await checkIsSecurity(user);
            if (!isSecurity) {
                throw new ApiError(httpStatus.FORBIDDEN, APICodes.INSUFFICIENT_USER_PRIVILEGE.message, APICodes.INSUFFICIENT_USER_PRIVILEGE.code);
            }

            const moveOutRequest = await MoveOutRequests.getRepository().findOne({
                where: { id: requestId }
            });

            if (!moveOutRequest) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
            }

            if (moveOutRequest.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
            }

            // Only close the request here; the nightly job handles deallocation
            moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED;
            moveOutRequest.moveOutDate = body.moveOutDate;
            moveOutRequest.comments = body?.reason;
            moveOutRequest.updatedBy = user.id;
            await moveOutRequest.save();
            const userId = moveOutRequest.user.id;
            try {
                const details = await this.buildMoveOutDetailsPayload(moveOutRequest.unit.id, moveOutRequest.moveOutRequestNo, moveOutRequest.moveOutDate, moveOutRequest.requestType);
                await addNotification(userId, 'move_out_request_closure_to_user', details);
            } catch (e) { }
            try {
                await addAdminNotification(user.id, 'move_out_request_closed_by_security_to_admin', { "<request_no>": moveOutRequest.moveOutRequestNo, "<move_out_date>": moveOutRequest.moveOutDate }, { unit_id: moveOutRequest.unit.id });
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'closed';
                hist.actionByType = TransitionRequestActionByTypes.SECURITY;
                hist.remarks = body?.reason || '';
                hist.createdBy = user.id;
                await hist.save();
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in closeMoveOutRequestBySecurity : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getUnitById(id: number): Promise<Units | null> {
        try {
            return await Units.getRepository()
                .createQueryBuilder('u')
                .innerJoinAndSelect('u.masterCommunity', 'mc', 'mc.isActive = true')
                .innerJoinAndSelect('u.community', 'c', 'c.isActive = true')
                .leftJoinAndSelect('u.tower', 't', 't.isActive = true')
                .leftJoinAndSelect('u.unitRestriction', 'ut', 'ut.isActive = true')
                .where('u.id = :id', { id })
                .andWhere('u.isActive = true')
                .getOne();
        } catch (error) {
            logger.error(`Error in getUnitById : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async createMoveOutRequestByUser(body: any, user: any): Promise<MoveOutRequests | null> {
        try {

            const requestUserId = Number(user.id);
            const targetUnitId = Number(body.unitId);

            await this.ensureUnitHandoverCompleted(targetUnitId);
            const userRoleSlug = await this.getUserRoleSlugForUnit(requestUserId, targetUnitId);
            const { moveInRequest, accountRenewalRequest } = await this.getMoveInAndRenewalRequests(requestUserId, targetUnitId);

            // Allow multiple active move-out requests for same user+unit (business decision)

            let moveOutRequest!: MoveOutRequests;
            await executeInTransaction(async (qr: any) => {
                const manager: EntityManager = qr.manager;
                const moveOutRequestNo = await this.generateUnitScopedMoveOutRequestNo(manager, targetUnitId);
                const req = new MoveOutRequests();
                req.moveOutRequestNo = moveOutRequestNo;
                req.requestType = userRoleSlug;
                req.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
                req.moveOutDate = body.moveOutDate;
                req.comments = body.comments;
                req.createdBy = user.id;
                req.updatedBy = user.id;
                // set relations by id without extra fetches
                (req as any).user = { id: requestUserId };
                (req as any).unit = { id: targetUnitId };
                (req as any).moveInRequest = { id: moveInRequest.id };
                if (accountRenewalRequest) {
                    (req as any).accountRenewalRequest = { id: accountRenewalRequest.id };
                }
                await manager.save(MoveOutRequests, req);
                moveOutRequest = req;
            });
            // Notify Community Admins on submission (non-blocking)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, body.moveOutDate, userRoleSlug);
                await addAdminNotification(
                    user.id,
                    'move_out_request_submission_admin',
                    details,
                    { unit_id: targetUnitId }
                );
            } catch (e) { }
            // Notify User (submission confirmation)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, body.moveOutDate, userRoleSlug);
                await addNotification(user.id, 'move_out_request_submitted_to_user', details);
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'created';
                hist.actionByType = TransitionRequestActionByTypes.USER;
                hist.remarks = body?.comments || '';
                hist.createdBy = user.id;
                await hist.save();
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in createMoveOutRequestByUser : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async createMoveOutRequestByAdmin(body: any, adminUser: any): Promise<MoveOutRequests | null> {
        try {
            if (!adminUser?.isAdmin) {
                throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
            }

            const { unitId, userId, moveOutDate, comments } = body;

            if (!unitId || !userId || !moveOutDate) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }

            const occupantUserId = Number(userId);
            const targetUnitId = Number(unitId);

            await this.ensureUnitHandoverCompleted(targetUnitId);
            const userRoleSlug = await this.getUserRoleSlugForUnit(occupantUserId, targetUnitId);
            const { moveInRequest, accountRenewalRequest } = await this.getMoveInAndRenewalRequests(occupantUserId, targetUnitId);

            // Allow multiple active move-out requests for same user+unit (business decision)

            let moveOutRequest!: MoveOutRequests;
            await executeInTransaction(async (qr: any) => {
                const manager: EntityManager = qr.manager;
                const moveOutRequestNo = await this.generateUnitScopedMoveOutRequestNo(manager, targetUnitId);
                const req = new MoveOutRequests();
                req.moveOutRequestNo = moveOutRequestNo;
                req.requestType = userRoleSlug;
                req.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
                req.moveOutDate = moveOutDate;
                req.comments = comments;
                req.createdBy = adminUser.id;
                req.updatedBy = adminUser.id;
                (req as any).user = { id: occupantUserId };
                (req as any).unit = { id: targetUnitId };
                (req as any).moveInRequest = { id: moveInRequest.id };
                if (accountRenewalRequest) {
                    (req as any).accountRenewalRequest = { id: accountRenewalRequest.id };
                }
                await manager.save(MoveOutRequests, req);
                moveOutRequest = req;
            });
            // Auto-approval style messaging to customer (admin-created flow)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, moveOutDate, userRoleSlug);
                await addNotification(occupantUserId, 'move_out_request_approved', details);
                await addNotification(occupantUserId, 'move_out_approval_email_to_user', details);
            } catch (e) { }
            // Inform Admins the request has been created (auto-approved flow)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, moveOutDate, userRoleSlug);
                await addAdminNotification(adminUser.id, 'move_out_auto_approved_created_to_admin', details, { unit_id: targetUnitId });
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'created';
                hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                hist.remarks = comments || '';
                hist.createdBy = adminUser.id;
                await hist.save();
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in createMoveOutRequestByAdmin : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutHistory(requestId: number, user: any) {
        try {
            const rows = await MoveOutHistories.getRepository().createQueryBuilder('h')
                .innerJoin('h.request', 'mor')
                .where('mor.id = :requestId', { requestId })
                .orderBy('h.createdAt', 'DESC')
                .getMany();
            return rows;
        } catch (error) {
            logger.error(`Error in getMoveOutHistory : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutPermit(requestId: number, user: any) {
        try {
            const req = await MoveOutRequests.getRepository().findOne({ where: { id: requestId } });
            if (!req) return null;
            let payload: any = {};
            try { payload = req.additionalInfo ? JSON.parse(req.additionalInfo) : {}; } catch { payload = {}; }
            return payload?.permit || null;
        } catch (error) {
            logger.error(`Error in getMoveOutPermit : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    // Generates a request no like MOP-<unit_number>-<n> safely under concurrency
    private async generateUnitScopedMoveOutRequestNo(manager: EntityManager, unitId: number): Promise<string> {
        // Lock the unit row to serialize per-unit numbering
        const lockedUnit = await manager.getRepository(Units)
            .createQueryBuilder('u')
            .setLock('pessimistic_write')
            .where('u.id = :unitId', { unitId })
            .getOne();
        if (!lockedUnit) {
            throw new ApiError(httpStatus.NOT_FOUND, APICodes.UNIT_NOT_FOUND?.message || 'Unit not found', (APICodes as any).UNIT_NOT_FOUND?.code || 'UNIT_NOT_FOUND');
        }

        const unitNumber = lockedUnit.unitNumber;
        const prefix = `MOP-${unitNumber}-`;

        // Get the current max sequence for this unit
        const raw = await manager.getRepository(MoveOutRequests)
            .createQueryBuilder('mor')
            .innerJoin('mor.unit', 'u')
            .select("MAX(CAST(SUBSTRING_INDEX(mor.moveOutRequestNo, '-', -1) AS UNSIGNED))", 'max')
            .where('u.id = :unitId', { unitId })
            .andWhere('mor.moveOutRequestNo LIKE :prefix', { prefix: `${prefix}%` })
            .getRawOne();

        const currentMax = Number(raw?.max) || 0;
        const next = currentMax + 1;
        return `${prefix}${next}`;
    }

    private async getUserRoleSlugForUnit(userId: number, unitId: number): Promise<MOVE_IN_USER_TYPES> {
        const userRole = UserRoles.getRepository()
            .createQueryBuilder("ur")
            .innerJoin("ur.user", "user", "user.isActive = true")
            .innerJoin("ur.unit", "unit", "unit.isActive = true")
            .innerJoinAndSelect("ur.role", "role", "role.isActive = true")
            .where("user.id = :userId", { userId })
            .andWhere("unit.id = :unitId", { unitId })
            .select(["role.slug as slug"]);

        const userRoleResult = await userRole.getRawOne();

        const allowedRoles = Object.values(MOVE_IN_USER_TYPES) as MOVE_IN_USER_TYPES[];

        if (!userRoleResult?.slug || !allowedRoles.includes(userRoleResult.slug as MOVE_IN_USER_TYPES)) {
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.ROLE_NOT_FOUND.message, APICodes.ROLE_NOT_FOUND.code);
        }

        return userRoleResult.slug as MOVE_IN_USER_TYPES;
    }

    private async getMoveInAndRenewalRequests(userId: number, unitId: number): Promise<{ moveInRequest: MoveInRequests, accountRenewalRequest: AccountRenewalRequests | null }> {
        const moveInRequest = await MoveInRequests.getRepository()
            .createQueryBuilder("mir")
            .innerJoin("mir.user", "mirUser", "mirUser.isActive = true")
            .innerJoin("mir.unit", "mirUnit", "mirUnit.isActive = true")
            .where("mir.isActive = true")
            .andWhere("mirUser.id = :userId", { userId })
            .andWhere("mirUnit.id = :unitId", { unitId })
            .andWhere("mir.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] })
            .orderBy("mir.updatedAt", "DESC")
            .getOne();

        if (!moveInRequest) {
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
        }

        const accountRenewalRequest = await AccountRenewalRequests.getRepository()
            .createQueryBuilder("arr")
            .innerJoin("arr.user", "arrUser", "arrUser.isActive = true")
            .innerJoin("arr.unit", "arrUnit", "arrUnit.isActive = true")
            .where("arr.isActive = true")
            .andWhere("arrUser.id = :userId", { userId })
            .andWhere("arrUnit.id = :unitId", { unitId })
            .andWhere("arr.moveInRequest = :moveInRequestId", { moveInRequestId: moveInRequest.id })
            .andWhere("arr.status = :status", { status: MOVE_REQUEST_STATUS.APPROVED })
            .orderBy("arr.updatedAt", "DESC")
            .getOne();

        return { moveInRequest, accountRenewalRequest };
    }

    // Admin helper: return occupant user details for a unit and ensure a closed move-in exists for same user
    async getMoveOutUserDetailsByUnit(unitId: number, user: any) {
        try {
            // basic unit check
            const unit = await this.getUnitById(unitId);
            if (!unit) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.UNIT_NOT_FOUND.message, APICodes.UNIT_NOT_FOUND.code);
            }

            // 1) Try current occupant mapping via helper (does not over-restrict joins)
            const currentOcc = await getCurrentOccupancyRoleForUnit(unitId);

            if (currentOcc?.user?.id) {
                // ensure a CLOSED move-in exists for the same user + unit
                await this.getMoveInAndRenewalRequests(Number(currentOcc.user.id), unitId);
                return {
                    userId: Number(currentOcc.user.id),
                    firstName: currentOcc.user.firstName || null,
                    middleName: currentOcc.user.middleName || null,
                    lastName: currentOcc.user.lastName || null,
                    email: currentOcc.user.email || null,
                    mobile: currentOcc.user.mobile || null,
                    dialCode: (currentOcc.user as any)?.dialCode?.dialCode || (currentOcc.user as any)?.dialCode || null,
                    residencyType: (currentOcc as any)?.role?.slug || unit.occupancyStatus || null,
                };
            }

            // 2) Fallback: use the latest CLOSED Move-In for this unit to derive user
            const lastClosedMoveIn = await MoveInRequests.getRepository()
                .createQueryBuilder('mir')
                .innerJoinAndSelect('mir.unit', 'u', 'u.isActive = true')
                .innerJoinAndSelect('mir.user', 'usr', 'usr.isActive = true')
                .leftJoinAndSelect('usr.dialCode', 'dc')
                .where('mir.isActive = true')
                .andWhere('u.id = :unitId', { unitId })
                .andWhere('mir.status = :closed', { closed: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED })
                .orderBy('mir.updatedAt', 'DESC')
                .getOne();

            if (!lastClosedMoveIn?.user?.id) {
                // No occupant and no closed move-in → nothing to return for this unit
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
            }

            return {
                userId: Number(lastClosedMoveIn.user.id),
                firstName: lastClosedMoveIn.user.firstName || null,
                middleName: lastClosedMoveIn.user.middleName || null,
                lastName: lastClosedMoveIn.user.lastName || null,
                email: lastClosedMoveIn.user.email || null,
                mobile: lastClosedMoveIn.user.mobile || null,
                dialCode: (lastClosedMoveIn.user as any)?.dialCode?.dialCode || (lastClosedMoveIn.user as any)?.dialCode || null,
                residencyType: lastClosedMoveIn.requestType || null,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error(`Error in getMoveOutUserDetailsByUnit : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }
}
