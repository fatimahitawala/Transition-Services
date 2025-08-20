import { Router } from 'express';
import { MoveOutController } from '../moveOut.controller';
import { AuthMiddleware } from '../../../Common/Middlewares/AuthMiddleware';
import { catchAsync } from '../../../Common/Middlewares/catchAsync';
import { validate } from '../../../Common/Middlewares/validate';
import { MoveOutValidation } from '../moveOut.validation';

const router = Router();
const moveOutController = new MoveOutController();
const moveOutValidation = new MoveOutValidation();
const authMiddleware = new AuthMiddleware();

router.get('/moveOutList', authMiddleware.auth(), catchAsync(moveOutController.getMoveOutList));

router.put('/cancelMoveOutRequest/:requestId', authMiddleware.auth(), validate(moveOutValidation.cancelMoveOutRequestByUser), catchAsync(moveOutController.cancelMoveOutRequestByUser));

export default router;

//write swagger documentation
/**
 * @swagger
 * tags:
 *   name: MoveOut
 *   description: MoveOut management
 */

/**
 * @swagger
 * /move-out/moveOutList:
 *   get:
 *     summary: Get list of move out requests
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of move out requests
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /move-out/cancelMoveOutRequest/{requestId}:
 *   put:
 *     summary: Cancel a move out request
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request to cancel
 *     responses:
 *       200:
 *         description: Move out request canceled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */