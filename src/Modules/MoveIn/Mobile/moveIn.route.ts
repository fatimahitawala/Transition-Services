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
// GET routes
router.get("/request-list", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));
router.get("/request/:unitId", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));

// POST routes for different move-in request types
router.post('/request/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/request/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/request/hho-unit', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
router.post('/request/hhc-company', auth.auth(), validate(moveInValidation.createHhcCompanyMoveIn), catchAsync(moveInController.createHhcCompanyMoveInRequest));


// PUT routes to edit existing move-in requests by type
router.put('/request/owner/:requestId', auth.auth(), validate(moveInValidation.updateOwnerMoveIn), catchAsync(moveInController.updateOwnerMoveInRequest));
router.put('/request/tenant/:requestId', auth.auth(), validate(moveInValidation.updateTenantMoveIn), catchAsync(moveInController.updateTenantMoveInRequest));
router.put('/request/hho-unit/:requestId', auth.auth(), validate(moveInValidation.updateHhoOwnerMoveIn), catchAsync(moveInController.updateHhoOwnerMoveInRequest));
router.put('/request/hhc-company/:requestId', auth.auth(), validate(moveInValidation.updateHhcCompanyMoveIn), catchAsync(moveInController.updateHhcCompanyMoveInRequest));


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

// Cancel move-in request route
router.put('/request/:requestId/cancel', auth.auth(), validate(moveInValidation.cancelMoveInRequest), catchAsync(moveInController.cancelMoveInRequest));

/**
 * @swagger
 * tags:
 *   - name: MoveIn
 *     description: Move-in request operations
 */

/**
 * @swagger
 * /move-in/request:
 *   get:
 *     summary: Get move-in requests for authenticated user
 *     tags: [MoveIn]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of move-in requests
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /move-in/request/owner:
 *   post:
 *     summary: Create owner move-in request (Mobile)
 *     description: Create a new move-in request for an owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [MoveIn]
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
 * /move-in/request/tenant:
 *   post:
 *     summary: Create tenant move-in request
 *     description: Create a new move-in request for a tenant. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [MoveIn]
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
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD) (optional)
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
 *                     default: 1
 *                     description: Number of adults (1-6)
 *                     example: 2
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     default: 0
 *                     description: Number of children (0-6)
 *                     example: 1
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
 *                     default: 0
 *                     description: Number of pets (0-6)
 *                     example: 1
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     description: Whether any occupants have special needs
 *                     example: false
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
 *       422:
 *         description: Validation error - move-in date must be at least 30 days in the future
 */

/**
 * @swagger
 * /move-in/request/hho-unit:
 *   post:
 *     summary: Create HHO unit move-in request
 *     description: Create a new move-in request for a holiday home unit owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [MoveIn]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unitId, moveInDate, details]
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
 *               comments:
 *                 type: string
 *                 nullable: true
 *                 description: Additional comments for the move-in request
 *                 example: "Need early access for renovation"
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *                 description: Additional information
 *                 example: ""
 *               ownerFirstName:
 *                 type: string
 *                 description: Owner first name (optional; derived from auth user if omitted)
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 description: Owner last name (optional; derived from auth user if omitted)
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Owner email (optional; derived from auth user if omitted)
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 description: Dial code (optional; derived from auth user if omitted)
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number (optional; derived from auth user if omitted)
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 description: Nationality (optional; derived from auth user if omitted)
 *                 example: "UAE"
 *               details:
 *                 type: object
 *                 required: [unitPermitNumber, unitPermitStartDate, unitPermitExpiryDate, termsAccepted]
 *                 properties:
 *                   unitPermitNumber:
 *                     type: string
 *                     description: Unit permit number as shown in the app screen
 *                     example: "42388"
 *                   unitPermitStartDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit start date in ISO 8601 format (YYYY-MM-DD)
 *                     example: "2027-08-27"
 *                   unitPermitExpiryDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit end/expiry date in ISO 8601 format (YYYY-MM-DD)
 *                     example: "2028-08-27"
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *     responses:
 *       201:
 *         description: Move-in request created successfully
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
 *       422:
 *         description: Validation error - move-in date must be at least 30 days in the future
 */

/**
 * @swagger
 * /move-in/request/owner/{requestId}:
 *   put:
 *     summary: Update owner move-in request
 *     description: Update an existing owner move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [MoveIn]
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
 */

/**
 * @swagger
 * /move-in/request/tenant/{requestId}:
 *   put:
 *     summary: Update tenant move-in request
 *     description: Update an existing tenant move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [MoveIn]
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
 *                 example: "2026-08-31"
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
 */

/**
 * @swagger
 * /move-in/request/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO unit move-in request
 *     description: Update an existing HHO unit move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [MoveIn]
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
 */




/**
 * @swagger
 * /move-in/request/hhc-company:
 *   post:
 *     summary: Create HHC company move-in request
 *     description: Create a new move-in request for a company. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [MoveIn]
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
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
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
 *                 nullable: true
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
 *                 description: User's mobile number
 *                 example: "501234567"
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Company representative's full name
 *                 example: "Yatin Singhal"
 *               company:
 *                 type: string
 *                 maxLength: 255
 *                 description: Company name
 *                 example: "TechCorp Solutions"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Company email address
 *                 example: "info@techcorp.com"
 *               operatorOfficeNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Office phone number
 *                 example: "501234567"
 *               tradeLicenseNumber:
 *                 type: string
 *                 maxLength: 100
 *                 description: Company trade license number
 *                 example: "TL-2024-001234"
 *               tradeLicenseExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Trade license expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 nullable: true
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit expiry date in ISO 8601 format (YYYY-MM-DD). Must be after unitPermitStartDate.
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               unitPermitNumber:
 *                 type: string
 *                 maxLength: 100
 *                 description: Unit permit number
 *                 example: "UP-2025-001"
 *               leaseStartDate:
 *                 type: string
 *                 format: date
 *                 description: Lease start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               leaseEndDate:
 *                 type: string
 *                 format: date
 *                 description: Lease end date in ISO 8601 format (YYYY-MM-DD). Must be after leaseStartDate.
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               dtcmStartDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM expiry date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 nullable: true
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Company representative's nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 maxLength: 100
 *                 description: Emirates ID number of company representative
 *                 example: "784-1985-1234567-8"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2026-12-31"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               comments:
 *                 type: string
 *                 nullable: true
 *                 description: Additional comments for the move-in request
 *                 example: "Need early access for company setup"
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *                 description: Additional information
 *                 example: ""
 *               details:
 *                 type: object
 *                 required: [termsAccepted]
 *                 properties:
 *                   termsAccepted:
 *                     type: boolean
 *                     enum: [true]
 *                     description: Must be true to accept terms and conditions
 *                     example: true
 *               countryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code
 *                 example: "+971"
 *     responses:
 *       201:
 *         description: Move-in request created successfully
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
 *       422:
 *         description: Validation error - move-in date must be at least 30 days in the future
 */

/**
 * @swagger
 * /move-in/request/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company move-in request
 *     description: Update an existing HHC company move-in request. Only requests with status 'new', 'rfi-pending', or 'rfi-submitted' can be updated.
 *     tags: [MoveIn]
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
 */

/**
 * @swagger
 * /move-in/request/{unitId}:
 *   get:
 *     summary: Get move-in requests for a specific unit
 *     tags: [MoveIn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of move-in requests for unit
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /move-in/request/{requestId}/documents:
 *   post:
 *     summary: Upload move-in documents
 *     tags: [MoveIn]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               emirates-id-front:
 *                 type: string
 *                 format: binary
 *               emirates-id-back:
 *                 type: string
 *                 format: binary
 *               ejari:
 *                 type: string
 *                 format: binary
 *               unit-permit:
 *                 type: string
 *                 format: binary
 *               company-trade-license:
 *                 type: string
 *                 format: binary
 *               title-deed:
 *                 type: string
 *                 format: binary
 *               other:
 *                 type: string
 *                 format: binary
 *           encoding:
 *             other:
 *               style: form
 *     responses:
 *       200:
 *         description: Documents uploaded
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /move-in/request/{requestId}/cancel:
 *   put:
 *     summary: Cancel move-in request (Mobile)
 *     description: Cancel an existing move-in request. Only requests in 'Submitted', 'RFI Submitted', or 'Approved' status can be cancelled. Cancellation remarks are mandatory.
 *     tags: [MoveIn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the move-in request to cancel
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationRemarks
 *             properties:
 *               cancellationRemarks:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Mandatory cancellation remarks explaining the reason for cancellation
 *                 example: "Change in plans, no longer need the unit"
 *     responses:
 *       200:
 *         description: Request cancelled successfully
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
 *                   example: "Updated successfully"
 *                 code:
 *                   type: string
 *                   example: "SC013"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIR-2025-001234"
 *                     status:
 *                       type: string
 *                       example: "user-cancelled"
 *                     message:
 *                       type: string
 *                       example: "Move-in request cancelled successfully"
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
 *                   example: "Only requests in 'Submitted', 'RFI Submitted', or 'Approved' status can be cancelled"
 *                 code:
 *                   type: string
 *                   example: "EC041"
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - request does not belong to current user
 *       404:
 *         description: Not found - move-in request not found
 */

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

/**
 * @swagger
 * /move-in/request/hhc-company:
 *   post:
 *     summary: Create HHC company move-in request
 *     description: Create a new move-in request for a company. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
 *     tags: [MoveIn]
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
 *                 example: "2025-12-20"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
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
 *                 description: User's mobile number
 *                 example: "501234567"
 *               name:
 *                 type: string
 *                 description: Full name of the person
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
 *               operatorOfficeNumber:
 *                 type: string
 *                 description: Office phone number
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
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 nullable: true
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's nationality
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
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 nullable: true
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit expiry date in ISO 8601 format (YYYY-MM-DD). Must be after unitPermitStartDate.
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               unitPermitNumber:
 *                 type: string
 *                 description: Unit permit number
 *                 example: "UP-2025-001"
 *               leaseStartDate:
 *                 type: string
 *                 format: date
 *                 description: Lease start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               leaseEndDate:
 *                 type: string
 *                 format: date
 *                 description: Lease end date in ISO 8601 format (YYYY-MM-DD). Must be after leaseStartDate.
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               dtcmStartDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM expiry date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                 example: "2026-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               comments:
 *                 type: string
 *                 nullable: true
 *                 description: Additional comments for the move-in request
 *                 example: "Need early access for company setup"
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
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
 *               countryCode:
 *                 type: string
 *                 description: Country dial code
 *                 example: "+971"
 *           examples:
 *             hhc_company_example:
 *               summary: HHC Company move-in request
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-09-20"
 *                 userEmail: "yatin.singhal@techcorp.com"
 *                 firstName: "Yatin"
 *                 middleName: ""
 *                 lastName: "Singhal"
 *                 mobileNumber: "501234567"
 *                 name: "Yatin Singhal"
 *                 company: "TechCorp Solutions"
 *                 companyEmail: "info@techcorp.com"
 *                 operatorOfficeNumber: "501234567"
 *                 tradeLicenseNumber: "TL-2024-001234"
 *                 tradeLicenseExpiryDate: "2026-12-31"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1985-1234567-8"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 unitPermitStartDate: "2025-09-01"
 *                 unitPermitExpiryDate: "2026-09-01"
 *                 unitPermitNumber: "UP-2025-001"
 *                 leaseStartDate: "2025-09-01"
 *                 leaseEndDate: "2026-09-01"
 *                 comments: "Need early access for company setup"
 *                 additionalInfo: ""
 *                 details:
 *                   termsAccepted: true
 *                 countryCode: "+971"
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
 *                       example: "HHC_COMPANY"
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


