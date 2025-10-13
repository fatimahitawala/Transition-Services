import { Request, Response } from 'express';
import { successResponseWithPaginationData, successResponseWithData, successResponseWithPaginationCountData } from '../../../Common/Utils/apiResponse';
import { APICodes } from '../../../Common/Constants';
import activeResidentsService from './activeResidents.service';

class ActiveResidentsController {
  async list(req: Request, res: Response) {
    const { data, pagination, counts } = await activeResidentsService.getActiveResidentsList(req.query, (req as any).user);
    return successResponseWithPaginationCountData(res, APICodes.LISTING_SUCCESS, data, pagination, counts);
  }

  async details(req: Request, res: Response) {
    const { userRoleId } = req.params as any;
    const result = await activeResidentsService.getActiveResidentDetails(Number(userRoleId), req.user);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
  }

  async accessCards(req: Request, res: Response) {
    const { userRoleId } = req.params as any;
    const result = await activeResidentsService.getAccessCardDetails(Number(userRoleId), req.user);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
  }

  async parking(req: Request, res: Response) {
    const { userRoleId } = req.params as any;
    const result = await activeResidentsService.getParkingDetails(Number(userRoleId), req.user);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
  }

  async assets(req: Request, res: Response) {
    const { userRoleId } = req.params as any;
    const [accessCards, parking] = await Promise.all([
      activeResidentsService.getAccessCardDetails(Number(userRoleId), req.user),
      activeResidentsService.getParkingDetails(Number(userRoleId), req.user),
    ]);
    return successResponseWithData(res, APICodes.COMMON_SUCCESS, { accessCards, parking });
  }
}

export default new ActiveResidentsController();
