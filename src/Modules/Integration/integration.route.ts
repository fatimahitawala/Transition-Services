import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { validateIntegrationWebhookHealth } from './integration.validation';

const router = Router();
const controller = new IntegrationController();

// Health check endpoint
router.get('/webhook/health', validateIntegrationWebhookHealth, (req, res) => controller.health(req, res));


export default router;
