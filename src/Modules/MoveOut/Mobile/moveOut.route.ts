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

router.get('/request-list', authMiddleware.auth(), catchAsync(moveOutController.getMoveOutList));
router.put('/cancel/:requestId', authMiddleware.auth(), validate(moveOutValidation.cancelMoveOutRequestByUser), catchAsync(moveOutController.cancelMoveOutRequestByUser));
router.post('/create-request', authMiddleware.auth(), validate(moveOutValidation.createMoveOutRequestByUser), catchAsync(moveOutController.createMoveOutRequestByUser));

//export the router
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
 * /move-out/request-list:
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
 * /move-out/cancel/{requestId}:
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

/**
 * @swagger
 * /move-out/create-request:
 *   post:
 *     summary: Create a new move out request
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveOutDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit to move out from
 *               moveOutDate:
 *                 type: string
 *                 format: date
 *                 description: Date of move out
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *     responses:
 *       201:
 *         description: Move out request created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */