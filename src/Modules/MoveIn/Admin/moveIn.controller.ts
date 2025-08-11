import { Request, Response } from "express";
import { MoveInService } from "./moveIn.service";
import {
  successResponseWithData,
  successResponseWithPaginationData,
} from "../../../Common/Utils/apiResponse";
import { APICodes } from "../../../Common/Constants";

const moveInService = new MoveInService();

export class MoveInController {
  async getAllMoveInRequestList(req: Request, res: Response) {
    const { query } = req;

    const moveInRequestList = await moveInService.getAdminMoveIn(query);

    return successResponseWithPaginationData(
      res,
      APICodes.LISTING_SUCCESS,
      moveInRequestList.data,
      moveInRequestList.pagination
    );
  }

  async createMoveInRequest(req: Request, res: Response) {
    const result = await moveInService.createMoveIn(req.body);

    return successResponseWithData(
      res,
      APICodes.LISTING_SUCCESS,
      result
    );
  }
}
