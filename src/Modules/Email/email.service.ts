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
            
            const msg: any = { from: config.email.from, to, subject, html: text };
            
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
            logger.error(error);
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
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            // Try to find welcome pack with exact match (including tower)
            let welcomePack = null;
            
            // 1. First try: Tower-specific welcome pack
            if (towerId) {
                welcomePack = await welcomePackRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: towerId,
                        isActive: true
                    },
                    relations: ['file']
                });
            }

            // 2. Fallback to community-level welcome pack if tower-specific not found
            if (!welcomePack) {
                welcomePack = await welcomePackRepository.findOne({
                    where: {
                        masterCommunityId,
                        communityId,
                        towerId: IsNull(),
                        isActive: true
                    },
                    relations: ['file']
                });
            }

            // 3. Fallback to master community level welcome pack
            if (!welcomePack) {
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

            if (welcomePack?.file) {
                // If file is stored in Azure Blob Storage, we need to download it
                const fileUrl = `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/application/${welcomePack.file.filePath}`;
                
                return {
                    filename: welcomePack.file.fileOriginalName || 'welcome-pack.pdf',
                    path: fileUrl, // nodemailer can handle URLs
                    contentType: welcomePack.file.fileType || 'application/pdf'
                };
            }

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
     * Get status-specific message
     */
    private getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            'approved': 'Congratulations! Your move-in request has been approved. You can proceed with your move-in as scheduled.',
            'rfi-pending': 'Your request requires additional information. Please review the comments and provide the requested details.',
            'cancelled': 'Your move-in request has been cancelled. Please contact support if you have questions.',
            'user-cancelled': 'You have successfully cancelled your move-in request.',
            'closed': 'Your move-in process has been completed. Welcome to your new home!',
            'rfi-submitted': 'Thank you for submitting the additional information. Your request is being reviewed.'
        };
        return messages[status] || 'Your move-in request status has been updated.';
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
     * Send move-in status change email (without attachment)
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

            // Replace placeholders with actual data
            logger.info(`Replacing template placeholders...`);
            const processedTemplate = this.replaceTemplatePlaceholders(emailTemplate, data);
            logger.info(`Template processed successfully (final length: ${processedTemplate.length} chars)`);

            // Generate subject based on status
            const subject = this.getEmailSubject(data.status, data.requestNumber);
            logger.info(`Email subject generated: ${subject}`);

            // Send email without attachments (with CC if provided)
            logger.info(`Calling sendEmail method...`);
            await this.sendEmail(
                data.userDetails.email,
                subject,
                processedTemplate,
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
                logger.info(`Using default approval email template`);
            } else {
                logger.info(`Using custom email template from database`);
            }

            // Replace placeholders with actual data
            const processedTemplate = this.replaceTemplatePlaceholders(emailTemplate, data);

            // Get welcome pack attachment
            const welcomePackAttachment = await this.getWelcomePackFile(
                data.unitDetails.masterCommunityId,
                data.unitDetails.communityId,
                data.unitDetails.towerId
            );

            const attachments: EmailAttachment[] = [];
            if (welcomePackAttachment) {
                attachments.push(welcomePackAttachment);
                logger.info(`Welcome pack attachment found and added`);
            } else {
                logger.warn(`No welcome pack found for community ${data.unitDetails.communityId}, tower ${data.unitDetails.towerId}`);
            }

            // Generate subject
            const subject = this.getEmailSubject('approved', data.requestNumber);

            // Send email with welcome pack attachment (with CC if provided)
            await this.sendEmail(
                data.userDetails.email,
                subject,
                processedTemplate,
                attachments,
                data.ccEmails || [] // CC emails if provided
            );

            logger.info(`Move-in approval email with welcome pack sent successfully for request ${data.requestNumber}`);
        } catch (error) {
            logger.error(`Failed to send move-in approval email for request ${data.requestNumber}:`, error);
            throw error;
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
