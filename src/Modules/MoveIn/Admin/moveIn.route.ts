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
router.get("/request-list", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/request/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getMoveInRequestDetailsWithId));

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
router.put('/request/:requestId/approve', auth.auth(), validate(moveInValidation.approveRequest), catchAsync(moveInController.approveMoveInRequest));
router.put('/request/:requestId/rfi', auth.auth(), validate(moveInValidation.markRequestAsRFI), catchAsync(moveInController.markRequestAsRFI));
router.put('/request/:requestId/cancel', auth.auth(), validate(moveInValidation.cancelRequest), catchAsync(moveInController.cancelMoveInRequest));
router.put('/request/:requestId/close', auth.auth(), validate(moveInValidation.closeRequest), catchAsync(moveInController.closeMoveInRequest));
router.put('/owner/:requestId', auth.auth(), validate(moveInValidation.updateOwnerMoveIn), catchAsync(moveInController.updateOwnerMoveInRequest));
router.put('/tenant/:requestId', auth.auth(), validate(moveInValidation.updateTenantMoveIn), catchAsync(moveInController.updateTenantMoveInRequest));
router.put('/hho-unit/:requestId', auth.auth(), validate(moveInValidation.updateHhoOwnerMoveIn), catchAsync(moveInController.updateHhoOwnerMoveInRequest));
router.put('/hhc-company/:requestId', auth.auth(), validate(moveInValidation.updateHhcCompanyMoveIn), catchAsync(moveInController.updateHhcCompanyMoveInRequest));

// Move-In Process
router.post('/request/process', auth.auth(), validate(moveInValidation.moveInUnitAllocation), catchAsync(moveInController.moveInUnitAllocation));

/**
 * @swagger
 * /admin/move-in/request/process:
 *   post:
 *     summary: Process move-in unit allocation (Admin)
 *     description: Process move-in unit allocation by allocating units to users based on approved move-in requests. This endpoint handles user role management, unit status updates, and audit logging.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *             properties:
 *               requestId:
 *                 type: integer
 *                 description: ID of the approved move-in request to process
 *                 example: 123
 *           examples:
 *             example1:
 *               summary: Process move-in request
 *               value:
 *                 requestId: 123
 *     responses:
 *       200:
 *         description: Move-in unit allocation processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Move-in ticket processed successfully"
 *                 unitId:
 *                   type: integer
 *                   description: ID of the unit that was allocated
 *                   example: 456
 *                 unitNumber:
 *                   type: string
 *                   description: Unit number
 *                   example: "A-101"
 *                 occupancyStatus:
 *                   type: string
 *                   description: New occupancy status of the unit
 *                   example: "TENANT"
 *                 moveInRequestId:
 *                   type: integer
 *                   description: ID of the processed move-in request
 *                   example: 123
 *                 userId:
 *                   type: integer
 *                   description: ID of the user who was allocated to the unit
 *                   example: 789
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Move-in request not found"
 *                 code:
 *                   type: string
 *                   example: "MOVE_IN_REQUEST_NOT_FOUND"
 */
/**
 * @swagger
 * /admin/move-in/request/{requestId}/documents:
 *   post:
 *     summary: Upload documents for move-in request (Admin)
 *     description: Upload documents for a specific move-in request. Supports multiple document types including Emirates ID, Ejari, Unit Permit, Company Trade License, Title Deed, and other documents.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Move-in request ID
 *         example: 172
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               emirates-id-front:
 *                 type: string
 *                 format: binary
 *                 description: Emirates ID front side image/document
 *               emirates-id-back:
 *                 type: string
 *                 format: binary
 *                 description: Emirates ID back side image/document
 *               ejari:
 *                 type: string
 *                 format: binary
 *                 description: Ejari document
 *               unit-permit:
 *                 type: string
 *                 format: binary
 *                 description: Unit permit document (for HHO Owner and HHC Company requests)
 *               company-trade-license:
 *                 type: string
 *                 format: binary
 *                 description: Company trade license document (for HHC Company requests)
 *               title-deed:
 *                 type: string
 *                 format: binary
 *                 description: Title deed document (for Owner requests)
 *               other:
 *                 type: string
 *                 format: binary
 *                 description: Other supporting documents (max 4 files)
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 message:
 *                   type: string
 *                   example: "Documents uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadedDocuments:
 *                       type: array
 *                       description: List of successfully uploaded documents
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             description: Document type identifier
 *                             example: "emiratesIdFront"
 *                           documentType:
 *                             type: string
 *                             description: Document type from enum
 *                             example: "emirates-id-front"
 *                     requestId:
 *                       type: integer
 *                       description: Move-in request ID
 *                       example: 172
 *       400:
 *         description: Bad request - validation error or file upload error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: "EC001"
 *                 message:
 *                   type: string
 *                   example: "Unexpected field"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal server error
 */

// Status management routes

