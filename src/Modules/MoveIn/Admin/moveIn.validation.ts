import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { APICodes } from "../../../Common/Constants";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

// Custom validation functions
const moveInAtLeastDaysLater = (days: number) => (value: any, helpers: any) => {
  const inputDate = new Date(value);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + days);

  // Check if date is in the future (not today or past)
  if (inputDate <= now) {
    return helpers.message(APICodes.MOVE_IN_DATE_FUTURE.message);
  }

  // Check if date is within specified days from today (not beyond)
  if (inputDate > maxDate) {
    const message = APICodes.MOVE_IN_DATE_WITHIN_DAYS.message.replace('{days}', days.toString());
    return helpers.message(message);
  }

  return value;
};

// Custom validation function for edit operations - allows dates within 30 days from current date
const moveInWithinDays = (days: number) => (value: any, helpers: any) => {
  const inputDate = new Date(value);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + days);

  // For edit operations, allow dates within the specified days from today
  // This means: currentDate < moveInDate <= currentDate + days
  if (inputDate <= now) {
    return helpers.message(APICodes.MOVE_IN_DATE_FUTURE.message);
  }

  // Check if date is within specified days from today (not beyond)
  if (inputDate > maxDate) {
    const message = APICodes.MOVE_IN_DATE_WITHIN_DAYS.message.replace('{days}', days.toString());
    return helpers.message(message);
  }

  return value;
};

const validateDateAfter = (fieldName: string, apicode: any) => (value: any, helpers: any) => {
  const { [fieldName]: startDate } = helpers.state.ancestors[0];
  if (startDate && new Date(value) <= new Date(startDate)) {
    return helpers.message(apicode.message);
  }
  return value;
};

const validateTenancyContractStartBeforeMoveIn = (value: any, helpers: any) => {
  const { moveInDate } = helpers.state.ancestors[0];
  if (moveInDate && new Date(value) >= new Date(moveInDate)) {
    return helpers.message(APICodes.TENANCY_CONTRACT_START_BEFORE_MOVE_IN.message);
  }
  return value;
};

const validateEmiratesIdExpiry = (value: any, helpers: any) => {
  if (new Date(value) <= new Date()) {
    return helpers.message(APICodes.EMIRATES_ID_EXPIRY_FUTURE.message);
  }
  return value;
};

export function validateMoveIn(req: Request, res: Response, next: NextFunction) {
  // TODO: Add validation logic
  next();
}

export class MoveInvalidation {

  public getAdminMoveIn = {
    query: Joi.object().keys({
      page: Joi.number().optional(),
      per_page: Joi.number().optional(),
      masterCommunityIds: Joi.string().optional(),
      communityIds: Joi.string().optional(),
      towerIds: Joi.string().optional(),
      createdStartDate: Joi.date().iso().optional(),
      createdEndDate: Joi.date().iso().min(Joi.ref('createdStartDate')).optional(),
      moveInStartDate: Joi.date().iso().optional(),
      moveInEndDate: Joi.date().iso().min(Joi.ref('moveInStartDate')).optional(),
      status: Joi.string().optional(),
      search: Joi.string().optional(),
      requestId: Joi.string().optional(),
      unitNumber: Joi.string().optional(),
      requestType: Joi.string().valid('OWNER', 'TENANT', 'HHO_OWNER', 'HHO_COMPANY').optional(),
      sortBy: Joi.string().valid('id', 'createdAt', 'updatedAt', 'moveInDate', 'status', 'masterCommunityId', 'communityId', 'towerId', 'unitNumber', 'createdBy', 'updatedBy').optional(),
      sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    }),
  };

  public getAdminMoveInDetails = {
    query: Joi.object().keys({
      page: Joi.number().optional(),
      per_page: Joi.number().optional(),
      masterCommunityIds: Joi.string().optional(),
      communityIds: Joi.string().optional(),
      towerIds: Joi.string().optional(),
      amenityTypeIds: Joi.string().optional(),
      names: Joi.string().optional(),
      amenityIds: Joi.string().optional(),
      withAccess: Joi.boolean().optional(),
    }),
  };

