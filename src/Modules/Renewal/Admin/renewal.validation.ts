import Joi from 'joi';
import { ACCOUNT_RENEWAL_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS, TRANSITION_DOCUMENT_TYPES } from '../../../Entities/EntityTypes';

export class RenewalValidation {
  
  public getAdminRenewal = {
    query: Joi.object().keys({
      page: Joi.number().optional(),
      per_page: Joi.number().optional(),
      masterCommunityIds: Joi.string().optional(),
      communityIds: Joi.string().optional(),
      towerIds: Joi.string().optional(),
      createdStartDate: Joi.date().iso().optional(),
      createdEndDate: Joi.date().iso().min(Joi.ref('createdStartDate')).optional(),
      status: Joi.string().optional(),
      search: Joi.string().optional(),
      requestId: Joi.string().optional(),
      unitNumber: Joi.string().optional(),
      requestType: Joi.string().valid('tenant', 'hho_company', 'hho_owner').optional(),
      sortBy: Joi.string().valid('id', 'createdAt', 'updatedAt', 'status', 'masterCommunityId', 'communityId', 'towerId', 'unitNumber', 'createdBy', 'updatedBy').optional(),
      sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    })
  };

  public getAdminRenewalDetails = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    })
  };

  public createTenantRenewal = {
    body: Joi.object().keys({
      unitId: Joi.number().required(),
      userId: Joi.number().required(), // Admin specifies which user
      tenancyContractEndDate: Joi.date().required(),
      adults: Joi.number().min(1).max(6).optional().default(1),
      children: Joi.number().min(0).max(6).optional().default(0),
      householdStaffs: Joi.number().min(0).max(4).optional().default(0),
      pets: Joi.number().min(0).max(6).optional().default(0),
      peopleOfDetermination: Joi.boolean().optional().default(false),
      peopleOfDeterminationDetails: Joi.when('peopleOfDetermination', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow('').optional(),
      }),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      dialCode: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      nationality: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      emiratesIdNumber: Joi.string().optional(),
      emiratesIdExpiryDate: Joi.date().optional(),
      passportNumber: Joi.string().optional(),
      visaNumber: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      emergencyContactDialCode: Joi.string().optional(),
      emergencyContactNumber: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public createHhoOwnerRenewal = {
    body: Joi.object().keys({
      unitId: Joi.number().required(),
      userId: Joi.number().required(),
      dtcmExpiryDate: Joi.date().required(),
      adults: Joi.number().min(0).max(6).optional().default(0),
      children: Joi.number().min(0).max(6).optional().default(0),
      householdStaffs: Joi.number().min(0).max(4).optional().default(0),
      pets: Joi.number().min(0).max(6).optional().default(0),
      peopleOfDetermination: Joi.boolean().optional().default(false),
      peopleOfDeterminationDetails: Joi.when('peopleOfDetermination', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow('').optional(),
      }),
      ownerFirstName: Joi.string().optional(),
      ownerLastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      dialCode: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      nationality: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      emiratesIdNumber: Joi.string().optional(),
      passportNumber: Joi.string().optional(),
      visaNumber: Joi.string().optional(),
      unitPermitNumber: Joi.string().optional(),
      unitPermitStartDate: Joi.date().optional(),
      unitPermitExpiryDate: Joi.date().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      powerOfAttorneyNumber: Joi.string().optional(),
      attorneyFirstName: Joi.string().optional(),
      attorneyLastName: Joi.string().optional(),
      attorneyName: Joi.string().optional(),
      attorneyPhone: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      emergencyContactDialCode: Joi.string().optional(),
      emergencyContactNumber: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public createHhcCompanyRenewal = {
    body: Joi.object().keys({
      unitId: Joi.number().required(),
      userId: Joi.number().required(),
      leaseContractEndDate: Joi.date().required(),
      dtcmExpiryDate: Joi.date().required(),
      tradeLicenseExpiryDate: Joi.date().required(),
      adults: Joi.number().min(0).max(6).optional().default(0),
      children: Joi.number().min(0).max(6).optional().default(0),
      householdStaffs: Joi.number().min(0).max(4).optional().default(0),
      pets: Joi.number().min(0).max(6).optional().default(0),
      peopleOfDetermination: Joi.boolean().optional().default(false),
      peopleOfDeterminationDetails: Joi.when('peopleOfDetermination', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow('').optional(),
      }),
      name: Joi.string().optional(),
      companyName: Joi.string().optional(),
      companyEmail: Joi.string().email().optional(),
      countryCode: Joi.string().optional(),
      operatorOfficeNumber: Joi.string().optional(),
      tradeLicenseNumber: Joi.string().optional(),
      nationality: Joi.string().optional(),
      emiratesIdNumber: Joi.string().optional(),
      emiratesIdExpiryDate: Joi.date().optional(),
      companyAddress: Joi.string().optional(),
      companyPhone: Joi.string().optional(),
      powerOfAttorneyNumber: Joi.string().optional(),
      attorneyName: Joi.string().optional(),
      attorneyPhone: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public updateTenantRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      tenancyContractStartDate: Joi.date().optional(),
      tenancyContractEndDate: Joi.date().optional(),
      adults: Joi.number().min(1).max(6).optional(),
      children: Joi.number().min(0).max(6).optional(),
      householdStaffs: Joi.number().min(0).max(4).optional(),
      pets: Joi.number().min(0).max(6).optional(),
      peopleOfDetermination: Joi.boolean().optional(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      dialCode: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      nationality: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      emiratesIdNumber: Joi.string().optional(),
      emiratesIdExpiryDate: Joi.date().optional(),
      passportNumber: Joi.string().optional(),
      visaNumber: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      emergencyContactDialCode: Joi.string().optional(),
      emergencyContactNumber: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public updateHhoOwnerRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      ownerFirstName: Joi.string().optional(),
      ownerLastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      dialCode: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      nationality: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      adults: Joi.number().min(0).max(6).optional(),
      children: Joi.number().min(0).max(6).optional(),
      householdStaffs: Joi.number().min(0).max(4).optional(),
      pets: Joi.number().min(0).max(6).optional(),
      emiratesIdNumber: Joi.string().optional(),
      passportNumber: Joi.string().optional(),
      visaNumber: Joi.string().optional(),
      unitPermitNumber: Joi.string().optional(),
      unitPermitStartDate: Joi.date().optional(),
      unitPermitExpiryDate: Joi.date().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      powerOfAttorneyNumber: Joi.string().optional(),
      attorneyFirstName: Joi.string().optional(),
      attorneyLastName: Joi.string().optional(),
      attorneyName: Joi.string().optional(),
      attorneyPhone: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      emergencyContactDialCode: Joi.string().optional(),
      emergencyContactNumber: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public updateHhcCompanyRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      name: Joi.string().optional(),
      companyName: Joi.string().optional(),
      companyEmail: Joi.string().email().optional(),
      countryCode: Joi.string().optional(),
      operatorOfficeNumber: Joi.string().optional(),
      tradeLicenseNumber: Joi.string().optional(),
      tenancyContractStartDate: Joi.date().optional(),
      unitPermitStartDate: Joi.date().optional(),
      unitPermitExpiryDate: Joi.date().optional(),
      unitPermitNumber: Joi.string().optional(),
      leaseStartDate: Joi.date().optional(),
      leaseEndDate: Joi.date().optional(),
      nationality: Joi.string().optional(),
      emiratesIdNumber: Joi.string().optional(),
      emiratesIdExpiryDate: Joi.date().optional(),
      companyAddress: Joi.string().optional(),
      companyPhone: Joi.string().optional(),
      powerOfAttorneyNumber: Joi.string().optional(),
      attorneyName: Joi.string().optional(),
      attorneyPhone: Joi.string().optional(),
      ejariNumber: Joi.string().optional(),
      dtcmPermitNumber: Joi.string().optional(),
      emergencyContactName: Joi.string().optional(),
      relationship: Joi.string().optional(),
      comments: Joi.string().allow('').optional(),
      monthlyRent: Joi.number().optional(),
      securityDeposit: Joi.number().optional(),
      maintenanceFee: Joi.number().optional(),
      currency: Joi.string().optional(),
    })
  };

  public approveRequest = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      comments: Joi.string().allow('').optional(),
    })
  };

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

  public cancelRequest = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      reason: Joi.string().required(),
      comments: Joi.string().allow('').optional(),
    })
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
    })
  };

// Close validation removed - not applicable for renewals as per BRD
}