/**
 * @swagger
 * /admin/move-in/request/{requestId}/close:
 *   put:
 *     summary: Close move-in request (Security/Admin)
 *     description: Close a move-in request by security or admin. Only requests in Approved status can be closed. Actual move-in date is mandatory.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Move-in request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - closureRemarks
 *               - actualMoveInDate
 *             properties:
 *               closureRemarks:
 *                 type: string
 *                 description: Remarks for closing the request
 *                 example: "Move-in completed successfully"
 *               actualMoveInDate:
 *                 type: string
 *                 format: date
 *                 description: Actual move-in date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-01-25"
 *     responses:
 *       200:
 *         description: Move-in request closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Request closed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "closed"
 *       400:
 *         description: Bad Request - Invalid data or request not in approved status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Actual move-in date is mandatory when closing the request"
 *                 code:
 *                   type: string
 *                   example: "EC131"
 *       403:
 *         description: Forbidden - Only security or admin can close requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Only security or admin users can close move-in requests"
 *                 code:
 *                   type: string
 *                   example: "EC133"
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal Server Error
 */

// Update routes for different types of move-in requests (Admin)

/**
 * @swagger
 * /admin/move-in/owner/{requestId}:
 *   put:
 *     summary: Update owner move-in request (Admin)
 *     description: Admin endpoint to update an existing owner move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Move-in request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               status:
 *                 type: string
 *                 enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                 description: Request status
 *                 example: "approved"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Updated move-in request"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Updated information"
 *               details:
 *                 type: object
 *                 required:
 *                   - adults
 *                   - children
 *                   - householdStaffs
 *                   - pets
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     description: Number of adults (1-6)
 *                     example: 1
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of children (0-6)
 *                     example: 0
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                     description: Number of household staff (0-4)
 *                     example: 0
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of pets (0-6)
 *                     example: 0
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance"
 *     responses:
 *       200:
 *         description: Move-in request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 message:
 *                   type: string
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "approved"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /admin/move-in/tenant/{requestId}:
 *   put:
 *     summary: Update tenant move-in request (Admin)
 *     description: Admin endpoint to update an existing tenant move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Move-in request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - firstName
 *               - lastName
 *               - email
 *               - dialCode
 *               - phoneNumber
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               status:
 *                 type: string
 *                 enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                 description: Request status
 *                 example: "approved"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Updated move-in request"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Updated information"
 *               firstName:
 *                 type: string
 *                 description: First name of the tenant
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Last name of the tenant
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the tenant
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 description: Phone dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "501234567"
 *     responses:
 *       200:
 *         description: Move-in request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 message:
 *                   type: string
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "approved"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /admin/move-in/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO unit move-in request (Admin)
 *     description: Admin endpoint to update an existing HHO unit move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Move-in request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - ownerFirstName
 *               - ownerLastName
 *               - email
 *               - dialCode
 *               - phoneNumber
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               status:
 *                 type: string
 *                 enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                 description: Request status
 *                 example: "approved"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Updated move-in request"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Updated information"
 *               ownerFirstName:
 *                 type: string
 *                 description: First name of the HHO owner
 *                 example: "Jane"
 *               ownerLastName:
 *                 type: string
 *                 description: Last name of the HHO owner
 *                 example: "Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the HHO owner
 *                 example: "jane.smith@example.com"
 *               dialCode:
 *                 type: string
 *                 description: Phone dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "501234567"
 *     responses:
 *       200:
 *         description: Move-in request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 message:
 *                   type: string
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "approved"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /admin/move-in/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company move-in request (Admin)
 *     description: Admin endpoint to update an existing HHC company move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Move-in request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - name
 *               - company
 *               - email
 *               - dialCode
 *               - phoneNumber
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               status:
 *                 type: string
 *                 enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                 description: Request status
 *                 example: "approved"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Updated move-in request"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Updated information"
 *               name:
 *                 type: string
 *                 description: Name of the HHC company contact person
 *                 example: "John Doe"
 *               company:
 *                 type: string
 *                 description: Name of the HHC company
 *                 example: "ABC Company Ltd"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the HHC company contact
 *                 example: "contact@abccompany.com"
 *               dialCode:
 *                 type: string
 *                 description: Phone dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "501234567"
 *     responses:
 *       200:
 *         description: Move-in request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 message:
 *                   type: string
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "approved"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /admin/move-in/request-list:
 *   get:
 *     summary: Get all move-in requests (Admin)
 *     description: Get all move-in requests for admin users. Supports filtering by status, requestId, masterCommunity, community, tower, date ranges, search, unitNumber, requestType, and pagination. This endpoint replaces the old /admin/move-in/request endpoint.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: per_page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *         example: 20
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *         description: Filter by move-in request status
 *         example: "approved"
 *       - in: query
 *         name: requestId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by specific move-in request number (e.g., MIP-Garden Avenue 17-120)
 *         example: "MIP-Garden Avenue 17-120"
 *       - in: query
 *         name: masterCommunityIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of master community IDs to filter by
 *         example: "1,2,3"
 *       - in: query
 *         name: communityIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of community IDs to filter by
 *         example: "10,20,30"
 *       - in: query
 *         name: towerIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of tower IDs to filter by
 *         example: "100,200,300"
 *       - in: query
 *         name: createdStartDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date start (YYYY-MM-DD)
 *         example: "2025-01-01"
 *       - in: query
 *         name: createdEndDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date end (YYYY-MM-DD)
 *         example: "2025-12-31"
 *       - in: query
 *         name: moveInStartDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by move-in date start (YYYY-MM-DD)
 *         example: "2025-06-01"
 *       - in: query
 *         name: moveInEndDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by move-in date end (YYYY-MM-DD)
 *         example: "2025-12-31"
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search term for filtering requests
 *         example: "John Doe"
 *       - in: query
 *         name: unitNumber
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by unit number (partial match)
 *         example: "Garden Avenue 17"
 *       - in: query
 *         name: requestType
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["OWNER", "TENANT", "HHO_OWNER", "HHO_COMPANY"]
 *         description: Filter by move-in request type
 *         example: "OWNER"
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["id", "createdAt", "updatedAt", "moveInDate", "status", "masterCommunityId", "communityId", "towerId", "unitNumber", "createdBy", "updatedBy"]
 *           default: "createdAt"
 *         description: Field to sort by
 *         example: "createdAt"
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["ASC", "DESC"]
 *           default: "DESC"
 *         description: Sort order (ASC or DESC)
 *         example: "DESC"
 *     responses:
 *       200:
 *         description: List of all move-in requests. This endpoint replaces the old /admin/move-in/request endpoint with improved filtering capabilities.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Move-in request ID
 *                         example: 123
 *                       moveInRequestNo:
 *                         type: string
 *                         description: Move-in request number
 *                         example: "MIP-Garden Avenue 17-120"
 *                       requestType:
 *                         type: string
 *                         enum: ["OWNER", "TENANT", "HHO_OWNER", "HHO_COMPANY"]
 *                         description: Type of move-in request
 *                         example: "HHO_COMPANY"
 *                       status:
 *                         type: string
 *                         enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                         description: Current status of the move-in request
 *                         example: "new"
 *                       moveInDate:
 *                         type: string
 *                         format: date
 *                         description: Planned move-in date
 *                         example: "2025-09-20"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Request creation timestamp
 *                         example: "2025-09-15T09:57:57.164Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Request last update timestamp
 *                         example: "2025-09-15T09:58:44.000Z"
 *                       createdBy:
 *                         type: string
 *                         description: User ID who created the request
 *                         example: "40765"
 *                       updatedBy:
 *                         type: string
 *                         description: User ID who last updated the request
 *                         example: "40765"
 *                       unit:
 *                         type: object
 *                         description: Unit information
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: Unit ID
 *                             example: 7
 *                           unitNumber:
 *                             type: string
 *                             description: Unit number
 *                             example: "Garden Avenue 17"
 *                           floorNumber:
 *                             type: string
 *                             description: Floor number
 *                             example: "0"
 *                           unitName:
 *                             type: string
 *                             description: Unit name
 *                             example: "Garden Avenue 17"
 *                       masterCommunityId:
 *                         type: integer
 *                         description: Master community ID
 *                         example: 1
 *                       masterCommunityName:
 *                         type: string
 *                         description: Master community name
 *                         example: "Sobha Hartland"
 *                       communityId:
 *                         type: integer
 *                         description: Community ID
 *                         example: 2
 *                       communityName:
 *                         type: string
 *                         description: Community name
 *                         example: "Hartland Greens"
 *                       towerId:
 *                         type: integer
 *                         description: Tower ID
 *                         example: 3
 *                       towerName:
 *                         type: string
 *                         description: Tower name
 *                         example: "Tower A"
 *                 pagination:
 *                   type: object
 *                   description: Pagination information
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       description: Current page number
 *                       example: 1
 *                     perPage:
 *                       type: integer
 *                       description: Number of items per page
 *                       example: 20
 *                     totalItems:
 *                       type: integer
 *                       description: Total number of items
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *                       example: 3
 *                     hasNextPage:
 *                       type: boolean
 *                       description: Whether there is a next page
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       description: Whether there is a previous page
 *                       example: false
 *       400:
 *         description: Bad Request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid request parameters"
 *                 code:
 *                   type: string
 *                   example: "EC001"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized access"
 *                 code:
 *                   type: string
 *                   example: "EC002"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 code:
 *                   type: string
 *                   example: "EC500"
 */

