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

router.get("/request", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList)); // Use the validation directly
router.get('/moveInDetails/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getAllMoveInDetailsList));

export default router;
