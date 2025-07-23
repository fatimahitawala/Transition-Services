import { Router } from 'express';
import { MoveInController } from './moveIn.controller';

const router = Router();
const controller = new MoveInController();

router.get('/health', (req, res) => controller.health(req, res));

export default router;