/**
 * @swagger
 * /admin/move-in/request/{requestId}:
 *   get:
 *     summary: Get move-in request details by ID (Admin)
 *     description: Retrieves detailed information about a specific move-in request including all type-specific details, documents, and unit information
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Move-in request ID
 *         example: 120
 *     responses:
 *       200:
 *         description: Move-in request details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Operation completed successfully"
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Move-in request ID
 *                       example: 120
 *                     moveInRequestNo:
 *                       type: string
 *                       description: Move-in request number
 *                       example: "MIP-Garden Avenue 17-120"
 *                     requestType:
 *                       type: string
 *                       enum: ["OWNER", "TENANT", "HHO_OWNER", "HHO_COMPANY"]
 *                       description: Type of move-in request
 *                       example: "HHO_COMPANY"
 *                     status:
 *                       type: string
 *                       enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                       description: Current status of the request
 *                       example: "new"
 *                     moveInDate:
 *                       type: string
 *                       format: date
 *                       description: Requested move-in date
 *                       example: "2025-09-20"
 *                     comments:
 *                       type: string
 *                       nullable: true
 *                       description: Additional comments
 *                       example: "Owner moving in after renovation"
 *                     additionalInfo:
 *                       type: string
 *                       nullable: true
 *                       description: Additional information
 *                       example: "Renovation completed"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Creation timestamp
 *                       example: "2025-09-15T09:57:57.164Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last update timestamp
 *                       example: "2025-09-15T09:58:44.000Z"
 *                     createdBy:
 *                       type: string
 *                       description: User ID who created the request
 *                       example: "40765"
 *                     updatedBy:
 *                       type: string
 *                       description: User ID who last updated the request
 *                       example: "40765"
 *                     user:
 *                       type: object
 *                       description: User information
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 4
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         mobile:
 *                           type: string
 *                           example: "+971501234567"
 *                         alternativeEmail:
 *                           type: string
 *                           nullable: true
 *                           example: "john.alternative@example.com"
 *                         alternativeMobile:
 *                           type: string
 *                           nullable: true
 *                           example: "+971501234568"
 *                     unit:
 *                       type: object
 *                       description: Unit information with community hierarchy
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 123
 *                         unitNumber:
 *                           type: string
 *                           example: "Garden Avenue 17"
 *                         floorNumber:
 *                           type: string
 *                           example: "0"
 *                         unitName:
 *                           type: string
 *                           example: "T203"
 *                         masterCommunity:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Sobha Hartland"
 *                         community:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 2
 *                             name:
 *                               type: string
 *                               example: "Hartland Greens"
 *                         tower:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 3
 *                             name:
 *                               type: string
 *                               example: "Tower A"
 *                     moveInOwnerDetails:
 *                       type: object
 *                       description: Owner-specific details (if applicable)
 *                       example: {}
 *                     moveInTenantDetails:
 *                       type: object
 *                       description: Tenant-specific details (if applicable)
 *                       example: {}
 *                     moveInHHOOwnerDetails:
 *                       type: object
 *                       description: HHO Owner-specific details (if applicable)
 *                       example: {}
 *                     moveInCompanyDetails:
 *                       type: object
 *                       description: HHC Company-specific details (if applicable)
 *                       example: {}
 *                     documents:
 *                       type: array
 *                       description: List of uploaded documents
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           documentType:
 *                             type: string
 *                             example: "emiratesIdFront"
 *                           file:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               fileName:
 *                                 type: string
 *                                 example: "emirates_id_front.pdf"
 *                               fileUrl:
 *                                 type: string
 *                                 example: "https://storage.blob.core.windows.net/documents/emirates_id_front.pdf"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please authenticate"
 *                 code:
 *                   type: string
 *                   example: "EC005"
 *       404:
 *         description: Request not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Not Found"
 *                 code:
 *                   type: string
 *                   example: "EC404"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 *                 code:
 *                   type: string
 *                   example: "EC002"
 */

/**
 * @swagger
 * /admin/move-in/owner:
 *   post:
 *     summary: Create owner move-in request (Admin)
 *     description: Create a new move-in request for an owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be in the future and within 30 days from today.
 *     tags: [Admin MoveIn Management]
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
 *               - moveInDate
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated admin user's ID.
 *                 example: 456
 *               details:
 *                 type: object
 *                 required:
 *                   - adults
 *                   - children
 *                   - householdStaffs
 *                   - pets
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     description: Number of adults (1-6)
 *                     example: 1
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of children (0-6)
 *                     example: 0
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                     description: Number of household staff (0-4)
 *                     example: 0
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of pets (0-6)
 *                     example: 0
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
 *           examples:
 *             without_special_needs:
 *               summary: Owner move-in without special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-11-10"
 *                 userId: 456
 *                 details:
 *                   adults: 1
 *                   children: 0
 *                   householdStaffs: 0
 *                   pets: 0
 *                   peopleOfDetermination: false
 *                   detailsText: ""
 *             with_special_needs:
 *               summary: Owner move-in with special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-11-10"
 *                 userId: 456
 *                 details:
 *                   adults: 2
 *                   children: 1
 *                   householdStaffs: 1
 *                   pets: 1
 *                   peopleOfDetermination: true
 *                   detailsText: "Need wheelchair assistance for elderly or people of determination during move-in"
 *     responses:
 *       201:
 *         description: Move-in request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC012"
 *                 message:
 *                   type: string
 *                   example: "Created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "APPROVED"
 *                     requestType:
 *                       type: string
 *                       example: "OWNER"
 *                     moveInDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-09-17"
 *                     isAutoApproved:
 *                       type: boolean
 *                       example: true
 *                     moveInPermitUrl:
 *                       type: string
 *                       example: "move-in-permit-123.pdf"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "MoveInDate must be in ISO 8601 date format"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized access"
 *                 code:
 *                   type: string
 *                   example: "EC001"
 *       422:
 *         description: Validation error - move-in date must be at least 30 days in the future
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Move-in date must be at least 30 days in the future"
 *                 code:
 *                   type: string
 *                   example: "EC042"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "EC006"
 */

