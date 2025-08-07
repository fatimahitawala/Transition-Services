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
        // Allow PDF, DOC, DOCX files for welcome packs
        if (file.mimetype.includes("application/pdf") || 
            file.mimetype.includes("application/msword") || 
            file.mimetype.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
            cb(null, true);
        } else {
            cb(new Error("Please upload only PDF, DOC, or DOCX files!"));
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
router.put('/welcome-pack/:id', authMiddleware.auth(), upload.single('welcomePackFile'), validate(documentsValidation.updateWelcomePack), catchAsync(documentsController.updateWelcomePack));

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
 *                 description: Welcome pack file (PDF, DOC, DOCX)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Welcome pack created successfully
 */

/**
 * @swagger
 * /documents/welcome-pack/{id}:
 *   get:
 *     summary: Get welcome pack by ID
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
 *         description: Welcome pack details
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
 *                 description: Welcome pack file to replace (PDF, DOC, DOCX)
 *     responses:
 *       200:
 *         description: Welcome pack updated successfully
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
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         templateString:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
