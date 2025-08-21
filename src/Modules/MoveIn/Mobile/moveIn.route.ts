import { Router } from "express";
import { MoveInController } from "./moveIn.controller";
import { MoveInvalidation } from "./moveIn.validation";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

const moveInController = new MoveInController();
const moveInValidation = new MoveInvalidation();
const auth = new AuthMiddleware();

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: MoveIn
 *     description: Move-in request operations
 */

// GET routes
router.get("/request", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));
router.get("/request/:unitId", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));

// POST routes for different move-in request types
router.post('/request/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/request/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/request/hho-owner', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
router.post('/request/hhc-company', auth.auth(), validate(moveInValidation.createHhcCompanyMoveIn), catchAsync(moveInController.createHhcCompanyMoveInRequest));

// Single comprehensive document upload route (following AmenityRegistration pattern)
router.post('/request/:requestId/documents', 
	auth.auth(), 
	validate(moveInValidation.uploadDocuments),
	fileUploads.fields([
		{ name: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.EJARI, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.TITLE_DEED, maxCount: 1 },
		{ name: TRANSITION_DOCUMENT_TYPES.OTHER, maxCount: 4 }
	]), 
	catchAsync(moveInController.uploadDocuments)
);

export default router;
