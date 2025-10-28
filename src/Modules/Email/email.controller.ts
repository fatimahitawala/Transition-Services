/**
 * EMAIL CONTROLLER MODULE - TRANSITION SERVICES
 * =============================================
 * 
 * This controller handles HTTP requests for email functionality in Transition Services.
 * Provides REST API endpoints for email operations including:
 * - Move-in status email sending
 * - Move-in approval email sending with attachments
 * - Test email functionality for debugging
 * 
 * Key Features:
 * - RESTful API endpoints for email operations
 * - Request validation and error handling
 * - Integration with EmailService for actual email sending
 * - Test endpoints for development and debugging
 * - Comprehensive logging for API calls
 * 
 * @author Transition Services Team
 * @version 1.0.0
 * @since 2024
 */

import { Request, Response } from 'express';
import { EmailService, MoveInEmailData } from './email.service';
import { successResponse, successResponseWithData } from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants';
import { logger } from '../../Common/Utils/logger';

/**
 * AUTHENTICATED REQUEST INTERFACE
 * ==============================
 * Extends Express Request interface to include authenticated user information
 * Used for endpoints that require user authentication
 */
interface AuthenticatedRequest extends Request {
    user?: any;  // Authenticated user object from middleware
}

/**
 * EMAIL SERVICE INSTANCE
 * ======================
 * Singleton instance of EmailService for handling email operations
 */
const emailService = new EmailService();

/**
 * EMAIL CONTROLLER CLASS
 * ======================
 * Main controller class handling all email-related HTTP requests
 * 
 * Responsibilities:
 * - Process HTTP requests for email operations
 * - Validate request data
 * - Call appropriate EmailService methods
 * - Handle errors and return appropriate responses
 * - Provide test endpoints for development
 */
export class EmailController {
    /**
     * MOVE-IN STATUS EMAIL ENDPOINT
     * =============================
     * HTTP POST endpoint for sending move-in status change emails
     * 
     * Purpose:
     * - Sends status update emails (confirmations, RFIs, cancellations)
     * - Used by admin and mobile services for status notifications
     * - No attachments included (status emails are informational only)
     * 
     * Request Body:
     * - MoveInEmailData object with complete email information
     * 
     * Response:
     * - Success response with API code
     * - Error response if email sending fails
     * 
     * @param {AuthenticatedRequest} req - Express request with user authentication
     * @param {Response} res - Express response object
     * @returns {Promise<Response>} - HTTP response
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
     * MOVE-IN APPROVAL EMAIL ENDPOINT
     * ===============================
     * HTTP POST endpoint for sending move-in approval emails with attachments
     * 
     * Purpose:
     * - Sends approval emails with MIP template and welcome pack attachments
     * - Used when admin approves move-in requests
     * - Includes comprehensive attachments and detailed information
     * 
     * Request Body:
     * - MoveInEmailData object with complete email information
     * 
     * Attachments:
     * - MIP Template PDF (generated dynamically)
     * - Welcome Pack PDF (retrieved from Azure Blob Storage)
     * 
     * Response:
     * - Success response with API code
     * - Error response if email sending fails
     * 
     * @param {AuthenticatedRequest} req - Express request with user authentication
     * @param {Response} res - Express response object
     * @returns {Promise<Response>} - HTTP response
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
     * TEST EMAIL ENDPOINT
     * ==================
     * HTTP POST endpoint for testing basic email functionality
     * 
     * Purpose:
     * - Allows testing of email sending without move-in specific data
     * - Useful for debugging SMTP configuration and email delivery
     * - Development and testing tool
     * 
     * Request Body:
     * - to: Recipient email address
     * - subject: Email subject line
     * - content: HTML email content
     * 
     * Response:
     * - Success response with delivery confirmation
     * - Error response if email sending fails
     * 
     * @param {AuthenticatedRequest} req - Express request with user authentication
     * @param {Response} res - Express response object
     * @returns {Promise<Response>} - HTTP response
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
     * TEST MOVE-IN APPROVAL EMAIL ENDPOINT
     * ====================================
     * HTTP POST endpoint for testing move-in approval email functionality
     * 
     * Purpose:
     * - Tests the complete approval email flow with attachments
     * - Uses sample data to verify email generation and delivery
     * - Useful for testing PDF generation and attachment handling
     * - Development and debugging tool
     * 
     * Request Body:
     * - email: Optional recipient email (defaults to TEST_EMAIL_ADDRESS env var or test@example.com)
     * 
     * Sample Data:
     * - Uses predefined test data for request details
     * - Includes all required fields for email generation
     * - Tests both MIP template and welcome pack attachments
     * 
     * Response:
     * - Success response with test email details
     * - Error response if email sending fails
     * 
     * @param {AuthenticatedRequest} req - Express request with user authentication
     * @param {Response} res - Express response object
     * @returns {Promise<Response>} - HTTP response
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
                    email: req.body.email || process.env.TEST_EMAIL_ADDRESS || "test@example.com"
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

    /**
     * CHECK ENVIRONMENT CONFIGURATION ENDPOINT
     * ========================================
     * HTTP GET endpoint to verify environment variable configuration
     * 
     * Purpose:
     * - Verifies that EXECUTABLE_PATH is loaded correctly
     * - Checks SMTP configuration
     * - Useful for deployment troubleshooting
     * - Development and debugging tool
     * 
     * Response:
     * - Environment configuration details (sensitive data masked)
     * 
     * @param {AuthenticatedRequest} req - Express request with user authentication
     * @param {Response} res - Express response object
     * @returns {Promise<Response>} - HTTP response
     */
    async checkEnvConfig(req: AuthenticatedRequest, res: Response) {
        try {
            logger.info(`=== CHECK ENV CONFIG API CALLED ===`);
            
            const executablePath = process.env.EXECUTABLE_PATH;
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = process.env.SMTP_PORT;
            const emailFrom = process.env.EMAIL_FROM;
            
            logger.info(`EXECUTABLE_PATH from env: ${executablePath || 'NOT SET'}`);
            logger.info(`SMTP_HOST from env: ${smtpHost || 'NOT SET'}`);
            
            const config = {
                chrome: {
                    executablePath: executablePath || 'NOT SET (will use auto-detection)',
                    isConfigured: !!executablePath,
                    pathExists: executablePath ? 'Check manually on server' : 'N/A'
                },
                smtp: {
                    host: smtpHost || 'NOT SET',
                    port: smtpPort || 'NOT SET',
                    from: emailFrom || 'NOT SET',
                    isConfigured: !!(smtpHost && smtpPort && emailFrom)
                },
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            };
            
            return successResponseWithData(res, APICodes.COMMON_SUCCESS, config);
        } catch (error) {
            logger.error('Error in checkEnvConfig controller:', error);
            throw error;
        }
    }
}
