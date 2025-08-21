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

router.get('/request-list', authMiddleware.auth(), catchAsync(moveOutController.getAllMoveOutListAdmin));
router.get('/request-details/:requestId', authMiddleware.auth(), validate(moveOutValidation.getMoveOutRequestById), catchAsync(moveOutController.getMoveOutRequestById));
// router.post('/createRequest', authMiddleware.auth(), catchAsync(moveOutController.createMoveOutRequest));
router.put('/update-status/:action/:requestId', authMiddleware.auth(), validate(moveOutValidation.adminApproveOrCancelRequest), catchAsync(moveOutController.adminApproveOrCancelRequest));
router.put('/close-request/:requestId', authMiddleware.auth(), validate(moveOutValidation.closeMoveOutRequestBySecurity), catchAsync(moveOutController.closeMoveOutRequestBySecurity));

export default router;

// Swagger documentation
/**
 * @swagger
 * tags:
 *   - name: MoveOut
 *     description: MoveOut management
 */

/**
 * @swagger
 * /admin/move-out/moveOutList:
 *   get:
 *     summary: Get all move out requests
 *     tags: [MoveOut]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *       - in: query
 *         name: moveOutType
 *         schema:
 *           type: string
 *       - in: query
 *         name: masterCommunity
 *         schema:
 *           type: string
 *       - in: query
 *         name: community
 *         schema:
 *           type: string
 *       - in: query
 *         name: tower
 *         schema:
 *           type: string
 *       - in: query
 *         name: unit
 *         schema:
 *           type: string
 *       - in: query
 *         name: createdDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: moveOutDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: requestStatus
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of move out requests
 */

/**
 * @swagger
 * /admin/move-out/createRequest:
 *   post:
 *     summary: Create a new move out request
 *     tags: [MoveOut]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moveOutDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Move out request created
 */

/**
 * @swagger
 * /admin/move-out/moveOutDetails/{requestId}:
 *   get:
 *     summary: Get move out request details
 *     tags: [MoveOut]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *     responses:
 *       200:
 *         description: Move out request details
 */

/**
 * @swagger
 * /admin/move-out/updateStatus/{action}/{requestId}:
 *   put:
 *     summary: Update move out request status
 *     tags: [MoveOut]
 *     parameters:
 *       - in: path
 *         name: action
 *         required: true
 *         description: The action to perform (approve or cancel)
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *     responses:
 *       200:
 *         description: Move out request status updated
 */

/**
 * @swagger
 * /admin/move-out/close-request/{requestId}:
 *   put:
 *     summary: Close a move out request
 *     tags: [MoveOut]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moveOutDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Move out request closed
 */
