/**
 * EMAIL SERVICE MODULE - TRANSITION SERVICES
 * ==========================================
 * 
 * This module handles all email functionality for the Transition Services, including:
 * - Move-in request notifications (status changes, approvals, cancellations)
 * - OTP verification emails
 * - Support and error notification emails
 * - Email template management with community-specific customization
 * - PDF attachment generation (MIP templates and welcome packs)
 * 
 * Key Features:
 * - SMTP email delivery using nodemailer
 * - Community/tower-specific email templates
 * - Dynamic placeholder replacement
 * - PDF generation for MIP templates using Puppeteer
 * - Welcome pack attachment handling
 * - Comprehensive logging and error handling
 * 
 * @author Transition Services Team
 * @version 1.0.0
 * @since 2024
 */

import nodemailer from 'nodemailer';
import httpStatus from 'http-status';
import { logger } from '../../Common/Utils/logger';
import { APICodes } from '../../Common/Constants';
import ApiError from '../../Common/Utils/ApiError';
import config from '../../Common/Config/config';
import { OccupancyRequestTemplates } from '../../Entities/OccupancyRequestTemplates.entity';
import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { MoveInRequestDetailsTenant } from '../../Entities/MoveInRequestDetailsTenant.entity';
import { MoveInRequestDetailsHhcCompany } from '../../Entities/MoveInRequestDetailsHhcCompany.entity';
import { OCUPANCY_REQUEST_TYPES } from '../../Entities/EntityTypes/transition';
import { AppDataSource } from '../../Common/data-source';
import { IsNull } from 'typeorm';

/**
 * EMAIL ATTACHMENT INTERFACE
 * ==========================
 * Defines the structure for email attachments including PDFs and documents
 */
export interface EmailAttachment {
    filename: string;        // Display name for the attachment
    content?: Buffer;        // File content as buffer (for generated PDFs)
    path?: string;           // Local file path (for existing files)
    href?: string;           // Remote URL (for files hosted online)
    contentType?: string;     // MIME type of the attachment
}

/**
 * EMAIL OPTIONS INTERFACE
 * =======================
 * Enhanced email options supporting multiple recipients and CC
 */
export interface EmailOptions {
    to: string | string[];   // Primary recipients (supports multiple)
    cc?: string[];           // CC recipients
    subject: string;          // Email subject line
    html: string;            // HTML email content
    attachments?: EmailAttachment[]; // File attachments
}

/**
 * MOVE-IN EMAIL DATA INTERFACE
 * ============================
 * Comprehensive data structure for move-in related emails
 * Contains all necessary information for template processing and personalization
 */
export interface MoveInEmailData {
    requestId: number;       // Unique request identifier
    requestNumber: string;   // Human-readable request number (e.g., "MIN-2024-001")
    status: string;          // Current request status (approved, rfi-pending, cancelled, etc.)
    userDetails: {
        firstName: string;   // User's first name
        lastName: string;    // User's last name
        email: string | string[]; // Primary email(s) - supports multiple for company requests
    };
    unitDetails: {
        unitNumber: string;         // Unit identifier (e.g., "A001")
        unitName: string;           // Full unit name
        masterCommunityId: number;  // Master community ID for template lookup
        communityId: number;         // Community ID for template lookup
        towerId?: number;           // Tower ID for template lookup (optional)
        masterCommunityName: string; // Master community name
        communityName: string;      // Community name
        towerName?: string;         // Tower name (optional)
    };
    moveInDate?: Date;       // Scheduled move-in date
    comments?: string;       // Additional comments or remarks
    additionalInfo?: any;     // Extra data for template processing
    ccEmails?: string[];     // CC recipients (e.g., unit owner for tenant requests)
    requestType?: string;    // Request type (owner, tenant, hho-owner, hhc-company)
    isRecipientEmail?: boolean; // Flag to differentiate between user and recipient emails
}

/**
 * SMTP TRANSPORT CONFIGURATION
 * ============================
 * Initialize nodemailer transport using SMTP configuration from environment
 * Includes connection verification for non-test environments
 */
// Use the exact same pattern as User-Services with added timeouts
const smtpOptions: any = {
    ...config.email.smtp,
    // Timeouts to prevent long stalls on connection issues
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 10000,
};

const transport = nodemailer.createTransport(smtpOptions);
const hasSmtpHost = !!(config?.email?.smtp?.host && String(config.email.smtp.host).trim());
if (config.env !== 'test' && hasSmtpHost) {
    transport
        .verify()
        .then(() => logger.info('Connected to email server'))
        .catch((e: any) => {
            logger.error(e);
            logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env');
        });
} else if (!hasSmtpHost) {
    logger.warn('SMTP host not configured; emails will fail fast until SMTP is set');
}

/**
 * EMAIL SERVICE CLASS
 * ==================
 * Main service class handling all email operations for Transition Services
 * 
 * Features:
 * - Core email sending with SMTP
 * - Move-in specific email templates and processing
 * - PDF generation for MIP templates
 * - Welcome pack attachment handling
 * - Community-specific template management
 * - Comprehensive error handling and logging
 */
export class EmailService {

