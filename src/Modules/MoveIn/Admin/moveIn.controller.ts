import { Request, Response } from "express";
import { MoveInService } from "./moveIn.service";
import {
  notFoundResponse,
  successResponseWithData,
  successResponseWithPaginationData,
} from "../../../Common/Utils/apiResponse";
import { APICodes } from "../../../Common/Constants";

const moveInService = new MoveInService();

export class MoveInController {
  async getAllMoveInRequestList(req: Request, res: Response) {
    const { query } = req;
    const { user }: Record<string, any> = req;
    const moveInRequestList = await moveInService.getAdminMoveIn(query, user);
    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, moveInRequestList.data, moveInRequestList.pagination);
  }

  async createMoveInRequest(req: Request, res: Response) {
    const result = await moveInService.createMoveIn(req.body);
    return successResponseWithData(res, APICodes.LISTING_SUCCESS, result);
  }

  async getAllMoveInDetailsList(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params;
    const moveOutRequest = await moveInService.getMoveInRequestById(Number(requestId), user);
    if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, moveOutRequest);
  }
}
