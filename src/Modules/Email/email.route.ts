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
// No manual email routes needed - emails are triggered automatically

export default router;

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email notification services - Emails are sent automatically during move-in operations
 */
