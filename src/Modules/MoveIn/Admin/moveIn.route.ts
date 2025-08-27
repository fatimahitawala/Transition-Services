import { Router } from "express";
import { MoveInController } from "./moveIn.controller";
import express from "express";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { MoveInvalidation } from "./moveIn.validation";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

const moveInController = new MoveInController();
const moveInValidation = new MoveInvalidation();
const auth = new AuthMiddleware();

const router = Router();

// GET routes for admin move-in management
// GET routes for admin move-in management
router.get("/request", auth.auth(), validate(moveInValidation.getAdminMoveIn), catchAsync(moveInController.getAllMoveInRequestList));
router.get('/moveInDetails/:requestId', auth.auth(), validate(moveInValidation.getAdminMoveInDetails), catchAsync(moveInController.getAllMoveInDetailsList));

// POST routes for creating different types of move-in requests (Admin)
router.post('/owner', auth.auth(), validate(moveInValidation.createOwnerMoveIn), catchAsync(moveInController.createOwnerMoveInRequest));
router.post('/tenant', auth.auth(), validate(moveInValidation.createTenantMoveIn), catchAsync(moveInController.createTenantMoveInRequest));
router.post('/hho-owner', auth.auth(), validate(moveInValidation.createHhoOwnerMoveIn), catchAsync(moveInController.createHhoOwnerMoveInRequest));
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

/**
* @swagger
* tags:
*   name: Business Logic & Auto-Approval
*   description: Business logic validations and auto-approval system for move-in requests
*/

/**
* @swagger
* tags:
*   name: Move-In Status Management
*   description: Status management operations for move-in requests (Approve, RFI, Cancel, Close)
*/

/**
* @swagger
* tags:
*   name: MoveIn
*   description: Move-in request operations.
*/

/**
* @swagger
* /admin/move-in/business-logic:
*   get:
*     summary: Get business logic validation rules
*     description: Retrieve the business logic validation rules applied to owner, tenant, and HHO-Unit move-in requests
*     tags: [Business Logic & Auto-Approval]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Business logic validation rules retrieved successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/BusinessLogicValidation'
*       401:
*         description: Unauthorized - authentication required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/auto-approval:
*   get:
*     summary: Get auto-approval system details
*     description: Retrieve information about the auto-approval system for owner, tenant, and HHO-Unit move-in requests
*     tags: [Business Logic & Auto-Approval]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Auto-approval system details retrieved successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/AutoApprovalSystem'
*       401:
*         description: Unauthorized - authentication required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/hhc-company:
*   post:
*     summary: Create HHO Company move-in request (Admin)
*     description: Create a move-in request on behalf of an HHO Company. This request is automatically approved and generates a Move-in Permit. Only Community Admins can create this type of request.
*     tags: [Admin MoveIn Management]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: [unitId, userEmail, moveInDate, representativeName, companyName, companyEmail, officeContactNumber, tradeLicenseNumber, tradeLicenseExpiryDate, leaseStartDate, leaseEndDate, nationality, emiratesIdNumber, emiratesIdExpiryDate, dtcmStartDate, dtcmEndDate]
*             properties:
*               unitId:
*                 type: integer
*                 description: ID of the unit for move-in
*                 example: 123
*               userEmail:
*                 type: string
*                 format: email
*                 description: Email of the HHO Company user (must be registered in One App)
*                 example: "company@example.com"
*               moveInDate:
*                 type: string
*                 format: date
*                 description: Requested move-in date (ISO format, must be at least 30 days in future)
*                 example: "2025-02-15"
*               representativeName:
*                 type: string
*                 maxLength: 100
*                 description: Name of the company representative
*                 example: "John Smith"
*               companyName:
*                 type: string
*                 maxLength: 200
*                 description: Name of the company
*                 example: "ABC Trading Company LLC"
*               companyEmail:
*                 type: string
*                 format: email
*                 description: Company email address
*                 example: "info@abctrading.com"
*               officeContactNumber:
*                 type: string
*                 maxLength: 20
*                 description: Office contact number with country code
*                 example: "+971501234567"
*               tradeLicenseNumber:
*                 type: string
*                 maxLength: 50
*                 description: Company trade license number
*                 example: "TL123456"
*               tradeLicenseExpiryDate:
*                 type: string
*                 format: date
*                 description: Trade license expiry date
*                 example: "2026-12-31"
*               leaseStartDate:
*                 type: string
*                 format: date
*                 description: Lease start date
*                 example: "2025-01-01"
*               leaseEndDate:
*                 type: string
*                 format: date
*                 description: Lease end date
*                 example: "2027-12-31"
*               nationality:
*                 type: string
*                 maxLength: 50
*                 description: Nationality of the representative
*                 example: "UAE"
*               emiratesIdNumber:
*                 type: string
*                 maxLength: 20
*                 description: Emirates ID number
*                 example: "784-1985-1234567-8"
*               emiratesIdExpiryDate:
*                 type: string
*                 format: date
*                 description: Emirates ID expiry date
*                 example: "2030-05-15"
*               dtcmStartDate:
*                 type: string
*                 format: date
*                 description: DTCM start date
*                 example: "2025-01-01"
*               dtcmEndDate:
*                 type: string
*                 format: date
*                 description: DTCM end date
*                 example: "2027-12-31"
*     responses:
*       201:
*         description: HHO Company move-in request created and approved successfully
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
*                   example: "HHO Company move-in request created and approved successfully"
*                 data:
*                   type: object
*                   properties:
*                     requestId:
*                       type: integer
*                       example: 123
*                     requestNumber:
*                       type: string
*                       example: "MIN-UNIT123-123"
*                     status:
*                       type: string
*                       example: "approved"
*                     moveInPermit:
*                       type: object
*                       properties:
*                         permitNumber:
*                           type: string
*                           example: "MIP-2025-001"
*                         validFrom:
*                           type: string
*                           format: date
*                           example: "2025-02-15"
*                         validUntil:
*                           type: string
*                           format: date
*                           example: "2025-03-17"
*       400:
*         description: Bad request - validation error or business rule violation
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
*                   example: "Unit is not vacant or has overlapping move-in requests"
*                 code:
*                   type: string
*                   example: "EC001"
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       500:
*         description: Internal server error
*/