  // New validation schemas for Admin move-in requests
  public createOwnerMoveIn = {
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        userId: Joi.number().required(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).required(),
            detailsText: Joi.string().allow('').when('peopleOfDetermination', {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional()
            }),
          })
          .required(),
      })
      .required(),
  };

  public createTenantMoveIn = {
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        userId: Joi.number().required(),
        firstName: Joi.string().max(100).required(),
        lastName: Joi.string().max(100).required(),
        email: Joi.string().email().max(255).required(),
        dialCode: Joi.string().max(10).required(),
        phoneNumber: Joi.string().max(20).required(),
        nationality: Joi.string().max(100).required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        tenancyContractStartDate: Joi.date().iso().custom(validateTenancyContractStartBeforeMoveIn).required(),
        tenancyContractEndDate: Joi.date().iso().custom(validateDateAfter('tenancyContractStartDate', APICodes.TENANCY_CONTRACT_DATE_RANGE)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).required(),
            termsAccepted: Joi.boolean().valid(true).required(),
            detailsText: Joi.when('peopleOfDetermination', {
              is: true,
              then: Joi.string().required(),
              otherwise: Joi.string().allow('').optional(),
            }),
          })
          .required(),
      })
      .required(),
  };

  public createHhoOwnerMoveIn = {
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        userId: Joi.number().required(),
        // Optional owner identity fields - if omitted, derived from authenticated admin
        ownerFirstName: Joi.string().max(100).optional(),
        ownerLastName: Joi.string().max(100).optional(),
        email: Joi.string().email().max(255).optional(),
        dialCode: Joi.string().max(10).optional(),
        phoneNumber: Joi.string().max(20).optional(),
        nationality: Joi.string().max(100).optional(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            unitPermitNumber: Joi.string().optional(),
            unitPermitStartDate: Joi.date().iso().optional(),
            unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).optional(),
            termsAccepted: Joi.boolean().valid(true).required(),
          })
          .required(),
      })
      .required(),
  };

  public createHhcCompanyMoveIn = {
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        userId: Joi.number().required(),
        userEmail: Joi.string().email().required(),
        firstName: Joi.string().required(),
        middleName: Joi.string().allow('').optional(),
        lastName: Joi.string().required(),
        mobileNumber: Joi.string().required(),
        name: Joi.string().required(),
        company: Joi.string().required(),
        companyEmail: Joi.string().email().required(),
        countryCode: Joi.string().optional(),
        operatorOfficeNumber: Joi.string().required(),
        tradeLicenseNumber: Joi.string().required(),
        tradeLicenseExpiryDate: Joi.date().iso().required(),
        nationality: Joi.string().required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().required(),
        tenancyContractStartDate: Joi.date().iso().custom(validateTenancyContractStartBeforeMoveIn).required(),
        unitPermitStartDate: Joi.date().iso().required(),
        unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).required(),
        unitPermitNumber: Joi.string().required(),
        leaseStartDate: Joi.date().iso().required(),
        leaseEndDate: Joi.date().iso().custom(validateDateAfter('leaseStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        dtcmStartDate: Joi.date().iso().required(),
        dtcmExpiryDate: Joi.date().iso().custom(validateDateAfter('dtcmStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        // Do not require or persist termsAccepted for HHC company
        // Accept and ignore any incoming details payload
        details: Joi.any().optional(),
      })
      .required(),
  };

  public uploadDocuments = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      // Files are handled by multer middleware
      // Body can contain file IDs for existing files
      [`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`]: Joi.number().optional(),
      [`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`]: Joi.number().optional(),
    }),
  };

  // ==================== STATUS MANAGEMENT VALIDATIONS ====================

  /**
   * Validation for approving move-in request (UC-136)
   */
  public approveRequest = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      comments: Joi.string().optional().allow('').messages({
        'string.base': 'Comments must be a string'
      }),
    }).required(),
  };

  /**
   * Validation for marking request as RFI (UC-135)
   */
  public markRequestAsRFI = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      comments: Joi.string().optional().allow('').messages({
        'string.base': 'Comments must be a string'
      }),
    }).required(),
  };

  /**
   * Validation for cancelling move-in request (UC-138)
   */
  public cancelRequest = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      cancellationRemarks: Joi.string().optional().allow('').messages({
        'string.base': 'Cancellation remarks must be a string'
      }),
    }).required(),
  };

  /**
   * Validation for closing move-in request (UC-139)
   */
  public closeRequest = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      closureRemarks: Joi.string().required().messages({
        'any.required': 'Closure remarks are mandatory'
      }),
      actualMoveInDate: Joi.date().iso().required().messages({
        'any.required': 'Actual move-in date is mandatory',
        'date.format': 'Actual move-in date must be in ISO format (YYYY-MM-DD)'
      }),
    }).required(),
  };

  // ==================== UPDATE VALIDATIONS ====================

  /**
   * Validation for updating owner move-in request
   */
  public updateOwnerMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInWithinDays(30)).required(),
        status: Joi.string().valid('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed').required(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).required(),
            detailsText: Joi.string().allow('').when('peopleOfDetermination', {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional()
            }),
          })
          .required(),
      })
      .required(),
  };

  /**
   * Validation for updating tenant move-in request
   */
  public updateTenantMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInWithinDays(30)).required(),
        status: Joi.string().valid('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed').required(),
        firstName: Joi.string().max(100).required(),
        lastName: Joi.string().max(100).required(),
        email: Joi.string().email().max(255).required(),
        dialCode: Joi.string().max(10).required(),
        phoneNumber: Joi.string().max(20).required(),
        nationality: Joi.string().max(100).required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        tenancyContractStartDate: Joi.date().iso().custom(validateTenancyContractStartBeforeMoveIn).required(),
        tenancyContractEndDate: Joi.date().iso().custom(validateDateAfter('tenancyContractStartDate', APICodes.TENANCY_CONTRACT_DATE_RANGE)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).required(),
            termsAccepted: Joi.boolean().valid(true).required(),
            detailsText: Joi.when('peopleOfDetermination', {
              is: true,
              then: Joi.string().required(),
              otherwise: Joi.string().allow('').optional(),
            }),
          })
          .required(),
      })
      .required(),
  };

  /**
   * Validation for updating HHO unit move-in request
   */
  public updateHhoOwnerMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInWithinDays(30)).required(),
        status: Joi.string().valid('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed').required(),
        // Optional owner identity fields - if omitted, derived from authenticated admin
        ownerFirstName: Joi.string().max(100).optional(),
        ownerLastName: Joi.string().max(100).optional(),
        email: Joi.string().email().max(255).optional(),
        dialCode: Joi.string().max(10).optional(),
        phoneNumber: Joi.string().max(20).optional(),
        nationality: Joi.string().max(100).optional(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            unitPermitNumber: Joi.string().optional(),
            unitPermitStartDate: Joi.date().iso().optional(),
            unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).optional(),
            termsAccepted: Joi.boolean().valid(true).required(),
          })
          .required(),
      })
      .required(),
  };

  /**
   * Validation for updating HHC company move-in request
   */
  public updateHhcCompanyMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInWithinDays(30)).required(),
        status: Joi.string().valid('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed').required(),
        userEmail: Joi.string().email().max(255).required(),
        firstName: Joi.string().max(100).required(),
        middleName: Joi.string().max(100).allow('').optional(),
        lastName: Joi.string().max(100).required(),
        mobileNumber: Joi.string().max(20).required(),
        name: Joi.string().required(),
        company: Joi.string().required(),
        companyEmail: Joi.string().email().required(),
        countryCode: Joi.string().required(),
        operatorOfficeNumber: Joi.string().required(),
        tradeLicenseNumber: Joi.string().required(),
        tradeLicenseExpiryDate: Joi.date().iso().required(),
        nationality: Joi.string().max(100).required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        tenancyContractStartDate: Joi.date().iso().optional(),
        unitPermitStartDate: Joi.date().iso().required(),
        unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).required(),
        unitPermitNumber: Joi.string().required(),
        leaseStartDate: Joi.date().iso().required(),
        leaseEndDate: Joi.date().iso().custom(validateDateAfter('leaseStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        dtcmStartDate: Joi.date().iso().required(),
        dtcmExpiryDate: Joi.date().iso().custom(validateDateAfter('dtcmStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        // Do not require or persist termsAccepted for HHC company
        // Accept and ignore any incoming details payload
        details: Joi.any().optional(),
      })
      .required(),
  };

 /**
   * Validation for move-in unit allocation
   */
  public moveInUnitAllocation = {
    body: Joi.object()
      .keys({
        requestId: Joi.number().required(),
      })
      .required(),
  };

}
