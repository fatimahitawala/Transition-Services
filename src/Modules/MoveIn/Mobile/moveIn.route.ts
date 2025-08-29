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

// Swagger documentation
/**
* @swagger
* tags:
*   - name: MoveIn
*     description: MoveIn management
*/

/**
* @swagger
* /admin/move-in/request:
*   get:
*     summary: Close a move in request
*     tags: [MoveIn]
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
*         description: A list of move in requests
*/

/**
* @swagger
* /admin/movein/request/{unitId}:
*   get:
*     summary: get a move in request List
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


