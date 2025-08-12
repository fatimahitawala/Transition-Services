import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service'
import {
  successResponseWithData,
  successResponseWithPaginationData,
  notFoundResponse,
} from '../../Common/Utils/apiResponse';
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

    // Consolidated template controller methods
    async getTemplateList(req: Request, res: Response) {
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const result = await documentsService.getTemplateList(req.query, userId);
        res.status(200).json({
            success: true,
            message: 'Templates retrieved successfully',
            data: result.templates,
            pagination: result.pagination
        });
    }

    async createTemplate(req: Request, res: Response) {
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const data = {
            ...req.body,
            templateFile: req.file
        };
        const result = await documentsService.createTemplate(data, req.file, userId);
        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: result
        });
    }

    async getTemplateById(req: Request, res: Response) {
        const { id } = req.params;
        const { includeFile } = req.query;
        const result = await documentsService.getTemplateById(parseInt(id), includeFile === 'true');
        res.status(200).json({
            success: true,
            message: 'Template retrieved successfully',
            data: result
        });
    }

    async downloadTemplateFile(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.downloadTemplateFile(parseInt(id));
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.buffer);
    }

    async updateTemplate(req: Request, res: Response) {
        const { id } = req.params;
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const data = {
            ...req.body,
            templateFile: req.file
        };
        const result = await documentsService.updateTemplate(parseInt(id), data, req.file, userId);
        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: result
        });
    }

    async getTemplateHistory(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.getTemplateHistory(parseInt(id));
        res.status(200).json({
            success: true,
            message: 'Template history retrieved successfully',
            data: result
        });
    }

    // Email Recipients Methods
    async getEmailRecipientsList(req: Request, res: Response) {
        const { query }: Record<string, any> = req;
        const { officialRecipients, pagination } = await documentsService.getEmailRecipientsList(query);
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, officialRecipients, pagination);
    }

    async createEmailRecipients(req: Request, res: Response) {
        const { user: { id: userId = '' }, body }: Record<string, any> = req;
        const result = await documentsService.createEmailRecipients(body, userId);
        return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
    }

    async updateEmailRecipients(req: Request, res: Response) {
        const { user: { id: userId = '' }, body, params: { id } }: Record<string, any> = req;
        const result = await documentsService.updateEmailRecipients(parseInt(id), body, userId);
        return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
    }

    async getEmailRecipientsHistory(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.getEmailRecipientsHistory(parseInt(id));
        res.status(200).json({
            success: true,
            message: 'Email recipients history retrieved successfully',
            data: result
        });
    }

    async exportEmailRecipients(req: Request, res: Response) {
        const { query }: Record<string, any> = req;
        const result = await documentsService.exportEmailRecipients(query);
        
        // Set headers for file download
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Length', result.buffer.length);
        
        // Send the file buffer
        res.send(result.buffer);
    }


}
