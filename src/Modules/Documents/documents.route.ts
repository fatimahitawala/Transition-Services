import express from 'express';
import { DocumentsController } from './documents.controller';
import { DocumentsValidation } from './documents.validation';
import { validate } from '../../Common/Middlewares/validate';
import { catchAsync } from '../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';
import { welcomePackSingleUpload, templateSingleUpload } from '../../Common/Utils/upload';

const documentsController = new DocumentsController();
const documentsValidation = new DocumentsValidation();
const authMiddleware = new AuthMiddleware();

const router = express.Router();

router.get('/welcome-pack', authMiddleware.auth(), validate(documentsValidation.getWelcomePackList), catchAsync(documentsController.getWelcomePackList));
router.post('/welcome-pack', authMiddleware.auth(), welcomePackSingleUpload, validate(documentsValidation.createWelcomePack), catchAsync(documentsController.createWelcomePack));
router.get('/welcome-pack/:id/download', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.downloadWelcomePackFile));
router.get('/welcome-pack/:id', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.getWelcomePackById));
router.put('/welcome-pack/:id', authMiddleware.auth(), welcomePackSingleUpload, validate(documentsValidation.updateWelcomePack), catchAsync(documentsController.updateWelcomePack));

router.post('/welcome-kit/generate', authMiddleware.auth(), validate(documentsValidation.generateWelcomeKit), catchAsync(documentsController.generateWelcomeKitPDF));
router.post('/welcome-kit/template/:id/generate', authMiddleware.auth(), validate(documentsValidation.generateWelcomeKitFromTemplate), catchAsync(documentsController.generateWelcomeKitPDFFromTemplate));

router.get('/occupancytemplate/:templateType', authMiddleware.auth(), validate(documentsValidation.getTemplateList), catchAsync(documentsController.getTemplateList));
router.post('/occupancytemplate/:templateType', authMiddleware.auth(), templateSingleUpload, validate(documentsValidation.createTemplate), catchAsync(documentsController.createTemplate));
router.get('/occupancytemplate/:templateType/:id', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.getTemplateById));
router.get('/occupancytemplate/:templateType/:id/download', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.downloadTemplateFile));
router.put('/occupancytemplate/:templateType/:id', authMiddleware.auth(), templateSingleUpload, validate(documentsValidation.updateTemplate), catchAsync(documentsController.updateTemplate));
router.get('/occupancytemplate/:templateType/:id/history', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.getTemplateHistory));

// Email Recipients Routes (templateType: recipient-mail)
router.get('/email-recipients', authMiddleware.auth(), validate(documentsValidation.getEmailRecipientsList), catchAsync(documentsController.getEmailRecipientsList));
router.post('/email-recipients', authMiddleware.auth(), validate(documentsValidation.createEmailRecipients), catchAsync(documentsController.createEmailRecipients));
router.put('/email-recipients/:id', authMiddleware.auth(), validate(documentsValidation.updateEmailRecipients), catchAsync(documentsController.updateEmailRecipients));
router.get('/email-recipients/:id/history', authMiddleware.auth(), validate(documentsValidation.getEmailRecipientsById), catchAsync(documentsController.getEmailRecipientsHistory));

// Unified History Route - handles all template types (move-in, move-out, welcome-pack, recipient-mail)
router.get('/history/:templateType/:id', authMiddleware.auth(), validate(documentsValidation.getUnifiedHistory), catchAsync(documentsController.getUnifiedHistory));

/**
 * @swagger
 * /documents/welcome-pack/{id}:
 *   put:
 *     summary: Update welcome pack
 *     description: Update welcome pack status and optionally upload a new file. File upload is optional for updates.
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Welcome pack ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Active status of the welcome pack (optional)
 *               welcomePackFile:
 *                 type: string
 *                 format: binary
 *                 description: Welcome pack file (PDF or HTML) - optional for updates
 *             example:
 *               isActive: "false"
 *               welcomePackFile: "(optional file upload)"
 *     responses:
 *       200:
 *         description: Welcome pack updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Welcome pack updated successfully"
 *                 code:
 *                   type: string
 *                   example: "SC004"
 *                 data:
 *                   $ref: '#/components/schemas/WelcomePack'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */

// Welcome Kit PDF Generation Routes

