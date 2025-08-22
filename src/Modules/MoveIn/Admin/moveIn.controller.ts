import { Request, Response } from "express";
import { MoveInService } from "./moveIn.service";
import {
  notFoundResponse,
  successResponseWithData,
  successResponseWithPaginationData,
} from "../../../Common/Utils/apiResponse";
import { APICodes } from "../../../Common/Constants";
import { logger } from "../../../Common/Utils/logger";

// Extend the Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

const moveInService = new MoveInService();

export class MoveInController {
  async getAllMoveInRequestList(req: AuthenticatedRequest, res: Response) {
    const { query }: Record<string, any> = req;
    const moveInRequestList = await moveInService.getAdminMoveIn(query, req.user);
    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, moveInRequestList.data, moveInRequestList.pagination);
  }

  async createMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { query }: Record<string, any> = req;
    const result = await moveInService.createMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.LISTING_SUCCESS, result);
  }

  async getAllMoveInDetailsList(req: AuthenticatedRequest, res: Response) {
    const { query }: Record<string, any> = req;
    const { requestId } = req.params;
    const moveOutRequest = await moveInService.getMoveInRequestById(Number(requestId), req.user);
    if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, moveOutRequest);
  }

  // New Admin-specific move-in request methods
  async createOwnerMoveInRequest(req: AuthenticatedRequest, res: Response) {
    logger.debug(`MOVE-IN | CREATE OWNER | ADMIN REQUEST | USER: ${req.user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createOwnerMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createTenantMoveInRequest(req: AuthenticatedRequest, res: Response) {
    logger.debug(`MOVE-IN | CREATE TENANT | ADMIN REQUEST | USER: ${req.user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createTenantMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhoOwnerMoveInRequest(req: AuthenticatedRequest, res: Response) {
    logger.debug(`MOVE-IN | CREATE HHO OWNER | ADMIN REQUEST | USER: ${req.user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createHhoOwnerMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhcCompanyMoveInRequest(req: AuthenticatedRequest, res: Response) {
    logger.debug(`MOVE-IN | CREATE HHC COMPANY | ADMIN REQUEST | USER: ${req.user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createHhcCompanyMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  // Document upload method for Admin
  async uploadDocuments(req: AuthenticatedRequest, res: Response) {
    const { requestId } = req.params;
    const { files, body } = req as any;
    
    logger.debug(`MOVE-IN | UPLOAD DOCUMENTS | ADMIN | REQUEST ID: ${requestId} | USER: ${req.user?.id} | FILES: ${JSON.stringify(files)}`);
    
    const result = await moveInService.uploadDocuments(Number(requestId), files, body, req.user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }
}
