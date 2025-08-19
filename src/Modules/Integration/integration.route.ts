import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { validateIntegrationWebhookHealth } from './integration.validation';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';

const router = Router();
const controller = new IntegrationController();
const authMiddleware = new AuthMiddleware();

// Health check endpoint (no authentication required)
router.get('/webhook/health', validateIntegrationWebhookHealth, (req, res) => controller.health(req, res));

// Business logic routes (require authentication)
// Add your integration business logic routes here with authMiddleware.auth()
// Example:
// router.get('/data', authMiddleware.auth(), validate(validation.getIntegrationData), catchAsync(controller.getIntegrationData));

export default router;
