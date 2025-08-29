import { Router } from "express";
import { MoveInController } from "./moveIn.controller";
import express from "express";
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
router.post('/create/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/create/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/create/hho-owner', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
router.post('/create/hhc-company', auth.auth(), validate(moveInValidation.createHhcCompanyMoveIn), catchAsync(moveInController.createHhcCompanyMoveInRequest));

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

export default router;

// Swagger documentation
/**
* @swagger
* tags:
*   name: Admin MoveIn Management
*   description: Admin MoveIn request management operations
*/

/**
* @swagger
* components:
*   schemas:
*     MoveInRequestResponse:
*       type: object
*       properties:
*         id:
*           type: integer
*           description: Unique identifier for the move-in request
*           example: 123
*         moveInRequestNo:
*           type: string
*           description: Generated move-in request number
*           example: "MIN-UNIT-123-1703123456789"
*         status:
*           type: string
*           description: Current status of the move-in request
*           example: "open"
*         requestType:
*           type: string
*           description: Type of move-in request
*           enum: [owner, tenant, hho-owner, hhc-company]
*           example: "owner"
*         moveInDate:
*           type: string
*           format: date
*           description: Scheduled move-in date
*           example: "2025-12-20"
*         unit:
*           type: object
*           description: Unit information
*           properties:
*             id:
*               type: integer
*               example: 456
*             unitName:
*               type: string
*               example: "Unit A"
*             unitNumber:
*               type: string
*               example: "A-101"
*         details:
*           type: object
*           description: Type-specific details for the move-in request
*     OwnerDetails:
*       type: object
*       description: Occupancy and property details for owner move-in requests (owner personal details are auto-populated from user profile)
*       properties:
*         adults:
*           type: integer
*           minimum: 1
*           maximum: 6
*           example: 2
*         children:
*           type: integer
*           minimum: 0
*           maximum: 6
*           example: 1
*         householdStaffs:
*           type: integer
*           minimum: 0
*           maximum: 4
*           example: 0
*         pets:
*           type: integer
*           minimum: 0
*           maximum: 6
*           example: 1
*         peopleOfDetermination:
*           type: boolean
*           example: false
*         comments:
*           type: string
*           nullable: true
*           example: "Need wheelchair assistance"
*     TenantDetails:
*       type: object
*       properties:
*         firstName:
*           type: string
*           example: "Essa"
*         lastName:
*           type: string
*           example: "Mohammed"
*         email:
*           type: string
*           example: "essamohammed@gmail.com"
*         dialCode:
*           type: string
*           example: "+971"
*         phoneNumber:
*           type: string
*           example: "0555 089XXX"
*         nationality:
*           type: string
*           example: "United Arab Emirates"
*         emiratesIdNumber:
*           type: string
*           example: "784-xxxx-xxxxxx-x"
*         emiratesIdExpiryDate:
*           type: string
*           format: date
*           example: "2026-12-31"
*         tenancyContractStartDate:
*           type: string
*           format: date
*           example: "2025-09-01"
*         tenancyContractEndDate:
*           type: string
*           format: date
*           example: "2026-08-31"
*         adults:
*           type: integer
*           example: 2
*         children:
*           type: integer
*           example: 1
*         householdStaffs:
*           type: integer
*           example: 0
*         pets:
*           type: integer
*           example: 1
*         peopleOfDetermination:
*           type: boolean
*           example: false
*     HhoOwnerDetails:
*       type: object
*       properties:
*         ownerFirstName:
*           type: string
*           description: Owner's first name (auto-populated from admin profile)
*           example: "Admin"
*         ownerLastName:
*           type: string
*           description: Owner's last name (auto-populated from admin profile)
*           example: "User"
*         email:
*           type: string
*           description: Owner's email (auto-populated from admin profile)
*           example: "admin@onesobha.com"
*         dialCode:
*           type: string
*           description: Country dial code (auto-populated from admin profile)
*           example: "+971"
*         phoneNumber:
*           type: string
*           description: Owner's phone number (auto-populated from admin profile)
*           example: "501234567"
*         nationality:
*           type: string
*           description: Owner's nationality (auto-populated from admin profile)
*           example: "UAE"
*         adults:
*           type: integer
*           description: Number of adults (1-6)
*           example: 2
*         children:
*           type: integer
*           description: Number of children (0-6)
*           example: 0
*         householdStaffs:
*           type: integer
*           description: Number of household staff (0-4)
*           example: 2
*         pets:
*           type: integer
*           description: Number of pets (0-6)
*           example: 0
*         peopleOfDetermination:
*           type: boolean
*           description: Whether any occupants have special needs
*           example: true
*         comments:
*           type: string
*           description: Additional comments for the move-in request
*           example: "Home health care setup required"
*     HhcCompanyDetails:
*       type: object
*       properties:
*         name:
*           type: string
*           example: "John Doe"
*         companyName:
*           type: string
*           example: "ABC Healthcare Ltd"
*         companyEmail:
*           type: string
*           example: "info@abchealthcare.com"
*         countryCode:
*           type: string
*           example: "+971"
*         operatorOfficeNumber:
*           type: string
*           example: "04-1234567"
*         tradeLicenseNumber:
*           type: string
*           example: "TL-123456"
*         unitPermitStartDate:
*           type: string
*           format: date
*           example: "2025-09-01"
*         unitPermitExpiryDate:
*           type: string
*           format: date
*           example: "2026-08-31"
*         unitPermitNumber:
*           type: string
*           example: "UP-789012"
*         leaseStartDate:
*           type: string
*           format: date
*           example: "2025-09-01"
*         leaseEndDate:
*           type: string
*           format: date
*           example: "2026-08-31"
*         nationality:
*           type: string
*           example: "United Arab Emirates"
*         emiratesIdNumber:
*           type: string
*           example: "12345678"
*         emiratesIdExpiryDate:
*           type: string
*           format: date
*           example: "2026-12-31"
*     DocumentUploadResponse:
*       type: object
*       properties:
*         success:
*           type: boolean
*           example: true
*         message:
*           type: string
*           example: "Documents uploaded successfully"
*         uploadedDocuments:
*           type: array
*           items:
*             type: object
*             properties:
*               type:
*                 type: string
*                 example: "emiratesIdFront"
*               document:
*                 type: object
*                 description: Document entity information
*         requestId:
*           type: integer
*           example: 123
*     ErrorResponse:
*       type: object
*       properties:
*         success:
*           type: boolean
*           example: false
*         message:
*           type: string
*           example: "Validation error"
*         code:
*           type: string
*           example: "VALIDATION_ERROR"
*         errors:
*           type: array
*           items:
*             type: object
*             properties:
*               field:
*                 type: string
*                 example: "moveInDate"
*               message:
*                 type: string
*                 example: "Move-in date must be at least 30 days in the future"
*/

/**
* @swagger
* /admin/move-in/request:
*   get:
*     summary: Get all move-in requests (Admin)
*     tags: [Admin MoveIn Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: query
*         name: page
*         schema:
*           type: integer
*           default: 1
*         description: Page number
*       - in: query
*         name: per_page
*         schema:
*           type: integer
*           default: 20
*         description: Items per page
*       - in: query
*         name: masterCommunityIds
*         schema:
*           type: string
*         description: Comma-separated master community IDs
*       - in: query
*         name: communityIds
*         schema:
*           type: string
*         description: Comma-separated community IDs
*       - in: query
*         name: towerIds
*         schema:
*           type: string
*         description: Comma-separated tower IDs
*       - in: query
*         name: createdStartDate
*         schema:
*           type: string
*           format: date
*         description: Start date for filtering by creation date
*       - in: query
*         name: createdEndDate
*         schema:
*           type: string
*           format: date
*         description: End date for filtering by creation date
*       - in: query
*         name: moveInStartDate
*         schema:
*           type: string
*           format: date
*         description: Start date for filtering by move-in date
*       - in: query
*         name: moveInEndDate
*         schema:
*           type: string
*           format: date
*         description: End date for filtering by move-in date
*     responses:
*       200:
*         description: List of move-in requests retrieved successfully
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
*                   example: "Move-in requests retrieved successfully"
*                 data:
*                   type: array
*                   items:
*                     type: object
*                     properties:
*                       status:
*                         type: string
*                         example: "open"
*                       createdAt:
*                         type: string
*                         format: date-time
*                         example: "2025-01-15T10:30:00Z"
*                       moveInDate:
*                         type: string
*                         format: date
*                         example: "2025-12-20"
*                       moveInRequestNo:
*                         type: string
*                         example: "MIN-UNIT-123-1703123456789"
*                       requestType:
*                         type: string
*                         example: "owner"
*                       unit:
*                         type: object
*                         properties:
*                           unitName:
*                             type: string
*                             example: "Unit A"
*                           unitNumber:
*                             type: string
*                             example: "A-101"
*                 pagination:
*                   type: object
*                   properties:
*                     currentPage:
*                       type: integer
*                       example: 1
*                     totalPages:
*                       type: integer
*                       example: 5
*                     totalItems:
*                       type: integer
*                       example: 100
*                     itemsPerPage:
*                       type: integer
*                       example: 20
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/create/owner:
*   post:
*     summary: Create owner move-in request (Admin)
*     description: Create a new move-in request for an owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future. Owner's personal details (name, email, phone, etc.) are automatically populated from the authenticated user's profile and do not need to be provided in the request.
*     tags: [Admin MoveIn Management]
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
*                 example: "Optional comment"
*               additionalInfo:
*                 type: string
*                 nullable: true
*                 description: Additional information
*                 example: ""
*               details:
*                 type: object
*                 required: [adults, children, householdStaffs, pets]
*                 description: Occupancy details for the move-in request (owner personal details are auto-populated from user profile)
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
*                     description: Additional details text
*                     example: "Need wheelchair assistance for elderly patient during move-in"
*     responses:
*       201:
*         description: Move-in request created successfully
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
*                   example: "Move-in request created successfully"
*                 data:
*                   $ref: '#/components/schemas/MoveInRequestResponse'
*       400:
*         description: Bad request - validation error
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       422:
*         description: Validation error - move-in date must be at least 30 days in the future
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/create/tenant:
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
*                 example: "Essa"
*               lastName:
*                 type: string
*                 maxLength: 100
*                 description: Tenant's last name
*                 example: "Mohammed"
*               email:
*                 type: string
*                 format: email
*                 maxLength: 255
*                 description: Tenant's email address
*                 example: "essamohammed@gmail.com"
*               dialCode:
*                 type: string
*                 maxLength: 10
*                 description: Country dial code
*                 example: "+971"
*               phoneNumber:
*                 type: string
*                 maxLength: 20
*                 description: Phone number
*                 example: "0555 089XXX"
*               nationality:
*                 type: string
*                 maxLength: 100
*                 description: Tenant's nationality
*                 example: "United Arab Emirates"
*               emiratesIdNumber:
*                 type: string
*                 description: Emirates ID number
*                 example: "784-xxxx-xxxxxx-x"
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
*                   termsAccepted:
*                     type: boolean
*                     enum: [true]
*                     description: Must be true to accept terms and conditions
*                     example: true
*     responses:
*       201:
*         description: Move-in request created successfully
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
*                   example: "Move-in request created successfully"
*                 data:
*                   $ref: '#/components/schemas/MoveInRequestResponse'
*       400:
*         description: Bad request - validation error
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       401:
*         description: Unauthorized - authentication required
*       422:
*         description: Validation error - move-in date must be at least 30 days in the future
*/

/**
* @swagger
* /admin/move-in/create/hho-owner:
*   post:
*     summary: Create HHO owner move-in request (Admin)
*     description: Create a new move-in request for a home health care owner. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future. Admin user details (name, email, phone, etc.) are automatically populated from the authenticated admin's profile.
*     tags: [Admin MoveIn Management]
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
*                 example: "Home health care setup required"
*               additionalInfo:
*                 type: string
*                 nullable: true
*                 description: Additional information
*                 example: ""
*               details:
*                 type: object
*                 required: [adults, children, householdStaffs, pets, peopleOfDetermination, termsAccepted]
*                 description: Occupancy details for the move-in request
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
*                     example: 0
*                   householdStaffs:
*                     type: integer
*                     minimum: 0
*                     maximum: 4
*                     description: Number of household staff (0-4)
*                     example: 2
*                   pets:
*                     type: integer
*                     minimum: 0
*                     maximum: 6
*                     description: Number of pets (0-6)
*                     example: 0
*                   peopleOfDetermination:
*                     type: boolean
*                     description: Whether any occupants have special needs or require assistance
*                     example: true
*                   termsAccepted:
*                     type: boolean
*                     enum: [true]
*                     description: Must be true to accept terms and conditions
*                     example: true
*     responses:
*       201:
*         description: Move-in request created successfully
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
*                   example: "Move-in request created successfully"
*                 data:
*                   $ref: '#/components/schemas/MoveInRequestResponse'
*       400:
*         description: Bad request - validation error
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       422:
*         description: Validation error - move-in date must be at least 30 days in the future
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/create/hhc-company:
*   post:
*     summary: Create HHC company move-in request (Admin)
*     description: Create a new move-in request for a company. All dates must be in ISO 8601 format (YYYY-MM-DD) and moveInDate must be at least 30 days in the future.
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
*               - name
*               - company
*               - companyEmail
*               - countryCode
*               - operatorOfficeNumber
*               - tradeLicenseNumber
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
*                 description: Company representative's name
*                 example: "John Doe"
*               company:
*                 type: string
*                 maxLength: 255
*                 description: Company name
*                 example: "ABC Healthcare Ltd"
*               companyEmail:
*                 type: string
*                 format: email
*                 maxLength: 255
*                 description: Company email address
*                 example: "info@abchealthcare.com"
*               countryCode:
*                 type: string
*                 maxLength: 10
*                 description: Country dial code
*                 example: "+971"
*               operatorOfficeNumber:
*                 type: string
*                 maxLength: 20
*                 description: Office phone number
*                 example: "04-1234567"
*               tradeLicenseNumber:
*                 type: string
*                 maxLength: 100
*                 description: Company trade license number
*                 example: "TL-123456"
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
*                 example: "AB-12345678"
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
*                 example: "United Arab Emirates"
*               emiratesIdNumber:
*                 type: string
*                 maxLength: 100
*                 description: Emirates ID number of company representative
*                 example: "12345678"
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
*                   example: "Move-in request created successfully"
*                 data:
*                   $ref: '#/components/schemas/MoveInRequestResponse'
*       400:
*         description: Bad request - validation error
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       422:
*         description: Validation error - move-in date must be at least 30 days in the future
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/request/{requestId}/documents:
*   post:
*     summary: Upload move-in documents (Admin)
*     description: Upload documents for a move-in request. Admin can upload documents for any move-in request.
*     tags: [Admin MoveIn Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the move-in request
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
*                 description: Emirates ID front image
*               emirates-id-back:
*                 type: string
*                 format: binary
*                 description: Emirates ID back image
*               ejari:
*                 type: string
*                 format: binary
*                 description: Ejari document
*               unit-permit:
*                 type: string
*                 format: binary
*                 description: Unit permit document
*               company-trade-license:
*                 type: string
*                 format: binary
*                 description: Company trade license
*               title-deed:
*                 type: string
*                 format: binary
*                 description: Title deed document
*               other:
*                 type: string
*                 format: binary
*                 description: Other supporting documents (max 4)
*     responses:
*       200:
*         description: Documents uploaded successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/DocumentUploadResponse'
*       400:
*         description: Bad request - validation error
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       404:
*         description: Move-in request not found
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/moveInDetails/{requestId}:
*   get:
*     summary: Get move-in request details (Admin)
*     description: Get detailed information about a specific move-in request including all related details.
*     tags: [Admin MoveIn Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the move-in request
*     responses:
*       200:
*         description: Move-in request details retrieved successfully
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
*                   example: "Move-in request details retrieved successfully"
*                 data:
*                   type: object
*                   properties:
*                     id:
*                       type: integer
*                       example: 123
*                     moveInRequestNo:
*                       type: string
*                       example: "MIN-UNIT-123-1703123456789"
*                     status:
*                       type: string
*                       example: "open"
*                     requestType:
*                       type: string
*                       example: "owner"
*                     moveInDate:
*                       type: string
*                       format: date
*                       example: "2025-12-20"
*                     comments:
*                       type: string
*                       nullable: true
*                       example: "Additional comments"
*                     createdAt:
*                       type: string
*                       format: date-time
*                       example: "2025-01-15T10:30:00Z"
*                     updatedAt:
*                       type: string
*                       format: date-time
*                       example: "2025-01-15T10:30:00Z"
*                     unit:
*                       type: object
*                       properties:
*                         id:
*                           type: integer
*                           example: 456
*                         unitName:
*                           type: string
*                           example: "Unit A"
*                         unitNumber:
*                           type: string
*                           example: "A-101"
*                     user:
*                       type: object
*                       properties:
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
*                     moveInOwnerDetails:
*                       $ref: '#/components/schemas/OwnerDetails'
*                     moveInTenantDetails:
*                       $ref: '#/components/schemas/TenantDetails'
*                     moveInHHOOwnerDetails:
*                       $ref: '#/components/schemas/HhoOwnerDetails'
*                     moveInCompanyDetails:
*                       $ref: '#/components/schemas/HhcCompanyDetails'
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       404:
*         description: Move-in request not found
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*       500:
*         description: Internal server error
*/

