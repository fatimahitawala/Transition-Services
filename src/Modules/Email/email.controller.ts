import { Request, Response } from 'express';
import { EmailService, MoveInEmailData } from './email.service';
import { successResponse, successResponseWithData } from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants';
import { logger } from '../../Common/Utils/logger';

interface AuthenticatedRequest extends Request {
    user?: any;
}

const emailService = new EmailService();

export class EmailController {
    /**
     * Send move-in status change email (without attachment)
     */
    async sendMoveInStatusEmail(req: AuthenticatedRequest, res: Response) {
        try {
            const emailData: MoveInEmailData = req.body;
            
            logger.info(`Email API called for move-in status change: ${emailData.requestNumber}`);
            
            await emailService.sendMoveInStatusEmail(emailData);
            
            return successResponse(res, APICodes.EMAIL_SENT || APICodes.COMMON_SUCCESS);
        } catch (error) {
            logger.error('Error in sendMoveInStatusEmail controller:', error);
            throw error;
        }
    }

    /**
     * Send move-in approval email with welcome pack attachment
     */
    async sendMoveInApprovalEmail(req: AuthenticatedRequest, res: Response) {
        try {
            const emailData: MoveInEmailData = req.body;
            
            logger.info(`Email API called for move-in approval: ${emailData.requestNumber}`);
            
            await emailService.sendMoveInApprovalEmail(emailData);
            
            return successResponse(res, APICodes.EMAIL_SENT || APICodes.COMMON_SUCCESS);
        } catch (error) {
            logger.error('Error in sendMoveInApprovalEmail controller:', error);
            throw error;
        }
    }

    /**
     * Test email functionality
     */
    async testEmail(req: AuthenticatedRequest, res: Response) {
        try {
            const { to, subject, content } = req.body;
            
            if (!to || !subject || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: to, subject, content'
                });
            }

            logger.info(`=== TEST EMAIL API CALLED ===`);
            logger.info(`To: ${to}, Subject: ${subject}`);

            await emailService.sendEmail(to, subject, content);
            
            return successResponseWithData(res, APICodes.COMMON_SUCCESS, {
                message: 'Test email sent successfully',
                to,
                subject
            });
        } catch (error) {
            logger.error('Error in testEmail controller:', error);
            throw error;
        }
    }

    /**
     * Test move-in approval email with sample data
     */
    async testMoveInApprovalEmail(req: AuthenticatedRequest, res: Response) {
        try {
            logger.info(`=== TEST MOVE-IN APPROVAL EMAIL API CALLED ===`);
            
            // Sample data for testing
            const sampleEmailData: MoveInEmailData = {
                requestId: 999,
                requestNumber: "MIN-TEST-999",
                status: "approved",
                userDetails: {
                    firstName: "John",
                    lastName: "Doe",
                    email: req.body.email || "test@example.com"
                },
                unitDetails: {
                    unitNumber: "A001",
                    unitName: "Unit A001",
                    masterCommunityId: 1,
                    communityId: 1,
                    towerId: 1,
                    masterCommunityName: "Sobha Hartland",
                    communityName: "Creek Vista",
                    towerName: "Tower A"
                },
                moveInDate: new Date("2025-09-22"),
                comments: "Test approval email with welcome pack"
            };

            await emailService.sendMoveInApprovalEmail(sampleEmailData);
            
            return successResponseWithData(res, APICodes.COMMON_SUCCESS, {
                message: 'Test move-in approval email sent successfully',
                to: sampleEmailData.userDetails.email,
                requestNumber: sampleEmailData.requestNumber
            });
        } catch (error) {
            logger.error('Error in testMoveInApprovalEmail controller:', error);
            throw error;
        }
    }
}