/**
 * @swagger
 * /admin/move-in/tenant:
 *   post:
 *     summary: Create tenant move-in request (Admin)
 *     description: Create a new move-in request for a tenant. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be in the future and within 30 days from today.
 *     tags: [Admin MoveIn Management]
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
 *               - moveInDate
 *               - firstName
 *               - lastName
 *               - email
 *               - dialCode
 *               - phoneNumber
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
 *               - tenancyContractStartDate
 *               - tenancyContractEndDate
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-12-20"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated admin user's ID.
 *                 example: 456
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Tenant's email address
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Phone number
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1985-1234567-8"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               tenancyContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract end date in ISO 8601 format (YYYY-MM-DD). Must be after tenancyContractStartDate.
 *                 example: "2026-08-31"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               comments:
 *                 type: string
 *                 nullable: true
 *                 description: Additional comments for the move-in request
 *                 example: "Need early access for furniture delivery"
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *                 description: Additional information
 *                 example: ""
 *               details:
 *                 type: object
 *                 required:
 *                   - adults
 *                   - children
 *                   - householdStaffs
 *                   - pets
 *                   - peopleOfDetermination
 *                   - termsAccepted
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     description: Number of adults (1-6)
 *                     example: 2
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of children (0-6)
 *                     example: 1
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                     description: Number of household staff (0-4)
 *                     example: 1
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of pets (0-6)
 *                     example: 1
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any occupants have special needs
 *                     example: true
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
 *           examples:
 *             without_special_needs:
 *               summary: Tenant move-in without special needs
 *               value:
 *                 unitId: 19
 *                 moveInDate: "2025-11-10"
 *                 status: "new"
 *                 userId: 641
 *                 firstName: "Yatin"
 *                 lastName: "Singhal"
 *                 email: "yatin.singhal@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "6396775234"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-2221-2221111-3"
 *                 emiratesIdExpiryDate: "2026-10-31"
 *                 tenancyContractStartDate: "2025-10-01"
 *                 tenancyContractEndDate: "2026-10-03"
 *                 comments: ""
 *                 additionalInfo: ""
 *                 details:
 *                   adults: 1
 *                   children: 0
 *                   householdStaffs: 0
 *                   pets: 0
 *                   peopleOfDetermination: false
 *                   termsAccepted: true
 *                   detailsText: ""
 *             with_special_needs:
 *               summary: Tenant move-in with special needs
 *               value:
 *                 unitId: 19
 *                 moveInDate: "2025-11-10"
 *                 status: "new"
 *                 userId: 641
 *                 firstName: "Yatin"
 *                 lastName: "Singhal"
 *                 email: "yatin.singhal@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "6396775234"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-2221-2221111-3"
 *                 emiratesIdExpiryDate: "2026-10-31"
 *                 tenancyContractStartDate: "2025-10-01"
 *                 tenancyContractEndDate: "2026-10-03"
 *                 comments: ""
 *                 additionalInfo: ""
 *                 details:
 *                   adults: 1
 *                   children: 0
 *                   householdStaffs: 0
 *                   pets: 0
 *                   peopleOfDetermination: true
 *                   termsAccepted: true
 *                   detailsText: "Need wheelchair assistance for elderly or people of determination during move-in"
 *     responses:
 *       201:
 *         description: Move-in request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC012"
 *                 message:
 *                   type: string
 *                   example: "Created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     status:
 *                       type: string
 *                       example: "APPROVED"
 *                     requestType:
 *                       type: string
 *                       example: "TENANT"
 *                     moveInDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-12-20"
 *                     isAutoApproved:
 *                       type: boolean
 *                       example: true
 *                     moveInPermitUrl:
 *                       type: string
 *                       example: "move-in-permit-123.pdf"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "MoveInDate must be in ISO 8601 date format"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized access"
 *                 code:
 *                   type: string
 *                   example: "EC001"
 *       422:
 *         description: Validation error - move-in date must be at least 30 days in the future
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Move-in date must be at least 30 days in the future"
 *                 code:
 *                   type: string
 *                   example: "EC042"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "EC006"
 */

