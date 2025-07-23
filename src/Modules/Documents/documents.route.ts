import { Router } from 'express';
import { DocumentsController } from './documents.controller';

const router = Router();
const controller = new DocumentsController();

router.get('/health', (req, res) => controller.health(req, res));

export default router;
