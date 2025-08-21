import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service'
import {
  successResponseWithData,
  successResponseWithPaginationData,
  notFoundResponse,
  validationErrorWithData,
  successResponseWithBinaryData,
  successResponseWithPDFData,
} from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants/apiCodes.en';
import { WelcomeKitData } from './welcomeKit.service';

const documentsService = new DocumentsService();

export class DocumentsController {

    // Welcome Pack Methods
    async getWelcomePackList(req: Request, res: Response) {
        const { query }: Record<string, any> = req;
        const { includeFile, ...otherQueryParams } = query;
        
        // Convert includeFile to boolean
        const includeFileFlag = includeFile === 'true' || includeFile === true;
        
        // Pass the processed query parameters to the service
        const { data, pagination } = await documentsService.getWelcomePackList({
            ...otherQueryParams,
            includeFile: includeFileFlag
        });
        
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, data, pagination);
    }

    async createWelcomePack(req: Request, res: Response) {
        const { user: { id: userId = '' }, body }: Record<string, any> = req;
        const result = await documentsService.createWelcomePack(body, req.file, parseInt(userId));
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
        
        return successResponseWithBinaryData(res, APICodes.COMMON_SUCCESS, result.buffer, result.contentType, result.fileName);
    }

    async updateWelcomePack(req: Request, res: Response) {
        const { user: { id: userId = '' }, body, params: { id } }: Record<string, any> = req;
        const result = await documentsService.updateWelcomePack(parseInt(id), body, req.file, parseInt(userId));
        return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
    }

    // Consolidated template controller methods
    async getTemplateList(req: Request, res: Response) {
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const result = await documentsService.getTemplateList(req.query, userId);
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, result.templates, result.pagination);
    }

    async createTemplate(req: Request, res: Response) {
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const data = {
            ...req.body,
            templateFile: req.file
        };
        const result = await documentsService.createTemplate(data, req.file, userId);
        return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
    }

    async getTemplateById(req: Request, res: Response) {
        const { id } = req.params;
        const { includeFile } = req.query;
        const result = await documentsService.getTemplateById(parseInt(id), includeFile === 'true');
        if (!result) {
            return notFoundResponse(res, APICodes.NOT_FOUND);
        }
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    // Welcome Kit PDF Generation Methods
    async generateWelcomeKitPDF(req: Request, res: Response) {
        const { body }: Record<string, any> = req;
        
        // Validate required fields
        if (!body.residentName || !body.unitNumber || !body.buildingName) {
            return validationErrorWithData(res, {
                code: APICodes.VALIDATION_ERROR_CODE.message,
                message: APICodes.MISSING_REQUIRED_FIELDS.message
            });
        }

        const welcomeKitData: WelcomeKitData = {
            residentName: body.residentName,
            unitNumber: body.unitNumber,
            buildingName: body.buildingName,
            communityName: body.communityName || body.buildingName,
            masterCommunityName: body.masterCommunityName || APICodes.DEFAULT_MASTER_COMMUNITY.message,
            dateOfIssue: body.dateOfIssue || new Date().toLocaleDateString('en-GB'),
            moveInDate: body.moveInDate || APICodes.DEFAULT_MOVE_IN_DATE.message,
            referenceNumber: body.referenceNumber || `WK-${Date.now()}`,
            contactNumber: body.contactNumber || APICodes.DEFAULT_CONTACT_NUMBER.message
        };

        const pdfBuffer = await documentsService.generateWelcomeKitPDF(welcomeKitData);
        
        return successResponseWithPDFData(res, APICodes.COMMON_SUCCESS, pdfBuffer, `welcome-kit-${welcomeKitData.referenceNumber}.pdf`);
    }

    async generateWelcomeKitPDFFromTemplate(req: Request, res: Response) {
        const { params: { id }, body }: Record<string, any> = req;
        const templateId = parseInt(id);
        
        if (isNaN(templateId)) {
            return validationErrorWithData(res, {
                code: APICodes.VALIDATION_ERROR_CODE.message,
                message: APICodes.INVALID_TEMPLATE_ID.message
            });
        }

        const pdfBuffer = await documentsService.generateWelcomeKitPDFFromTemplate(templateId, body);
        
        return successResponseWithPDFData(res, APICodes.COMMON_SUCCESS, pdfBuffer, `welcome-kit-template-${templateId}.pdf`);
    }

    async downloadTemplateFile(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.downloadTemplateFile(parseInt(id));
        return successResponseWithBinaryData(res, APICodes.COMMON_SUCCESS, result.buffer, result.contentType, result.fileName);
    }

    async updateTemplate(req: Request, res: Response) {
        const { id } = req.params;
        const { user: { id: userId = '' } }: Record<string, any> = req;
        const data = {
            ...req.body,
            templateFile: req.file
        };
        const result = await documentsService.updateTemplate(parseInt(id), data, req.file, userId);
        return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
    }

    async getTemplateHistory(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.getTemplateHistory(parseInt(id));
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    async getUnifiedHistory(req: Request, res: Response) {
        const { templateType, id } = req.params;
        const result = await documentsService.getUnifiedHistory(templateType, parseInt(id));
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    // Email Recipients Methods
    async getEmailRecipientsList(req: Request, res: Response) {
        const { query }: Record<string, any> = req;
        const { officialRecipients, pagination } = await documentsService.getEmailRecipientsList(query);
        return successResponseWithPaginationData(res, APICodes.COMMON_SUCCESS, officialRecipients, pagination);
    }

    async createEmailRecipients(req: Request, res: Response) {
        const { user: { id: userId = '' }, body }: Record<string, any> = req;
        const result = await documentsService.createEmailRecipients(body, parseInt(userId));
        return successResponseWithData(res, APICodes.CREATE_SUCCESS, result);
    }

    async updateEmailRecipients(req: Request, res: Response) {
        const { user: { id: userId = '' }, body, params: { id } }: Record<string, any> = req;
        const result = await documentsService.updateEmailRecipients(parseInt(id), body, parseInt(userId));
        return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
    }

    async getEmailRecipientsHistory(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.getEmailRecipientsHistory(parseInt(id));
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }
}