/**
 * @swagger
 * /admin/move-in/hho-unit:
 *   post:
 *     summary: Create HHO Unit move-in request (Admin)
 *     description: Create a move-in request for an HHO Unit. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [Admin MoveIn Management]
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
 *               - moveInDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 7
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated admin user's ID.
 *                 example: 456
 *               ownerFirstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's first name (optional, defaults to admin user's name)
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's last name (optional, defaults to admin user's name)
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Owner's email (optional, defaults to admin user's email)
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Phone dial code (optional, defaults to admin user's dial code)
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Phone number (optional, defaults to admin user's phone)
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's nationality (optional, defaults to admin user's nationality)
 *                 example: "UAE"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: ""
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: ""
 *               details:
 *                 type: object
 *                 required:
 *                   - termsAccepted
 *                 properties:
 *                   unitPermitNumber:
 *                     type: string
 *                     description: Unit permit number (optional)
 *                     example: "121212121"
 *                   unitPermitStartDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit start date (optional)
 *                     example: "2025-10-31"
 *                   unitPermitExpiryDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit expiry date (optional)
 *                     example: "2025-11-26"
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: ""
 *           examples:
 *             basic_hho_unit:
 *               summary: Basic HHO unit move-in request
 *               value:
 *                 unitId: 4
 *                 moveInDate: "2025-11-10"
 *                 userId: 630
 *                 ownerFirstName: "Krishnan"
 *                 ownerLastName: "Kannan"
 *                 email: "aminda.w@techcarrot.ae"
 *                 dialCode: "+971"
 *                 phoneNumber: "509174069"
 *                 nationality: "UAE"
 *                 comments: ""
 *                 additionalInfo: ""
 *                 details:
 *                   unitPermitNumber: "121212121"
 *                   unitPermitStartDate: "2025-10-31"
 *                   unitPermitExpiryDate: "2025-11-26"
 *                   termsAccepted: true
 *             minimal_hho_unit:
 *               summary: Minimal HHO unit move-in request
 *               value:
 *                 unitId: 4
 *                 moveInDate: "2025-11-10"
 *                 userId: 630
 *                 details:
 *                   termsAccepted: true
 *     responses:
 *       201:
 *         description: HHO Unit move-in request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "HHO Unit move-in request created successfully"
 *                 code:
 *                   type: string
 *                   example: "SC001"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Created move-in request ID
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       description: Generated move-in request number
 *                       example: "MIP-UNIT-123-456"
 *                     requestType:
 *                       type: string
 *                       enum: ["HHO_OWNER"]
 *                       example: "HHO_OWNER"
 *                     status:
 *                       type: string
 *                       enum: ["new"]
 *                       example: "new"
 *                     moveInDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-09-17"
 *                     unitId:
 *                       type: integer
 *                       example: 7
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please authenticate"
 *                 code:
 *                   type: string
 *                   example: "EC005"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "EC006"
 */

