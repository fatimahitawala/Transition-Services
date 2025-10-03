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

    const renewalRequestList = await renewalService.getMobileRenewal(query, user);

    return successResponseWithPaginationData(res, APICodes.LISTING_SUCCESS, renewalRequestList.data, renewalRequestList.pagination);
  }

  async getRenewalRequestDetails(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    
    logger.debug(`RENEWAL | GET DETAILS | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    
    const renewalRequestDetails = await renewalService.getMobileRenewalRequestDetails(Number(requestId), user);
    
    if (!renewalRequestDetails) {
      return notFoundResponse(res, APICodes.RENEWAL_REQUEST_NOT_FOUND);
    }
    
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, renewalRequestDetails);
  }

  async createTenantRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE TENANT | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createTenantRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async createHhoOwnerRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE HHO OWNER | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createHhoOwnerRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async createHhcCompanyRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    logger.debug(`RENEWAL | CREATE HHC COMPANY | MOBILE REQUEST | USER: ${user?.id} | BODY: ${JSON.stringify(req.body)}`);
    const result = await renewalService.createHhcCompanyRenewal(req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CREATED, result);
  }

  async updateTenantRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE TENANT | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateTenantRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async updateHhoOwnerRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE HHO OWNER | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateHhoOwnerRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async updateHhcCompanyRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | UPDATE HHC COMPANY | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.updateHhcCompanyRenewal(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_UPDATED, result);
  }

  async cancelRenewalRequest(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params as any;
    logger.debug(`RENEWAL | CANCEL REQUEST | MOBILE REQUEST | USER: ${user?.id} | REQUEST: ${requestId}`);
    const result = await renewalService.cancelRenewalRequest(Number(requestId), req.body, user);
    return successResponseWithData(res, APICodes.RENEWAL_REQUEST_CANCELLED, result);
  }

  async uploadDocuments(req: Request, res: Response) {
    const { user }: Record<string, any> = req;
    const { requestId } = req.params;
    const { files, body } = req as any;

    logger.debug(`RENEWAL | UPLOAD DOCUMENTS | REQUEST ID: ${requestId} | USER: ${user?.id} | FILES: ${JSON.stringify(files)}`);

    const result = await renewalService.uploadDocuments(Number(requestId), files, body, user);
    return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
  }
}

