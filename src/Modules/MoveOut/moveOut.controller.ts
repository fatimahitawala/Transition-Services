import { Request, Response } from 'express';
import { notFoundResponse, successResponse, successResponseWithData, successResponseWithPaginationData } from '../../Common/Utils/apiResponse';
import { MoveOutService } from './moveOut.service';
import { APICodes } from '../../Common/Constants';

const moveOutService = new MoveOutService()
export class MoveOutController {

    // async createMoveOutRequest(req: Request, res: Response) {
    //     const { user, body }: Record<string, any> = req;
    //     const [, , userType] = req.path.split('/');
    //     // const moveOutResponse = await moveOutService.createMoveOutRequest({ ...body }, { user, userType });
    //     const moveOutResponse = '123'
    //     if (moveOutResponse) {
    //         return successResponseWithData(res, APICodes.CREATE_SUCCESS, { resultSet: moveOutResponse });
    //     } else {
    //         return notFoundResponse(res, APICodes.UNKNOWN_ERROR);
    //     }
    // }

    async getAllMoveOutListAdmin(req: Request, res: Response) {
        const { user }: Record<string, any> = req;
        const getList = await moveOutService.getAllMoveOutListAdmin(req.query, user)
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, getList.allMoveOutRequests, getList.pagination)
    }

    async adminApproveOrCancelRequest(req: Request, res: Response) {
        const { user }: Record<string, any> = req;
        const params = req.params;
        const body = req.body;

        const response = await moveOutService.adminApproveOrCancelRequest(user, params, body);
        if (!response) return notFoundResponse(res, APICodes.NOT_FOUND)
        return successResponse(res, APICodes.UPDATE_SUCCESS);
    }

    async getMoveOutList(req: Request, res: Response) {
        const getList = await moveOutService.getMoveOutList(req.query)
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, getList.moveOutList, getList.pagination)
    }

    async getMoveOutRequestById(req: Request, res: Response) {
        const { user }: Record<string, any> = req;
        const { requestId } = req.params;
        const moveOutRequest = await moveOutService.getMoveOutRequestById(Number(requestId), user);
        if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND)
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, moveOutRequest);
    }

    async cancelMoveOutRequestByUser(req: Request, res: Response) {
        const { user, body }: Record<string, any> = req;
        const { requestId } = req.params;
        const moveOutRequest = await moveOutService.cancelMoveOutRequestByUser(body, Number(user.id), Number(requestId));
        if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND)
        return successResponse(res, APICodes.UPDATE_SUCCESS);
    }

    async closeMoveOutRequestBySecurity(req: Request, res: Response) {
        const { user, body }: Record<string, any> = req;
        const { requestId } = req.params;
        const moveOutRequest = await moveOutService.closeMoveOutRequestBySecurity(body, Number(requestId), user);
        if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND)
        return successResponse(res, APICodes.UPDATE_SUCCESS);
    }

    async createMoveOutRequestByUser(req: Request, res: Response) {
        const { user, body }: Record<string, any> = req;
        const moveOutRequest = await moveOutService.createMoveOutRequestByUser(body, user);
        if (!moveOutRequest) return notFoundResponse(res, APICodes.NOT_FOUND)
        return successResponseWithData(res, APICodes.CREATE_SUCCESS, moveOutRequest);
    }
}
