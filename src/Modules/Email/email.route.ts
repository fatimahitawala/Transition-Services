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

// Note: Move-in emails are sent automatically during move-in operations
// These test endpoints are for development and debugging purposes only

/**
 * Test endpoint to send test move-in approval email with PDF generation
 * POST /api/v1/email/test-approval
 */
router.post(
    '/test-approval',
    authMiddleware.auth(),
    catchAsync(emailController.testMoveInApprovalEmail.bind(emailController))
);

/**
 * Test endpoint to verify environment configuration
 * GET /api/v1/email/check-config
 */
router.get(
    '/check-config',
    authMiddleware.auth(),
    catchAsync(emailController.checkEnvConfig.bind(emailController))
);

/**
 * Test endpoint to send basic test email
 * POST /api/v1/email/test
 */
router.post(
    '/test',
    authMiddleware.auth(),
    catchAsync(emailController.testEmail.bind(emailController))
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email notification services - Emails are sent automatically during move-in operations
 */
