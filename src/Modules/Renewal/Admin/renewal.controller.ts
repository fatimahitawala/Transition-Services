import { Request, Response } from 'express';
import { RenewalService } from './renewal.service';
import {
  successResponseWithData,
  successResponseWithPaginationData,
  notFoundResponse,
} from '../../../Common/Utils/apiResponse';
import { APICodes } from '../../../Common/Constants';
import { logger } from '../../../Common/Utils/logger';

const renewalService = new RenewalService();

export class RenewalController {
  async getAllRenewalRequestList(req: Request, res: Response) {
    const { query, user } = req;

    const renewalRequestList = await renewalService.getAdminRenewal(query, user);

    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, renewalRequestList.data, renewalRequestList.pagination);
  }

  async getRenewalRequestDetailsWithId(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    
    logger.debug(`RENEWAL | GET DETAILS | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    
    const renewalRequestDetails = await renewalService.getAdminRenewalRequestDetails(Number(requestId), user);
    
    if (!renewalRequestDetails) {
      return notFoundResponse(res, APICodes.RENEWAL_REQUEST_NOT_FOUND);
    }
    
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, renewalRequestDetails);
  }

  async createTenantRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE TENANT | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createTenantRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async createHhoOwnerRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE HHO OWNER | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createHhoOwnerRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async createHhcCompanyRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE HHC COMPANY | ADMIN REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createHhcCompanyRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async updateTenantRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE TENANT | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateTenantRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async updateHhoOwnerRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE HHO OWNER | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateHhoOwnerRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async updateHhcCompanyRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE HHC COMPANY | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateHhcCompanyRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async approveRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | APPROVE REQUEST | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.approveRenewalRequest(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_APPROVED, result);
  }

  async markRequestAsRFI(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | MARK AS RFI | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.markRequestAsRFI(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_MARKED_RFI, result);
  }

  async cancelRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | CANCEL REQUEST | ADMIN REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.cancelRenewalRequest(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CANCELLED, result);
  }

  async uploadDocuments(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params;
    const { files, body } = req as any;

    logger.debug(`RENEWAL | UPLOAD DOCUMENTS | ADMIN REQUEST | REQUEST ID: ${requestId} | USER: ${user?.id} | FILES: ${JSON.stringify(files)}`);

    const result = await renewalService.uploadDocuments(Number(requestId), files, body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }

// Close operation removed - not applicable for renewals as per BRD
}