/**
 * @swagger
 * /admin/move-in/hhc-company:
 *   post:
 *     summary: Create HHC Company move-in request (Admin)
 *     description: Create a move-in request on behalf of an HHC Company. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be in the future and within 30 days from today.
 *     tags: [Admin MoveIn Management]
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
 *               - moveInDate
 *               - userEmail
 *               - firstName
 *               - lastName
 *               - mobileNumber
 *               - name
 *               - company
 *               - companyEmail
 *               - operatorCountryCode
 *               - operatorOfficeNumber
 *               - tradeLicenseNumber
 *               - tradeLicenseExpiryDate
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
 *               - unitPermitStartDate
 *               - unitPermitExpiryDate
 *               - unitPermitNumber
 *               - leaseStartDate
 *               - leaseEndDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-20"
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated admin user's ID.
 *                 example: 456
 *               userEmail:
 *                 type: string
 *                 format: email
 *                 example: "essa.mohammed@gmail.com"
 *               firstName:
 *                 type: string
 *                 example: "Essa"
 *               middleName:
 *                 type: string
 *                 nullable: true
 *                 example: "Mohammed"
 *               lastName:
 *                 type: string
 *                 example: "Mohammed"
 *               mobileNumber:
 *                 type: string
 *                 example: "0555 0898XX"
 *               name:
 *                 type: string
 *                 example: "Essa"
 *               company:
 *                 type: string
 *                 example: "ABC Company"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 example: "abccompany@gmail.com"
 *               countryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code for mobile number
 *                 example: "+971"
 *               operatorCountryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code for operator office number
 *                 example: "+971"
 *               operatorOfficeNumber:
 *                 type: string
 *                 example: "+971 122345678"
 *               tradeLicenseNumber:
 *                 type: string
 *                 example: "12345678"
 *               tradeLicenseExpiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-31"
 *               nationality:
 *                 type: string
 *                 example: "United Arab Emirates"
 *               emiratesIdNumber:
 *                 type: string
 *                 example: "12345678"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2030-05-15"
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date (optional)
 *                 example: "2025-10-01"
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-30"
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-31"
 *               unitPermitNumber:
 *                 type: string
 *                 example: "1212"
 *               leaseStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-24"
 *               leaseEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-30"
 *               dtcmStartDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM start date (optional)
 *                 example: "2025-10-24"
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM expiry date (optional)
 *                 example: "2025-11-24"
 *               comments:
 *                 type: string
 *                 nullable: true
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *               details:
 *                 type: object
 *                 description: Ignored; termsAccepted is not required or stored
 *           examples:
 *             with_dtcm:
 *               summary: HHC company move-in with DTCM dates
 *               value:
 *                 unitId: 4
 *                 moveInDate: "2025-10-24"
 *                 userId: 630
 *                 userEmail: "aminda.w@techcarrot.ae"
 *                 firstName: "Krishnan"
 *                 middleName: ""
 *                 lastName: "Kannan"
 *                 mobileNumber: "+971509174069"
 *                 name: "12212"
 *                 company: "1212"
 *                 companyEmail: "aminda.w@techcarrot.ae"
 *                 countryCode: "+971"
 *                 operatorCountryCode: "+971"
 *                 operatorOfficeNumber: "1221212"
 *                 tradeLicenseNumber: "12212121"
 *                 tradeLicenseExpiryDate: "2025-10-31"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-3425560-6"
 *                 emiratesIdExpiryDate: "2025-10-30"
 *                 unitPermitStartDate: "2025-10-30"
 *                 unitPermitExpiryDate: "2025-10-31"
 *                 unitPermitNumber: "1212"
 *                 leaseStartDate: "2025-10-24"
 *                 leaseEndDate: "2025-10-30"
 *                 dtcmStartDate: "2025-10-24"
 *                 dtcmExpiryDate: "2025-11-24"
 *                 comments: ""
 *                 additionalInfo: ""
 *                 details:
 *                   termsAccepted: true
 *             without_dtcm:
 *               summary: HHC company move-in without DTCM dates (minimal)
 *               value:
 *                 unitId: 4
 *                 moveInDate: "2025-10-24"
 *                 userId: 630
 *                 userEmail: "aminda.w@techcarrot.ae"
 *                 firstName: "Krishnan"
 *                 middleName: ""
 *                 lastName: "Kannan"
 *                 mobileNumber: "+971509174069"
 *                 name: "12212"
 *                 company: "1212"
 *                 companyEmail: "aminda.w@techcarrot.ae"
 *                 countryCode: "+971"
 *                 operatorCountryCode: "+971"
 *                 operatorOfficeNumber: "1221212"
 *                 tradeLicenseNumber: "12212121"
 *                 tradeLicenseExpiryDate: "2025-10-31"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-3425560-6"
 *                 emiratesIdExpiryDate: "2025-10-30"
 *                 unitPermitStartDate: "2025-10-30"
 *                 unitPermitExpiryDate: "2025-10-31"
 *                 unitPermitNumber: "1212"
 *                 leaseStartDate: "2025-10-24"
 *                 leaseEndDate: "2025-10-30"
 *                 comments: ""
 *                 additionalInfo: ""
 *                 details:
 *                   termsAccepted: true
 *     responses:
 *       201:
 *         description: HHC Company move-in request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "SC012"
 *                 message:
 *                   type: string
 *                   example: "Created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/MoveInRequest'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - authentication required
 */

/**
 * @swagger
 * /admin/move-in/owner/{requestId}:
 *   put:
 *     summary: Update owner move-in request (Admin)
 *     description: Update an existing owner move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-20"
 *               status:
 *                 type: string
 *                 enum: ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed']
 *                 description: Status of the move-in request
 *                 example: "new"
 *               details:
 *                 type: object
 *                 required:
 *                   - adults
 *                   - children
 *                   - householdStaffs
 *                   - pets
 *                   - peopleOfDetermination
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     description: Number of adults
 *                     example: 2
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of children
 *                     example: 1
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                     description: Number of household staff
 *                     example: 0
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of pets
 *                     example: 1
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any household member is a person of determination
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Additional details text (required if peopleOfDetermination is true)
 *                     example: "Family with young children"
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Request can only be updated when status is 'new', 'rfi-pending', or 'rfi-submitted'"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 */

/**
 * @swagger
 * /admin/move-in/tenant/{requestId}:
 *   put:
 *     summary: Update tenant move-in request (Admin)
 *     description: Update an existing tenant move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - firstName
 *               - lastName
 *               - email
 *               - dialCode
 *               - phoneNumber
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
 *               - tenancyContractStartDate
 *               - tenancyContractEndDate
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-20"
 *               status:
 *                 type: string
 *                 enum: ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed']
 *                 description: Status of the move-in request
 *                 example: "new"
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Tenant's email address
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Phone number
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tenant's nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1985-1234567-8"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *               tenancyContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract end date in ISO 8601 format (YYYY-MM-DD). Must be after tenancyContractStartDate.
 *                 example: "2026-09-01"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Need early access for furniture delivery"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Ground floor unit preferred"
 *               details:
 *                 type: object
 *                 required:
 *                   - adults
 *                   - children
 *                   - householdStaffs
 *                   - pets
 *                   - peopleOfDetermination
 *                   - termsAccepted
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     description: Number of adults
 *                     example: 2
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of children
 *                     example: 1
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                     description: Number of household staff
 *                     example: 0
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     description: Number of pets
 *                     example: 1
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any household member is a person of determination
 *                     example: false
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *                   detailsText:
 *                     type: string
 *                     description: Additional details text (required if peopleOfDetermination is true)
 *                     example: "Family with young children"
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Request can only be updated when status is 'new', 'rfi-pending', or 'rfi-submitted'"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 */