/**
 * @swagger
 * /documents/welcome-kit/generate:
 *   post:
 *     summary: Generate Welcome Kit PDF with dynamic data
 *     description: Creates a professional Welcome Kit PDF document for new residents with customizable move-in timings and resident information
 *     tags: [Documents - Welcome Kit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WelcomeKitData'
 *           examples:
 *             basic:
 *               summary: Basic request with required fields only
 *               value:
 *                 residentName: "ADI NEGRU"
 *                 unitNumber: "1003"
 *                 buildingName: "Creek Vistas Grande"
 *             complete:
 *               summary: Complete request with all fields
 *               value:
 *                 residentName: "ADI NEGRU"
 *                 unitNumber: "1003"
 *                 buildingName: "Creek Vistas Grande"
 *                 communityName: "Creek Vistas Grande"
 *                 masterCommunityName: "Sobha Hartland"
 *                 dateOfIssue: "29-06-2025"
 *                 moveInDate: "05-07-2025"
 *                 referenceNumber: "WK-6844"
 *                 contactNumber: "800 SOBHA (76242)"
 *                 moveInTimingsWeekdays: "9:00 AM - 6:00 PM"
 *                 moveInTimingsSundays: "10:00 AM - 4:00 PM"
 *             customTimings:
 *               summary: Request with custom move-in timings
 *               value:
 *                 residentName: "JOHN DOE"
 *                 unitNumber: "2001"
 *                 buildingName: "Sunset Tower"
 *                 communityName: "Sobha Hartland"
 *                 moveInDate: "20-08-2025"
 *                 referenceNumber: "WK-2025-001"
 *                 moveInTimingsWeekdays: "8:00 AM - 7:00 PM"
 *                 moveInTimingsSundays: "9:00 AM - 5:00 PM"
 *     responses:
 *       200:
 *         description: Welcome Kit PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             description: PDF file containing the Welcome Kit document
 *         headers:
 *           Content-Disposition:
 *             description: Filename for download
 *             schema:
 *               type: string
 *               example: "attachment; filename=welcome-kit-WK-6844.pdf"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */

/**
 * @swagger
 * /documents/welcome-kit/template/{id}/generate:
 *   post:
 *     summary: Generate Welcome Kit PDF from existing template with dynamic data
 *     description: Creates a Welcome Kit PDF using an existing template and overrides with provided dynamic data. All fields are optional as they can be inherited from the template.
 *     tags: [Documents - Welcome Kit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Template ID from the welcome-pack system
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WelcomeKitTemplateData'
 *           examples:
 *             minimal:
 *               summary: Minimal request - use template defaults
 *               value: {}
 *             overrideData:
 *               summary: Override specific template data
 *               value:
 *                 residentName: "JANE SMITH"
 *                 unitNumber: "B205"
 *                 moveInDate: "25-08-2025"
 *                 referenceNumber: "WK-2025-002"
 *             completeOverride:
 *               summary: Complete override of template data
 *               value:
 *                 residentName: "JOHN DOE"
 *                 unitNumber: "2001"
 *                 buildingName: "Ocean View"
 *                 communityName: "Sobha Hartland"
 *                 masterCommunityName: "Sobha Hartland"
 *                 dateOfIssue: "15-08-2025"
 *                 moveInDate: "20-08-2025"
 *                 referenceNumber: "WK-2025-003"
 *                 contactNumber: "800 SOBHA (76242)"
 *                 moveInTimingsWeekdays: "8:00 AM - 7:00 PM"
 *                 moveInTimingsSundays: "9:00 AM - 5:00 PM"
 *     responses:
 *       200:
 *         description: Welcome Kit PDF generated successfully from template
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             description: PDF file containing the Welcome Kit document based on template and provided data
 *         headers:
 *           Content-Disposition:
 *             description: Filename for download
 *             schema:
 *               type: string
 *               example: "attachment; filename=welcome-kit-template-1.pdf"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */

// Template Routes (templateType: move-in, move-out) - All routes require authentication

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}:
 *   get:
 *     summary: Get list of templates (move-in and move-out only)
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template to filter by (move-in = Move In Permit, move-out = Move Out Permit) - Required
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: masterCommunityIds
 *         schema:
 *           type: string
 *         description: Comma-separated master community IDs for filtering
 *       - in: query
 *         name: communityIds
 *         schema:
 *           type: string
 *         description: Comma-separated community IDs for filtering
 *       - in: query
 *         name: towerIds
 *         schema:
 *           type: string
 *         description: Comma-separated tower IDs for filtering
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering by name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *       - in: query
 *         name: includeFile
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include template file content
 *     responses:
 *       200:
 *         description: List of templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       400:
 *         description: Bad request - Template type is required and must be either "move-in" or "move-out"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}:
 *   post:
 *     summary: Create a new template (move-in or move-out only)
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template (move-in = Move In Permit, move-out = Move Out Permit)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - masterCommunityId
 *               - communityId
 *               - templateFile
 *             properties:
 *               masterCommunityId:
 *                 type: integer
 *                 description: Master Community ID
 *               communityId:
 *                 type: integer
 *                 description: Community ID
 *               towerId:
 *                 type: integer
 *                 description: Tower ID (optional)
 *               isActive:
 *                 type: boolean
 *                 description: Whether the template is active
 *               templateFile:
 *                 type: string
 *                 format: binary
 *                 description: Template file (PDF or HTML, max 10MB)
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       400:
 *         description: Bad request - validation error or file type/size issue
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template (move-in = Move In Permit, move-out = Move Out Permit)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *       - in: query
 *         name: includeFile
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include template file content
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}/{id}/download:
 *   get:
 *     summary: Download template file
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template (move-in = Move In Permit, move-out = Move Out Permit)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template or file not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}/{id}:
 *   put:
 *     summary: Update template
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template (move-in = Move In Permit, move-out = Move Out Permit)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Whether the template is active
 *               templateFile:
 *                 type: string
 *                 format: binary
 *                 description: New template file (PDF or HTML, max 10MB)
 *     responses:
 *       200:
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       400:
 *         description: Bad request - validation error or file type/size issue
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/occupancytemplate/{templateType}/{id}/history:
 *   get:
 *     summary: Get template history - tracks all changes including who added/edited the template (move-in/move-out)
 *     tags: [Documents - Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out]
 *         description: Type of template (move-in = Move In Permit, move-out = Move Out Permit)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TemplateHistory'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */

// Email Recipients Routes
/**
 * @swagger
 * /documents/email-recipients:
 *   get:
 *     summary: Get list of email recipients with advanced filtering, search, and pagination. Supports filtering by master community, community, tower, active status, and date ranges.
 *     tags: [Documents - Email Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for master community, community, tower, or email addresses
 *       - in: query
 *         name: masterCommunityIds
 *         schema:
 *           type: string
 *         description: Filter by master community IDs (comma-separated)
 *       - in: query
 *         name: communityIds
 *         schema:
 *           type: string
 *         description: Filter by community IDs (comma-separated)
 *       - in: query
 *         name: towerIds
 *         schema:
 *           type: string
 *         description: Filter by tower IDs (comma-separated)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (ISO format)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, masterCommunityId, communityId, towerId, isActive, createdAt, updatedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order (ASC/DESC)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of email recipients with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmailRecipients'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     per_page:
 *                       type: integer
 *                     total_records:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/email-recipients:
 *   post:
 *     summary: Create a new email recipients configuration (only one active configuration allowed per unique combination of master community/community/tower)
 *     tags: [Documents - Email Recipients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - masterCommunityId
 *               - communityId
 *               - mipRecipients
 *               - mopRecipients
 *             properties:
 *               masterCommunityId:
 *                 type: integer
 *                 description: Master Community ID
 *                 example: 1
 *               communityId:
 *                 type: integer
 *                 description: Community ID
 *                 example: 5
 *               towerId:
 *                 type: integer
 *                 description: Tower ID (optional)
 *                 example: 10
 *               mipRecipients:
 *                 type: string
 *                 description: MIP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *                 example: "admin@community.com, manager@community.com, supervisor@community.com"
 *               mopRecipients:
 *                 type: string
 *                 description: MOP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *                 example: "admin@community.com, manager@community.com, supervisor@community.com"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the configuration is active
 *           example:
 *             masterCommunityId: 1
 *             communityId: 5
 *             towerId: 10
 *             mipRecipients: "admin@community.com, manager@community.com, supervisor@community.com"
 *             mopRecipients: "admin@community.com, manager@community.com, supervisor@community.com"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Email recipients configuration created successfully
 *       400:
 *         description: Bad request - validation error, email format error, or conflict with existing active configuration for the same master community/community/tower combination
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/email-recipients/{id}:
 *   put:
 *     summary: Update email recipients configuration (setting to active will deactivate other configurations for the same combination)
 *     tags: [Documents - Email Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email Recipients ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mipRecipients:
 *                 type: string
 *                 description: MIP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *                 example: "admin@community.com, manager@community.com, supervisor@community.com"
 *               mopRecipients:
 *                 type: string
 *                 description: MOP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *                 example: "admin@community.com, manager@community.com, supervisor@community.com"
 *               isActive:
 *                 type: boolean
 *                 description: Whether the configuration is active
 *           example:
 *             mipRecipients: "admin@community.com, manager@community.com, supervisor@community.com"
 *             mopRecipients: "admin@community.com, manager@community.com, supervisor@community.com"
 *             isActive: true
 *     responses:
 *       200:
 *         description: Email recipients configuration updated successfully
 *       400:
 *         description: Bad request - validation error or conflict
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Email recipients configuration not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/email-recipients/{id}/history:
 *   get:
 *     summary: Get email recipients configuration history - tracks all changes including who added/edited the configuration
 *     tags: [Documents - Email Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email Recipients ID
 *     responses:
 *       200:
 *         description: Email recipients history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmailRecipientsTemplateHistory'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Email recipients configuration not found
 *       500:
 *         description: Internal server error
 */





