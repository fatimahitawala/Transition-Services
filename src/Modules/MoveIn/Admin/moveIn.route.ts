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
router.get('/details/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getAllMoveInDetailsList));

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
*     summary: move in request
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
*         description: A list of move out requests
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
* /admin/movein/details/{requestId}:
*   get:
*     summary: move in Details request
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

