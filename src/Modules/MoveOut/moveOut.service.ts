import httpStatus from "http-status";
import ApiError from "../../Common/Utils/ApiError";
import { logger } from "../../Common/Utils/logger";
import { APICodes } from "../../Common/Constants";
import { MoveOutRequests } from "../../Entities/MoveOutRequests.entity";
import { getPaginationInfo } from "../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../Common/Utils/adminAccess";
import { Units } from "../../Entities/Units.entity";
import { MOVE_IN_AND_OUT_REQUEST_STATUS } from "../../Entities/EntityTypes";

export class MoveOutService {

    async getAllMoveOutListAdmin(query: any, user: any) {
        try {
            const { page = 1, per_page = 20, requestId, moveOutType, masterCommunity, community, tower, unit, createdDate, moveOutDate, requestStatus } = query
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
                .where("mor.isActive = true")

            const isSecurity = await checkIsSecurity(user);
            qb = checkAdminPermission(qb, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);

            if (isSecurity) {
                qb.andWhere("mor.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
            }

            if (requestId) qb.andWhere("mor.id = :requestId", { requestId });
            if (moveOutType) qb.andWhere("mor.requestType = :moveOutType", { moveOutType });
            if (masterCommunity) qb.andWhere("masterCommunity.id = :masterCommunity", { masterCommunity });
            if (community) qb.andWhere("community.id = :community", { community });
            if (tower) qb.andWhere("tower.id = :tower", { tower });
            if (unit) qb.andWhere("unit.id = :unit", { unit });
            if (requestStatus) qb.andWhere("mor.status = :requestStatus", { requestStatus });
            if (createdDate) qb.andWhere("DATE(mor.createdAt) = :createdDate", { createdDate });
            if (moveOutDate) qb.andWhere("DATE(mor.moveOutDate) = :moveOutDate", { moveOutDate });

            qb.orderBy("mor.createdAt", "DESC")
                .offset((page - 1) * per_page)
                .limit(per_page);
            const count = await qb.getCount();
            const list = await qb.getMany();
            const pagination = getPaginationInfo(page, per_page, count);
            return { allMoveOutRequests: list, pagination };
        } catch (error) {
            logger.error(error)
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
        }
    }

    async adminApproveOrCancelRequest(user: any, params: any, body: any) {
        try {
            let moveOutRequest = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.id = :requestId", { requestId: params?.requestId })
                .andWhere("mor.isActive = true")
            moveOutRequest = checkAdminPermission(moveOutRequest, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);
            const result = await moveOutRequest.getOne();

            if (result) {

                result.status = params?.action === 'approve' ? MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED : MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED;
                result.updatedBy = user.id;
                result.moveOutDate = body?.moveOutDate;
                result.comments = body?.reason;

                await MoveOutRequests.getRepository().save(result);

                if (result?.status == MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {

                }

                return result;
            }
        } catch (error) {
            logger.error(error)
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
        }
    }

    async getMoveOutList(query: any) {
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
            logger.error(error)
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
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
            return result;
        } catch (error) {
            logger.error(error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
        }
    }

    async cancelMoveOutRequestByUser(body: any, userId: number, requestId: number) {
        try {
            const moveOutRequest = await MoveOutRequests.getRepository().findOne({
                where: { id: requestId, user: { id: userId } }
            });
            if (moveOutRequest && moveOutRequest.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED;
                moveOutRequest.comments = body.reason;
                moveOutRequest.updatedBy = userId;
                await moveOutRequest.save();
                return moveOutRequest;
            }
        } catch (error) {
            logger.error(error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
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
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                APICodes.UNKNOWN_ERROR.message,
                APICodes.UNKNOWN_ERROR.code,
                error
            );
        }
    }

}
