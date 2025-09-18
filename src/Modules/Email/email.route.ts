import express from 'express';
import { EmailController } from './email.controller';
import { EmailValidation } from '../Email/email.validation';
import { validate } from '../../Common/Middlewares/validate';
import { catchAsync } from '../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';

const emailController = new EmailController();
const emailValidation = new EmailValidation();
const authMiddleware = new AuthMiddleware();

const router = express.Router();

// Move-in email routes
router.post('/move-in/status', 
    authMiddleware.auth(), 
    validate(emailValidation.sendMoveInStatusEmail), 
    catchAsync(emailController.sendMoveInStatusEmail)
);

router.post('/move-in/approval', 
    authMiddleware.auth(), 
    validate(emailValidation.sendMoveInApprovalEmail), 
    catchAsync(emailController.sendMoveInApprovalEmail)
);

// Test email routes (for development/testing)
router.post('/test', 
    authMiddleware.auth(), 
    validate(emailValidation.testEmail), 
    catchAsync(emailController.testEmail)
);

router.post('/test/move-in-approval', 
    authMiddleware.auth(), 
    catchAsync(emailController.testMoveInApprovalEmail)
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email notification services
 */

/**
 * @swagger
 * /email/move-in/status:
 *   post:
 *     summary: Send move-in status change email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - requestNumber
 *               - status
 *               - userDetails
 *               - unitDetails
 *             properties:
 *               requestId:
 *                 type: number
 *               requestNumber:
 *                 type: string
 *               status:
 *                 type: string
 *               userDetails:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *               unitDetails:
 *                 type: object
 *                 properties:
 *                   unitNumber:
 *                     type: string
 *                   unitName:
 *                     type: string
 *                   masterCommunityId:
 *                     type: number
 *                   communityId:
 *                     type: number
 *                   towerId:
 *                     type: number
 *                   masterCommunityName:
 *                     type: string
 *                   communityName:
 *                     type: string
 *                   towerName:
 *                     type: string
 *               moveInDate:
 *                 type: string
 *                 format: date
 *               comments:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Email sent successfully
 *       "400":
 *         description: Bad request
 *       "500":
 *         description: Internal server error
 */

/**
 * @swagger
 * /email/move-in/approval:
 *   post:
 *     summary: Send move-in approval email with welcome pack attachment
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - requestNumber
 *               - status
 *               - userDetails
 *               - unitDetails
 *             properties:
 *               requestId:
 *                 type: number
 *               requestNumber:
 *                 type: string
 *               status:
 *                 type: string
 *               userDetails:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *               unitDetails:
 *                 type: object
 *                 properties:
 *                   unitNumber:
 *                     type: string
 *                   unitName:
 *                     type: string
 *                   masterCommunityId:
 *                     type: number
 *                   communityId:
 *                     type: number
 *                   towerId:
 *                     type: number
 *                   masterCommunityName:
 *                     type: string
 *                   communityName:
 *                     type: string
 *                   towerName:
 *                     type: string
 *               moveInDate:
 *                 type: string
 *                 format: date
 *               comments:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Approval email with welcome pack sent successfully
 *       "400":
 *         description: Bad request
 *       "500":
 *         description: Internal server error
 */

/**
 * @swagger
 * /email/test:
 *   post:
 *     summary: Send test email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Test email sent successfully
 *       "400":
 *         description: Bad request
 *       "500":
 *         description: Internal server error
 */
