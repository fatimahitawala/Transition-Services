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
    const { query, user }: Record<string, any> = req;
    const moveInRequestList = await moveInService.getAllMoveInRequestList(query, user);
    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, moveInRequestList.data, moveInRequestList.pagination);
  }

  async createMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, body }: Record<string, any> = req;
    const result = await moveInService.createMoveInRequest(body, user);
    return successResponseWithData(res, APICodes.LISTING_SUCCESS, result);
  }

  async getMoveInRequestDetailsWithId(req: AuthenticatedRequest, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params;
    const moveOutRequest = await moveInService.getMoveInRequestDetailsWithId(Number(requestId), user);
    if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, moveOutRequest);
  }

  // New Admin-specific move-in request methods
  async createOwnerMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, body } = req;
    logger.debug(`MOVE-IN | CREATE OWNER | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(body)}`);
    const result = await moveInService.createOwnerMoveIn(body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createTenantMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, body } = req;
    logger.debug(`MOVE-IN | CREATE TENANT | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(body)}`);
    const result = await moveInService.createTenantMoveIn(body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhoOwnerMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, body } = req;
    logger.debug(`MOVE-IN | CREATE HHO OWNER | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(body)}`);
    const result = await moveInService.createHhoOwnerMoveIn(req.body, req.user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  async createHhcCompanyMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, body } = req;
    logger.debug(`MOVE-IN | CREATE HHC COMPANY | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(body)}`);
    const result = await moveInService.createHhcCompanyMoveIn(body, user);
    return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
  }

  // Document upload method for Admin
  async uploadDocuments(req: AuthenticatedRequest, res: Response) {
    const { requestId } = req.params;
    const { files, body, user } = req as any;

    logger.debug(`MOVE-IN | UPLOAD DOCUMENTS | ADMIN | REQUEST ID: ${requestId} | USER: ${user?.id} | FILES: ${JSON.stringify(files)}`);
    const result = await moveInService.uploadDocuments(Number(requestId), files, body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  // ==================== STATUS MANAGEMENT CONTROLLERS ====================

  /**
   * Approve move-in request (UC-136)
   * Business Rules:
   * - Only requests in Submitted, RFI Submitted status can be approved
   * - No active overlapping move-in request exists for the same unit
   * - MIP template must be active for the unit
   * - SLA: Move-in request max 30 days validity
   */
  async approveMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, params, body }: Record<string, any> = req;
    const { requestId } = params;
    const { comments } = body;
    logger.debug(`MOVE-IN | APPROVE REQUEST | ADMIN | REQUEST ID: ${requestId} | USER: ${user?.id} | COMMENTS: ${comments}`);
    const result = await moveInService.approveMoveInRequest(Number(requestId), comments, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  /**
   * Mark move-in request as RFI (UC-135)
   * Business Rules:
   * - Only requests in Submitted status can be marked as RFI
   * - Admin must provide remarks
   * - Status transition: Submitted → RFI Pending
   */
  async markRequestAsRFI(req: AuthenticatedRequest, res: Response) {
    const { user, params, body } = req;
    const { requestId } = params;
    const { comments } = body;

    logger.debug(`MOVE-IN | MARK RFI | ADMIN | REQUEST ID: ${requestId} | USER: ${user?.id} | COMMENTS: ${comments}`);

    const result = await moveInService.markRequestAsRFI(Number(requestId), comments, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  /**
   * Cancel/Reject move-in request (UC-138)
   * Business Rules:
   * - Only requests in Submitted, RFI Submitted, or Approved status can be cancelled
   * - Cancellation remarks are mandatory
   * - Status changes to Cancelled
   */
  async cancelMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, params, body } = req;
    const { requestId } = params;
    const { cancellationRemarks } = body;
    logger.debug(`MOVE-IN | CANCEL REQUEST | ADMIN | REQUEST ID: ${requestId} | USER: ${user?.id} | REMARKS: ${cancellationRemarks}`);
    const result = await moveInService.cancelMoveInRequest(Number(requestId), cancellationRemarks, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

  /**
   * Close move-in request by security (UC-139)
   * Business Rules:
   * - Only requests in Approved status can be closed
   * - Security team can close requests
   * - Unit is linked to user and marked as occupied
   * - Previous user access is invalidated
   */
  async closeMoveInRequest(req: AuthenticatedRequest, res: Response) {
    const { user, params, body } = req;
    const { requestId } = params;
    const { closureRemarks, actualMoveInDate } = body;
    logger.debug(`MOVE-IN | CLOSE REQUEST | SECURITY/ADMIN | REQUEST ID: ${requestId} | USER: ${user?.id} | REMARKS: ${closureRemarks} | DATE: ${actualMoveInDate}`);
    const result = await moveInService.closeMoveInRequest(Number(requestId), closureRemarks, new Date(actualMoveInDate), user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

}