import { Router } from "express";
import { RenewalController } from "./renewal.controller";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { RenewalValidation } from "./renewal.validation";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

const renewalController = new RenewalController();
const renewalValidation = new RenewalValidation();
const auth = new AuthMiddleware();

const router = Router();
router.get("/request-list", auth.auth(), validate(renewalValidation.getAdminRenewal), catchAsync(renewalController.getAllRenewalRequestList));
router.get('/request/:requestId', auth.auth(), validate(renewalValidation.getAdminRenewalDetails), catchAsync(renewalController.getRenewalRequestDetailsWithId));
router.post('/tenant', auth.auth(), validate(renewalValidation.createTenantRenewal), catchAsync(renewalController.createTenantRenewalRequest));
router.post('/hho-unit', auth.auth(), validate(renewalValidation.createHhoOwnerRenewal), catchAsync(renewalController.createHhoOwnerRenewalRequest));
router.post('/hhc-company', auth.auth(), validate(renewalValidation.createHhcCompanyRenewal), catchAsync(renewalController.createHhcCompanyRenewalRequest));
// Document upload route removed - use /renewal/request/:requestId/documents instead (works for both admin and mobile)
router.put('/request/:requestId/approve', auth.auth(), validate(renewalValidation.approveRequest), catchAsync(renewalController.approveRenewalRequest));
router.put('/request/:requestId/rfi', auth.auth(), validate(renewalValidation.markRequestAsRFI), catchAsync(renewalController.markRequestAsRFI));
router.put('/request/:requestId/cancel', auth.auth(), validate(renewalValidation.cancelRequest), catchAsync(renewalController.cancelRenewalRequest));
router.put('/tenant/:requestId', auth.auth(), validate(renewalValidation.updateTenantRenewal), catchAsync(renewalController.updateTenantRenewalRequest));
router.put('/hho-unit/:requestId', auth.auth(), validate(renewalValidation.updateHhoOwnerRenewal), catchAsync(renewalController.updateHhoOwnerRenewalRequest));
router.put('/hhc-company/:requestId', auth.auth(), validate(renewalValidation.updateHhcCompanyRenewal), catchAsync(renewalController.updateHhcCompanyRenewalRequest));

/**
 * @swagger
 * tags:
 *   - name: Renewal (Backoffice)
 *     description: Renewal management endpoints for administrators
 */