// ==================== STATUS MANAGEMENT API DOCUMENTATION ====================

/**
* @swagger
* /admin/move-in/request/{requestId}/approve:
*   put:
*     summary: Approve move-in request (UC-136)
*     description: Approve a move-in request that has been submitted or resubmitted after RFI. This action generates a Move-In Permit (MIP) valid for 30 days and sends notifications to relevant stakeholders.
*     tags: [Move-In Status Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the move-in request to approve
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: [comments]
*             properties:
*               comments:
*                 type: string
*                 maxLength: 35
*                 description: Approval comments/remarks (mandatory)
*                 example: "All documents verified and requirements met. Approved for move-in."
*     responses:
*       200:
*         description: Move-in request approved successfully
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
*                   example: "Move-in request approved successfully"
*                 data:
*                   type: object
*                   properties:
*                     requestId:
*                       type: integer
*                       example: 123
*                     status:
*                       type: string
*                       example: "approved"
*                     moveInPermitUrl:
*                       type: string
*                       example: "move-in-permit-123.pdf"
*       400:
*         description: Bad request - validation error or business rule violation
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
*                   example: "Cannot approve request in cancelled status. Only Submitted or RFI Submitted requests can be approved."
*                 code:
*                   type: string
*                   example: "EC001"
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       409:
*         description: Conflict - overlapping requests exist
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
*                   example: "Cannot approve move-in request. 2 overlapping request(s) exist for this unit."
*                 code:
*                   type: string
*                   example: "EC001"
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/request/{requestId}/rfi:
*   put:
*     summary: Mark move-in request as RFI (UC-135)
*     description: Mark a move-in request as Request for Information (RFI) when additional details or clarification are needed from the customer. This changes the status to RFI Pending and sends notifications to the customer.
*     tags: [Move-In Status Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the move-in request to mark as RFI
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: [comments]
*             properties:
*               comments:
*                 type: string
*                 maxLength: 35
*                 description: RFI comments/remarks explaining what additional information is needed (mandatory)
*                 example: "Please provide updated Emirates ID with extended validity period."
*     responses:
*       200:
*         description: Request marked as RFI successfully
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
*                   example: "Request marked as RFI successfully"
*                 data:
*                   type: object
*                   properties:
*                     requestId:
*                       type: integer
*                       example: 123
*                     status:
*                       type: string
*                       example: "rfi-pending"
*       400:
*         description: Bad request - validation error or business rule violation
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
*                   example: "Cannot mark request as RFI in approved status. Only Submitted requests can be marked as RFI."
*                 code:
*                   type: string
*                   example: "EC001"
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/request/{requestId}/cancel:
*   put:
*     summary: Cancel/Reject move-in request (UC-138)
*     description: Cancel or reject a move-in request that is invalid, duplicated, or unqualified. This action changes the status to Cancelled and sends notifications to the customer with cancellation remarks.
*     tags: [Move-In Status Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the move-in request to cancel
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: [cancellationRemarks]
*             properties:
*               cancellationRemarks:
*                 type: string
*                 maxLength: 100
*                 description: Detailed explanation for cancellation/rejection (mandatory)
*                 example: "Request cancelled due to duplicate submission for the same unit and date range."
*     responses:
*       200:
*         description: Request cancelled successfully
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
*                   example: "Request cancelled successfully"
*                 data:
*                   type: object
*                   properties:
*                     requestId:
*                       type: integer
*                       example: 123
*                     status:
*                       type: string
*                       example: "cancelled"
*       400:
*         description: Bad request - validation error or business rule violation
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
*                   example: "Cannot cancel request in closed status."
*                 code:
*                   type: string
*                   example: "EC001"
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - admin access required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* /admin/move-in/request/{requestId}/close:
*   put:
*     summary: Close move-in request by security (UC-139)
*     description: Close an approved move-in request when the customer arrives at the site and presents the Move-In Permit (MIP) to the security team. This action links the unit to the user, marks it as occupied, and invalidates previous user access.
*     tags: [Move-In Status Management]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: requestId
*         required: true
*         schema:
*           type: integer
*         description: The ID of the approved move-in request to close
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: [closureRemarks, actualMoveInDate]
*             properties:
*               closureRemarks:
*                 type: string
*                 maxLength: 100
*                 description: Security remarks about the closure (mandatory)
*                 example: "Customer arrived with valid MIP. Unit access granted and keys handed over."
*               actualMoveInDate:
*                 type: string
*                 format: date
*                 description: Actual date when the customer moved in (mandatory, ISO format YYYY-MM-DD)
*                 example: "2025-01-15"
*     responses:
*       200:
*         description: Request closed successfully
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
*                     actualMoveInDate:
*                       type: string
*                       format: date
*                       example: "2025-01-15"
*       400:
*         description: Bad request - validation error or business rule violation
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
*                   example: "Cannot close request in submitted status. Only Approved requests can be closed."
*                 code:
*                   type: string
*                   example: "EC001"
*       401:
*         description: Unauthorized - authentication required
*       403:
*         description: Forbidden - security or admin access required
*       500:
*         description: Internal server error
*/

