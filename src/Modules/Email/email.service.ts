import nodemailer from 'nodemailer';
import httpStatus from 'http-status';
import { logger } from '../../Common/Utils/logger';
import { APICodes } from '../../Common/Constants';
import ApiError from '../../Common/Utils/ApiError';
import config from '../../Common/Config/config';
import { OccupancyRequestTemplates } from '../../Entities/OccupancyRequestTemplates.entity';
import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { OCUPANCY_REQUEST_TYPES } from '../../Entities/EntityTypes/transition';
import { AppDataSource } from '../../Common/data-source';
import { IsNull } from 'typeorm';

export interface EmailAttachment {
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
}

export interface EmailOptions {
    to: string | string[]; // Support multiple "To" recipients
    cc?: string[];
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

export interface MoveInEmailData {
    requestId: number;
    requestNumber: string;
    status: string;
    userDetails: {
        firstName: string;
        lastName: string;
        email: string | string[]; // Support multiple primary emails
    };
    unitDetails: {
        unitNumber: string;
        unitName: string;
        masterCommunityId: number;
        communityId: number;
        towerId?: number;
        masterCommunityName: string;
        communityName: string;
        towerName?: string;
    };
    moveInDate?: Date;
    comments?: string;
    additionalInfo?: any;
    ccEmails?: string[]; // CC emails (e.g., owner email for tenant requests)
    requestType?: string; // To determine email logic
}

// Use the exact same pattern as User-Services
const transport = nodemailer.createTransport(config.email.smtp);
if (config.env !== 'test') {
    transport
        .verify()
        .then(() => logger.info('Connected to email server'))
        .catch((e: any) => {
            logger.error(e);
            logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env');
        });
}

export class EmailService {

