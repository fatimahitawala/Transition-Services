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
router.get("/request", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));
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
 *     summary: Create owner move-in request
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
 *               moveInDate:
 *                 type: string
 *                 format: date
 *               comments:
 *                 type: string
 *                 nullable: true
 *               additionalInfo:
 *                 type: string
 *                 nullable: true
 *               details:
 *                 type: object
 *                 required: [adults, children, householdStaffs, pets]
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 6
 *                     default: 1
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     default: 0
 *                   householdStaffs:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 4
 *                   pets:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                     default: 0
 *                   peopleOfDetermination:
 *                     type: boolean
 *                   detailsText:
 *                     type: string
 *           examples:
 *             sample:
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-08-01"
 *                 comments: "Optional comment"
 *                 additionalInfo: ""
 *                 details:
 *                   adults: 1
 *                   children: 0
 *                   householdStaffs: 0
 *                   pets: 0
 *                   peopleOfDetermination: false
 *                   detailsText: ""
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
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
 *             $ref: '#/components/schemas/OwnerMoveInPayload'
 *     responses:
 *       200:
 *         description: Updated successfully
 */

/**
 * @swagger
 * /move-in/request/tenant/{requestId}:
 *   put:
 *     summary: Update tenant move-in request
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
 *             $ref: '#/components/schemas/TenantMoveInPayload'
 *     responses:
 *       200:
 *         description: Updated successfully
 */

/**
 * @swagger
 * /move-in/request/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO unit move-in request
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
 *             $ref: '#/components/schemas/HhoUnitMoveInPayload'
 *     responses:
 *       200:
 *         description: Updated successfully
 */

/**
 * @swagger
 * /move-in/request/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company move-in request
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
 *             $ref: '#/components/schemas/HhcCompanyMoveInPayload'
 *     responses:
 *       200:
 *         description: Updated successfully
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
 *               - name
 *               - company
 *               - companyEmail
 *               - countryCode
 *               - operatorOfficeNumber
 *               - tradeLicenseNumber
 *               - tenancyContractStartDate
 *               - unitPermitStartDate
 *               - unitPermitExpiryDate
 *               - unitPermitNumber
 *               - leaseStartDate
 *               - leaseEndDate
 *               - nationality
 *               - emiratesIdNumber
 *               - emiratesIdExpiryDate
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
 *               countryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code
 *                 example: "+971"
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
 *               tenancyContractStartDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract start date in ISO 8601 format (YYYY-MM-DD)
 *                 example: "2025-09-01"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
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


