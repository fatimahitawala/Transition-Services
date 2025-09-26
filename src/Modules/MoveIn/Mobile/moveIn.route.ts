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
// GET routes - unitId is optional query parameter
router.get("/request-list", auth.auth(), catchAsync(moveInController.getAllMoveInRequestList));
router.get("/request/:requestId", auth.auth(), catchAsync(moveInController.getMoveInRequestDetails));

// POST routes for different move-in request types
router.post('/request/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/request/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/request/hho-unit', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
router.post('/request/hhc-company', auth.auth(), validate(moveInValidation.createHhcCompanyMoveIn), catchAsync(moveInController.createHhcCompanyMoveInRequest));
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


// PUT routes to edit existing move-in requests by type

/**
 * @swagger
 * /move-in/request/owner/{requestId}:
 *   put:
 *     summary: Update owner move-in request (Mobile)
 *     description: Update an existing owner move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn]
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be within 30 days from current date.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being updated. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 * /move-in/request/tenant/{requestId}:
 *   put:
 *     summary: Update tenant move-in request (Mobile)
 *     description: Update an existing tenant move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn]
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be within 30 days from current date.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being updated. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 * /move-in/request/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO unit move-in request (Mobile)
 *     description: Update an existing HHO unit move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn]
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be within 30 days from current date.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being updated. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 * /move-in/request/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company move-in request (Mobile)
 *     description: Update an existing HHC company move-in request. All dates must be in ISO 8601 format (YYYY-MM-DD).
 *     tags: [MoveIn]
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
 *                 description: Move-in date in ISO 8601 format (YYYY-MM-DD). Must be within 30 days from current date.
 *                 example: "2025-09-17"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being updated. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 * tags:
 *   - name: MoveIn
 *     description: Move-in request operations for mobile users. Includes creating, viewing, and managing move-in requests for owners, tenants, HHO units, and HHO companies.
 */

/**
 * @swagger
 * /move-in/request-list:
 *   get:
 *     summary: Get move-in requests for authenticated user
 *     description: Get all move-in requests for the authenticated user. Supports filtering by status, unitIds, and pagination.
 *     tags: [MoveIn]
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
 *         example: "new"
 *       - in: query
 *         name: unitIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of unit IDs to filter by.
 *         example: "123,456,789"
 *       - in: query
 *         name: requestId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by specific move-in request ID.
 *         example: 123
 *     responses:
 *       200:
 *         description: List of move-in requests
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
 *                   example: "Listing success."
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
 *                         example: "MIP-UNIT-123-456"
 *                       status:
 *                         type: string
 *                         enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                         example: "approved"
 *                       requestType:
 *                         type: string
 *                         enum: ["OWNER", "TENANT", "HHO_UNIT", "HHC_COMPANY"]
 *                         example: "OWNER"
 *                       moveInDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-09-17"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       createdBy:
 *                         type: integer
 *                         description: User ID who created the request
 *                         example: 12345
 *                       updatedBy:
 *                         type: integer
 *                         description: User ID who last updated the request
 *                         example: 12345
 *                       unit:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: Unit ID
 *                             example: 7
 *                           unitNumber:
 *                             type: string
 *                             example: "A-101"
 *                           floorNumber:
 *                             type: string
 *                             example: "0"
 *                           unitName:
 *                             type: string
 *                             example: "T203"
 *                       masterCommunityId:
 *                         type: integer
 *                         example: 1
 *                       masterCommunityName:
 *                         type: string
 *                         example: "Sobha Hartland"
 *                       communityId:
 *                         type: integer
 *                         example: 2
 *                       communityName:
 *                         type: string
 *                         example: "Hartland Greens"
 *                       towerId:
 *                         type: integer
 *                         example: 3
 *                       towerName:
 *                         type: string
 *                         example: "Tower A"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     perPage:
 *                       type: integer
 *                       example: 20
 *                     totalItems:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /move-in/request/{requestId}:
 *   get:
 *     summary: Get move-in request details by ID (Mobile)
 *     description: Get detailed information about a specific move-in request including type-specific details and documents.
 *     tags: [MoveIn]
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
 *                       description: Move-in request ID
 *                       example: 123
 *                     moveInRequestNo:
 *                       type: string
 *                       example: "MIP-UNIT-123-456"
 *                     requestType:
 *                       type: string
 *                       enum: ["OWNER", "TENANT", "HHO_OWNER", "HHO_COMPANY"]
 *                       example: "OWNER"
 *                     status:
 *                       type: string
 *                       enum: ["new", "rfi-pending", "rfi-submitted", "approved", "user-cancelled", "cancelled", "closed"]
 *                       example: "approved"
 *                     moveInDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-09-17"
 *                     comments:
 *                       type: string
 *                       example: "Additional comments"
 *                     additionalInfo:
 *                       type: string
 *                       example: "Special requirements"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     unitId:
 *                       type: integer
 *                       example: 7
 *                     unitNumber:
 *                       type: string
 *                       example: "A-101"
 *                     floorNumber:
 *                       type: integer
 *                       example: 1
 *                     unitName:
 *                       type: string
 *                       example: "Apartment A-101"
 *                     masterCommunityId:
 *                       type: integer
 *                       example: 1
 *                     masterCommunityName:
 *                       type: string
 *                       example: "Sobha Hartland"
 *                     communityId:
 *                       type: integer
 *                       example: 2
 *                     communityName:
 *                       type: string
 *                       example: "Hartland Greens"
 *                     towerId:
 *                       type: integer
 *                       example: 3
 *                     towerName:
 *                       type: string
 *                       example: "Tower A"
 *                     userId:
 *                       type: integer
 *                       example: 40765
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     middleName:
 *                       type: string
 *                       example: "Michael"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     mobile:
 *                       type: string
 *                       example: "+971501234567"
 *                     moveInOwnerDetails:
 *                       type: object
 *                       description: Owner-specific details (always present, empty object if not applicable)
 *                       properties:
 *                         adults:
 *                           type: integer
 *                           example: 2
 *                         children:
 *                           type: integer
 *                           example: 1
 *                         householdStaffs:
 *                           type: integer
 *                           example: 0
 *                         pets:
 *                           type: integer
 *                           example: 1
 *                         peopleOfDetermination:
 *                           type: boolean
 *                           example: false
 *                         determination_text:
 *                           type: string
 *                           example: "Special assistance needed"
 *                         emergencyContactDialCode:
 *                           type: string
 *                           example: "+971"
 *                         emergencyContactNumber:
 *                           type: string
 *                           example: "501234567"
 *                         emiratesIdNumber:
 *                           type: string
 *                           example: "784-1985-1234567-8"
 *                         passportNumber:
 *                           type: string
 *                           example: "A1234567"
 *                         visaNumber:
 *                           type: string
 *                           example: "V1234567"
 *                         companyName:
 *                           type: string
 *                           example: "ABC Company"
 *                         tradeLicenseNumber:
 *                           type: string
 *                           example: "TL123456"
 *                         companyAddress:
 *                           type: string
 *                           example: "123 Business Street"
 *                         companyPhone:
 *                           type: string
 *                           example: "+97141234567"
 *                         companyEmail:
 *                           type: string
 *                           example: "info@abccompany.com"
 *                         powerOfAttorneyNumber:
 *                           type: string
 *                           example: "POA123456"
 *                         attorneyName:
 *                           type: string
 *                           example: "John Attorney"
 *                         attorneyPhone:
 *                           type: string
 *                           example: "+971501234567"
 *                         ejariNumber:
 *                           type: string
 *                           example: "EJ123456"
 *                         dtcmPermitNumber:
 *                           type: string
 *                           example: "DTCM123456"
 *                         emergencyContactName:
 *                           type: string
 *                           example: "Jane Emergency"
 *                         relationship:
 *                           type: string
 *                           example: "Spouse"
 *                         comments:
 *                           type: string
 *                           example: "Additional comments"
 *                         monthlyRent:
 *                           type: number
 *                           example: 5000.00
 *                         securityDeposit:
 *                           type: number
 *                           example: 10000.00
 *                         maintenanceFee:
 *                           type: number
 *                           example: 500.00
 *                         currency:
 *                           type: string
 *                           example: "AED"
 *                     moveInTenantDetails:
 *                       type: object
 *                       description: Tenant-specific details (always present, empty object if not applicable)
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
 *                         dialCode:
 *                           type: string
 *                           example: "+971"
 *                         phoneNumber:
 *                           type: string
 *                           example: "501234567"
 *                         nationality:
 *                           type: string
 *                           example: "UAE"
 *                         dateOfBirth:
 *                           type: string
 *                           format: date
 *                           example: "1990-01-01"
 *                         emergencyContactDialCode:
 *                           type: string
 *                           example: "+971"
 *                         emergencyContactNumber:
 *                           type: string
 *                           example: "501234567"
 *                         adults:
 *                           type: integer
 *                           example: 2
 *                         children:
 *                           type: integer
 *                           example: 1
 *                         householdStaffs:
 *                           type: integer
 *                           example: 0
 *                         pets:
 *                           type: integer
 *                           example: 1
 *                         peopleOfDetermination:
 *                           type: boolean
 *                           example: false
 *                         emiratesIdNumber:
 *                           type: string
 *                           example: "784-1985-1234567-8"
 *                         emiratesIdExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-12-31"
 *                         tenancyContractStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         tenancyContractEndDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-08-31"
 *                         passportNumber:
 *                           type: string
 *                           example: "A1234567"
 *                         visaNumber:
 *                           type: string
 *                           example: "V1234567"
 *                         powerOfAttorneyNumber:
 *                           type: string
 *                           example: "POA123456"
 *                         attorneyName:
 *                           type: string
 *                           example: "John Attorney"
 *                         attorneyPhone:
 *                           type: string
 *                           example: "+971501234567"
 *                         ejariNumber:
 *                           type: string
 *                           example: "EJ123456"
 *                         dtcmPermitNumber:
 *                           type: string
 *                           example: "DTCM123456"
 *                         emergencyContactName:
 *                           type: string
 *                           example: "Jane Emergency"
 *                         relationship:
 *                           type: string
 *                           example: "Spouse"
 *                         comments:
 *                           type: string
 *                           example: "Additional comments"
 *                         determination_text:
 *                           type: string
 *                           example: "Special assistance needed"
 *                         monthlyRent:
 *                           type: number
 *                           example: 5000.00
 *                         securityDeposit:
 *                           type: number
 *                           example: 10000.00
 *                         maintenanceFee:
 *                           type: number
 *                           example: 500.00
 *                         currency:
 *                           type: string
 *                           example: "AED"
 *                     moveInHHOOwnerDetails:
 *                       type: object
 *                       description: HHO Owner-specific details (always present, empty object if not applicable)
 *                       properties:
 *                         ownerFirstName:
 *                           type: string
 *                           example: "John"
 *                         ownerLastName:
 *                           type: string
 *                           example: "Doe"
 *                         attorneyFirstName:
 *                           type: string
 *                           example: "Jane"
 *                         attorneyLastName:
 *                           type: string
 *                           example: "Attorney"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         dialCode:
 *                           type: string
 *                           example: "+971"
 *                         phoneNumber:
 *                           type: string
 *                           example: "501234567"
 *                         nationality:
 *                           type: string
 *                           example: "UAE"
 *                         dateOfBirth:
 *                           type: string
 *                           format: date
 *                           example: "1990-01-01"
 *                         emergencyContactDialCode:
 *                           type: string
 *                           example: "+971"
 *                         emergencyContactNumber:
 *                           type: string
 *                           example: "501234567"
 *                         adults:
 *                           type: integer
 *                           example: 2
 *                         children:
 *                           type: integer
 *                           example: 1
 *                         householdStaffs:
 *                           type: integer
 *                           example: 0
 *                         pets:
 *                           type: integer
 *                           example: 1
 *                         peopleOfDetermination:
 *                           type: boolean
 *                           example: false
 *                         emiratesIdNumber:
 *                           type: string
 *                           example: "784-1985-1234567-8"
 *                         passportNumber:
 *                           type: string
 *                           example: "A1234567"
 *                         visaNumber:
 *                           type: string
 *                           example: "V1234567"
 *                         powerOfAttorneyNumber:
 *                           type: string
 *                           example: "POA123456"
 *                         attorneyName:
 *                           type: string
 *                           example: "John Attorney"
 *                         attorneyPhone:
 *                           type: string
 *                           example: "+971501234567"
 *                         ejariNumber:
 *                           type: string
 *                           example: "EJ123456"
 *                         dtcmPermitNumber:
 *                           type: string
 *                           example: "DTCM123456"
 *                         unitPermitNumber:
 *                           type: string
 *                           example: "UP123456"
 *                         unitPermitStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         unitPermitExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-08-31"
 *                         emergencyContactName:
 *                           type: string
 *                           example: "Jane Emergency"
 *                         relationship:
 *                           type: string
 *                           example: "Spouse"
 *                         comments:
 *                           type: string
 *                           example: "Additional comments"
 *                         determination_text:
 *                           type: string
 *                           example: "Special assistance needed"
 *                         monthlyRent:
 *                           type: number
 *                           example: 5000.00
 *                         securityDeposit:
 *                           type: number
 *                           example: 10000.00
 *                         maintenanceFee:
 *                           type: number
 *                           example: 500.00
 *                         currency:
 *                           type: string
 *                           example: "AED"
 *                     moveInCompanyDetails:
 *                       type: object
 *                       description: HHC Company-specific details (always present, empty object if not applicable)
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         companyName:
 *                           type: string
 *                           example: "ABC Company"
 *                         companyEmail:
 *                           type: string
 *                           example: "info@abccompany.com"
 *                         countryCode:
 *                           type: string
 *                           example: "+971"
 *                         operatorCountryCode:
 *                           type: string
 *                           example: "+971"
 *                         operatorOfficeNumber:
 *                           type: string
 *                           example: "501234567"
 *                         tradeLicenseNumber:
 *                           type: string
 *                           example: "TL123456"
 *                         tradeLicenseExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-12-31"
 *                         tenancyContractStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         unitPermitStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         unitPermitExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-08-31"
 *                         unitPermitNumber:
 *                           type: string
 *                           example: "UP123456"
 *                         leaseStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         leaseEndDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-08-31"
 *                         dtcmStartDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-09-01"
 *                         dtcmExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-08-31"
 *                         nationality:
 *                           type: string
 *                           example: "UAE"
 *                         emiratesIdNumber:
 *                           type: string
 *                           example: "784-1985-1234567-8"
 *                         emiratesIdExpiryDate:
 *                           type: string
 *                           format: date
 *                           example: "2026-12-31"
 *                         peopleOfDetermination:
 *                           type: boolean
 *                           example: false
 *                         companyAddress:
 *                           type: string
 *                           example: "123 Business Street"
 *                         companyPhone:
 *                           type: string
 *                           example: "+97141234567"
 *                         powerOfAttorneyNumber:
 *                           type: string
 *                           example: "POA123456"
 *                         attorneyName:
 *                           type: string
 *                           example: "John Attorney"
 *                         attorneyPhone:
 *                           type: string
 *                           example: "+971501234567"
 *                         ejariNumber:
 *                           type: string
 *                           example: "EJ123456"
 *                         dtcmPermitNumber:
 *                           type: string
 *                           example: "DTCM123456"
 *                         emergencyContactName:
 *                           type: string
 *                           example: "Jane Emergency"
 *                         relationship:
 *                           type: string
 *                           example: "Spouse"
 *                         comments:
 *                           type: string
 *                           example: "Additional comments"
 *                         determination_text:
 *                           type: string
 *                           example: "Special assistance needed"
 *                         monthlyRent:
 *                           type: number
 *                           example: 5000.00
 *                         securityDeposit:
 *                           type: number
 *                           example: 10000.00
 *                         maintenanceFee:
 *                           type: number
 *                           example: 500.00
 *                         currency:
 *                           type: string
 *                           example: "AED"
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
 *                             enum: ["passport-front", "passport-back", "emirates-id-front", "emirates-id-back", "unit-permit", "company-trade-license", "ejari", "title-deed", "other"]
 *                             example: "passport-front"
 *                           expiryDate:
 *                             type: string
 *                             format: date
 *                             example: "2025-12-31"
 *                           userId:
 *                             type: integer
 *                             description: ID of the user who uploaded the document
 *                             example: 12345
 *                           fileId:
 *                             type: integer
 *                             description: ID of the associated file
 *                             example: 67890
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           file:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               fileName:
 *                                 type: string
 *                                 example: "passport.pdf"
 *                               filePath:
 *                                 type: string
 *                                 example: "/uploads/documents/passport.pdf"
 *                               fileUrl:
 *                                 type: string
 *                                 example: "https://storageaccount.blob.core.windows.net/container/application/uploads/documents/passport.pdf"
 *                               fileType:
 *                                 type: string
 *                                 example: "application/pdf"
 *                               fileSize:
 *                                 type: string
 *                                 example: "1024"
 *                               fileExtension:
 *                                 type: string
 *                                 example: ".pdf"
 *                               fileOriginalName:
 *                                 type: string
 *                                 example: "passport_document.pdf"
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Move-in request not found
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
 *                   example: "Request Not found"
 *                 code:
 *                   type: string
 *                   example: "EC058"
 *       500:
 *         description: Internal Server Error
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
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated user's ID.
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
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated user's ID.
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
 *             required: [unitId, moveInDate, ownerFirstName, ownerLastName, email, dialCode, phoneNumber, nationality, details]
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
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 *                 maxLength: 100
 *                 description: Owner first name (required)
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Owner last name (required)
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 description: Owner email (required)
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Dial code (required)
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 description: Phone number (required)
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nationality (required)
 *                 example: "UAE"
 *               details:
 *                 type: object
 *                 required: [peopleOfDetermination]
 *                 properties:
 *                   unitPermitNumber:
 *                     type: string
 *                     description: Unit permit number as shown in the app screen (optional)
 *                     example: "42388"
 *                   unitPermitStartDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit start date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                     example: "2027-08-27"
 *                   unitPermitExpiryDate:
 *                     type: string
 *                     format: date
 *                     description: Unit permit end/expiry date in ISO 8601 format (YYYY-MM-DD) (optional)
 *                     example: "2028-08-27"
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     default: false
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
 *           examples:
 *             without_special_needs:
 *               summary: HHO Unit move-in without special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-12-20"
 *                 comments: "Need early access for renovation"
 *                 additionalInfo: ""
 *                 ownerFirstName: "John"
 *                 ownerLastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 details:
 *                   peopleOfDetermination: false
 *             with_special_needs:
 *               summary: HHO Unit move-in with special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-12-20"
 *                 comments: "Need early access for renovation"
 *                 additionalInfo: ""
 *                 ownerFirstName: "John"
 *                 ownerLastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 details:
 *                   peopleOfDetermination: true
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
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
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
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
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
 *                   - peopleOfDetermination
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
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     default: false
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
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
 *               - operatorCountryCode
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
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 *                 required: [peopleOfDetermination]
 *                 properties:
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     default: false
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
 *               countryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Country dial code
 *                 example: "+971"
 *               operatorCountryCode:
 *                 type: string
 *                 maxLength: 10
 *                 description: Operator country dial code
 *                 example: "+971"
 *           examples:
 *             without_special_needs:
 *               summary: HHC Company move-in without special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-09-20"
 *                 userEmail: "yatin.singhal@techcorp.com"
 *                 firstName: "Yatin"
 *                 lastName: "Singhal"
 *                 mobileNumber: "501234567"
 *                 name: "Yatin Singhal"
 *                 company: "TechCorp Solutions"
 *                 companyEmail: "info@techcorp.com"
 *                 operatorOfficeNumber: "501234567"
 *                 tradeLicenseNumber: "TL-2024-001234"
 *                 tradeLicenseExpiryDate: "2025-12-31"
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
 *                   peopleOfDetermination: false
 *                 countryCode: "+971"
 *                 operatorCountryCode: "+971"
 *             with_special_needs:
 *               summary: HHC Company move-in with special needs
 *               value:
 *                 unitId: 123
 *                 moveInDate: "2025-09-20"
 *                 userEmail: "yatin.singhal@techcorp.com"
 *                 firstName: "Yatin"
 *                 lastName: "Singhal"
 *                 mobileNumber: "501234567"
 *                 name: "Yatin Singhal"
 *                 company: "TechCorp Solutions"
 *                 companyEmail: "info@techcorp.com"
 *                 operatorOfficeNumber: "501234567"
 *                 tradeLicenseNumber: "TL-2024-001234"
 *                 tradeLicenseExpiryDate: "2025-12-31"
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
 *                   peopleOfDetermination: true
 *                   detailsText: "Need wheelchair assistance for elderly or people of determination during move-in"
 *                 countryCode: "+971"
 *                 operatorCountryCode: "+971"
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
 *               - operatorCountryCode
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
 *               operatorCountryCode:
 *                 type: string
 *                 description: Operator country dial code
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
 *                   - peopleOfDetermination
 *                 properties:
 *                   peopleOfDetermination:
 *                     type: boolean
 *                     default: false
 *                     description: Whether any occupants have special needs
 *                     example: false
 *                   detailsText:
 *                     type: string
 *                     description: Details about special needs assistance (required when peopleOfDetermination is true)
 *                     example: "Need wheelchair assistance for elderly or people of determination during move-in"
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
 *     description: Cancel an existing move-in request. Only requests in 'new' status can be cancelled. Cancellation remarks are optional.
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationRemarks:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Optional cancellation remarks explaining the reason for cancellation
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
 *                   example: "Only requests in 'new' status can be cancelled"
 *                 code:
 *                   type: string
 *                   example: "EC207"
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
 *               - operatorCountryCode
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
 *               userId:
 *                 type: integer
 *                 description: ID of the user for whom the move-in request is being created. If not provided, uses the authenticated user's ID.
 *                 example: 456
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
 *                 properties:
 *               countryCode:
 *                 type: string
 *                 description: Country dial code
 *                 example: "+971"
 *               operatorCountryCode:
 *                 type: string
 *                 description: Operator country dial code
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
 *                 countryCode: "+971"
 *                 operatorCountryCode: "+971"
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