    /**
     * Send an email (copied from User-Services with attachment support)
     * @param {string} to
     * @param {string} subject
     * @param {string} text
     * @param {EmailAttachment[]} attachments
     * @returns {Promise}
     */
    async sendEmail(to: string | string[], subject: string, text: string, attachments: EmailAttachment[] = [], cc: string[] = []) {
        try {
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
                msg.attachments = attachments.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    path: att.path,
                    contentType: att.contentType
                }));
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
                hasAuth: !!(config.email.smtp.auth.user && config.email.smtp.auth.pass)
            })}`);
            logger.error("******************Email Service Error******************");
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.EMAIL_ERROR?.message || 'Email error', APICodes.EMAIL_ERROR?.code || 'EMAIL_ERROR');
        }
    };

    /**
     * Send email with enhanced options (including CC)
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
     * Send reset password email (copied from User-Services)
     * @param {string} to
     * @param {any} details
     * @returns {Promise}
     */
    async sendResetPasswordEmail(to: string, details: any) {
        const subject = 'Reset Password : OTP Verification Required';
        const text = `<div>Dear&nbsp;${details.firstName}&nbsp;${details.lastName}<br><br>Please use the following OTP to reset your password:<br><br><strong><span style="font-size: 18px;">OTP: ${details.otp}</span></strong><br><br>This OTP is valid for a limited time and is essential to activate your account. Please enter it in the app as prompted.<br>If you encounter any issues during the reset password process or have questions about our app, feel free to reach out to our support team for assistance.<br>Best regards,<br>Team @ ONE Sobha App</div>`;
        await this.sendEmail(to, subject, text);
    };

    /**
     * Send OTP Validation email (copied from User-Services)
     * @param {string} to
     * @param {any} details
     * @returns {Promise}
     */
    async sendMoveInVerificationEmail(to: string, details: any) {
        const subject = 'Move In : OTP Verification Required';
        const text = `<div>Dear&nbsp;${details.firstName}&nbsp;${details.lastName}<br><br>Please use the following OTP to move in:<br><br><strong><span style="font-size: 18px;">OTP: ${details.otp}</span></strong><br><br>This OTP is valid for a limited time and is essential to activate your account. Please enter it in the app as prompted.<br>If you encounter any issues during the move in process or have questions about our app, feel free to reach out to our support team for assistance.<br>Best regards,<br>Team @ ONE Sobha App</div>`;
        await this.sendEmail(to, subject, text);
    };

    /**
     * Send general OTP email (copied from User-Services)
     * @param {string} to
     * @param {any} otp
     * @returns {Promise}
     */
    async sendEmailOTPGeneral(to: string, otp: any) {
        const subject = 'Your One-Time Password (OTP) from ONE Sobha App';
        const text = `<div>Dear&nbsp;User <br><br>Welcome to ONE Sobha App! We have received a request to verify your identity for  ONE Sobha. To complete the verification process, please use the following One-Time Password (OTP):<br>

        OTP: ${otp}.<br><br>Best regards,<br>Team @ ONE Sobha App</div>`;
        return await this.sendEmail(to, subject, text);
    };

    /**
     * Send support email (copied from User-Services)
     * @param {string} message
     * @param {string} error
     * @param {string} apiDetails
     * @returns {Promise}
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
     * Get email template for move-in based on community/tower (MIP specific)
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
     * Get welcome pack PDF for approved move-in
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
                    path: fileUrl, // nodemailer can handle URLs
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
     * Replace template placeholders with actual data (Enhanced for MIP templates)
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
     * Get default email template for different statuses
     */
    private getDefaultEmailTemplate(status: string, data: MoveInEmailData): string {
        const baseTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header Image with Frame -->
            <div style="width: 100%; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                <img src="https://res.cloudinary.com/ddbdlqjcq/image/upload/v1755076402/Screenshot_2025-08-13_142428_1_qwua5y.png" 
                     alt="ONE Sobha Header" 
                     style="width: 100%; height: auto; display: block;" />
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="color: #333; margin: 0;">ONE Sobha App - Move-In Request Update</h2>
            </div>
            
            <div style="background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <p>Dear {{fullName}},</p>
                
                <p>Your move-in request <strong>{{requestNumber}}</strong> for unit <strong>{{unitName}}</strong> has been updated.</p>
                
                <div style="background-color: #f1f3f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">Request Details:</h3>
                    <p><strong>Request Number:</strong> {{requestNumber}}</p>
                    <p><strong>Unit:</strong> {{unitName}}</p>
                    <p><strong>Community:</strong> {{communityName}}</p>
                    <p><strong>Status:</strong> <span style="color: #007bff; font-weight: bold;">{{status}}</span></p>
                    {{moveInDateSection}}
                    {{commentsSection}}
                </div>
                
                {{statusSpecificContent}}
                
                <p>If you have any questions, please contact our support team.</p>
                
                <p>Best regards,<br>Team @ ONE Sobha App</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>© {{currentYear}} ONE Sobha App. All rights reserved.</p>
            </div>
        </div>`;

        let statusSpecificContent = '';
        let moveInDateSection = data.moveInDate ? `<p><strong>Move-in Date:</strong> {{moveInDate}}</p>` : '';
        let commentsSection = data.comments ? `<p><strong>Comments:</strong> {{comments}}</p>` : '';

        switch (status.toLowerCase()) {
            case 'approved':
                statusSpecificContent = `
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0;">🎉 Congratulations! Your move-in request has been approved!</h3>
                    <p>You can now proceed with your move-in as scheduled. Please find your welcome pack attached to this email.</p>
                    <p>Please ensure you have all required documents ready for the move-in process.</p>
                </div>`;
                break;
            case 'rfi-pending':
                statusSpecificContent = `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0;">📋 Additional Information Required</h3>
                    <p>Your move-in request requires additional information or documentation. Please review the comments above and provide the requested information.</p>
                    <p>You can update your request through the ONE Sobha App.</p>
                </div>`;
                break;
            case 'cancelled':
                statusSpecificContent = `
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0;">❌ Move-in Request Cancelled</h3>
                    <p>Your move-in request has been cancelled. Please review the comments above for more details.</p>
                    <p>If you have any questions or would like to submit a new request, please contact our support team.</p>
                </div>`;
                break;
            default:
                statusSpecificContent = `
                <div style="background-color: #e2e3e5; border: 1px solid #d6d8db; color: #383d41; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p>Your request status has been updated. Please check the ONE Sobha App for more details.</p>
                </div>`;
        }

        return baseTemplate
            .replace('{{statusSpecificContent}}', statusSpecificContent)
            .replace('{{moveInDateSection}}', moveInDateSection)
            .replace('{{commentsSection}}', commentsSection);
    }

    /**
     * Send move-in status change email with MIP template as PDF attachment
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

            // Fallback to default template if custom template not found
            if (!emailTemplate) {
                emailTemplate = this.getDefaultEmailTemplate(data.status, data);
                logger.info(`Using default email template for status: ${data.status}`);
            } else {
                logger.info(`Using custom email template from database (length: ${emailTemplate.length} chars)`);
            }

            // Create simple email body with header image and status content
            const emailBody = this.createEmailBodyWithHeader(data.status, data.requestNumber);

            // Generate subject based on status
            const subject = this.getEmailSubject(data.status, data.requestNumber);
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
     * Send move-in approval email with welcome pack attachment
     */
    async sendMoveInApprovalEmail(data: MoveInEmailData): Promise<void> {
        try {
            logger.info(`=== MOVE-IN APPROVAL EMAIL START ===`);
            logger.info(`Sending move-in approval email with welcome pack for request ${data.requestNumber} to ${data.userDetails.email}`);
            logger.info(`Community hierarchy: MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);
            
            // Log SMTP configuration for debugging
            logger.info(`SMTP Configuration: ${JSON.stringify({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure,
                hasAuth: !!(config.email.smtp.auth.user && config.email.smtp.auth.pass),
                from: config.email.from
            })}`);

            // Test SMTP connection first
            try {
                await transport.verify();
                logger.info('SMTP connection verified successfully');
            } catch (smtpError) {
                logger.error('SMTP connection verification failed:', smtpError);
                throw new Error(`SMTP connection failed: ${smtpError instanceof Error ? smtpError.message : 'Unknown SMTP error'}`);
            }

            // Get custom MIP template from database (user-specific for approval)
            logger.info(`Fetching custom MIP approval template from database...`);
            let emailTemplate = await this.getMoveInEmailTemplate(
                data.unitDetails.masterCommunityId,
                data.unitDetails.communityId,
                data.unitDetails.towerId,
                'approved'
            );

            // Fallback to default template if custom template not found
            if (!emailTemplate) {
                emailTemplate = this.getDefaultEmailTemplate('approved', data);
                logger.info(`Using default approval email template (length: ${emailTemplate.length})`);
            } else {
                logger.info(`Using custom email template from database (length: ${emailTemplate.length})`);
            }

            // Replace placeholders with actual data
            const processedTemplate = this.replaceTemplatePlaceholders(emailTemplate, data);
            logger.info(`Email template processed successfully`);

            // Generate MIP template as PDF attachment
            logger.info(`Generating MIP template as PDF attachment...`);
            const mipTemplateHtml = this.getMIPTemplateHTML(data);
            logger.info(`MIP template HTML generated (length: ${mipTemplateHtml.length})`);
            
            const mipPdfAttachment = await this.generateMIPTemplatePDF(mipTemplateHtml, data);
            if (mipPdfAttachment) {
                logger.info(`MIP PDF generated successfully (${mipPdfAttachment.filename}, ${mipPdfAttachment.content?.length || 0} bytes)`);
            } else {
                logger.error(`MIP PDF generation failed - returned null`);
            }

            // Get welcome pack attachment
            logger.info(`Fetching welcome pack for MC:${data.unitDetails.masterCommunityId}, C:${data.unitDetails.communityId}, T:${data.unitDetails.towerId}`);
            const welcomePackAttachment = await this.getWelcomePackFile(
                data.unitDetails.masterCommunityId,
                data.unitDetails.communityId,
                data.unitDetails.towerId
            );

            const attachments: EmailAttachment[] = [];
            if (mipPdfAttachment) {
                attachments.push(mipPdfAttachment);
                logger.info(`MIP template PDF attachment added (${mipPdfAttachment.filename})`);
            } else {
                logger.warn(`MIP template PDF attachment failed to generate`);
            }
            
            if (welcomePackAttachment) {
                attachments.push(welcomePackAttachment);
                logger.info(`Welcome pack attachment found and added (${welcomePackAttachment.filename})`);
            } else {
                logger.warn(`No welcome pack found for community ${data.unitDetails.communityId}, tower ${data.unitDetails.towerId}`);
            }

            logger.info(`Total attachments: ${attachments.length} (MIP: ${mipPdfAttachment ? 'Yes' : 'No'}, Welcome Pack: ${welcomePackAttachment ? 'Yes' : 'No'})`);

            // Create detailed email body with header image and move-in permit content
            const emailBody = this.createDetailedApprovalEmailBody(data);
            logger.info(`Email body created (length: ${emailBody.length})`);

            // Generate subject
            const subject = this.getEmailSubject('approved', data.requestNumber);
            logger.info(`Email subject: ${subject}`);

            // Log email details before sending
            logger.info(`Email details: To: ${data.userDetails.email}, CC: ${data.ccEmails?.join(', ') || 'None'}, Subject: ${subject}, Attachments: ${attachments.length}`);

            // Send email with MIP template and welcome pack attachments (with CC if provided)
            await this.sendEmail(
                data.userDetails.email,
                subject,
                emailBody,
                attachments,
                data.ccEmails || [] // CC emails if provided
            );

            logger.info(`=== MOVE-IN APPROVAL EMAIL SUCCESS ===`);
            logger.info(`Move-in approval email with welcome pack sent successfully for request ${data.requestNumber}`);
        } catch (error) {
            logger.error(`=== MOVE-IN APPROVAL EMAIL ERROR ===`);
            logger.error(`Failed to send move-in approval email for request ${data.requestNumber}:`, error);
            logger.error(`Error details: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error(`=== MOVE-IN APPROVAL EMAIL ERROR END ===`);
            throw error;
        }
    }

    /**
     * Get MIP template HTML content
     */
    private getMIPTemplateHTML(data: MoveInEmailData): string {
        // Use the uploaded MIP template and replace placeholders
        const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Move-In Request Update - ONE Sobha App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header-image {
            width: 100%;
            margin-bottom: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .header-image img {
            width: 100%;
            height: auto;
            display: block;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .content {
            background-color: white;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .details-box {
            background-color: #f1f3f4;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .status-approved {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .status-rfi {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .status-cancelled {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <!-- Header Image with Frame -->
    <div class="header-image">
        <img src="https://res.cloudinary.com/ddbdlqjcq/image/upload/v1755076402/Screenshot_2025-08-13_142428_1_qwua5y.png" 
             alt="ONE Sobha Header" />
    </div>
    
    <div class="header">
        <h2 style="color: #333; margin: 0;">ONE Sobha App - Move-In Request Update</h2>
    </div>
    
    <div class="content">
        <p>Dear {{fullName}},</p>
        
        <p>Your move-in request <strong>{{requestNumber}}</strong> for unit <strong>{{unitName}}</strong> has been updated.</p>
        
        <div class="details-box">
            <h3 style="margin: 0 0 10px 0; color: #333;">Request Details:</h3>
            <p><strong>Request Number:</strong> {{requestNumber}}</p>
            <p><strong>Unit:</strong> {{unitName}}</p>
            <p><strong>Community:</strong> {{communityName}}</p>
            <p><strong>Master Community:</strong> {{masterCommunityName}}</p>
            <p><strong>Tower:</strong> {{towerName}}</p>
            <p><strong>Status:</strong> <span style="color: #007bff; font-weight: bold;">{{status}}</span></p>
            <p><strong>Move-in Date:</strong> {{moveInDate}}</p>
            <p><strong>Comments:</strong> {{comments}}</p>
        </div>
        
        <!-- Status-specific content will be inserted here -->
        <div class="status-approved">
            <h3 style="margin: 0 0 10px 0;">🎉 Congratulations! Your move-in request has been approved!</h3>
            <p>You can now proceed with your move-in as scheduled. Please find your welcome pack attached to this email.</p>
            <p>Please ensure you have all required documents ready for the move-in process.</p>
        </div>
        
        <h3 style="color: #333; margin-top: 25px;">Next Steps:</h3>
        <ul>
            <li>Review the attached welcome pack for detailed move-in instructions</li>
            <li>Ensure all required documents are ready</li>
            <li>Contact the community management team if you have any questions</li>
            <li>Arrive at the scheduled move-in time</li>
        </ul>
        
        <h3 style="color: #333; margin-top: 25px;">Important Information:</h3>
        <ul>
            <li>Bring a valid ID for verification</li>
            <li>Ensure all utilities are connected</li>
            <li>Check parking arrangements if applicable</li>
            <li>Review community rules and regulations</li>
        </ul>
        
        <p>If you have any questions, please contact our support team at {{supportEmail}}.</p>
        
        <p>Best regards,<br>Team @ {{companyName}}</p>
    </div>
    
    <div class="footer">
        <p>© {{currentYear}} {{companyName}}. All rights reserved.</p>
    </div>
</body>
</html>`;

        // Replace placeholders with actual data
        return this.replaceTemplatePlaceholders(template, data);
    }

    /**
     * Generate MIP template as PDF attachment
     */
    private async generateMIPTemplatePDF(htmlContent: string, data: MoveInEmailData): Promise<EmailAttachment | null> {
        try {
            logger.info(`=== MIP PDF GENERATION START ===`);
            logger.info(`Generating MIP template PDF for request ${data.requestNumber}`);
            logger.info(`HTML content length: ${htmlContent.length}`);
            
            // Validate HTML content
            if (!htmlContent || htmlContent.trim().length === 0) {
                logger.error('HTML content is empty or null');
                return null;
            }
            
            // Import puppeteer dynamically to avoid build issues
            const puppeteer = require('puppeteer');
            logger.info('Puppeteer imported successfully');
            
            // Launch Puppeteer
            logger.info('Launching Puppeteer browser...');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            logger.info('Puppeteer browser launched successfully');
            
            const page = await browser.newPage();
            logger.info('New page created');
            
            // Set content and wait for images to load
            logger.info('Setting page content...');
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            logger.info('Page content set successfully');
            
            // Generate PDF
            logger.info('Generating PDF...');
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
            logger.info(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
            
            await browser.close();
            logger.info('Browser closed');
            
            const filename = `${data.requestNumber}-${data.status}.pdf`;
            
            logger.info(`=== MIP PDF GENERATION SUCCESS ===`);
            logger.info(`MIP template PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);
            
            return {
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            };
        } catch (error) {
            logger.error(`=== MIP PDF GENERATION ERROR ===`);
            logger.error(`Error generating MIP template PDF for request ${data.requestNumber}:`, error);
            logger.error(`Error details: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            logger.error(`=== MIP PDF GENERATION ERROR END ===`);
            return null;
        }
    }

    /**
     * Create simple email body with header image
     */
    private createEmailBodyWithHeader(status: string, requestNumber: string): string {
        const statusMessage = this.getStatusMessage(status);
        
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
                <h2 style="color: #333; margin-bottom: 15px;">Move-in Request Update</h2>
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
     * Create detailed approval email body with move-in permit content
     */
    private createDetailedApprovalEmailBody(data: MoveInEmailData): string {
        const statusMessage = this.getStatusMessage('approved');
        const nextSteps = this.getNextSteps('approved');
        
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
                <h2 style="color: #333; margin-bottom: 15px;">🎉 Move-in Request Approved</h2>
                
                <!-- Status Message -->
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0;">Congratulations! Your move-in request has been approved!</h3>
                    <p style="margin: 0;">You can now proceed with your move-in as scheduled. Please find your welcome pack and detailed information attached to this email.</p>
                </div>
                
                <!-- Request Details -->
                <div style="background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #333; margin-top: 0;">Request Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Request Number:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.requestNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Unit Details:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.unitDetails.unitNumber} - ${data.unitDetails.unitName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Community:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.unitDetails.communityName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Master Community:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.unitDetails.masterCommunityName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Tower:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.unitDetails.towerName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Move-in Date:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.moveInDate ? new Date(data.moveInDate).toLocaleDateString() : 'TBD'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Request Type:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.requestType}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Next Steps -->
                <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #333; margin-top: 0;">Next Steps</h3>
                    <p style="margin: 0; color: #666;">${nextSteps}</p>
                </div>
                
                <!-- Attachments Info -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #333; margin-top: 0;">📎 Attachments</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li><strong>MIP Template:</strong> Detailed move-in process information and requirements</li>
                        <li><strong>Welcome Pack:</strong> Community guidelines, amenities information, and move-in checklist</li>
                    </ul>
                </div>
                
                <!-- Comments -->
                ${data.comments ? `
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #333; margin-top: 0;">Additional Information</h3>
                    <p style="margin: 0; color: #666;">${data.comments}</p>
                </div>
                ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 20px; padding: 15px; color: #999; font-size: 12px;">
                <p>This is an automated message from ONE Sobha App</p>
                <p>For support, please contact your community management team</p>
            </div>
        </div>`;
    }

    /**
     * Get status-specific message for email body
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
     * Generate email subject based on status
     */
    private getEmailSubject(status: string, requestNumber: string): string {
        switch (status.toLowerCase()) {
            case 'approved':
                return `🎉 Move-in Request Approved - ${requestNumber} | ONE Sobha App`;
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
