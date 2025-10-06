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
    { name: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.EJARI, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.TITLE_DEED, maxCount: 1 },
    { name: TRANSITION_DOCUMENT_TYPES.OTHER, maxCount: 4 }
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
 *     description: Submit a renewal request for a tenant. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               - acceptTerms
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
 *               peopleOfDetermination:
 *                 type: boolean
 *                 description: Whether any household member is a person of determination
 *                 example: false
 *               peopleOfDeterminationDetails:
 *                 type: string
 *                 description: Details about people of determination (if applicable)
 *                 example: ""
 *               acceptTerms:
 *                 type: boolean
 *                 enum: [true]
 *                 description: Must be true to accept terms and conditions
 *                 example: true
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
 *               nationality:
 *                 type: string
 *                 description: Nationality of the tenant
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
 *                 example: "2025-12-31"
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
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 0
 *                 pets: 0
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 acceptTerms: true
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2025-12-31"
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
 *                 tenancyContractEndDate: "2026-01-01"
 *                 adults: 2
 *                 children: 1
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 acceptTerms: true
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 dialCode: "+971"
 *                 phoneNumber: "501234567"
 *                 nationality: "UAE"
 *                 dateOfBirth: "1990-01-01"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2025-12-31"
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
 * /renewal/request/hho-unit:
 *   post:
 *     summary: Create HHO owner renewal request
 *     description: Submit a renewal request for a holiday home owner. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               - dtcmExpiryDate
 *               - acceptTerms
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
 *               acceptTerms:
 *                 type: boolean
 *                 enum: [true]
 *                 description: Must be true to accept terms and conditions
 *                 example: true
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
 *                 dtcmExpiryDate: "2026-12-31"
 *                 adults: 0
 *                 children: 0
 *                 householdStaffs: 0
 *                 pets: 0
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 acceptTerms: true
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
 *                 dtcmExpiryDate: "2026-12-31"
 *                 adults: 1
 *                 children: 0
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 acceptTerms: true
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
 * /renewal/request/hhc-company:
 *   post:
 *     summary: Create HHC company renewal request
 *     description: Submit a renewal request for a holiday home company. The request will be validated to ensure no approved move-out request exists for the same unit.
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
 *               - dtcmExpiryDate
 *               - tradeLicenseExpiryDate
 *               - acceptTerms
 *               - name
 *               - companyName
 *               - companyEmail
 *               - countryCode
 *               - operatorOfficeNumber
 *               - tradeLicenseNumber
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
 *               acceptTerms:
 *                 type: boolean
 *                 enum: [true]
 *                 description: Must be true to accept terms and conditions
 *                 example: true
 *               name:
 *                 type: string
 *                 description: Company representative's name
 *                 example: "John Doe"
 *               companyName:
 *                 type: string
 *                 description: Company name
 *                 example: "ABC Holiday Homes LLC"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 description: Company email address
 *                 example: "info@abcholidays.com"
 *               countryCode:
 *                 type: string
 *                 description: Country dial code
 *                 example: "+971"
 *               operatorOfficeNumber:
 *                 type: string
 *                 description: Operator office number
 *                 example: "043334444"
 *               tradeLicenseNumber:
 *                 type: string
 *                 description: Trade license number
 *                 example: "TL123456"
 *               nationality:
 *                 type: string
 *                 description: Representative's nationality
 *                 example: "UAE"
 *               emiratesIdNumber:
 *                 type: string
 *                 description: Emirates ID number
 *                 example: "784-1990-12345678-1"
 *               emiratesIdExpiryDate:
 *                 type: string
 *                 format: date
 *                 description: Emirates ID expiry date
 *                 example: "2025-12-31"
 *               companyAddress:
 *                 type: string
 *                 description: Company address
 *                 example: "Dubai, UAE"
 *               companyPhone:
 *                 type: string
 *                 description: Company phone number
 *                 example: "043334444"
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
 *                 leaseContractEndDate: "2026-12-31"
 *                 dtcmExpiryDate: "2026-12-31"
 *                 tradeLicenseExpiryDate: "2026-12-31"
 *                 adults: 0
 *                 children: 0
 *                 householdStaffs: 0
 *                 pets: 0
 *                 peopleOfDetermination: false
 *                 peopleOfDeterminationDetails: ""
 *                 acceptTerms: true
 *                 name: "John Doe"
 *                 companyName: "ABC Holiday Homes LLC"
 *                 companyEmail: "info@abcholidays.com"
 *                 countryCode: "+971"
 *                 operatorOfficeNumber: "043334444"
 *                 tradeLicenseNumber: "TL123456"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2025-12-31"
 *                 companyAddress: "Dubai, UAE"
 *                 companyPhone: "043334444"
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
 *                 leaseContractEndDate: "2026-12-31"
 *                 dtcmExpiryDate: "2026-12-31"
 *                 tradeLicenseExpiryDate: "2026-12-31"
 *                 adults: 1
 *                 children: 0
 *                 householdStaffs: 1
 *                 pets: 1
 *                 peopleOfDetermination: true
 *                 peopleOfDeterminationDetails: "Need wheelchair assistance for elderly or people of determination during renewal process"
 *                 acceptTerms: true
 *                 name: "John Doe"
 *                 companyName: "ABC Holiday Homes LLC"
 *                 companyEmail: "info@abcholidays.com"
 *                 countryCode: "+971"
 *                 operatorOfficeNumber: "043334444"
 *                 tradeLicenseNumber: "TL123456"
 *                 nationality: "UAE"
 *                 emiratesIdNumber: "784-1990-12345678-1"
 *                 emiratesIdExpiryDate: "2025-12-31"
 *                 companyAddress: "Dubai, UAE"
 *                 companyPhone: "043334444"
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
 *     description: Upload documents for a renewal request. Supports multiple document types including Emirates ID, Ejari, Unit Permit, etc.
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
 *                 description: Company trade license (for HHC companies)
 *               title-deed:
 *                 type: string
 *                 format: binary
 *                 description: Title deed document
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

