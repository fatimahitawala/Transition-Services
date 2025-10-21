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
      adults: Joi.number().min(1).max(6).required(),
      children: Joi.number().min(0).max(6).required(),
      householdStaffs: Joi.number().min(0).max(4).required(),
      pets: Joi.number().min(0).max(6).required(),
      determinationComments: Joi.string().allow('').optional(),
    })
  };

  public createHhoOwnerRenewal = {
    body: Joi.object().keys({
      unitId: Joi.number().required(),
      userId: Joi.number().required(),
      dtcmPermitEndDate: Joi.date().required(),
    })
  };

  public createHhcCompanyRenewal = {
    body: Joi.object().keys({
      unitId: Joi.number().required(),
      userId: Joi.number().required(),
      leaseContractEndDate: Joi.date().required(),
      dtcmPermitEndDate: Joi.date().required(),
      permitExpiry: Joi.date().required(),
    })
  };

  public updateTenantRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      tenancyContractEndDate: Joi.date().optional(),
      adults: Joi.number().min(1).max(6).optional(),
      children: Joi.number().min(0).max(6).optional(),
      householdStaffs: Joi.number().min(0).max(4).optional(),
      pets: Joi.number().min(0).max(6).optional(),
      determinationComments: Joi.string().allow('').optional(),
    })
  };

  public updateHhoOwnerRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      dtcmPermitEndDate: Joi.date().optional(),
    })
  };

  public updateHhcCompanyRenewal = {
    params: Joi.object().keys({
      requestId: Joi.number().required(),
    }),
    body: Joi.object().keys({
      leaseContractEndDate: Joi.date().optional(),
      dtcmPermitEndDate: Joi.date().optional(),
      permitExpiry: Joi.date().optional(),
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