/**
 * @swagger
 * /documents/welcome-pack/{id}/download:
 *   get:
 *     summary: Download welcome pack file
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Welcome pack ID
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Welcome pack or file not found
 *       500:
 *         description: Internal server error
 */

export default router;

/**
 * @swagger
 * tags:
 *   - name: Documents - Welcome Pack
 *     description: Welcome Pack Management with complete history tracking
 *   - name: Documents - Templates
 *     description: Template Management (templateType move-in, move-out) with complete history tracking
 *   - name: Documents - Email Recipients
 *     description: Email Recipients Management (templateType recipient-mail) for Move-in and Move-out notifications with complete history tracking. Supports multiple comma-separated email addresses per community. Only one active configuration allowed per unique combination of master community/community/tower.
 *   - name: Documents - Unified History
 *     description: Unified history tracking for all template types (move-in, move-out, welcome-pack, recipient-mail)
 * 
 * @swagger
 * components:
 *   x-history-routes:
 *     description: >
 *       Complete History Tracking Available for All Document Types.
 *       - Welcome Pack History: GET /documents/welcome-pack/{id}/history - Track all welcome pack changes.
 *       - Template History (Move-in/Move-out): GET /documents/occupancytemplate/{templateType}/{id}/history - Track all template changes.
 *       - Email Recipients History: GET /documents/email-recipients/{id}/history - Track all email recipient changes.
 *       - Unified History: GET /documents/history/{templateType}/{id} - Track history for any template type (move-in, move-out, welcome-pack, recipient-mail).
 *       All history endpoints return comprehensive audit trails including who made changes, when, and what was changed.
 */

