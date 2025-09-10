import { Request, Response } from 'express';
import { MoveInService } from './moveIn.service';
import {
  successResponseWithData,
  successResponseWithPaginationData,
  notFoundResponse,
} from '../../../Common/Utils/apiResponse';
import { APICodes } from '../../../Common/Constants';
import { logger } from '../../../Common/Utils/logger';

const moveInService = new MoveInService();

export class MoveInController {
  async getAllMoveInRequestList(req: Request, res: Response) {
    const { query } = req;

    const moveInRequestList = await moveInService.getMobileMoveIn(query);

    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, moveInRequestList.data, moveInRequestList.pagination);
  }

  async getMoveInRequestDetails(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    
    logger.debug(`MOVE-IN | GET DETAILS | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    
    const moveInRequestDetails = await moveInService.getMobileMoveInRequestDetails(Number(requestId), user);
    
    if (!moveInRequestDetails) {
      return notFoundResponse(res, APICodes.REQUEST_NOT_FOUND);
    }
    
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, moveInRequestDetails);
  }

  // Removed generic createMoveInRequest in favor of type-specific endpoints

  async createOwnerMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`MOVE-IN | CREATE OWNER | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createOwnerMoveIn(req.body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createTenantMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`MOVE-IN | CREATE TENANT | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createTenantMoveIn(req.body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhoOwnerMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`MOVE-IN | CREATE HHO OWNER | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createHhoOwnerMoveIn(req.body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhcCompanyMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`MOVE-IN | CREATE HHC COMPANY | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.createHhcCompanyMoveIn(req.body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async updateOwnerMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`MOVE-IN | UPDATE OWNER | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.updateOwnerMoveIn(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  async updateTenantMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`MOVE-IN | UPDATE TENANT | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.updateTenantMoveIn(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  async updateHhoOwnerMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`MOVE-IN | UPDATE HHO OWNER | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.updateHhoOwnerMoveIn(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  async updateHhcCompanyMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`MOVE-IN | UPDATE HHC COMPANY | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.updateHhcCompanyMoveIn(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  // Single comprehensive document upload method (following AmenityRegistration pattern)
  async uploadDocuments(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params;
    const { files, body } = req as any;

    logger.debug(`MOVE-IN | UPLOAD DOCUMENTS | REQUEST ID: ${requestId} | USER: ${user?.id} | FILES: ${JSON.stringify(files)}`);

    const result = await moveInService.uploadDocuments(Number(requestId), files, body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  /**
   * Cancel move-in request (Mobile)
   */
  async cancelMoveInRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`MOVE-IN | CANCEL REQUEST | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId} | BODY: ${JSON.stringify(req.body)}`);
    const result = await moveInService.cancelMoveInRequest(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }
}
