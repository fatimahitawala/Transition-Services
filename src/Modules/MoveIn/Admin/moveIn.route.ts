import { Router } from "express";
import { MoveInController } from "./moveIn.controller";
import express from "express";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { MoveInvalidation } from "./moveIn.validation";

const moveInController = new MoveInController();
const moveInValidation = new MoveInvalidation();
const auth = new AuthMiddleware();

const router = Router();

router.get("/request", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/moveInDetails/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getAllMoveInDetailsList));

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

// Swagger documentation
/**
* @swagger
* tags:
*   - name: MoveOut
*     description: MoveOut management
*/

/**
* @swagger
* /admin/movein/moveInDetails/{requestId}:
*   get:
*     summary: Close a move in request
*     tags: [MoveOut]
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         description: The ID of the move out request
*    
*     responses:
*       200:
*         description: Move out request closed
*/

