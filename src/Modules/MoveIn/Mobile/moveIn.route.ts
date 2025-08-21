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
*     responses:
*       200:
*         description: Move in request 
*/

/**
* @swagger
* /admin/movein/request/{unitId}:
*   get:
*     summary: get a move in request List
*     tags: [MoveOut]
*     parameters:
*       - in: path
*         name: unitId
*         required: true
*         description: The ID of the move out request
*    
*     responses:
*       200:
*         description: Move out request closed
*/


