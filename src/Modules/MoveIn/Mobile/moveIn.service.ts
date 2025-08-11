import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { checkAdminPermission } from "../../../Common/Utils/adminAccess";
import { Units } from "../../../Entities/Units.entity";

export class MoveInService {
  createMoveInRequest(body: any) {
    throw new Error("Method not implemented.");
  }

  async createMoveIn(data: any) {
    // TODO: Implement business logicxxw
    return { success: true, name: "krishnan", data };
  }

  async getAlMoveInRequestList(query: any) {
    try {
      const { page = 1, per_page = 20 } = query;
      const skip = (page - 1) * per_page;
      const getMoveInRequestList = await MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .where("mv.isActive= true", {});
      const count = await getMoveInRequestList.getCount();
      const data = await getMoveInRequestList
        .offset(skip)
        .limit(per_page)
        .getMany();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data, pagination };
    } catch (error) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code,
        error
      );
    }
  }

  async getMobileMoveIn(query: any, unitId: number) {
    const unit = await this.getUnitById(unitId);

    if (!unit) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        APICodes.UNIT_NOT_FOUND.message,
        APICodes.UNIT_NOT_FOUND.code
      );
    }
    try {
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
        unit = "",
        unitIds = "",
      } = query;
      masterCommunityIds = masterCommunityIds.split(",").filter((e: any) => e);
      communityIds = communityIds.split(",").filter((e: any) => e);
      towerIds = towerIds.split(",").filter((e: any) => e);
      unitIds = unitIds.split(",").filter((e: any) => e);
      let whereClause = "am.isActive = true";

      if (masterCommunityIds && masterCommunityIds.length)
        whereClause += ` AND am.masterCommunity IN (:...masterCommunityIds)`;

      if (communityIds && communityIds.length)
        whereClause += ` AND am.community IN (:...communityIds)`;

      if (towerIds && towerIds.length)
        whereClause += ` AND am.tower IN (:...towerIds)`;

      if (createdStartDate)
        whereClause += ` AND am.createdAt >= :createdStartDate`;

      if (createdEndDate) whereClause += ` AND am.createdAt <= :createdEndDate`;

      if (moveInStartDate)
        whereClause += ` AND am.moveInDate >= :moveInStartDate`;

      if (moveInEndDate) whereClause += ` AND am.moveInDate <= :moveInEndDate`;
      if (unit) whereClause += `AND am.unit =:unitId`;
      if (unitIds && unitIds.length)
        whereClause += ` AND am.unit IN (:...units)`;

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
      getMoveInList.innerJoinAndSelect(
        "u.masterCommunity",
        "mc",
        "mc.isActive=1"
      );
      getMoveInList.innerJoinAndSelect("u.community", "c", "c.isActive=1");
      getMoveInList.innerJoinAndSelect("u.tower", "t", "t.isActive=1");
      getMoveInList.where(whereClause, {
        masterCommunityIds,
        communityIds,
        towerIds,
      });

      // getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, query.user);
      getMoveInList.offset((page - 1) * per_page).limit(per_page);

      const list = await getMoveInList.getMany();
      const count = await getMoveInList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data: list, pagination };
    } catch (error) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code,
        error
      );
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