/**
* @swagger
* components:
*   schemas:
*     StatusTransitionFlow:
*       type: object
*       description: Status transition flow for move-in requests
*       properties:
*         submitted:
*           type: string
*           example: "OPEN (new request submitted)"
*         rfiPending:
*           type: string
*           example: "RFI_PENDING (admin marked as RFI)"
*         rfiSubmitted:
*           type: string
*           example: "RFI_SUBMITTED (customer resubmitted after RFI)"
*         approved:
*           type: string
*           example: "APPROVED (admin approved request)"
*         closed:
*           type: string
*           example: "CLOSED (security closed after physical move-in)"
*         cancelled:
*           type: string
*           example: "CANCELLED (admin cancelled request)"
*       required:
*         - submitted
*         - rfiPending
*         - rfiSubmitted
*         - approved
*         - closed
*         - cancelled
*     BusinessRules:
*       type: object
*       description: Business rules for status management
*       properties:
*         approvalRules:
*           type: array
*           items:
*             type: string
*           example: [
*             "Only requests in Submitted or RFI Submitted status can be approved",
*             "No active overlapping move-in request exists for the same unit",
*             "MIP template must be active for the unit",
*             "SLA: Move-in request max 30 days validity"
*           ]
*         rfiRules:
*           type: array
*           items:
*             type: string
*           example: [
*             "Only requests in Submitted status can be marked as RFI",
*             "Admin must provide remarks",
*             "Status transition: Submitted → RFI Pending"
*           ]
*         cancellationRules:
*           type: array
*           items:
*             type: string
*           example: [
*             "Only requests in Submitted, RFI Submitted, or Approved status can be cancelled",
*             "Cancellation remarks are mandatory",
*             "Status changes to Cancelled"
*           ]
*         closureRules:
*           type: array
*           items:
*             type: string
*           example: [
*             "Only requests in Approved status can be closed",
*             "Security team can close requests",
*             "Unit is linked to user and marked as occupied",
*             "Previous user access is invalidated"
*           ]
*/

/**
* @swagger
* /admin/move-in/status-flow:
*   get:
*     summary: Get status transition flow
*     description: Retrieve the status transition flow and business rules for move-in request management
*     tags: [Move-In Status Management]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Status transition flow retrieved successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 statusFlow:
*                   $ref: '#/components/schemas/StatusTransitionFlow'
*                 businessRules:
*                   $ref: '#/components/schemas/BusinessRules'
*       401:
*         description: Unauthorized - authentication required
*       500:
*         description: Internal server error
*/

export default router;

