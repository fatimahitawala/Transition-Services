import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service'
import {
  successResponseWithData,
  successResponseWithPaginationData,
  notFoundResponse,
} from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants/apiCodes.en';
import { WelcomeKitData } from './welcomeKit.service';
import { logger } from '../../Common/Utils/logger';

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
        try {
            const { params: { id } }: Record<string, any> = req;
            const result = await documentsService.downloadWelcomePackFile(parseInt(id));
            
            // Set headers for file download
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.setHeader('Content-Length', result.buffer.length);
            
            // Send the file buffer
            res.send(result.buffer);
        } catch (error: any) {
            // Handle NOT_FOUND error specifically
            if (error.code === APICodes.NOT_FOUND.code) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            // Re-throw other errors to be handled by global error handler
            throw error;
        }
    }

    async updateWelcomePack(req: Request, res: Response) {
        try {
            const { user: { id: userId = '' }, body, params: { id } }: Record<string, any> = req;
            const result = await documentsService.updateWelcomePack(parseInt(id), body, req.file, parseInt(userId));
            return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
        } catch (error: any) {
            // Handle NOT_FOUND error specifically
            if (error.code === APICodes.NOT_FOUND.code) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            // Re-throw other errors to be handled by global error handler
            throw error;
        }
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
        try {
            const { id } = req.params;
            const { includeFile } = req.query;
            const result = await documentsService.getTemplateById(parseInt(id), includeFile === 'true');
            if (!result) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
        } catch (error: any) {
            // Handle NOT_FOUND error specifically
            if (error.code === APICodes.NOT_FOUND.code) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            // Re-throw other errors to be handled by global error handler
            throw error;
        }
    }

    // Welcome Kit PDF Generation Methods
    async generateWelcomeKitPDF(req: Request, res: Response) {
        try {
            const { body }: Record<string, any> = req;
            
            // Validate required fields
            if (!body.residentName || !body.unitNumber || !body.buildingName) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: residentName, unitNumber, buildingName'
                });
            }

            const welcomeKitData: WelcomeKitData = {
                residentName: body.residentName,
                unitNumber: body.unitNumber,
                buildingName: body.buildingName,
                communityName: body.communityName || body.buildingName,
                masterCommunityName: body.masterCommunityName || 'Sobha Hartland',
                dateOfIssue: body.dateOfIssue || new Date().toLocaleDateString('en-GB'),
                moveInDate: body.moveInDate || 'Move-in Date',
                referenceNumber: body.referenceNumber || `WK-${Date.now()}`,
                contactNumber: body.contactNumber || '800 SOBHA (76242)'
            };

            const pdfBuffer = await documentsService.generateWelcomeKitPDF(welcomeKitData);
            
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="welcome-kit-${welcomeKitData.referenceNumber}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            // Send the PDF buffer
            res.send(pdfBuffer);
        } catch (error: any) {
            logger.error(`Error generating Welcome Kit PDF: ${error}`);
            res.status(500).json({
                success: false,
                message: 'Error generating Welcome Kit PDF',
                error: error.message
            });
        }
    }

    async generateWelcomeKitPDFFromTemplate(req: Request, res: Response) {
        try {
            const { params: { id }, body }: Record<string, any> = req;
            const templateId = parseInt(id);
            
            if (isNaN(templateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid template ID'
                });
            }

            const pdfBuffer = await documentsService.generateWelcomeKitPDFFromTemplate(templateId, body);
            
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="welcome-kit-template-${templateId}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            // Send the PDF buffer
            res.send(pdfBuffer);
        } catch (error: any) {
            logger.error(`Error generating Welcome Kit PDF from template: ${error}`);
            res.status(500).json({
                success: false,
                message: 'Error generating Welcome Kit PDF from template',
                error: error.message
            });
        }
    }

    async downloadTemplateFile(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.downloadTemplateFile(parseInt(id));
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.buffer);
    }

    async updateTemplate(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { user: { id: userId = '' } }: Record<string, any> = req;
            const data = {
                ...req.body,
                templateFile: req.file
            };
            const result = await documentsService.updateTemplate(parseInt(id), data, req.file, userId);
            return successResponseWithData(res, APICodes.UPDATE_SUCCESS, result);
        } catch (error: any) {
            // Handle NOT_FOUND error specifically
            if (error.code === APICodes.NOT_FOUND.code) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            // Re-throw other errors to be handled by global error handler
            throw error;
        }
    }

    async getTemplateHistory(req: Request, res: Response) {
        const { id } = req.params;
        const result = await documentsService.getTemplateHistory(parseInt(id));
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }

    async getUnifiedHistory(req: Request, res: Response) {
        try {
            const { templateType, id } = req.params;
            const result = await documentsService.getUnifiedHistory(templateType, parseInt(id));
            return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
        } catch (error: any) {
            // Handle NOT_FOUND error specifically
            if (error.code === APICodes.NOT_FOUND.code) {
                return notFoundResponse(res, APICodes.NOT_FOUND);
            }
            // Re-throw other errors to be handled by global error handler
            throw error;
        }
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
