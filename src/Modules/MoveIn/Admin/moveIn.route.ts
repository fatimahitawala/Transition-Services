import { Router } from "express";
import { MoveInController } from "./moveIn.controller";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { MoveInvalidation } from "./moveIn.validation";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

const moveInController = new MoveInController();
const moveInValidation = new MoveInvalidation();
const auth = new AuthMiddleware();

const router = Router();

// GET routes for admin move-in management
router.get("/request", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/details/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getAllMoveInDetailsList));

// POST routes for creating different types of move-in requests (Admin)
router.post('/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/hho-unit', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
router.post('/hhc-company', auth.auth(), validate(moveInValidation.createHhcCompanyMoveIn), catchAsync(moveInController.createHhcCompanyMoveInRequest));

// Document upload route for Admin
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

// Status management routes
router.put('/request/:requestId/approve', auth.auth(), validate(moveInValidation.approveRequest), catchAsync(moveInController.approveMoveInRequest));
router.put('/request/:requestId/rfi', auth.auth(), validate(moveInValidation.markRequestAsRFI), catchAsync(moveInController.markRequestAsRFI));
router.put('/request/:requestId/cancel', auth.auth(), validate(moveInValidation.cancelRequest), catchAsync(moveInController.cancelMoveInRequest));
router.put('/request/:requestId/close', auth.auth(), validate(moveInValidation.closeRequest), catchAsync(moveInController.closeMoveInRequest));

export default router;

