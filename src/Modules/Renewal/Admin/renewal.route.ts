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
router.post('/request/:requestId/documents', auth.auth(), validate(renewalValidation.uploadDocuments), catchAsync(renewalController.uploadDocuments));
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
 *     description: Admin creates a renewal request for a tenant on behalf of a user. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               peopleOfDetermination:
 *                 type: boolean
 *                 description: Whether any household member is a person of determination
 *                 example: false
 *               peopleOfDeterminationDetails:
 *                 type: string
 *                 description: Details about people of determination (if applicable)
 *                 example: ""
 *               firstName:
 *                 type: string
 *                 description: Tenant's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Tenant's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Tenant's email address
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 description: Phone dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 description: Tenant's nationality
 *                 example: "UAE"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *                 example: "1990-01-01"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1990-12345678-1"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date
 *                 example: "2026-12-31"
 *               passportNumber:
 *                 type: string
 *                 description: Passport number
 *                 example: "A1234567"
 *               visaNumber:
 *                 type: string
 *                 description: Visa number
 *                 example: "V1234567"
 *               ejariNumber:
 *                 type: string
 *                 description: Ejari number
 *                 example: "EJ123456"
 *               dtcmPermitNumber:
 *                 type: string
 *                 description: DTCM permit number
 *                 example: "DTCM123456"
 *               emergencyContactName:
 *                 type: string
 *                 description: Emergency contact name
 *                 example: "Jane Doe"
 *               emergencyContactDialCode:
 *                 type: string
 *                 description: Emergency contact dial code
 *                 example: "+971"
 *               emergencyContactNumber:
 *                 type: string
 *                 description: Emergency contact number
 *                 example: "501234567"
 *               relationship:
 *                 type: string
 *                 description: Relationship with emergency contact
 *                 example: "Spouse"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Additional information"
 *               monthlyRent:
 *                 type: number
 *                 description: Monthly rent amount
 *                 example: 5000
 *               securityDeposit:
 *                 type: number
 *                 description: Security deposit amount
 *                 example: 10000
 *               maintenanceFee:
 *                 type: number
 *                 description: Maintenance fee amount
 *                 example: 500
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 example: "AED"
 *           examples:
 *             without_special_needs:
 *               summary: Tenant renewal without special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 0
 *                 pets: 1
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 passportNumber: "A1234567"
 *                 visaNumber: "V1234567"
 *                 ejariNumber: "EJ123456"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 emergencyContactName: "Jane Doe"
 *                 emergencyContactDialCode: "+971"
 *                 emergencyContactNumber: "501234567"
 *                 relationship: "Spouse"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
 *             with_special_needs:
 *               summary: Tenant renewal with special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 passportNumber: "A1234567"
 *                 visaNumber: "V1234567"
 *                 ejariNumber: "EJ123456"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 emergencyContactName: "Jane Doe"
 *                 emergencyContactDialCode: "+971"
 *                 emergencyContactNumber: "501234567"
 *                 relationship: "Spouse"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
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
 *     description: Admin creates a renewal request for a holiday home owner. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               - dtcmExpiryDate
 *               - ownerFirstName
 *               - ownerLastName
 *               - email
 *               - dialCode
 *               - phoneNumber
 *               - nationality
 *             properties:
 *               unitId:
 *                 type: integer
 *                 description: ID of the unit for renewal
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 description: User ID for whom the renewal is being created
 *                 example: 456
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM permit expiry date
 *                 example: "2026-12-31"
 *               adults:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of adults
 *                 example: 0
 *               children:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of children
 *                 example: 0
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
 *               peopleOfDetermination:
 *                 type: boolean
 *                 description: Whether any household member is a person of determination
 *                 example: false
 *               peopleOfDeterminationDetails:
 *                 type: string
 *                 description: Details about people of determination (if applicable)
 *                 example: ""
 *               ownerFirstName:
 *                 type: string
 *                 description: Owner's first name
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 description: Owner's last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Owner's email address
 *                 example: "john.doe@example.com"
 *               dialCode:
 *                 type: string
 *                 description: Phone dial code
 *                 example: "+971"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "501234567"
 *               nationality:
 *                 type: string
 *                 description: Owner's nationality
 *                 example: "UAE"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *                 example: "1990-01-01"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1990-12345678-1"
 *               passportNumber:
 *                 type: string
 *                 description: Passport number
 *                 example: "A1234567"
 *               visaNumber:
 *                 type: string
 *                 description: Visa number
 *                 example: "V1234567"
 *               unitPermitNumber:
 *                 type: string
 *                 description: Unit permit number
 *                 example: "UP123456"
 *               unitPermitStartDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit start date
 *                 example: "2025-01-01"
 *               unitPermitExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Unit permit expiry date
 *                 example: "2026-01-01"
 *               dtcmPermitNumber:
 *                 type: string
 *                 description: DTCM permit number
 *                 example: "DTCM123456"
 *               ejariNumber:
 *                 type: string
 *                 description: Ejari number
 *                 example: "EJ123456"
 *               powerOfAttorneyNumber:
 *                 type: string
 *                 description: Power of attorney number
 *                 example: "POA123456"
 *               attorneyFirstName:
 *                 type: string
 *                 description: Attorney's first name
 *                 example: "Jane"
 *               attorneyLastName:
 *                 type: string
 *                 description: Attorney's last name
 *                 example: "Smith"
 *               attorneyName:
 *                 type: string
 *                 description: Attorney's full name
 *                 example: "Jane Smith"
 *               attorneyPhone:
 *                 type: string
 *                 description: Attorney's phone number
 *                 example: "501234567"
 *               emergencyContactName:
 *                 type: string
 *                 description: Emergency contact name
 *                 example: "Jane Doe"
 *               emergencyContactDialCode:
 *                 type: string
 *                 description: Emergency contact dial code
 *                 example: "+971"
 *               emergencyContactNumber:
 *                 type: string
 *                 description: Emergency contact number
 *                 example: "501234567"
 *               relationship:
 *                 type: string
 *                 description: Relationship with emergency contact
 *                 example: "Spouse"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Additional information"
 *               monthlyRent:
 *                 type: number
 *                 description: Monthly rent amount
 *                 example: 5000
 *               securityDeposit:
 *                 type: number
 *                 description: Security deposit amount
 *                 example: 10000
 *               maintenanceFee:
 *                 type: number
 *                 description: Maintenance fee amount
 *                 example: 500
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 example: "AED"
 *           examples:
 *             without_special_needs:
 *               summary: HHO owner renewal without special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 dtcmExpiryDate: "2026-12-31"
 *                 adults: 0
 *                 children: 0
 *                 householdStaffs: 0
 *                 pets: 0
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 ownerFirstName: "John"
 *                 ownerLastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 passportNumber: "A1234567"
 *                 visaNumber: "V1234567"
 *                 unitPermitNumber: "UP123456"
 *                 unitPermitStartDate: "2025-01-01"
 *                 unitPermitExpiryDate: "2026-01-01"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 ejariNumber: "EJ123456"
 *                 emergencyContactName: "Jane Doe"
 *                 emergencyContactDialCode: "+971"
 *                 emergencyContactNumber: "501234567"
 *                 relationship: "Spouse"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
 *             with_special_needs:
 *               summary: HHO owner renewal with special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 dtcmExpiryDate: "2026-12-31"
 *                 adults: 1
 *                 children: 0
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 ownerFirstName: "John"
 *                 ownerLastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 passportNumber: "A1234567"
 *                 visaNumber: "V1234567"
 *                 unitPermitNumber: "UP123456"
 *                 unitPermitStartDate: "2025-01-01"
 *                 unitPermitExpiryDate: "2026-01-01"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 ejariNumber: "EJ123456"
 *                 emergencyContactName: "Jane Doe"
 *                 emergencyContactDialCode: "+971"
 *                 emergencyContactNumber: "501234567"
 *                 relationship: "Spouse"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
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
 *     description: Admin creates a renewal request for a holiday home company. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               - dtcmExpiryDate
 *               - tradeLicenseExpiryDate
 *               - name
 *               - companyName
 *               - companyEmail
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
 *               dtcmExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: DTCM permit expiry date
 *                 example: "2026-12-31"
 *               tradeLicenseExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Trade license expiry date
 *                 example: "2026-12-31"
 *               adults:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of adults
 *                 example: 0
 *               children:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of children
 *                 example: 0
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
 *               peopleOfDetermination:
 *                 type: boolean
 *                 description: Whether any household member is a person of determination
 *                 example: false
 *               peopleOfDeterminationDetails:
 *                 type: string
 *                 description: Details about people of determination (if applicable)
 *                 example: ""
 *               name:
 *                 type: string
 *                 description: Contact person name
 *                 example: "John Doe"
 *               companyName:
 *                 type: string
 *                 description: Company name
 *                 example: "ABC Holiday Homes LLC"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 description: Company email address
 *                 example: "info@abcholidayhomes.com"
 *               countryCode:
 *                 type: string
 *                 description: Country code
 *                 example: "+971"
 *               operatorOfficeNumber:
 *                 type: string
 *                 description: Operator office number
 *                 example: "501234567"
 *               tradeLicenseNumber:
 *                 type: string
 *                 description: Trade license number
 *                 example: "TL123456"
 *               nationality:
 *                 type: string
 *                 description: Nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1990-12345678-1"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date
 *                 example: "2026-12-31"
 *               companyAddress:
 *                 type: string
 *                 description: Company address
 *                 example: "Dubai, UAE"
 *               companyPhone:
 *                 type: string
 *                 description: Company phone number
 *                 example: "501234567"
 *               powerOfAttorneyNumber:
 *                 type: string
 *                 description: Power of attorney number
 *                 example: "POA123456"
 *               attorneyName:
 *                 type: string
 *                 description: Attorney's name
 *                 example: "Jane Smith"
 *               attorneyPhone:
 *                 type: string
 *                 description: Attorney's phone number
 *                 example: "501234567"
 *               ejariNumber:
 *                 type: string
 *                 description: Ejari number
 *                 example: "EJ123456"
 *               dtcmPermitNumber:
 *                 type: string
 *                 description: DTCM permit number
 *                 example: "DTCM123456"
 *               emergencyContactName:
 *                 type: string
 *                 description: Emergency contact name
 *                 example: "Jane Doe"
 *               relationship:
 *                 type: string
 *                 description: Relationship with emergency contact
 *                 example: "Manager"
 *               comments:
 *                 type: string
 *                 description: Additional comments
 *                 example: "Additional information"
 *               monthlyRent:
 *                 type: number
 *                 description: Monthly rent amount
 *                 example: 5000
 *               securityDeposit:
 *                 type: number
 *                 description: Security deposit amount
 *                 example: 10000
 *               maintenanceFee:
 *                 type: number
 *                 description: Maintenance fee amount
 *                 example: 500
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 example: "AED"
 *           examples:
 *             without_special_needs:
 *               summary: HHC company renewal without special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 leaseContractEndDate: "2026-01-01"
 *                 dtcmExpiryDate: "2026-12-31"
 *                 tradeLicenseExpiryDate: "2026-12-31"
 *                 adults: 0
 *                 children: 0
 *                 householdStaffs: 0
 *                 pets: 0
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 name: "John Doe"
 *                 companyName: "ABC Holiday Homes LLC"
 *                 companyEmail: "info@abcholidayhomes.com"
 *                 countryCode: "+971"
 *                 operatorOfficeNumber: "501234567"
 *                 tradeLicenseNumber: "TL123456"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 companyAddress: "Dubai, UAE"
 *                 companyPhone: "501234567"
 *                 powerOfAttorneyNumber: "POA123456"
 *                 attorneyName: "Jane Smith"
 *                 attorneyPhone: "501234567"
 *                 ejariNumber: "EJ123456"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 emergencyContactName: "Jane Doe"
 *                 relationship: "Manager"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
 *             with_special_needs:
 *               summary: HHC company renewal with special needs
 *               value:
 *                 unitId: 123
 *                 userId: 456
 *                 leaseContractEndDate: "2026-01-01"
 *                 dtcmExpiryDate: "2026-12-31"
 *                 tradeLicenseExpiryDate: "2026-12-31"
 *                 adults: 1
 *                 children: 0
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 name: "John Doe"
 *                 companyName: "ABC Holiday Homes LLC"
 *                 companyEmail: "info@abcholidayhomes.com"
 *                 countryCode: "+971"
 *                 operatorOfficeNumber: "501234567"
 *                 tradeLicenseNumber: "TL123456"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2026-12-31"
 *                 companyAddress: "Dubai, UAE"
 *                 companyPhone: "501234567"
 *                 powerOfAttorneyNumber: "POA123456"
 *                 attorneyName: "Jane Smith"
 *                 attorneyPhone: "501234567"
 *                 ejariNumber: "EJ123456"
 *                 dtcmPermitNumber: "DTCM123456"
 *                 emergencyContactName: "Jane Doe"
 *                 relationship: "Manager"
 *                 comments: "Additional information"
 *                 monthlyRent: 5000
 *                 securityDeposit: 10000
 *                 maintenanceFee: 500
 *                 currency: "AED"
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
 * /admin/renewal/request/{requestId}/documents:
 *   post:
 *     summary: Upload documents for renewal request (Admin)
 *     description: Upload documents for a renewal request. Document types are restricted based on the renewal request type.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               emirates_id_front:
 *                 type: string
 *                 format: binary
 *                 description: Emirates ID front image
 *               emirates_id_back:
 *                 type: string
 *                 format: binary
 *                 description: Emirates ID back image
 *               ejari:
 *                 type: string
 *                 format: binary
 *                 description: Ejari document
 *               unit_permit:
 *                 type: string
 *                 format: binary
 *                 description: Unit permit document
 *               company_trade_license:
 *                 type: string
 *                 format: binary
 *                 description: Company trade license document
 *               title_deed:
 *                 type: string
 *                 format: binary
 *                 description: Title deed document
 *               other:
 *                 type: string
 *                 format: binary
 *                 description: Other supporting documents
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
 *                             example: 123
 *                           documentType:
 *                             type: string
 *                             example: "emirates_id_front"
 *                           fileName:
 *                             type: string
 *                             example: "emirates_id_front_123.pdf"
 *                           fileUrl:
 *                             type: string
 *                             example: "https://storage.azure.com/renewal/123/emirates_id_front/emirates_id_front_123.pdf"
 *                     message:
 *                       type: string
 *                       example: "2 document(s) uploaded successfully"
 *       400:
 *         description: Invalid document types or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Renewal request not found
 *       500:
 *         description: Internal server error
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

