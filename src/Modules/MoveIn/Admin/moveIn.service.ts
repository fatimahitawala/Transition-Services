import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../../Common/Utils/adminAccess";
import { logger } from "../../../Common/Utils/logger";
import { MOVE_IN_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS } from "../../../Entities/EntityTypes";
import { MoveInRequestDetailsHhcCompany } from "../../../Entities/MoveInRequestDetailsHhcCompany.entity";
import { MoveInRequestDetailsHhoOwner } from "../../../Entities/MoveInRequestDetailsHhoOwner.entity";
import { MoveInRequestDetailsTenant } from "../../../Entities/MoveInRequestDetailsTenant.entity";

export class MoveInService {
  createMoveInRequest(body: any) {
    throw new Error("Method not implemented.");
  }

  async createMoveIn(data: any) {
    // TODO: Implement business logicxxw
    return { success: true, name: "krishnan", data };
  }

  async getAllMoveInRequestList(query: any) {
    try {
      const { page = 1, per_page = 20 } = query;
      const skip = (page - 1) * per_page;
      const getMoveInRequestList = await MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .where("mv.isActive= true", {});
      const count = await getMoveInRequestList.getCount();
      const data = await getMoveInRequestList.offset(skip).limit(per_page).getMany();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data, pagination };
    } catch (error) {
      logger.error(`Error in MoveInRequestList : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }

  async getAdminMoveIn(query: any, user: any) {
    try {
      const isSecurity = await checkIsSecurity(user);
      let {
        page = 1,
        per_page = 20,
        masterCommunityIds = "",
        communityIds = "",
        towerIds = "",
        createdStartDate = "",
        createdEndDate = "",
        moveInStartDate = "",
        moveInEndDate = "",
      } = query;

      masterCommunityIds = masterCommunityIds.split(",").filter((e: any) => e);
      communityIds = communityIds.split(",").filter((e: any) => e);
      towerIds = towerIds.split(",").filter((e: any) => e);

      let whereClause = "am.isActive = true";

      if (masterCommunityIds && masterCommunityIds.length)
        whereClause += ` AND am.masterCommunity IN (:...masterCommunityIds)`;

      if (communityIds && communityIds.length)
        whereClause += ` AND am.community IN (:...communityIds)`;

      if (towerIds && towerIds.length)
        whereClause += ` AND am.tower IN (:...towerIds)`;

      if (createdStartDate) whereClause += ` AND am.createdAt >= :createdStartDate`;

      if (createdEndDate) whereClause += ` AND am.createdAt <= :createdEndDate`;

      if (moveInStartDate) whereClause += ` AND am.moveInDate >= :moveInStartDate`;

      if (moveInEndDate) whereClause += ` AND am.moveInDate <= :moveInEndDate`;

      let getMoveInList = MoveInRequests.getRepository()
        .createQueryBuilder("am")
        .select([
          "am.status",
          "am.createdAt",
          "am.moveInDate",
          "am.moveInRequestNo",
          "am.requestType",
        ])
        .where(whereClause, {
          masterCommunityIds,
          communityIds,
          towerIds,
          startDate: query.startDate,
          endDate: query.endDate,
        });

      getMoveInList.innerJoinAndSelect("am.unit", "u", "u.isActive=1");
      getMoveInList.innerJoinAndSelect("u.masterCommunity", "mc", "mc.isActive=1");
      getMoveInList.innerJoinAndSelect("u.community", "c", "c.isActive=1");
      getMoveInList.innerJoinAndSelect("u.tower", "t", "t.isActive=1");

      getMoveInList.where(whereClause, { masterCommunityIds, communityIds, towerIds });

      getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, query.user);

      if (isSecurity) {
        getMoveInList.andWhere("am.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }
      getMoveInList.offset((page - 1) * per_page).limit(per_page);

      const list = await getMoveInList.getMany();
      const count = await getMoveInList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data: list, pagination };
    } catch (error) {
      logger.error(`Error in getAdminMoveIn : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }

  async getMoveInRequestById(requestId: number, user: any) {
    try {
      let query = MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .select([
          "mv.id",
          "masterCommunity.name",
          "community.name",
          "tower.name",
          "unit.unitName",
          "unit.unitNumber",
          "tower.id",
          "community.id",
          "masterCommunity.id",
          "unit.id",
          "user.firstName",
          "user.middleName",
          "user.lastName",
          "user.email",
          "user.mobile",
          "mv.requestType",
          "mv.moveInDate",
          "mv.comments",
          "mv.moveInRequestNo",
          "mv.createdBy",
          "mv.status",
          "mv.createdAt",
          "mv.updatedAt",
        ])
        .innerJoin("mv.user", "user", "user.isActive = true")
        .innerJoin("mv.unit", "unit", "unit.isActive = true")
        .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
        .innerJoin("unit.tower", "tower", "tower.isActive = true")
        .innerJoin("unit.community", "community", "community.isActive = true")
        .where("mv.isActive = true AND mv.id = :requestId", { requestId });

      const isSecurity = await checkIsSecurity(user);

      if (isSecurity) {
        query.andWhere("mv.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }

      let result: any = await query.getOne();

      if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
      }

      const detailsMap: Record<string, { repo: any; alias: string; key: string }> = {
        [MOVE_IN_USER_TYPES.HHO_COMPANY]: {
          repo: MoveInRequestDetailsHhcCompany,
          alias: "moveInCompany",
          key: "moveInCompanyDetails",
        },
        [MOVE_IN_USER_TYPES.HHO_OWNER]: {
          repo: MoveInRequestDetailsHhoOwner,
          alias: "moveInHHO",
          key: "moveInHHOOwnerDetails",
        },
        [MOVE_IN_USER_TYPES.TENANT]: {
          repo: MoveInRequestDetailsTenant,
          alias: "moveInTenant",
          key: "moveInTenantDetails",
        },
        [MOVE_IN_USER_TYPES.OWNER]: {
          repo: MoveInRequestDetailsTenant,
          alias: "moveInOwner",
          key: "moveInOwnerDetails",
        },
      };

      const typeConfig = detailsMap[result.requestType];
      if (typeConfig) {
        const details = await typeConfig.repo
          .getRepository()
          .createQueryBuilder(typeConfig.alias)
          .where(`${typeConfig.alias}.moveInRequest.id = :id AND ${typeConfig.alias}.isActive = true`, { id: result.id })
          .getOne();

        result = { ...result, [typeConfig.key]: details };
      }

      return result;
    } catch (error) {
      logger.error(`Error in MoveInRequestById : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }
}

