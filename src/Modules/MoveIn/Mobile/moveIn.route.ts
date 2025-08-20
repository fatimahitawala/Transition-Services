import express, { Router } from 'express';
import { MoveInController } from './moveIn.controller';
import { validate } from '../../../Common/Middlewares/validate';
import { catchAsync } from '../../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../../Common/Middlewares/AuthMiddleware';
import { MoveInvalidation } from './moveIn.validation';

const moveInController = new MoveInController();
const moveInValidation = new MoveInvalidation();
const auth = new AuthMiddleware();

const router = Router();

router.get('/request', auth.auth(), validate(moveInValidation.getMobileMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/request/:unitId', auth.auth(), validate(moveInValidation.getMobileMoveIn), catchAsync(moveInController.getAllMoveInRequestList));

export default router;
