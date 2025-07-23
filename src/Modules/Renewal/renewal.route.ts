import { Router } from 'express';
import { RenewalController } from './renewal.controller';

const router = Router();
const controller = new RenewalController();

router.get('/health', (req, res) => controller.health(req, res));

export default router;