/**
 * @swagger
 * /admin/move-in/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO unit move-in request (Admin)
 *     description: Update an existing HHO unit move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-20"
 *               status:
 *                 type: string
 *                 enum: ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed']
 *                 description: Status of the move-in request
 *                 example: "new"
 *               ownerFirstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's first name (optional)
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's last name (optional)
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Owner's email address (optional)
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code (optional)
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Phone number (optional)
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner's nationality (optional)
 *                 example: "UAE"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Need early access for furniture delivery"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: "Ground floor unit preferred"
 *               details:
 *                 type: object
 *                 required:
 *                   - unitPermitNumber
 *                   - unitPermitStartDate
 *                   - unitPermitExpiryDate
 *                   - termsAccepted
 *                 properties:
 *                   unitPermitNumber:
 *                     type: string
 *                     description: Unit permit number
 *                     example: "UP-2025-001"
 *                   unitPermitStartDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit start date in ISO 8601 format (YYYY-MM-DD)
 *                     example: "2025-09-01"
 *                   unitPermitExpiryDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit expiry date in ISO 8601 format (YYYY-MM-DD). Must be after unitPermitStartDate.
 *                     example: "2026-09-01"
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Request can only be updated when status is 'new', 'rfi-pending', or 'rfi-submitted'"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 */

/**
 * @swagger
 * /admin/move-in/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company move-in request (Admin)
 *     description: Update an existing HHC company move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [Admin MoveIn Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - moveInDate
 *               - status
 *               - userEmail
 *               - firstName
 *               - lastName
 *               - mobileNumber
 *               - name
 *               - company
 *               - companyEmail
 *               - operatorOfficeNumber
 *               - tradeLicenseNumber
 *               - tradeLicenseExpiryDate
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
 *               - unitPermitStartDate
 *               - unitPermitExpiryDate
 *               - unitPermitNumber
 *               - leaseStartDate
 *               - leaseEndDate
 *               - details
 *               - operatorCountryCode
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be in the future and within 30 days from today.
 *                 example: "2025-09-20"
 *               status:
 *                 type: string
 *                 enum: ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed']
 *                 description: Status of the move-in request
 *                 example: "new"
 *               userEmail:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: User's email address
 *                 example: "yatin.singhal@techcorp.com"
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's first name
 *                 example: "Yatin"
 *               middleName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's middle name (optional)
 *                 example: ""
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's last name
 *                 example: "Singhal"
 *               mobileNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Mobile number
 *                 example: "501234567"
 *               name:
 *                 type: string
 *                 description: Full name
 *                 example: "Yatin Singhal"
 *               company:
 *                 type: string
 *                 description: Company name
 *                 example: "TechCorp Solutions"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 description: Company email address
 *                 example: "info@techcorp.com"
 *               countryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code for mobile number
 *                 example: "+971"
 *               operatorCountryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code for operator office number
 *                 example: "+971"
 *               operatorOfficeNumber:
 *                 type: string
 *                 description: Operator office number
 *                 example: "501234567"
 *               tradeLicenseNumber:
 *                 type: string
 *                 description: Trade license number
 *                 example: "TL-2024-001234"
 *               tradeLicenseExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Trade license expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1985-1234567-8"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 nullable: true
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit expiry date in ISO 8601 format (YYYY-MM-DD). Must be after unitPermitStartDate.
 *                 example: "2026-09-01"
 *               unitPermitNumber:
 *                 type: string
 *                 description: Unit permit number
 *                 example: "UP-2025-001"
 *               leaseStartDate:
 *                 type: string
 *                 format: date
 *                 description: Lease start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *               leaseEndDate:
 *                 type: string
 *                 format: date
 *                 description: Lease end date in ISO 8601 format (YYYY-MM-DD). Must be after leaseStartDate.
 *                 example: "2026-09-01"
 *               dtcmStartDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 nullable: true
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM expiry date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2026-09-01"
 *                 nullable: true
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Need early access for company setup"
 *               additionalInfo:
 *                 type: string
 *                 description: Additional information
 *                 example: ""
 *               details:
 *                 type: object
 *                 required:
 *                   - termsAccepted
 *                 properties:
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Request can only be updated when status is 'new', 'rfi-pending', or 'rfi-submitted'"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 */

export default router;

