import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { APICodes } from "../../../Common/Constants";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";

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
    // Use standardized message for exceeding allowed future window
    return helpers.message(APICodes.MOVE_IN_DATE_TOO_FAR.message);
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

const validateEmiratesIdExpiry = (value: any, helpers: any) => {
  if (new Date(value) <= new Date()) {
    return helpers.message(APICodes.EMIRATES_ID_EXPIRY_FUTURE.message);
  }
  return value;
};

export function validateMoveIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // TODO: Add validation logic
  next();
}

export class MoveInvalidation {
  public getMobileMoveIn = {
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

  public createOwnerMoveIn = {
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).optional(),
            detailsText: Joi.string().allow('').optional(),
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
        firstName: Joi.string().max(100).required(),
        lastName: Joi.string().max(100).required(),
        email: Joi.string().email().max(255).required(),
        dialCode: Joi.string().max(10).required(),
        phoneNumber: Joi.string().max(20).required(),
        nationality: Joi.string().max(100).required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        tenancyContractStartDate: Joi.date().iso().required(),
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
        // Owner identity (can come from UI; if omitted, will be derived from authenticated user)
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
            unitPermitNumber: Joi.string().required(),
            unitPermitStartDate: Joi.date().iso().required(),
            unitPermitExpiryDate: Joi.date()
              .iso()
              .custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE))
              .required(),
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
        name: Joi.string().required(),
        company: Joi.string().required(),
        companyEmail: Joi.string().email().required(),
        countryCode: Joi.string().required(),
        operatorOfficeNumber: Joi.string().required(),
        tradeLicenseNumber: Joi.string().required(),
        tenancyContractStartDate: Joi.date().iso().required(),
        unitPermitStartDate: Joi.date().iso().required(),
        unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).required(),
        unitPermitNumber: Joi.string().required(),
        leaseStartDate: Joi.date().iso().required(),
        leaseEndDate: Joi.date().iso().custom(validateDateAfter('leaseStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            termsAccepted: Joi.boolean().valid(true).required(),
          })
          .required(),
      })
      .required(),
  };

  // ============ UPDATE (PUT) validations ============
  public updateOwnerMoveIn = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            adults: Joi.number().integer().min(1).max(6).required(),
            children: Joi.number().integer().min(0).max(6).required(),
            householdStaffs: Joi.number().integer().min(0).max(4).required(),
            pets: Joi.number().integer().min(0).max(6).required(),
            peopleOfDetermination: Joi.boolean().default(false).optional(),
            detailsText: Joi.string().allow('').optional(),
          })
          .required(),
      })
      .required(),
  };

  public updateTenantMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        firstName: Joi.string().max(100).required(),
        lastName: Joi.string().max(100).required(),
        email: Joi.string().email().max(255).required(),
        dialCode: Joi.string().max(10).required(),
        phoneNumber: Joi.string().max(20).required(),
        nationality: Joi.string().max(100).required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        tenancyContractStartDate: Joi.date().iso().required(),
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
          })
          .required(),
      })
      .required(),
  };

  public updateHhcCompanyMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        name: Joi.string().required(),
        company: Joi.string().required(),
        companyEmail: Joi.string().email().required(),
        countryCode: Joi.string().required(),
        operatorOfficeNumber: Joi.string().required(),
        tradeLicenseNumber: Joi.string().required(),
        tenancyContractStartDate: Joi.date().iso().required(),
        unitPermitStartDate: Joi.date().iso().required(),
        unitPermitExpiryDate: Joi.date().iso().custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE)).required(),
        unitPermitNumber: Joi.string().required(),
        leaseStartDate: Joi.date().iso().required(),
        leaseEndDate: Joi.date().iso().custom(validateDateAfter('leaseStartDate', APICodes.LEASE_DATE_RANGE)).required(),
        nationality: Joi.string().required(),
        emiratesIdNumber: Joi.string().required(),
        emiratesIdExpiryDate: Joi.date().iso().custom(validateEmiratesIdExpiry).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            termsAccepted: Joi.boolean().valid(true).required(),
          })
          .required(),
      })
      .required(),
  };

  public updateHhoOwnerMoveIn = {
    params: Joi.object().keys({ requestId: Joi.number().required() }),
    body: Joi.object()
      .keys({
        unitId: Joi.number().required(),
        moveInDate: Joi.date().iso().custom(moveInAtLeastDaysLater(30)).required(),
        comments: Joi.string().allow('').optional(),
        additionalInfo: Joi.string().allow('').optional(),
        details: Joi.object()
          .keys({
            unitPermitNumber: Joi.string().required(),
            unitPermitStartDate: Joi.date().iso().required(),
            unitPermitExpiryDate: Joi.date()
              .iso()
              .custom(validateDateAfter('unitPermitStartDate', APICodes.UNIT_PERMIT_DATE_RANGE))
              .required(),
            termsAccepted: Joi.boolean().valid(true).required(),
          })
          .required(),
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
}