    /**
     * CORE EMAIL SENDING METHOD
     * =========================
     * Sends emails using nodemailer with comprehensive logging and error handling
     * 
     * Enhanced features over User-Services:
     * - Support for multiple recipients
     * - CC functionality
     * - File attachment support
     * - Detailed logging for debugging
     * - SMTP configuration validation
     * 
     * @param {string|string[]} to - Primary recipient(s)
     * @param {string} subject - Email subject line
     * @param {string} text - HTML email content
     * @param {EmailAttachment[]} attachments - File attachments (optional)
     * @param {string[]} cc - CC recipients (optional)
     * @returns {Promise<nodemailer.SentMessageInfo>} - Email delivery result
     * 
     * @throws {ApiError} - When email sending fails
     */
    async sendEmail(to: string | string[], subject: string, text: string, attachments: EmailAttachment[] = [], cc: string[] = []) {
        try {
            // Fast-fail when SMTP is not configured properly
            const host = config?.email?.smtp?.host ? String(config.email.smtp.host).trim() : '';
            const fromAddress = config?.email?.from ? String(config.email.from).trim() : '';
            const isLocalHost = host === 'localhost' || host === '127.0.0.1';
            const allowLocal = String(process.env.ALLOW_LOCAL_SMTP || '').toLowerCase() === 'true';

            if (!host) {
                logger.error('SMTP_HOST is not configured. Please set SMTP_* env vars in Transition-Services/.env');
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.EMAIL_ERROR?.message || 'Email error', APICodes.EMAIL_ERROR?.code || 'EMAIL_ERROR');
            }
            if (isLocalHost && !allowLocal) {
                logger.error('SMTP_HOST points to localhost but ALLOW_LOCAL_SMTP is not true. Preventing email send.');
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.EMAIL_ERROR?.message || 'Email error', APICodes.EMAIL_ERROR?.code || 'EMAIL_ERROR');
            }
            if (!fromAddress) {
                logger.error('EMAIL_FROM is not configured. Please set EMAIL_FROM in Transition-Services/.env');
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.EMAIL_ERROR?.message || 'Email error', APICodes.EMAIL_ERROR?.code || 'EMAIL_ERROR');
            }
            logger.info(`=== SENDING EMAIL ===`);
            logger.info(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
            logger.info(`CC: ${cc.length > 0 ? cc.join(', ') : 'None'}`);
            logger.info(`Subject: ${subject}`);
            logger.info(`From: ${config.email.from}`);
            logger.info(`Attachments: ${attachments.length} files`);
            logger.info(`HTML content length: ${text.length} characters`);
            logger.info(`HTML content preview: ${text.substring(0, 200)}...`);

            const msg: any = {
                from: config.email.from,
                to,
                subject,
                html: text  // Plain UTF-8 string, NOT Base64
            };

            // Add CC if provided
            if (cc && cc.length > 0) {
                msg.cc = cc;
                logger.info(`CC recipients added: ${cc.join(', ')}`);
            }

            // Add attachments if provided (enhancement over User-Services)
            if (attachments && attachments.length > 0) {
                msg.attachments = attachments.map(att => {
                    const attachment: any = {
                        filename: att.filename,
                        contentType: att.contentType
                    };

                    // Use content if provided (for generated PDFs)
                    if (att.content) {
                        attachment.content = att.content;
                    }
                    // Use href for remote URLs (Azure Blob Storage)
                    else if (att.href) {
                        attachment.href = att.href;
                    }
                    // Use path for local files
                    else if (att.path) {
                        attachment.path = att.path;
                    }

                    return attachment;
                });
                logger.info(`Attachments added: ${attachments.map(a => a.filename).join(', ')}`);
            }

            const result = await transport.sendMail(msg);
            logger.info(`=== EMAIL SENT SUCCESSFULLY ===`);
            logger.info(`Message ID: ${result.messageId}`);
            logger.info(`Email sent to: ${Array.isArray(to) ? to.join(', ') : to}${cc.length > 0 ? `, CC: ${cc.join(', ')}` : ''}`);
            return result;
        } catch (error) {
            logger.error("******************Email Service Error******************");
            logger.error(`Error sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
            logger.error(`Subject: ${subject}`);
            logger.error(`Error details: ${JSON.stringify(error)}`);
            logger.error(`Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error(`SMTP Config: ${JSON.stringify({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure,
                hasAuth: !!(config.email.smtp.auth.user && config.email.smtp.auth.pass),
                connectionTimeout: (smtpOptions as any)?.connectionTimeout,
                greetingTimeout: (smtpOptions as any)?.greetingTimeout,
                socketTimeout: (smtpOptions as any)?.socketTimeout,
            })}`);
            logger.error("******************Email Service Error******************");
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.EMAIL_ERROR?.message || 'Email error', APICodes.EMAIL_ERROR?.code || 'EMAIL_ERROR');
        }
    };

    /**
     * ENHANCED EMAIL SENDING WITH OPTIONS
     * ===================================
     * Wrapper method for sending emails using the EmailOptions interface
     * Provides a cleaner API for complex email operations
     * 
     * @param {EmailOptions} options - Complete email configuration
     * @returns {Promise<nodemailer.SentMessageInfo>} - Email delivery result
     */
    async sendEmailWithOptions(options: EmailOptions) {
        return await this.sendEmail(
            options.to,
            options.subject,
            options.html,
            options.attachments || [],
            options.cc || []
        );
    };

    /**
     * PASSWORD RESET OTP EMAIL
     * ========================
     * Sends OTP email for password reset functionality
     * Uses standardized template with user personalization
     * 
     * @param {string} to - Recipient email address
     * @param {any} details - User details containing firstName, lastName, and otp
     * @returns {Promise<void>}
     */
    async sendResetPasswordEmail(to: string, details: any) {
        const subject = 'Reset Password : OTP Verification Required';
        details.firstName = (details && details.firstName) ? details.firstName : 'User';
        details.lastName = (details && details.lastName) ? details.lastName : '';
        const text = `<div>Dear&nbsp;${details.firstName}&nbsp;${details.lastName}<br><br>Please use the following OTP to reset your password:<br><br><strong><span style="font-size: 18px;">OTP: ${details.otp}</span></strong><br><br>This OTP is valid for a limited time and is essential to activate your account. Please enter it in the app as prompted.<br>If you encounter any issues during the reset password process or have questions about our app, feel free to reach out to our support team for assistance.<br>Best regards,<br>Team @ ONE Sobha App</div>`;
        await this.sendEmail(to, subject, text);
    };

    /**
     * MOVE-IN VERIFICATION OTP EMAIL
     * ==============================
     * Sends OTP email for move-in verification process
     * Used during the move-in request submission workflow
     * 
     * @param {string} to - Recipient email address
     * @param {any} details - User details containing firstName, lastName, and otp
     * @returns {Promise<void>}
     */
    async sendMoveInVerificationEmail(to: string, details: any) {
        const subject = 'Move In : OTP Verification Required';
        details.firstName = (details && details.firstName) ? details.firstName : 'User';
        details.lastName = (details && details.lastName) ? details.lastName : '';
        const text = `<div>Dear&nbsp;${details.firstName}&nbsp;${details.lastName}<br><br>Please use the following OTP to move in:<br><br><strong><span style="font-size: 18px;">OTP: ${details.otp}</span></strong><br><br>This OTP is valid for a limited time and is essential to activate your account. Please enter it in the app as prompted.<br>If you encounter any issues during the move in process or have questions about our app, feel free to reach out to our support team for assistance.<br>Best regards,<br>Team @ ONE Sobha App</div>`;
        await this.sendEmail(to, subject, text);
    };

    /**
     * GENERAL PURPOSE OTP EMAIL
     * =========================
     * Sends generic OTP email for various verification purposes
     * Used for general authentication and verification workflows
     * 
     * @param {string} to - Recipient email address
     * @param {any} otp - OTP code to be sent
     * @returns {Promise<nodemailer.SentMessageInfo>} - Email delivery result
     */
    async sendEmailOTPGeneral(to: string, otp: any) {
        const subject = 'Your One-Time Password (OTP) from ONE Sobha App';
        const text = `<div>Dear&nbsp;User <br><br>Welcome to ONE Sobha App! We have received a request to verify your identity for  ONE Sobha. To complete the verification process, please use the following One-Time Password (OTP):<br>

        OTP: ${otp}.<br><br>Best regards,<br>Team @ ONE Sobha App</div>`;
        return await this.sendEmail(to, subject, text);
    };

    /**
     * SUPPORT/ERROR NOTIFICATION EMAIL
     * ===============================
     * Sends error notifications to support team
     * Used for system error reporting and debugging
     * 
     * @param {string} message - Error message or description
     * @param {string} error - Error stack trace or details
     * @param {string} apiDetails - API endpoint and request details
     * @returns {Promise<void>}
     */
    async sendSupportEmail(message: string, error: string, apiDetails: string) {
        const subject = `${message} - ${process.env.NODE_ENV || 'development'} - ${new Date().toISOString()}`;
        const text = `<div>Dear user,</div>
            <div>There is error detected in the system, please find the error details below:</div>
            <div></div>
            <div>Error Stack:</div>
            <div style="border:1px solid black; background-color:#E7E9EB; padding:5px;"><code>${error}</code></div>
            <div></div>
            <div>API Details: </div>
            <div style="border:1px solid black; background-color:#E7E9EB; padding:5px;"><code>${apiDetails}</code></div>
        `;

        const supportEmail = process.env.ONE_APP_SUPPORT_EMAIL;
        if (!supportEmail) {
            logger.error('Support email not found');
            return;
        }

        await this.sendEmail(supportEmail, subject, text);
    };

    /**
     * EMAIL TEMPLATE RETRIEVAL
     * ========================
     * Retrieves community-specific email templates from database
     * Implements hierarchical fallback: Tower → Community → Master Community
     * 
     * Template Hierarchy:
     * 1. Tower-specific template (most specific)
     * 2. Community-level template (fallback)
     * 3. Master community template (final fallback)
     * 
     * @param {number} masterCommunityId - Master community identifier
     * @param {number} communityId - Community identifier
     * @param {number} [towerId] - Tower identifier (optional)
     * @param {string} [status] - Request status for template filtering
     * @returns {Promise<string|null>} - Template HTML string or null if not found
     */
    private async getMoveInEmailTemplate(
        masterCommunityId: number,
        communityId: number,
        towerId?: number,
        status?: string
    ): Promise<string | null> {
        try {
            const templateRepository = AppDataSource.getRepository(OccupancyRequestTemplates);

            logger.info(`Fetching MIP email template for masterCommunity: ${masterCommunityId}, community: ${communityId}, tower: ${towerId}, status: ${status}`);

            // Try to find template with exact match (tower → community → master community hierarchy)
            let template = null;

            // 1. First try: Tower-specific template
            if (towerId) {
                template = await templateRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: towerId,
                        templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN,
                        isActive: true
                    }
                });

                if (template) {
                    logger.info(`Found tower-specific MIP template for tower: ${towerId}`);
                }
            }

            // 2. Second try: Community-level template (no tower)
            if (!template) {
                template = await templateRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: IsNull(),
                        templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN,
                        isActive: true
                    }
                });

                if (template) {
                    logger.info(`Found community-specific MIP template for community: ${communityId}`);
                }
            }

            // 3. Third try: Master community level template
            if (!template) {
                template = await templateRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId: IsNull(),
                        towerId: IsNull(),
                        templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN,
                        isActive: true
                    }
                });

                if (template) {
                    logger.info(`Found master community MIP template for masterCommunity: ${masterCommunityId}`);
                }
            }

            if (!template) {
                logger.warn(`No MIP template found for masterCommunity: ${masterCommunityId}, community: ${communityId}, tower: ${towerId}`);
                return null;
            }

            return template.templateString;
        } catch (error) {
            logger.error('Error fetching MIP email template:', error);
            return null;
        }
    }

    /**
     * WELCOME PACK FILE RETRIEVAL
     * ===========================
     * Retrieves welcome pack PDF files for approved move-in requests
     * Implements hierarchical fallback similar to email templates
     * 
     * File Hierarchy:
     * 1. Tower-specific welcome pack (most specific)
     * 2. Community-level welcome pack (fallback)
     * 3. Master community welcome pack (final fallback)
     * 
     * Files are stored in Azure Blob Storage and accessed via URLs
     * 
     * @param {number} masterCommunityId - Master community identifier
     * @param {number} communityId - Community identifier
     * @param {number} [towerId] - Tower identifier (optional)
     * @returns {Promise<EmailAttachment|null>} - Welcome pack attachment or null if not found
     */
    private async getWelcomePackFile(
        masterCommunityId: number,
        communityId: number,
        towerId?: number
    ): Promise<EmailAttachment | null> {
        try {
            logger.info(`=== WELCOME PACK RETRIEVAL START ===`);
            logger.info(`Searching for welcome pack with MC:${masterCommunityId}, C:${communityId}, T:${towerId}`);

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);

            // Try to find welcome pack with exact match (including tower)
            let welcomePack = null;

            // 1. First try: Tower-specific welcome pack
            if (towerId) {
                logger.info(`Searching for tower-specific welcome pack...`);
                welcomePack = await welcomePackRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: towerId,
                        isActive: true
                    },
                    relations: ['file']
                });
                logger.info(`Tower-specific search result: ${welcomePack ? 'FOUND' : 'NOT FOUND'}`);
            }

            // 2. Fallback to community-level welcome pack if tower-specific not found
            if (!welcomePack) {
                logger.info(`Searching for community-level welcome pack...`);
                welcomePack = await welcomePackRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: IsNull(),
                        isActive: true
                    },
                    relations: ['file']
                });
                logger.info(`Community-level search result: ${welcomePack ? 'FOUND' : 'NOT FOUND'}`);
            }

            // 3. Fallback to master community level welcome pack
            if (!welcomePack) {
                logger.info(`Searching for master community-level welcome pack...`);
                welcomePack = await welcomePackRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId: IsNull(),
                        towerId: IsNull(),
                        isActive: true
                    },
                    relations: ['file']
                });
            }

            logger.info(`Master community-level search result: ${welcomePack ? 'FOUND' : 'NOT FOUND'}`);

            if (welcomePack?.file) {
                logger.info(`Welcome pack found! File details: ${JSON.stringify({
                    id: welcomePack.file.id,
                    fileName: welcomePack.file.fileName,
                    filePath: welcomePack.file.filePath,
                    fileType: welcomePack.file.fileType
                })}`);

                // If file is stored in Azure Blob Storage, we need to download it
                const fileUrl = `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/application/${welcomePack.file.filePath}`;

                logger.info(`Welcome pack file URL: ${fileUrl}`);

                return {
                    filename: welcomePack.file.fileOriginalName || 'welcome-pack.pdf',
                    href: fileUrl, // Use href for remote URLs
                    contentType: welcomePack.file.fileType || 'application/pdf'
                };
            }

            logger.warn(`No welcome pack found for MC:${masterCommunityId}, C:${communityId}, T:${towerId}`);
            return null;
        } catch (error) {
            logger.error('Error fetching welcome pack:', error);
            return null;
        }
    }

    /**
     * TEMPLATE PLACEHOLDER REPLACEMENT
     * ================================
     * Replaces template placeholders with actual data for email personalization
     * Supports comprehensive placeholder system for dynamic content generation
     * 
     * Supported Placeholders:
     * - User Information: {{firstName}}, {{lastName}}, {{fullName}}, {{email}}
     * - Request Details: {{requestNumber}}, {{requestId}}, {{status}}, {{comments}}
     * - Unit Information: {{unitNumber}}, {{unitName}}, {{communityName}}, etc.
     * - Date Information: {{moveInDate}}, {{currentDate}}, {{currentYear}}
     * - Status-specific: {{statusMessage}}, {{nextSteps}}
     * - Company Info: {{companyName}}, {{supportEmail}}, {{appName}}
     * 
     * @param {string} template - HTML template with placeholders
     * @param {MoveInEmailData} data - Data object containing replacement values
     * @returns {string} - Processed template with placeholders replaced
     */
    private replaceTemplatePlaceholders(template: string, data: MoveInEmailData): string {
        const currentDate = new Date();
        const moveInDate = data.moveInDate ? new Date(data.moveInDate) : null;

        const replacements: Record<string, string> = {
            // User Information
            '{{firstName}}': data.userDetails.firstName,
            '{{lastName}}': data.userDetails.lastName,
            '{{fullName}}': `${data.userDetails.firstName} ${data.userDetails.lastName}`,
            '{{email}}': Array.isArray(data.userDetails.email) ? data.userDetails.email.join(', ') : data.userDetails.email,

            // Request Information
            '{{requestNumber}}': data.requestNumber,
            '{{requestId}}': data.requestId.toString(),
            '{{status}}': data.status,
            '{{statusTitle}}': this.getStatusTitle(data.status),
            '{{comments}}': data.comments || '',
            '{{remarks}}': data.comments || '',

            // Unit Information
            '{{unitNumber}}': data.unitDetails.unitNumber,
            '{{unitName}}': data.unitDetails.unitName,
            '{{masterCommunityName}}': data.unitDetails.masterCommunityName,
            '{{communityName}}': data.unitDetails.communityName,
            '{{towerName}}': data.unitDetails.towerName || '',
            '{{propertyAddress}}': this.formatPropertyAddress(data.unitDetails),

            // Date Information
            '{{moveInDate}}': moveInDate ? moveInDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '',
            '{{moveInDateShort}}': moveInDate ? moveInDate.toLocaleDateString() : '',
            '{{currentDate}}': currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            '{{currentDateShort}}': currentDate.toLocaleDateString(),
            '{{currentYear}}': currentDate.getFullYear().toString(),
            '{{currentTime}}': currentDate.toLocaleTimeString(),

            // Status-specific information
            '{{statusMessage}}': this.getStatusMessage(data.status),
            '{{nextSteps}}': this.getNextSteps(data.status),

            // Company/App Information
            '{{companyName}}': 'ONE Sobha App',
            '{{supportEmail}}': process.env.ONE_APP_SUPPORT_EMAIL || 'support@onesobhaapp.com',
            '{{appName}}': 'ONE Sobha App'
        };

        let processedTemplate = template;

        // Replace all placeholders
        Object.entries(replacements).forEach(([placeholder, value]) => {
            // Use global replace with regex to replace all occurrences
            processedTemplate = processedTemplate.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        // Log template processing for debugging
        logger.info(`Template processed for request ${data.requestNumber}, placeholders replaced`);

        return processedTemplate;
    }

    /**
     * Get user-friendly status title
     */
    private getStatusTitle(status: string): string {
        const statusTitles: Record<string, string> = {
            'approved': 'Approved',
            'rfi-pending': 'Additional Information Required',
            'cancelled': 'Cancelled',
            'user-cancelled': 'Cancelled by User',
            'closed': 'Completed',
            'new': 'Submitted',
            'rfi-submitted': 'Information Submitted'
        };
        return statusTitles[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }


    /**
     * Get next steps based on status
     */
    private getNextSteps(status: string): string {
        const nextSteps: Record<string, string> = {
            'approved': 'Please ensure you have all required documents ready for the move-in process. Check your welcome pack for detailed instructions.',
            'rfi-pending': 'Please log into the ONE Sobha App to provide the additional information requested.',
            'cancelled': 'If you wish to submit a new request, please contact our support team.',
            'user-cancelled': 'If you change your mind, you can submit a new move-in request through the app.',
            'closed': 'Enjoy your new home! Contact support if you need any assistance.',
            'rfi-submitted': 'We will review your submission and update you within 2-3 business days.'
        };
        return nextSteps[status] || 'Please check the ONE Sobha App for more details.';
    }

    /**
     * Format property address
     */
    private formatPropertyAddress(unitDetails: any): string {
        const parts = [
            unitDetails.unitName,
            unitDetails.towerName,
            unitDetails.communityName,
            unitDetails.masterCommunityName
        ].filter(Boolean);

        return parts.join(', ');
    }


    /**
     * MOVE-IN STATUS EMAIL SENDER
     * ==========================
     * Sends status update emails for move-in requests (confirmations, RFIs, cancellations)
     * 
     * Features:
     * - Uses community-specific templates with fallback to default
     * - No attachments (status emails are informational only)
     * - Supports CC recipients (e.g., unit owners for tenant requests)
     * - Comprehensive logging for debugging
     * 
     * Email Types:
     * - Confirmation emails (request submitted)
     * - RFI notifications (additional information required)
     * - Cancellation notifications
     * - Update notifications
     * 
     * @param {MoveInEmailData} data - Complete email data including user, unit, and request details
     * @returns {Promise<void>}
     * 
     * @throws {Error} - When email sending fails
     */
    async sendMoveInStatusEmail(data: MoveInEmailData): Promise<void> {
        try {
            logger.info(`=== MOVE-IN STATUS EMAIL START ===`);
            logger.info(`Sending move-in status email for request ${data.requestNumber} to ${data.userDetails.email}`);
            logger.info(`Status: ${data.status}`);
            logger.info(`Community hierarchy: MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);

            // Get custom MIP template from database (user-specific)
            logger.info(`Fetching custom MIP template from database...`);
            let emailTemplate = await this.getMoveInEmailTemplate(
                data.unitDetails.masterCommunityId,
                data.unitDetails.communityId,
                data.unitDetails.towerId,
                data.status
            );

            // Use custom template from database if found
            if (emailTemplate) {
                logger.info(`Using custom email template from database (length: ${emailTemplate.length} chars)`);
            } else {
                logger.info(`No custom email template found, will use simple email body`);
            }

            // Create simple email body with header image and status content
            const emailBody = this.createEmailBodyWithHeader(data.status, data.requestNumber, data.isRecipientEmail, data);

            // Generate subject based on status
            const subject = this.getEmailSubject(data.status, data.requestNumber, data.isRecipientEmail, data);
            logger.info(`Email subject generated: ${subject}`);

            // Send email with header image only (no attachments for status emails)
            logger.info(`Calling sendEmail method...`);
            await this.sendEmail(
                data.userDetails.email,
                subject,
                emailBody,
                [], // no attachments for status emails
                data.ccEmails || [] // CC emails if provided
            );

            logger.info(`=== MOVE-IN STATUS EMAIL SUCCESS ===`);
            logger.info(`Move-in status email sent successfully for request ${data.requestNumber}`);
        } catch (error) {
            logger.error(`=== MOVE-IN STATUS EMAIL ERROR ===`);
            logger.error(`Failed to send move-in status email for request ${data.requestNumber}:`, error);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error(`=== MOVE-IN STATUS EMAIL ERROR END ===`);
            throw error;
        }
    }

    /**
     * MOVE-IN APPROVAL EMAIL SENDER
     * =============================
     * Sends approval emails for move-in requests with attachments
     * 
     * Features:
     * - Uses community-specific templates with fallback to default
     * - Includes MIP template as PDF attachment (generated dynamically)
     * - Includes welcome pack PDF attachment (retrieved from Azure Blob Storage)
     * - Supports CC recipients (e.g., unit owners for tenant requests)
     * - Comprehensive logging for debugging
     * 
     * Attachments:
     * - MIP Template PDF: Generated from HTML template using Puppeteer
     * - Welcome Pack PDF: Retrieved from community-specific storage
     * 
     * @param {MoveInEmailData} data - Complete email data including user, unit, and request details
     * @returns {Promise<void>}
     * 
     * @throws {Error} - When email sending fails
     */
    async sendMoveInApprovalEmail(data: MoveInEmailData): Promise<void> {
        try {
            logger.info(`=== MOVE-IN APPROVAL EMAIL START ===`);
            logger.info(`Sending move-in approval email with welcome pack for request ${data.requestNumber} to ${data.userDetails.email}`);
            logger.info(`Community hierarchy: MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);

            // Get custom MIP template from database (user-specific for approval)
            logger.info(`Fetching custom MIP approval template from database...`);
            let emailTemplate = await this.getMoveInEmailTemplate(
                data.unitDetails.masterCommunityId,
                data.unitDetails.communityId,
                data.unitDetails.towerId,
                'approved'
            );

            // Use custom template from database if found
            if (emailTemplate) {
                logger.info(`Using custom email template from database`);
            } else {
                logger.info(`No custom email template found for approval, will use detailed approval body`);
            }

            // Replace placeholders with actual data if template exists
            const processedTemplate = emailTemplate ? this.replaceTemplatePlaceholders(emailTemplate, data) : null;

            // Generate attachments only for user emails, not for recipient emails
            const attachments: EmailAttachment[] = [];
            let welcomePackUrl = '';

            if (!data.isRecipientEmail) {
                // Generate MIP template as PDF attachment
                logger.info(`Generating MIP template as PDF attachment...`);

                try {
                    const mipTemplateHtml = await this.getMIPTemplateHTML(data);
                    const mipPdfAttachment = await this.generateMIPTemplatePDF(mipTemplateHtml, data);

                    if (mipPdfAttachment) {
                        attachments.push(mipPdfAttachment);
                        logger.info(`MIP template PDF attachment added (${mipPdfAttachment.filename})`);
                    } else {
                        logger.error(`✗ MIP template PDF generation returned null - Cannot send approval email`);
                        throw new Error('MIP template PDF generation failed');
                    }
                } catch (mipError) {
                    logger.error(`✗ CRITICAL ERROR: MIP template generation failed`);
                    logger.error(`Error: ${mipError instanceof Error ? mipError.message : 'Unknown error'}`);
                    logger.error(`Cannot send approval email without MIP template`);
                    throw mipError; // Re-throw to prevent approval email from being sent
                }

                // Get welcome pack attachment (optional - failure here doesn't block email)
                logger.info(`Fetching welcome pack for MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);
                const welcomePackAttachment = await this.getWelcomePackFile(
                    data.unitDetails.masterCommunityId,
                    data.unitDetails.communityId,
                    data.unitDetails.towerId
                );

                if (welcomePackAttachment) {
                    attachments.push(welcomePackAttachment);
                    welcomePackUrl = welcomePackAttachment.href || welcomePackAttachment.path || '';
                    logger.info(`Welcome pack attachment found and added (${welcomePackAttachment.filename})`);
                } else {
                    logger.warn(`No welcome pack found for community ${data.unitDetails.communityId}, tower ${data.unitDetails.towerId}`);
                }

                logger.info(`Total attachments: ${attachments.length} (MIP: Yes, Welcome Pack: ${welcomePackAttachment ? 'Yes' : 'No'})`);
            } else {
                logger.info(`Recipient email - no attachments will be sent`);
            }

            // Create detailed email body with header image and move-in permit content
            const emailBody = await this.createDetailedApprovalEmailBody(data, welcomePackUrl);

            // Generate subject
            const subject = this.getEmailSubject('approved', data.requestNumber, data.isRecipientEmail, data);

            // Send email with MIP template and welcome pack attachments (with CC if provided)
            await this.sendEmail(
                data.userDetails.email,
                subject,
                emailBody,
                attachments,
                data.ccEmails || [] // CC emails if provided
            );

            logger.info(`=== MOVE-IN APPROVAL EMAIL SUCCESS ===`);
            logger.info(`Move-in approval email sent successfully for request ${data.requestNumber}`);
        } catch (error) {
            logger.error(`=== MOVE-IN APPROVAL EMAIL FAILED ===`);
            logger.error(`Failed to send move-in approval email for request ${data.requestNumber}`);
            logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logger.error(`Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error(`=== MOVE-IN APPROVAL EMAIL FAILED END ===`);
            throw error;
        }
    }

    /**
     * MIP TEMPLATE HTML GENERATOR
     * ===========================
     * Generates HTML content for MIP (Move-In Permit) template
     * Creates a comprehensive HTML document with all request details
     * 
     * Features:
     * - Professional styling with CSS
     * - Header image integration
     * - Request details table
     * - Status-specific content sections
     * - Next steps and important information
     * - Placeholder replacement for dynamic content
     * 
     * @param {MoveInEmailData} data - Complete email data for template generation
     * @returns {string} - Complete HTML document ready for PDF conversion
     */
    private async getMIPTemplateHTML(data: MoveInEmailData): Promise<string> {
        try {
            logger.info(`=== MIP TEMPLATE HTML GENERATION START ===`);
            logger.info(`Request: ${data.requestNumber}, MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);
            logger.info(`User: ${data.userDetails.firstName} ${data.userDetails.lastName}, Email: ${data.userDetails.email}`);
            logger.info(`Move-in Date: ${data.moveInDate}`);

            const templateRepository = AppDataSource.getRepository(OccupancyRequestTemplates);
            let template = null;

            // Try to find template with exact match (tower → community → master community hierarchy)
            // Note: isActive has select: false, so we need to explicitly select it
            const selectFields = ['id', 'masterCommunityId', 'communityId', 'towerId', 'templateType', 'templateString', 'isActive'];

            // 1. First try: Tower-specific template
            if (data.unitDetails.towerId) {
                template = await templateRepository
                    .createQueryBuilder('template')
                    .select(selectFields.map(f => `template.${f}`))
                    .where('template.masterCommunityId = :masterCommunityId', { masterCommunityId: data.unitDetails.masterCommunityId })
                    .andWhere('template.communityId = :communityId', { communityId: data.unitDetails.communityId })
                    .andWhere('template.towerId = :towerId', { towerId: data.unitDetails.towerId })
                    .andWhere('template.templateType = :templateType', { templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN })
                    .andWhere('template.isActive = :isActive', { isActive: true })
                    .getOne();

                if (template) {
                    logger.info(`✓ Found tower-specific MIP template (ID: ${template.id})`);
                }
            }

            // 2. Second try: Community-level template (no tower)
            if (!template) {
                template = await templateRepository
                    .createQueryBuilder('template')
                    .select(selectFields.map(f => `template.${f}`))
                    .where('template.masterCommunityId = :masterCommunityId', { masterCommunityId: data.unitDetails.masterCommunityId })
                    .andWhere('template.communityId = :communityId', { communityId: data.unitDetails.communityId })
                    .andWhere('template.towerId IS NULL')
                    .andWhere('template.templateType = :templateType', { templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN })
                    .andWhere('template.isActive = :isActive', { isActive: true })
                    .getOne();

                if (template) {
                    logger.info(`✓ Found community-specific MIP template (ID: ${template.id})`);
                }
            }

            // 3. Third try: Master community level template
            if (!template) {
                template = await templateRepository
                    .createQueryBuilder('template')
                    .select(selectFields.map(f => `template.${f}`))
                    .where('template.masterCommunityId = :masterCommunityId', { masterCommunityId: data.unitDetails.masterCommunityId })
                    .andWhere('template.communityId IS NULL')
                    .andWhere('template.towerId IS NULL')
                    .andWhere('template.templateType = :templateType', { templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN })
                    .andWhere('template.isActive = :isActive', { isActive: true })
                    .getOne();

                if (template) {
                    logger.info(`✓ Found master community MIP template (ID: ${template.id})`);
                }
            }

            if (!template || !template.templateString) {
                logger.error(`✗ NO MIP TEMPLATE FOUND IN DATABASE - CANNOT GENERATE PDF`);
                logger.error(`Searched for: MC=${data.unitDetails.masterCommunityId}, C=${data.unitDetails.communityId}, T=${data.unitDetails.towerId}`);
                logger.error(`MIP template must be configured in database before approving move-in requests`);
                throw new Error(`MIP template not found for MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);
            }

            logger.info(`=== MIP TEMPLATE FOUND IN DATABASE ===`);
            logger.info(`Template ID: ${template.id}`);
            logger.info(`Template Type: ${template.templateType}`);
            logger.info(`Master Community ID: ${template.masterCommunityId}`);
            logger.info(`Community ID: ${template.communityId}`);
            logger.info(`Tower ID: ${template.towerId || 'NULL (Community level)'}`);
            logger.info(`Template length: ${template.templateString.length} characters`);
            logger.info(`Template type check - First 50 chars: ${template.templateString.substring(0, 50)}`);

            let templateContent = template.templateString;

            // Check if template is Base64 encoded
            // Base64 strings typically don't start with < or <!DOCTYPE
            const isLikelyBase64 = !templateContent.trim().startsWith('<') &&
                !templateContent.trim().startsWith('<!') &&
                /^[A-Za-z0-9+/=]+$/.test(templateContent.substring(0, 100));

            if (isLikelyBase64) {
                try {
                    logger.info(`⚠ Template appears to be Base64 encoded, attempting to decode...`);
                    templateContent = Buffer.from(templateContent, 'base64').toString('utf-8');
                    logger.info(`✓ Base64 decoded successfully (new length: ${templateContent.length} chars)`);
                    logger.info(`Decoded preview (first 200 chars): ${templateContent.substring(0, 200)}...`);
                } catch (decodeError) {
                    logger.error(`✗ Base64 decode failed:`, decodeError);
                    logger.warn(`Using template as-is without decoding`);
                }
            } else {
                logger.info(`✓ Template appears to be plain HTML (not Base64 encoded)`);
            }

            logger.info(`Template preview (first 200 chars): ${templateContent.substring(0, 200)}...`);

            // Replace placeholders with actual data
            const finalHtml = this.replaceMIPPlaceholders(templateContent, data);
            logger.info(`✓ Placeholders replaced (final length: ${finalHtml.length} chars)`);
            logger.info(`Final HTML preview (first 200 chars): ${finalHtml.substring(0, 200)}...`);

            logger.info(`=== MIP TEMPLATE HTML GENERATION COMPLETE ===`);
            return finalHtml;
        } catch (error) {
            logger.error('=== MIP TEMPLATE HTML GENERATION ERROR ===');
            logger.error('Error fetching MIP template from database:', error);
            logger.error(`Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error('=== MIP TEMPLATE HTML GENERATION FAILED ===');
            // Do NOT use fallback template - throw error to prevent approval without proper template
            throw error;
        }
    }

    /**
     * REPLACE MIP TEMPLATE PLACEHOLDERS
     * ==================================
     * Replaces only the 6 specific placeholders used in MIP template
     * Supports ${} format placeholders
     */
    private replaceMIPPlaceholders(template: string, data: MoveInEmailData): string {
        const currentDate = new Date();
        const moveInDate = data.moveInDate ? new Date(data.moveInDate) : null;

        const occupantName = `${data.userDetails.firstName} ${data.userDetails.lastName}`;
        const address = `${data.unitDetails.unitNumber || ''} ${data.unitDetails.unitName || ''}`.trim();
        const community = data.unitDetails.communityName || '';
        const moveInDateFormatted = moveInDate ? moveInDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : '';
        const dateOfIssue = currentDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // ONLY the 6 placeholders used in the template
        const replacements: Record<string, string> = {
            '${data.MoveInDate}': moveInDateFormatted,
            '${data.AdminPortalRequestCode}': data.requestNumber,
            '${OccupantName}': occupantName,
            '${Address}': address,
            '${Community}': community,
            '${DateOfIssue}': dateOfIssue
        };

        logger.info(`Replacing MIP template placeholders...`);
        logger.info(`Placeholders to replace: ${Object.keys(replacements).length}`);

        let processedTemplate = template;
        let replacedCount = 0;

        // Replace all placeholders
        Object.entries(replacements).forEach(([placeholder, value]) => {
            // Escape special regex characters
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g');
            const matches = processedTemplate.match(regex);
            if (matches && matches.length > 0) {
                processedTemplate = processedTemplate.replace(regex, value);
                replacedCount += matches.length;
                logger.info(`  ✓ ${placeholder} -> ${value}`);
            }
        });

        logger.info(`✓ Total replacements: ${replacedCount}`);

        // Check for any remaining unreplaced placeholders
        const remainingPlaceholders = processedTemplate.match(/\$\{[^}]+\}/g);
        if (remainingPlaceholders && remainingPlaceholders.length > 0) {
            logger.warn(`⚠ Unreplaced placeholders found: ${[...new Set(remainingPlaceholders)].join(', ')}`);
        } else {
            logger.info(`✓ All placeholders replaced successfully`);
        }

        return processedTemplate;
    }


    /**
     * PDF GENERATION USING PUPPETEER
     * ==============================
     * Converts HTML content to PDF using Puppeteer browser automation
     * 
     * Features:
     * - Headless Chrome browser for PDF generation
     * - A4 format with proper margins
     * - Background graphics and styling preserved
     * - Network idle wait for image loading
     * - Error handling for PDF generation failures
     * 
     * Technical Details:
     * - Uses Puppeteer for reliable PDF generation
     * - Waits for network idle to ensure images load
     * - Returns buffer content for email attachment
     * - Handles browser cleanup automatically
     * 
     * @param {string} htmlContent - Complete HTML document to convert
     * @param {MoveInEmailData} data - Email data for filename generation
     * @returns {Promise<EmailAttachment|null>} - PDF attachment or null if generation fails
     */
    private async generateMIPTemplatePDF(htmlContent: string, data: MoveInEmailData): Promise<EmailAttachment | null> {
        try {
            // Import puppeteer dynamically to avoid build issues
            const puppeteer = require('puppeteer');

            logger.info(`=== MIP PDF GENERATION START ===`);
            logger.info(`Request: ${data.requestNumber}, Status: ${data.status}`);
            logger.info(`HTML Content Length: ${htmlContent.length} characters`);
            logger.info(`HTML Preview (first 300 chars): ${htmlContent.substring(0, 300)}...`);
            logger.info(`HTML Preview (last 100 chars): ...${htmlContent.substring(htmlContent.length - 100)}`);

            // Configure Chrome executable path from environment variable
            const launchOptions: any = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };

            // Add executablePath if EXECUTABLE_PATH is set in environment
            const chromeExecutablePath = process.env.EXECUTABLE_PATH;
            logger.info(`=== Chrome Executable Path Configuration ===`);
            logger.info(`EXECUTABLE_PATH from env: ${chromeExecutablePath || 'NOT SET'}`);

            if (chromeExecutablePath && chromeExecutablePath.trim()) {
                launchOptions.executablePath = chromeExecutablePath.trim();
                logger.info(`✓ Using Chrome executable path from EXECUTABLE_PATH env variable`);
                logger.info(`✓ Path: ${chromeExecutablePath.trim()}`);
            } else {
                logger.info(`⚠ EXECUTABLE_PATH not set, using Puppeteer auto-detection`);
                logger.warn(`If PDF generation fails, set EXECUTABLE_PATH in .env file`);
            }

            // Launch Puppeteer
            logger.info(`Launching Puppeteer browser...`);
            const browser = await puppeteer.launch(launchOptions);
            logger.info(`✓ Browser launched successfully`);

            const page = await browser.newPage();
            logger.info(`✓ New page created`);

            // Set content and wait for images to load
            logger.info(`Setting HTML content and waiting for network idle...`);
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            logger.info(`✓ HTML content set successfully`);

            // Generate PDF
            logger.info(`Generating PDF from HTML...`);
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });
            logger.info(`✓ PDF generated successfully (${pdfBuffer.length} bytes)`);

            await browser.close();
            logger.info(`✓ Browser closed`);

            const filename = `${data.requestNumber}-${data.status}.pdf`;
            logger.info(`=== MIP PDF GENERATION COMPLETE ===`);
            logger.info(`Filename: ${filename}, Size: ${pdfBuffer.length} bytes`);

            return {
                filename: filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            };
        } catch (error) {
            logger.error('=== MIP PDF GENERATION ERROR ===');
            logger.error('Error generating MIP template PDF:', error);
            logger.error(`EXECUTABLE_PATH from env: ${process.env.EXECUTABLE_PATH || 'NOT SET'}`);
            logger.error(`HTML Content Length: ${htmlContent ? htmlContent.length : 0} characters`);
            logger.error(`HTML Content Preview: ${htmlContent ? htmlContent.substring(0, 200) : 'NULL/EMPTY'}`);
            logger.error(`Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error('=================================');
            return null;
        }
    }

    /**
     * SIMPLE EMAIL BODY CREATOR
     * =========================
     * Creates a simple email body with header image for status emails
     * Used for non-approval emails that don't require detailed content
     * 
     * Features:
     * - Header image with professional styling
     * - Status-specific messaging
     * - Request number display
     * - Clean, minimal design
     * 
     * @param {string} status - Request status for appropriate messaging
     * @param {string} requestNumber - Request number for display
     * @returns {string} - HTML email body
     */
    private createEmailBodyWithHeader(status: string, requestNumber: string, isRecipientEmail: boolean = false, data?: MoveInEmailData): string {
        const statusMessage = this.getStatusMessage(status);
        const moveInDateStr = data?.moveInDate ? new Date(data.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

        let heading = '';
        if (status.toLowerCase() === 'approved') {
            if (isRecipientEmail) {
                // For recipient emails: "User name move in date starts from 15 August 2022 Ref # MIP-10"
                const userName = data?.userDetails ? `${data.userDetails.firstName} ${data.userDetails.lastName}` : 'User';
                heading = `${userName} move in date starts from ${moveInDateStr} Ref # ${requestNumber}`;
            } else {
                // For user emails: "Your move in date starts from 15 August 2022 Ref # MIP-10"
                heading = `Your move in date starts from ${moveInDateStr} Ref # ${requestNumber}`;
            }
        } else {
            heading = 'Move-in Request Update';
        }

        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header Image with Frame -->
            <div style="width: 100%; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                <img src="https://res.cloudinary.com/ddbdlqjcq/image/upload/v1755076402/Screenshot_2025-08-13_142428_1_qwua5y.png" 
                     alt="ONE Sobha Header" 
                     style="width: 100%; height: auto; display: block;" />
            </div>
            
            <!-- Email Content -->
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #333; margin-bottom: 15px;">${heading}</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    ${statusMessage}
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    <strong>Request Number:</strong> ${requestNumber}
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 10px;">
                    Please find the detailed information in the attached MIP template document.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 20px; padding: 15px; color: #999; font-size: 12px;">
                <p>This is an automated message from ONE Sobha App</p>
                <p>For support, please contact your community management team</p>
            </div>
        </div>`;
    }

    /**
     * DETAILED APPROVAL EMAIL BODY CREATOR
     * ====================================
     * Creates comprehensive email body for approval emails with detailed information
     * Used specifically for move-in approval notifications
     * 
     * Features:
     * - Professional header image with styling
     * - Congratulations message with status-specific styling
     * - Detailed request information table
     * - Next steps section with guidance
     * - Attachment information section
     * - Additional comments section (if provided)
     * - Professional footer
     * 
     * @param {MoveInEmailData} data - Complete email data for content generation
     * @returns {string} - Comprehensive HTML email body
     */
    private async createDetailedApprovalEmailBody(data: MoveInEmailData, welcomePackUrl: string = ''): Promise<string> {
        // Check if this is a recipient email (MIP recipients) and use different template
        if (data.isRecipientEmail) {
            return await this.createRecipientEmailBody(data);
        }

        // Original user email template
        // Get recipient name
        const recipientName = `${data.userDetails.firstName} ${data.userDetails.lastName}`.trim() || 'homeowner';

        // If welcome pack URL is provided, use it; otherwise show a message
        const welcomePackButton = welcomePackUrl ?
            `<a href="${welcomePackUrl}" target="_blank" rel="noopener"
                   style="display:inline-block;background:#0b63a5;color:#ffffff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600;">
                  Click here to view the Welcome Pack
                </a>` :
            `<p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;color:#666;">
                Welcome Pack is attached to this email.
              </p>`;

        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Move In Permit Approved</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial, Helvetica, sans-serif;color:#333;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0b63a5;padding:20px 24px;color:#ffffff;">
              <h1 style="margin:0;font-size:18px;font-weight:600;">Sobha Community Management</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px 0;font-size:15px;">Dear ${recipientName},</p>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;">
                We have reviewed your request and enclose herein your Move In Permit
                (Reference no. <strong>${data.requestNumber}</strong>).
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;">
                ${welcomePackButton}
              </p>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;">
                In the provided Welcome Pack, you will find everything you need to know about your community — from amenities and events, to information on the Community Service Fee, FAQs and emergency guidelines.
              </p>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;">
                On behalf of Sobha Community Management we welcome you to the community.
              </p>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;">
                Please provide your movers with a copy of this MIP to gain access to the community if you are not accompanying them.
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;">
                If you have any other enquiries, please feel free to get in touch with us at
                <strong>800 SOBHACC (7624222)</strong> 
              </p>

              <p style="margin:0 0 4px 0;font-size:15px;">Kind regards,</p>
              <p style="margin:0;font-size:15px;font-weight:600;">Sobha Community Management</p>
            </td>
          </tr>

          <!-- Footer 
          <tr>
            <td style="background:#f0f4f8;padding:14px 24px;font-size:12px;color:#666;">
              <span>© Sobha Community Management</span>
              <span style="float:right;">Reference: ${data.requestNumber}</span>
            </td>
          </tr>-->

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    /**
     * CREATE RECIPIENT EMAIL BODY FOR MIP RECIPIENTS
     * ===============================================
     * Creates a simple notification email body for community management team
     * Notifies them about a new Move In Permit issuance
     * 
     * Features:
     * - Simple, professional format
     * - All key MIP details
     * - No attachments required
     * - Designed for internal team notification
     * 
     * @param {MoveInEmailData} data - Complete email data for content generation
     * @returns {string} - HTML email body for recipient notification
     */
    private async createRecipientEmailBody(data: MoveInEmailData): Promise<string> {
        // Format dates
        const moveInDateFormatted = data.moveInDate ? 
            new Date(data.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 
            'N/A';
        
        const mipIssueDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

        // Format property details
        const propertyDetails = [
            data.unitDetails.unitNumber,
            data.unitDetails.towerName,
            data.unitDetails.communityName,
            data.unitDetails.masterCommunityName
        ].filter(Boolean).join(', ');

        // Format user type with proper capitalization
        let userTypeFormatted = 'N/A';
        if (data.requestType) {
            const typeMap: Record<string, string> = {
                'owner': 'Owner',
                'tenant': 'Tenant',
                'hho_owner': 'HHO Owner',
                'hho-owner': 'HHO Owner',
                'hho_company': 'HHO Company',
                'hho-company': 'HHO Company'
            };
            userTypeFormatted = typeMap[data.requestType.toLowerCase()] || 
                data.requestType.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        // Get applicant name
        const applicantName = `${data.userDetails.firstName} ${data.userDetails.lastName}`.trim();

        // Fetch lease dates from database based on request type
        let leaseStartDate = 'N/A';
        let leaseEndDate = 'N/A';
        
        try {
            logger.info(`Fetching lease details for requestId: ${data.requestId}, requestType: ${data.requestType}`);
            
            if (data.requestType === 'tenant') {
                const tenantDetails = await AppDataSource.getRepository(MoveInRequestDetailsTenant)
                    .createQueryBuilder('tenant')
                    .leftJoin('tenant.moveInRequest', 'request')
                    .where('request.id = :requestId', { requestId: data.requestId })
                    .getOne();
                    
                logger.info(`Tenant details found: ${!!tenantDetails}`);
                if (tenantDetails) {
                    if (tenantDetails.tenancyContractStartDate) {
                        leaseStartDate = new Date(tenantDetails.tenancyContractStartDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    if (tenantDetails.tenancyContractEndDate) {
                        leaseEndDate = new Date(tenantDetails.tenancyContractEndDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    logger.info(`Tenant lease dates - Start: ${leaseStartDate}, End: ${leaseEndDate}`);
                }
            } else if (data.requestType === 'hho_company' || data.requestType === 'hho-company') {
                const companyDetails = await AppDataSource.getRepository(MoveInRequestDetailsHhcCompany)
                    .createQueryBuilder('company')
                    .leftJoin('company.moveInRequest', 'request')
                    .where('request.id = :requestId', { requestId: data.requestId })
                    .getOne();
                    
                logger.info(`HHO Company details found: ${!!companyDetails}`);
                if (companyDetails) {
                    logger.info(`HHO Company raw dates - leaseStartDate: ${companyDetails.leaseStartDate}, leaseEndDate: ${companyDetails.leaseEndDate}`);
                    if (companyDetails.leaseStartDate) {
                        leaseStartDate = new Date(companyDetails.leaseStartDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    if (companyDetails.leaseEndDate) {
                        leaseEndDate = new Date(companyDetails.leaseEndDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    logger.info(`HHO Company formatted lease dates - Start: ${leaseStartDate}, End: ${leaseEndDate}`);
                }
            }
        } catch (error) {
            logger.error(`Error fetching lease details for recipient email: ${error}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack'}`);
        }

        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Move In Permit Issued - Notification</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial, Helvetica, sans-serif;color:#333;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0b63a5;padding:20px 24px;color:#ffffff;">
              <h1 style="margin:0;font-size:18px;font-weight:600;">Sobha Community Management</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 18px 0;font-size:15px;">Dear Team,</p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                This is to notify you that a new Move In Permit (MIP) has been issued.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">MIP reference no.</strong>
                    <span>${data.requestNumber}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">User type</strong>
                    <span>${userTypeFormatted}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:180px;color:#333;font-weight:bold;vertical-align:top;">Property details</td>
                        <td style="color:#555;vertical-align:top;">${propertyDetails}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">Applicant name</strong>
                    <span>${applicantName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">Occupant name</strong>
                    <span>${applicantName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">Move in date</strong>
                    <span>${moveInDateFormatted}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">Move out date</strong>
                    <span>N/A</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">Start date (lease)</strong>
                    <span>${leaseStartDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #e8e8e8;">
                    <strong style="display:inline-block;width:180px;color:#333;">End date (lease)</strong>
                    <span>${leaseEndDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <strong style="display:inline-block;width:180px;color:#333;">MIP date of issue</strong>
                    <span>${mipIssueDate}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px 0;font-size:15px;">Kind regards,</p>
              <p style="margin:0;font-size:15px;font-weight:600;">Sobha Community Management</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }


    /**
     * STATUS MESSAGE GENERATOR
     * ========================
     * Generates user-friendly status messages for email content
     * Provides contextual messaging based on request status
     * 
     * @param {string} status - Request status (approved, rfi-pending, cancelled, etc.)
     * @returns {string} - User-friendly status message
     */
    private getStatusMessage(status: string): string {
        switch (status.toLowerCase()) {
            case 'approved':
                return '🎉 Great news! Your move-in request has been approved. Please find the detailed information and next steps in the attached MIP template document.';
            case 'rfi-pending':
                return '📋 Additional information is required for your move-in request. Please review the attached MIP template for details on what information is needed.';
            case 'cancelled':
                return '❌ Your move-in request has been cancelled. Please refer to the attached MIP template for more details and next steps.';
            case 'rfi-submitted':
                return '✅ Thank you for submitting the additional information. Your move-in request is now under review. Please find the status details in the attached MIP template.';
            case 'closed':
                return '✅ Your move-in has been completed successfully. Please find the completion details in the attached MIP template document.';
            default:
                return '📋 There has been an update to your move-in request. Please review the attached MIP template for detailed information.';
        }
    }

    /**
     * EMAIL SUBJECT GENERATION
     * ========================
     * Generates appropriate email subjects based on request status and recipient type
     * Different subjects for user vs recipient emails
     * 
     * @param {string} status - Current request status
     * @param {string} requestNumber - Request number for identification
     * @param {boolean} isRecipientEmail - Whether this is a recipient email (vs user email)
     * @param {MoveInEmailData} data - Email data for additional context
     * @returns {string} - Formatted email subject
     */
    private getEmailSubject(status: string, requestNumber: string, isRecipientEmail: boolean = false, data?: MoveInEmailData): string {
        const moveInDateStr = data?.moveInDate ? new Date(data.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

        if (status.toLowerCase() === 'approved') {
            if (isRecipientEmail) {
                // For recipient emails: "Move in request Raised : request id"
                return `Move in request Raised : ${requestNumber}`;
            } else {
                // For user emails: "Move In Permit Reference No. MIP-10: Application Approved"
                return `Move In Permit Reference No. ${requestNumber}: Application Approved`;
            }
        }

        // For other statuses, use the original format
        switch (status.toLowerCase()) {
            case 'rfi-pending':
                return `📋 Additional Information Required - ${requestNumber} | ONE Sobha App`;
            case 'cancelled':
                return `❌ Move-in Request Cancelled - ${requestNumber} | ONE Sobha App`;
            case 'rfi-submitted':
                return `✅ Information Submitted - ${requestNumber} | ONE Sobha App`;
            case 'closed':
                return `✅ Move-in Completed - ${requestNumber} | ONE Sobha App`;
            default:
                return `📋 Move-in Request Update - ${requestNumber} | ONE Sobha App`;
        }
    }
}
