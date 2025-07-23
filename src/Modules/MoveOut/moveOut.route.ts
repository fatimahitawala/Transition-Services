import { Router } from 'express';
import { MoveOutController } from './moveOut.controller';

const router = Router();
const controller = new MoveOutController();

router.get('/health', (req, res) => controller.health(req, res));

export default router;
