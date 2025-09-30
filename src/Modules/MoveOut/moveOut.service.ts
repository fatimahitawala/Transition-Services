import httpStatus from "http-status";
import ApiError from "../../Common/Utils/ApiError";
import { logger } from "../../Common/Utils/logger";
import { APICodes } from "../../Common/Constants";
import { MoveOutRequests } from "../../Entities/MoveOutRequests.entity";
import { getPaginationInfo } from "../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../Common/Utils/adminAccess";
import { Units } from "../../Entities/Units.entity";
import { UnitBookings } from "../../Entities/UnitBookings.entity";
import { MOVE_IN_AND_OUT_REQUEST_STATUS, MOVE_IN_USER_TYPES, MOVE_REQUEST_STATUS } from "../../Entities/EntityTypes";
import { addNotification, addAdminNotification } from "../../Common/Utils/notification";
import { UserRoles } from "../../Entities/UserRoles.entity";
import { MoveInRequests } from "../../Entities/MoveInRequests.entity";
import { AccountRenewalRequests } from "../../Entities/AccountRenewalRequests.entity";
import { executeInTransaction } from "../../Common/Utils/transactionUtil";
import { EntityManager } from "typeorm";

export class MoveOutService {
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
                    "mor.moveOutRequestNo as moveOutRequestNo",
                    "mor.moveOutDate as moveOutDate",
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

                const payload = {
                    "<request_no>": result.moveOutRequestNo,
                    "<user_type>": userRoleResult?.slug,
                    "<property_details>": `${result.unitName}, ${result.unitNumber}`,
                    "<occupant_name>": `${result?.firstName} ${result?.lastName}`,
                    "<move_out_date>": result?.moveOutDate,
                    "<end_date>": '',
                    "<permit_date>": ''
                }
                addNotification(userId, 'move_out_request_approval_to_user', { "<request_no>": result.moveOutRequestNo })
                console.log("Sending move_out_request_approval_to_user_mail notification", userId, payload);

                addNotification(userId, 'move_out_request_approval_to_user_mail', payload)
                // Notify Security Team on approval (non-blocking)
                try {
                    await addAdminNotification(
                        user.id,
                        'move_out_request_approved_security',
                        { "<request_no>": result.moveOutRequestNo, "<move_out_date>": result.moveOutDate },
                        { unit_id: unitId }
                    );
                } catch (e) { }
            } else {
                addNotification(userId, 'move_out_request_cancel_to_user', { "<request_no>": result.moveOutRequestNo })
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

            moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED;
            moveOutRequest.moveOutDate = body.moveOutDate;
            moveOutRequest.comments = body?.reason;
            moveOutRequest.updatedBy = user.id;
            await moveOutRequest.save();
            const userId = moveOutRequest.user.id;
            addNotification(userId, 'move_out_request_closure_to_user', { "<request_no>": moveOutRequest.moveOutRequestNo });
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
                .createQueryBuilder("u")
                .leftJoinAndMapOne("u.tower", "u.tower", "t", "t.isActive = 1")
                .leftJoinAndMapOne("u.community", "u.community", "c", "c.isActive = 1")
                .leftJoinAndMapOne(
                    "u.masterCommunity",
                    "u.masterCommunity",
                    "mc",
                    "mc.isActive = 1"
                )
                .leftJoinAndMapOne(
                    "u.unitRestriction",
                    "u.unitRestriction",
                    "ut",
                    "ut.isActive = 1"
                )
                .where({ id })
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
                await addAdminNotification(
                    user.id,
                    'move_out_request_submission_admin',
                    { "<request_no>": moveOutRequest.moveOutRequestNo },
                    { unit_id: targetUnitId }
                );
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
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in createMoveOutRequestByAdmin : ${JSON.stringify(error)}`);
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

}