/**
 * @swagger
 * /documents/welcome-pack:
 *   get:
 *     summary: Get list of welcome packs with advanced filtering, search, and pagination
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for master community, community, or tower ID
 *       - in: query
 *         name: masterCommunityIds
 *         schema:
 *           type: string
 *         description: Filter by master community IDs (comma-separated)
 *       - in: query
 *         name: communityIds
 *         schema:
 *           type: string
 *         description: Filter by community IDs (comma-separated)
 *       - in: query
 *         name: towerIds
 *         schema:
 *           type: string
 *         description: Filter by tower IDs (comma-separated)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ['true', 'false', true, false]
 *         description: Filter by active status (true/false or "true"/"false"). If not specified, shows all records (both active and inactive)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (ISO format)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, masterCommunityId, communityId, towerId, isActive, createdAt, updatedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order (ASC/DESC)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: includeFile
 *         schema:
 *           type: string
 *           enum: ['true', 'false', true, false]
 *           default: 'false'
 *         description: Include file content in response (true/false or "true"/"false")
 *     responses:
 *       200:
 *         description: List of welcome packs with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WelcomePack'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     per_page:
 *                       type: integer
 *                     total_records:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/welcome-pack:
 *   post:
 *     summary: Create a new welcome pack
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - masterCommunityId
 *               - communityId
 *               - welcomePackFile
 *             properties:
 *               masterCommunityId:
 *                 type: integer
 *                 description: Master Community ID
 *               communityId:
 *                 type: integer
 *                 description: Community ID
 *               towerId:
 *                 type: integer
 *                 description: Tower ID (optional)
 *               welcomePackFile:
 *                 type: string
 *                 format: binary
 *                 description: Welcome pack file (PDF or HTML only)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Welcome pack created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/WelcomePack'
 *       400:
 *         description: Bad request - Invalid file type or missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/welcome-pack/{id}:
 *   get:
 *     summary: Get welcome pack by ID with file content
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Welcome pack ID
 *       - in: query
 *         name: includeFile
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include file content in response (true/false)
 *     responses:
 *       200:
 *         description: Welcome pack details with optional file content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/WelcomePack'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Welcome pack not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/welcome-pack/{id}:
 *   put:
 *     summary: Update welcome pack status and/or replace file
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Welcome pack ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Welcome pack status (true for active, false for inactive)
 *               welcomePackFile:
 *                 type: string
 *                 format: binary
 *                 description: Welcome pack file to replace (PDF or HTML only)
 *     responses:
 *       200:
 *         description: Welcome pack updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/WelcomePack'
 *       400:
 *         description: Bad request - Invalid file type
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Welcome pack not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/welcome-pack/{id}/history:
 *   get:
 *     summary: Get welcome pack history by ID - tracks all changes including who added/edited the welcome pack
 *     tags: [Documents - Welcome Pack]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Welcome pack ID
 *     responses:
 *       200:
 *         description: Welcome pack history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WelcomePackHistory'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Welcome pack not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /documents/history/{templateType}/{id}:
 *   get:
 *     summary: Get unified history for any template type
 *     description: Get history records for move-in, move-out, welcome-pack, or recipient-mail templates based on templateType parameter
 *     tags: [Documents - Unified History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [move-in, move-out, welcome-pack, recipient-mail]
 *         description: Type of template to get history for
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TemplateHistory'
 *       400:
 *         description: Bad request - Invalid template type
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WelcomePack:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         masterCommunityId:
 *           type: integer
 *         communityId:
 *           type: integer
 *         towerId:
 *           type: integer
 *           nullable: true
 *         templateString:
 *           type: string
 *           description: Base64 encoded file content (only included when includeFile=true)
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 *     Template:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         masterCommunity:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         community:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         tower:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         templateType:
 *           type: string
 *           enum: [move-in, move-out]
 *         templateString:
 *           type: string
 *           description: Base64 encoded file content (only included when includeFile=true)
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 *     TemplateHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         templateType:
 *           type: string
 *           enum: [move-in, move-out, recipient-mail, welcome-pack]
 *           description: Type of template history entry
 *         occupancyRequestTemplates:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             templateType:
 *               type: string
 *               enum: [move-in, move-out]
 *             isActive:
 *               type: boolean
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 *     EmailRecipients:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         masterCommunity:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         community:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         tower:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         mipRecipients:
 *           type: string
 *           description: MIP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *           example: "admin@community.com, manager@community.com, supervisor@community.com"
 *         mopRecipients:
 *           type: string
 *           description: MOP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *           example: "admin@community.com, manager@community.com, supervisor@community.com"
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 *     EmailRecipientsTemplateHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         templateType:
 *           type: string
 *           enum: [recipient-mail]
 *           description: Type of template history entry
 *         occupancyRequestEmailRecipients:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             masterCommunity:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *             community:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *             tower:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *         mipRecipients:
 *           type: string
 *           description: MIP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *           example: "admin@community.com, manager@community.com, supervisor@community.com"
 *         mopRecipients:
 *           type: string
 *           description: MOP Email Recipients - Multiple email addresses separated by commas (e.g., "user1@example.com, user2@example.com"). Each email must be in valid email format.
 *           example: "admin@community.com, manager@community.com, supervisor@community.com"
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 */