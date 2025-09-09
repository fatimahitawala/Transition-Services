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
router.get("/request-list", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/details/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getMoveInRequestDetailsWithId));

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

// Update routes for different types of move-in requests (Admin)
router.put('/owner/:requestId', auth.auth(), validate(moveInValidation.updateOwnerMoveIn), catchAsync(moveInController.updateOwnerMoveInRequest));
router.put('/tenant/:requestId', auth.auth(), validate(moveInValidation.updateTenantMoveIn), catchAsync(moveInController.updateTenantMoveInRequest));
router.put('/hho-unit/:requestId', auth.auth(), validate(moveInValidation.updateHhoOwnerMoveIn), catchAsync(moveInController.updateHhoOwnerMoveInRequest));
router.put('/hhc-company/:requestId', auth.auth(), validate(moveInValidation.updateHhcCompanyMoveIn), catchAsync(moveInController.updateHhcCompanyMoveInRequest));
/**
 * @swagger
 * /admin/move-in/owner:
 *   post:
 *     summary: Create owner move-in request (Admin)
 *     description: Create a new move-in request for an owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
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
 *                 unitId: 7
 *                 moveInDate: "2025-09-17"
 *                 details:
 *                   adults: 1
 *                   children: 0
 *                   householdStaffs: 0
 *                   pets: 0
 *                   peopleOfDetermination: false
 *             with_special_needs:
 *               summary: Owner move-in with special needs
 *               value:
 *                 unitId: 7
 *                 moveInDate: "2025-09-17"
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
 *                       example: "MIN-UNIT-123-456"
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
 *     description: Create a new move-in request for a tenant. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
 *                 example: "2025-12-20"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
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
 *                 unitId: 123
 *                 moveInDate: "2025-12-20"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1985-1234567-8"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 tenancyContractStartDate: "2025-09-01"
 *                 tenancyContractEndDate: "2026-08-31"
 *                 comments: "Need early access for furniture delivery"
 *                 additionalInfo: ""
 *                 details:
 *                   adults: 2
 *                   children: 1
 *                   householdStaffs: 0
 *                   pets: 1
 *                   peopleOfDetermination: false
 *                   termsAccepted: true
 *             with_special_needs:
 *               summary: Tenant move-in with special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-12-20"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1985-1234567-8"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 tenancyContractStartDate: "2025-09-01"
 *                 tenancyContractEndDate: "2026-08-31"
 *                 comments: "Need early access for furniture delivery"
 *                 additionalInfo: ""
 *                 details:
 *                   adults: 2
 *                   children: 1
 *                   householdStaffs: 1
 *                   pets: 1
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
 *                       example: "MIN-UNIT-123-456"
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
 * /admin/move-in/hhc-company:
 *   post:
 *     summary: Create HHC Company move-in request (Admin)
 *     description: Create a move-in request on behalf of an HHC Company. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
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
 *               - operatorOfficeNumber
 *               - tradeLicenseNumber
 *               - tradeLicenseExpiryDate
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
 *               - tenancyContractStartDate
 *               - unitPermitStartDate
 *               - unitPermitExpiryDate
 *               - unitPermitNumber
 *               - leaseStartDate
 *               - leaseEndDate
 *               - dtcmStartDate
 *               - dtcmExpiryDate
 *               - details
 *             properties:
 *               unitId:
 *                 type: integer
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-20"
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
 *                 example: "2025-09-01"
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-20"
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-20"
 *               unitPermitNumber:
 *                 type: string
 *                 example: "42388"
 *               leaseStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-20"
 *               leaseEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-20"
 *               dtcmStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-01"
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2027-12-31"
 *               comments:
 *                 type: string
 *                 nullable: true
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *               details:
 *                 type: object
 *                 description: Ignored; termsAccepted is not required or stored
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
 *                 example: "2025-09-20"
 *               status:
 *                 type: string
 *                 enum: ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed']
 *                 description: Status of the move-in request
 *                 example: "new"
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
 *                     description: Additional details text
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
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
 *               - countryCode
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for move-in
 *                 example: 123
 *               moveInDate:
 *                 type: string
 *                 format: date
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be at least 30 days in the future.
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
 *                 description: Country dial code
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

