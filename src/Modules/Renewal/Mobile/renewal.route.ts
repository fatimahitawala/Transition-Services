import { Router } from "express";
import { RenewalController } from "./renewal.controller";
import { RenewalValidation } from "./renewal.validation";
import { AuthMiddleware } from "../../../Common/Middlewares/AuthMiddleware";
import { validate } from "../../../Common/Middlewares/validate";
import { catchAsync } from "../../../Common/Middlewares/catchAsync";
import { fileUploads } from "../../../Common/Utils/upload";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

const renewalController = new RenewalController();
const renewalValidation = new RenewalValidation();
const auth = new AuthMiddleware();

const router = Router();

router.get("/request-list", auth.auth(), catchAsync(renewalController.getAllRenewalRequestList));
router.get("/request/:requestId", auth.auth(), catchAsync(renewalController.getRenewalRequestDetails));
router.post('/request/tenant', auth.auth(), validate(renewalValidation.createTenantRenewal), catchAsync(renewalController.createTenantRenewalRequest));
router.post('/request/hho-unit', auth.auth(), validate(renewalValidation.createHhoOwnerRenewal), catchAsync(renewalController.createHhoOwnerRenewalRequest));
router.post('/request/hhc-company', auth.auth(), validate(renewalValidation.createHhcCompanyRenewal), catchAsync(renewalController.createHhcCompanyRenewalRequest));
router.put('/request/tenant/:requestId', auth.auth(), validate(renewalValidation.updateTenantRenewal), catchAsync(renewalController.updateTenantRenewalRequest));
router.put('/request/hho-unit/:requestId', auth.auth(), validate(renewalValidation.updateHhoOwnerRenewal), catchAsync(renewalController.updateHhoOwnerRenewalRequest));
router.put('/request/hhc-company/:requestId', auth.auth(), validate(renewalValidation.updateHhcCompanyRenewal), catchAsync(renewalController.updateHhcCompanyRenewalRequest));
router.put('/request/:requestId/cancel', auth.auth(), validate(renewalValidation.cancelRenewalRequest), catchAsync(renewalController.cancelRenewalRequest));
router.post('/request/:requestId/documents',
  auth.auth(),
  validate(renewalValidation.uploadDocuments),
  fileUploads.fields([
    { name: TRANSITION_DOCUMENT_TYPES.EJARI, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT, maxCount: 1 }
  ]),
  catchAsync(renewalController.uploadDocuments)
);

router.put('/request/:requestId/rfi-submit', auth.auth(), validate(renewalValidation.submitRFI), catchAsync(renewalController.submitRFI));

/**
 * @swagger
 * tags:
 *   - name: Renewal (Mobile)
 *     description: Renewal management endpoints for mobile users
 */