/**
 * @swagger
 * /admin/renewal/request-list:
 *   get:
 *     summary: Get all renewal requests (Admin)
 *     description: Retrieve a list of all renewal requests with advanced filtering options
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, rfi-pending, rfi-submitted, approved, user-cancelled, cancelled, closed]
 *         description: Filter by renewal status
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [tenant, hho_company, hho_owner]
 *         description: Filter by request type
 *       - in: query
 *         name: unitId
 *         schema:
 *           type: integer
 *         description: Filter by unit ID
 *       - in: query
 *         name: communityId
 *         schema:
 *           type: integer
 *         description: Filter by community ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of renewal requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/request/{requestId}:
 *   get:
 *     summary: Get renewal request details with logs (Admin)
 *     description: Retrieve detailed information about a specific renewal request including audit logs
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Renewal request ID
 *     responses:
 *       200:
 *         description: Renewal request details retrieved successfully
 *       404:
 *         description: Renewal request not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/tenant:
 *   post:
 *     summary: Create tenant renewal request (Admin)
 *     description: Admin creates a simplified renewal request for a tenant on behalf of a user containing only essential occupancy details. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Backoffice)]
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
 *               - userId
 *               - tenancyContractEndDate
 *               - adults
 *               - children
 *               - householdStaffs
 *               - pets
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 description: User ID for whom the renewal is being created
 *                 example: 456
 *               tenancyContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: Tenancy contract end date
 *                 example: "2026-01-01"
 *               adults:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 6
 *                 description: Number of adults
 *                 example: 2
 *               children:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of children
 *                 example: 1
 *               householdStaffs:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 4
 *                 description: Number of household staff
 *                 example: 0
 *               pets:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of pets
 *                 example: 1
 *               determinationComments:
 *                 type: string
 *                 description: Optional comments about people of determination accessibility requirements
 *                 example: "Additional accessibility requirements"
 *           examples:
 *             basic_renewal:
 *               summary: Basic tenant renewal request
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 0
 *                 pets: 0
 *             with_determination_comments:
 *               summary: Tenant renewal with determination comments
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 1
 *                 pets: 1
 *                 determinationComments: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *     responses:
 *       200:
 *         description: Tenant renewal request created successfully
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
 *                     accountRenewalRequestNo:
 *                       type: string
 *                       example: "ARR-000123"
 *                     status:
 *                       type: string
 *                       example: "new"
 *                     requestType:
 *                       type: string
 *                       example: "tenant"
 *                     message:
 *                       type: string
 *                       example: "Request Submitted Successfully!"
 *       400:
 *         description: Invalid request data or move-out request already approved
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
 *                   example: "MOVE_OUT_ALREADY_APPROVED"
 *                 message:
 *                   type: string
 *                   example: "Move-out request is already raised for this unit and it is approved. Cannot create renewal request."
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/hho-unit:
 *   post:
 *     summary: Create HHO owner renewal request (Admin)
 *     description: Admin creates a simplified renewal request for a holiday home owner on behalf of a user containing only essential permit information. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Backoffice)]
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
 *               - userId
 *               - dtcmPermitEndDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 description: User ID for whom the renewal is being created
 *                 example: 456
 *               dtcmPermitEndDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM permit end date
 *                 example: "2026-12-31"
 *           examples:
 *             basic_hho_renewal:
 *               summary: Basic HHO owner renewal request
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 dtcmPermitEndDate: "2026-12-31"
 *     responses:
 *       200:
 *         description: HHO owner renewal request created successfully
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
 *                     accountRenewalRequestNo:
 *                       type: string
 *                       example: "ARR-000123"
 *                     status:
 *                       type: string
 *                       example: "new"
 *                     requestType:
 *                       type: string
 *                       example: "hho_owner"
 *                     message:
 *                       type: string
 *                       example: "Request Submitted Successfully!"
 *       400:
 *         description: Invalid request data or move-out request already approved
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
 *                   example: "MOVE_OUT_ALREADY_APPROVED"
 *                 message:
 *                   type: string
 *                   example: "Move-out request is already raised for this unit and it is approved. Cannot create renewal request."
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/hhc-company:
 *   post:
 *     summary: Create HHC company renewal request (Admin)
 *     description: Admin creates a simplified renewal request for a holiday home company on behalf of a user containing only essential permit and contract dates. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Backoffice)]
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
 *               - userId
 *               - leaseContractEndDate
 *               - dtcmPermitEndDate
 *               - permitExpiry
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 description: User ID for whom the renewal is being created
 *                 example: 456
 *               leaseContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: Lease contract end date
 *                 example: "2026-01-01"
 *               dtcmPermitEndDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM permit end date
 *                 example: "2026-12-31"
 *               permitExpiry:
 *                 type: string
 *                 format: date
 *                 description: Trade license permit expiry date
 *                 example: "2026-12-31"
 *           examples:
 *             basic_hhc_renewal:
 *               summary: Basic HHC company renewal request
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 leaseContractEndDate: "2026-01-01"
 *                 dtcmPermitEndDate: "2026-12-31"
 *                 permitExpiry: "2026-12-31"
 *     responses:
 *       200:
 *         description: HHC company renewal request created successfully
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
 *                     accountRenewalRequestNo:
 *                       type: string
 *                       example: "ARR-000123"
 *                     status:
 *                       type: string
 *                       example: "new"
 *                     requestType:
 *                       type: string
 *                       example: "hho_company"
 *                     message:
 *                       type: string
 *                       example: "Request Submitted Successfully!"
 *       400:
 *         description: Invalid request data or move-out request already approved
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
 *                   example: "MOVE_OUT_ALREADY_APPROVED"
 *                 message:
 *                   type: string
 *                   example: "Move-out request is already raised for this unit and it is approved. Cannot create renewal request."
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * NOTE: Document upload route removed from admin module.
 * Use /renewal/request/{requestId}/documents instead (works for both admin and mobile users)
 */

