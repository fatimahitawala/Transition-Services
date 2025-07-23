import { Router } from 'express';
import { WebhookController } from './webhook.controller';

const router = Router();
const controller = new WebhookController();

router.get('/health', (req, res) => controller.health(req, res));

export default router;
