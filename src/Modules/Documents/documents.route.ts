import express from 'express';
import { DocumentsController } from './documents.controller';
import { DocumentsValidation } from './documents.validation';
import { validate } from '../../Common/Middlewares/validate';
import { catchAsync } from '../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';
import multer from 'multer';

const documentsController = new DocumentsController();
const documentsValidation = new DocumentsValidation();
const authMiddleware = new AuthMiddleware();

const router = express.Router();

// File upload configuration for welcome pack documents
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Allow PDF and HTML files for welcome packs
        if (file.mimetype.includes("application/pdf") || 
            file.mimetype.includes("text/html")) {
            cb(null, true);
        } else {
            cb(new Error("Please upload only PDF or HTML files!"));
        }
    }
});

// Health check
router.get('/health', (req, res) => documentsController.health(req, res));

/**
 * @swagger
 * /documents/health:
 *   get:
 *     summary: Health check for documents service
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Documents service is running"
 *               timestamp: "2025-08-07T10:30:00.000Z"
 */

// Welcome Pack Routes (Admin routes) - All routes require authentication
router.get('/welcome-pack', authMiddleware.auth(), validate(documentsValidation.getWelcomePackList), catchAsync(documentsController.getWelcomePackList));
router.post('/welcome-pack', authMiddleware.auth(), upload.single('welcomePackFile'), validate(documentsValidation.createWelcomePack), catchAsync(documentsController.createWelcomePack));
router.get('/welcome-pack/:id', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.getWelcomePackById));
router.get('/welcome-pack/:id/download', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.downloadWelcomePackFile));
router.put('/welcome-pack/:id', authMiddleware.auth(), upload.single('welcomePackFile'), validate(documentsValidation.updateWelcomePack), catchAsync(documentsController.updateWelcomePack));

/**
 * @swagger
 * /documents/welcome-pack/{id}/download:
 *   get:
 *     summary: Download welcome pack file
 *     tags: [Documents]
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
 *   name: Documents
 *   description: Welcome Pack Management
 */

/**
 * @swagger
 * /documents/welcome-pack:
 *   get:
 *     summary: Get list of welcome packs with advanced filtering, search, and pagination
 *     tags: [Documents]
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
 *           type: boolean
 *         description: Filter by active status (true/false). If not specified, shows all records (both active and inactive)
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
 *           type: boolean
 *           default: false
 *         description: Include file content in response (true/false)
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
 *     tags: [Documents]
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
 *     tags: [Documents]
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
 *     tags: [Documents]
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
 */