/**
 * @swagger
 * /admin/renewal/request/{requestId}/approve:
 *   put:
 *     summary: Approve renewal request (Admin)
 *     description: Admin approves a renewal request. Only requests in 'submitted' or 'rfi-submitted' status can be approved.
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Renewal request ID
 *         example: 123
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Admin's approval comments
 *                 example: "All documents verified and approved for renewal"
 *               approvalNotes:
 *                 type: string
 *                 description: Additional approval notes
 *                 example: "Renewal approved for 12 months from current expiry date"
 *     responses:
 *       200:
 *         description: Renewal request approved successfully
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
 *                   example: "SC022"
 *                 message:
 *                   type: string
 *                   example: "Renewal request approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "approved"
 *                     approvedBy:
 *                       type: string
 *                       example: "admin@example.com"
 *                     approvedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - Invalid status for approval
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
 *                   example: "EC212"
 *                 message:
 *                   type: string
 *                   example: "Renewal request approval is not allowed in current status"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Renewal request not found
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
 *                   example: "EC208"
 *                 message:
 *                   type: string
 *                   example: "Renewal request not found"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/request/{requestId}/rfi:
 *   put:
 *     summary: Mark renewal request as RFI (Admin)
 *     description: Admin marks a renewal request as Request For Information (RFI). Only requests in 'submitted' status can be marked as RFI. This changes status to 'rfi-pending' and notifies the user. Optional comments can be provided.
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Renewal request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Comments for the user about what is needed
 *                 example: "Please upload clear copies of Emirates ID front and back, and valid Ejari document"
 *     responses:
 *       200:
 *         description: Renewal request marked as RFI successfully
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
 *                   example: "SC023"
 *                 message:
 *                   type: string
 *                   example: "Renewal request marked as RFI successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "rfi-pending"
 *                     comments:
 *                       type: string
 *                       example: "Please upload clear copies of Emirates ID front and back, and valid Ejari document"
 *                     markedBy:
 *                       type: string
 *                       example: "admin@example.com"
 *                     markedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - Invalid status for RFI or missing required fields
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
 *                   example: "EC213"
 *                 message:
 *                   type: string
 *                   example: "Invalid renewal request status for this operation"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Renewal request not found
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
 *                   example: "EC208"
 *                 message:
 *                   type: string
 *                   example: "Renewal request not found"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/renewal/request/{requestId}/cancel:
 *   put:
 *     summary: Cancel renewal request (Admin)
 *     description: Admin cancels a renewal request. Only requests in 'submitted', 'rfi-submitted', or 'approved' status can be cancelled.
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Renewal request ID
 *         example: 123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Policy violation"
 *               comments:
 *                 type: string
 *                 description: Additional cancellation comments
 *                 example: "Request cancelled due to non-compliance with community policies"
 *               cancellationType:
 *                 type: string
 *                 enum: ["policy-violation", "document-fraud", "user-request", "system-error", "other"]
 *                 description: Type of cancellation
 *                 example: "policy-violation"
 *     responses:
 *       200:
 *         description: Renewal request cancelled successfully
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
 *                   example: "SC024"
 *                 message:
 *                   type: string
 *                   example: "Renewal request cancelled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "cancelled"
 *                     reason:
 *                       type: string
 *                       example: "Policy violation"
 *                     cancelledBy:
 *                       type: string
 *                       example: "admin@example.com"
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - Invalid status for cancellation or missing required fields
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
 *                   example: "EC210"
 *                 message:
 *                   type: string
 *                   example: "Renewal request cancellation is not allowed in current status"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Renewal request not found
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
 *                   example: "EC208"
 *                 message:
 *                   type: string
 *                   example: "Renewal request not found"
 *       500:
 *         description: Internal server error
 */

// Note: Close operation is NOT APPLICABLE for renewals as per BRD
// Renewals are complete once approved - no closure process needed

/**
 * @swagger
 * /admin/renewal/tenant/{requestId}:
 *   put:
 *     summary: Update tenant renewal request (Admin)
 *     description: Admin updates an existing tenant renewal request
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Renewal request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adults:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 6
 *               children:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant renewal request updated successfully
 *       404:
 *         description: Renewal request not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /admin/renewal/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO owner renewal request (Admin)
 *     description: Admin updates an existing HHO owner renewal request
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Renewal request ID
 *     responses:
 *       200:
 *         description: HHO owner renewal request updated successfully
 *       404:
 *         description: Renewal request not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /admin/renewal/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company renewal request (Admin)
 *     description: Admin updates an existing HHC company renewal request
 *     tags: [Renewal (Backoffice)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Renewal request ID
 *     responses:
 *       200:
 *         description: HHC company renewal request updated successfully
 *       404:
 *         description: Renewal request not found
 *       401:
 *         description: Unauthorized
 */

export default router;

