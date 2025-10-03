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
router.post('/create-request', authMiddleware.auth(), validate(moveOutValidation.createMoveOutRequestByAdmin), catchAsync(moveOutController.createMoveOutRequestByAdmin));
router.put('/update-status/:action/:requestId', authMiddleware.auth(), validate(moveOutValidation.adminApproveOrCancelRequest), catchAsync(moveOutController.adminApproveOrCancelRequest));
router.put('/close-request/:requestId', authMiddleware.auth(), validate(moveOutValidation.closeMoveOutRequestBySecurity), catchAsync(moveOutController.closeMoveOutRequestBySecurity));

// History and permit
router.get('/request-history/:requestId', authMiddleware.auth(), validate(moveOutValidation.getMoveOutRequestById), catchAsync(moveOutController.getMoveOutHistory));
router.get('/permit/:requestId', authMiddleware.auth(), validate(moveOutValidation.getMoveOutRequestById), catchAsync(moveOutController.getMoveOutPermit));

// Fetch occupant user details for selected unit (with move-in closed validation)
router.get('/user-details/:unitId', authMiddleware.auth(), validate(moveOutValidation.getUserDetailsByUnitParams), catchAsync(moveOutController.getMoveOutUserDetailsByUnit));

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
 * /admin/move-out/user-details/{unitId}:
 *   get:
 *     summary: Get occupant user details for a unit (Move-Out)
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit ID for which to fetch current occupant details
 *     responses:
 *       200:
 *         description: Occupant user details for the given unit
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/move-out/request-list:
 *   get:
 *     summary: Get all move out requests
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
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
 *         name: createdStartDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: createdEndDate
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
 *       - in: query
 *         name: moveOutRequestNo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of move out requests with counts
 */

/**
 * @swagger
 * /admin/move-out/create-request:
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
 *               - userId
 *               - moveOutDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: Unit ID for which to create the request
 *               userId:
 *                 type: integer
 *                 description: Requester user ID
 *               moveOutDate:
 *                 type: string
 *                 format: date
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Move out request created
 */

/**
 * @swagger
 * /admin/move-out/request-details/{requestId}:
 *   get:
 *     summary: Get move out request details
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Move out request details
 */

/**
 * @swagger
 * /admin/move-out/update-status/{action}/{requestId}:
 *   put:
 *     summary: Update move out request status
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: action
 *         required: true
 *         description: The action to perform (approve or cancel)
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moveOutDate:
 *                 type: string
 *                 format: date
 *                 description: Required when action is approve
 *               reason:
 *                 type: string
 *                 description: Optional; used when action is cancel
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
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: The ID of the move out request
 *         schema:
 *           type: integer
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
 *                 description: Closure remarks by security
 *     responses:
 *       200:
 *         description: Move out request closed
 */

/**
 * @swagger
 * /admin/move-out/request-history/{requestId}:
 *   get:
 *     summary: Get move out request history
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: History events
 */

/**
 * @swagger
 * /admin/move-out/permit/{requestId}:
 *   get:
 *     summary: Get move out permit details
 *     tags: [MoveOut]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permit details
 */