/**
 * @swagger
 * /renewal/request-list:
 *   get:
 *     summary: Get all renewal requests for logged-in user
 *     description: Retrieve a list of renewal requests created by the authenticated user
 *     tags: [Renewal (Mobile)]
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
 *         name: unitId
 *         schema:
 *           type: integer
 *         description: Filter by unit ID
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
 * /renewal/request/{requestId}:
 *   get:
 *     summary: Get renewal request details
 *     description: Retrieve detailed information about a specific renewal request
 *     tags: [Renewal (Mobile)]
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
 * /renewal/request/tenant:
 *   post:
 *     summary: Create tenant renewal request
 *     description: Submit a simplified renewal request for a tenant containing only essential occupancy details. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Mobile)]
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
 *               tenancyContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: End date of the tenancy contract
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
 *                 example: 0
 *               determinationComments:
 *                 type: string
 *                 description: Optional comments about people of determination accessibility requirements
 *                 example: "Additional accessibility requirements"
 *           examples:
 *             basic_renewal:
 *               summary: Basic tenant renewal request
 *               value:
 *                 unitId: 123
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 0
 *                 pets: 0
 *             with_determination_comments:
 *               summary: Tenant renewal with determination comments
 *               value:
 *                 unitId: 123
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
 * /renewal/request/hho-unit:
 *   post:
 *     summary: Create HHO owner renewal request
 *     description: Submit a simplified renewal request for a holiday home owner containing only essential permit information. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Mobile)]
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
 *               - dtcmPermitEndDate
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
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
 * /renewal/request/hhc-company:
 *   post:
 *     summary: Create HHC company renewal request
 *     description: Submit a simplified renewal request for a holiday home company containing only essential permit and contract dates. The request will be validated to ensure no approved move-out request exists for the same unit.
 *     tags: [Renewal (Mobile)]
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
 *               - leaseContractEndDate
 *               - dtcmPermitEndDate
 *               - permitExpiry
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
 *               leaseContractEndDate:
 *                 type: string
 *                 format: date
 *                 description: Lease contract end date
 *                 example: "2026-12-31"
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
 *                 leaseContractEndDate: "2026-12-31"
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
 * @swagger
 * /renewal/request/tenant/{requestId}:
 *   put:
 *     summary: Update tenant renewal request
 *     description: Update an existing tenant renewal request
 *     tags: [Renewal (Mobile)]
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
 * /renewal/request/hho-unit/{requestId}:
 *   put:
 *     summary: Update HHO owner renewal request
 *     description: Update an existing HHO owner renewal request
 *     tags: [Renewal (Mobile)]
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
 * /renewal/request/hhc-company/{requestId}:
 *   put:
 *     summary: Update HHC company renewal request
 *     description: Update an existing HHC company renewal request
 *     tags: [Renewal (Mobile)]
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

/**
 * @swagger
 * /renewal/request/{requestId}/cancel:
 *   put:
 *     summary: Cancel renewal request
 *     description: Cancel a renewal request with a reason
 *     tags: [Renewal (Mobile)]
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Changed plans"
 *               comments:
 *                 type: string
 *                 example: "No longer needed"
 *     responses:
 *       200:
 *         description: Renewal request cancelled successfully
 *       404:
 *         description: Renewal request not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /renewal/request/{requestId}/documents:
 *   post:
 *     summary: Upload renewal documents
 *     description: |
 *       Upload documents for a renewal request based on renewal type:
 *       - **Tenant Renewal**: Only Ejari document (required)
 *       - **HHO Owner Renewal**: Only DTCM permit/Unit Permit (required)
 *       - **HHC Company Renewal**: No documents allowed - document upload is disabled for this type
 *     tags: [Renewal (Mobile)]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               ejari:
 *                 type: string
 *                 format: binary
 *                 description: Ejari document (Required for Tenant Renewal only)
 *               unit-permit:
 *                 type: string
 *                 format: binary
 *                 description: DTCM permit/Unit permit document (Required for HHO Owner Renewal only)
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
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadedDocuments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           documentType:
 *                             type: string
 *                             example: "emirates-id-front"
 *                           fileName:
 *                             type: string
 *                             example: "emirates_id_front.pdf"
 *                           fileUrl:
 *                             type: string
 *                             example: "https://storageaccount.blob.core.windows.net/container/application/uploads/documents/emirates_id_front.pdf"
 *       400:
 *         description: Invalid request data or file upload error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Renewal request not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /renewal/request/{requestId}/rfi-submit:
 *   put:
 *     summary: Submit RFI response for renewal request (Mobile)
 *     description: User submits response to RFI (Request For Information) raised by admin. This changes status from 'rfi-pending' to 'rfi-submitted'.
 *     tags: [Renewal (Mobile)]
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
 *               - comments
 *             properties:
 *               comments:
 *                 type: string
 *                 description: User's response to the RFI raised by admin
 *                 example: "I have uploaded the required Emirates ID documents as requested"
 *               additionalInfo:
 *                 type: string
 *                 description: Any additional information or clarification
 *                 example: "The documents are valid until 2025-12-31"
 *     responses:
 *       200:
 *         description: RFI response submitted successfully
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
 *                     requestId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "rfi-submitted"
 *                     message:
 *                       type: string
 *                       example: "RFI response submitted successfully. Admin will review your submission."
 *       400:
 *         description: Bad request - Invalid data or request not in RFI pending status
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
 *                   example: "EC209"
 *                 message:
 *                   type: string
 *                   example: "Renewal request is not in RFI pending status"
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

export default router;

