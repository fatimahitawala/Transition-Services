import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { successResponse, successResponseWithData, successResponseWithPaginationData, notFoundResponse } from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants/apiCodes.en';

const documentsService = new DocumentsService();

export class DocumentsController {

    health(req: Request, res: Response) {
        const result = documentsService.health();
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    // Welcome Pack Methods
    async getWelcomePackList(req: Request, res: Response) {
        const { query }: Record<string, any> = req;
        const { data, pagination } = await documentsService.getWelcomePackList(query);
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, data, pagination);
    }

    async createWelcomePack(req: Request, res: Response) {
        const { user: { id: userId = '' }, body }: Record<string, any> = req;
        const result = await documentsService.createWelcomePack(body, req.file, userId);
        return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
    }

    async getWelcomePackById(req: Request, res: Response) {
        const { params: { id }, query: { includeFile } }: Record<string, any> = req;
        const includeFileFlag = includeFile === 'true' || includeFile === true;
        const result = await documentsService.getWelcomePackById(parseInt(id), includeFileFlag);
        if (!result) {
            return notFoundResponse(res, APICodes.NOT_FOUND);
        }
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    async downloadWelcomePackFile(req: Request, res: Response) {
        const { params: { id } }: Record<string, any> = req;
        const result = await documentsService.downloadWelcomePackFile(parseInt(id));
        
        // Set headers for file download
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Length', result.buffer.length);
        
        // Send the file buffer
        res.send(result.buffer);
    }

    async updateWelcomePack(req: Request, res: Response) {
        const { user: { id: userId = '' }, body, params: { id } }: Record<string, any> = req;
        const result = await documentsService.updateWelcomePack(parseInt(id), body, req.file, userId);
        return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
    }


}
