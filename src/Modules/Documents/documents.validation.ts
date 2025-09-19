import Joi from 'joi';
import { APICodes } from '../../Common/Constants';

export class DocumentsValidation {
    
    getWelcomePackList = Joi.object({
        search: Joi.string().optional().description(APICodes.SEARCH_TERM_DESCRIPTION.message),
        masterCommunityIds: Joi.string().optional().description(APICodes.MASTER_COMMUNITY_IDS_DESCRIPTION.message),
        communityIds: Joi.string().optional().description(APICodes.COMMUNITY_IDS_DESCRIPTION.message),
        towerIds: Joi.string().optional().description(APICodes.TOWER_IDS_DESCRIPTION.message),
        isActive: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().description(APICodes.IS_ACTIVE_DESCRIPTION.message),
        startDate: Joi.date().iso().optional().description(APICodes.START_DATE_DESCRIPTION.message),
        endDate: Joi.date().iso().optional().description(APICodes.END_DATE_DESCRIPTION.message),
        sortBy: Joi.string().valid('id', 'masterCommunityId', 'communityId', 'towerId', 'isActive', 'createdAt', 'updatedAt').optional().description(APICodes.SORT_FIELD_DESCRIPTION.message),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional().description(APICodes.SORT_ORDER_FILTER_DESCRIPTION.message),
        page: Joi.number().min(1).optional().description(APICodes.PAGE_FILTER_DESCRIPTION.message),
        per_page: Joi.number().min(1).max(100).optional().description(APICodes.PER_PAGE_FILTER_DESCRIPTION.message),
        includeFile: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().default(false).description(APICodes.INCLUDE_FILE_DESCRIPTION.message)
    });

    createWelcomePack = Joi.object({
        masterCommunityId: Joi.string().required().messages({
            'any.required': APICodes.MASTER_COMMUNITY_REQUIRED.message,
            'string.empty': APICodes.MASTER_COMMUNITY_REQUIRED.message
        }),
        communityId: Joi.string().required().messages({
            'any.required': APICodes.COMMUNITY_REQUIRED.message,
            'string.empty': APICodes.COMMUNITY_REQUIRED.message
        }),
        towerId: Joi.string().optional().allow(''),
        isActive: Joi.string().valid('true', 'false', true, false).default('true')
    });

    getWelcomePackById = Joi.object({
        id: Joi.number().required().messages({
            'any.required': 'Welcome Pack ID is required',
            'number.base': 'Welcome Pack ID must be a number'
        }),
        includeFile: Joi.boolean().optional().default(false)
    });

    updateWelcomePack = Joi.object({
        masterCommunityId: Joi.number().integer().optional().messages({
            'number.base': APICodes.MASTER_COMMUNITY_ID_MUST_BE_NUMBER.message,
            'number.integer': APICodes.MASTER_COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        communityId: Joi.number().integer().optional().messages({
            'number.base': APICodes.COMMUNITY_ID_MUST_BE_NUMBER.message,
            'number.integer': APICodes.COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        towerId: Joi.number().integer().allow(null).optional().messages({
            'number.base': APICodes.TOWER_ID_MUST_BE_NUMBER.message,
            'number.integer': APICodes.TOWER_ID_MUST_BE_NUMBER.message
        }),
        fileId: Joi.number().integer().optional(),
        isActive: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().messages({
            'alternatives.types': APICodes.STATUS_INVALID_FORMAT.message
        })
    });

    // Welcome Kit PDF Generation Validation
    generateWelcomeKit = Joi.object({
        residentName: Joi.string().required().messages({
            'any.required': APICodes.RESIDENT_NAME_REQUIRED.message,
            'string.empty': APICodes.RESIDENT_NAME_CANNOT_BE_EMPTY.message
        }),
        unitNumber: Joi.string().required().messages({
            'any.required': APICodes.UNIT_NUMBER_REQUIRED.message,
            'string.empty': APICodes.UNIT_NUMBER_CANNOT_BE_EMPTY.message
        }),
        buildingName: Joi.string().required().messages({
            'any.required': APICodes.BUILDING_NAME_REQUIRED.message,
            'string.empty': APICodes.BUILDING_NAME_CANNOT_BE_EMPTY.message
        }),
        communityName: Joi.string().optional(),
        masterCommunityName: Joi.string().optional(),
        dateOfIssue: Joi.string().optional(),
        moveInDate: Joi.string().optional(),
        referenceNumber: Joi.string().optional(),
        contactNumber: Joi.string().optional(),
        moveInTimingsWeekdays: Joi.string().optional(),
        moveInTimingsSundays: Joi.string().optional()
    });

    generateWelcomeKitFromTemplate = Joi.object({
        residentName: Joi.string().optional(),
        unitNumber: Joi.string().optional(),
        buildingName: Joi.string().optional(),
        communityName: Joi.string().optional(),
        masterCommunityName: Joi.string().optional(),
        dateOfIssue: Joi.string().optional(),
        moveInDate: Joi.string().optional(),
        referenceNumber: Joi.string().optional(),
        contactNumber: Joi.string().optional(),
        moveInTimingsWeekdays: Joi.string().optional(),
        moveInTimingsSundays: Joi.string().optional()
    });

    // Consolidated template validation methods
    getTemplateList = Joi.object({
        templateType: Joi.string().valid('move-in', 'move-out').required().messages({
            'any.required': APICodes.TEMPLATE_TYPE_REQUIRED.message,
            'string.empty': APICodes.TEMPLATE_TYPE_CANNOT_BE_EMPTY.message,
            'any.only': APICodes.TEMPLATE_TYPE_INVALID.message
        }),
        page: Joi.number().integer().min(1).default(1).optional(),
        per_page: Joi.number().integer().min(1).max(100).default(20).optional(),
        masterCommunityIds: Joi.string().optional().allow(''),
        communityIds: Joi.string().optional().allow(''),
        towerIds: Joi.string().optional().allow(''),
        search: Joi.string().optional().allow(''),
        isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        sortBy: Joi.string().valid('id', 'createdAt', 'updatedAt', 'templateType').default('createdAt').optional(),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').optional(),
        includeFile: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default(false).optional()
    });

    createTemplate = {
        params: Joi.object({
            templateType: Joi.string().valid('move-in', 'move-out').required(),
        }),
        body: Joi.object({
            masterCommunityId: Joi.number().integer().required(),
            communityId: Joi.number().integer().required(),
            towerId: Joi.number().integer().optional().allow(null),
            isActive: Joi.boolean().default(true)
        })
    };

    getTemplateById = {
        params: Joi.object({
            templateType: Joi.string().valid('move-in', 'move-out').required(),
            id: Joi.number().integer().required(),
        }),
        query: Joi.object({
            includeFile: Joi.boolean().default(false)
        })
    };

    getUnifiedHistory = Joi.object({
        templateType: Joi.string().valid('move-in', 'move-out', 'welcome-pack', 'recipient-mail').required().messages({
            'any.required': APICodes.UNIFIED_TEMPLATE_TYPE_REQUIRED.message,
            'string.empty': APICodes.UNIFIED_TEMPLATE_TYPE_CANNOT_BE_EMPTY.message,
            'any.only': APICodes.UNIFIED_TEMPLATE_TYPE_INVALID.message
        }),
        id: Joi.number().integer().required().messages({
            'any.required': APICodes.TEMPLATE_ID_REQUIRED.message,
            'number.base': APICodes.TEMPLATE_ID_MUST_BE_NUMBER.message
        })
    });

    updateTemplate = {
        params: Joi.object({
            templateType: Joi.string().valid('move-in', 'move-out').required().messages({
                'any.required': APICodes.TEMPLATE_TYPE_REQUIRED.message,
                'string.empty': APICodes.TEMPLATE_TYPE_CANNOT_BE_EMPTY.message,
                'any.only': APICodes.TEMPLATE_TYPE_INVALID.message
            }),
            id: Joi.number().integer().required(),
        }),
        body: Joi.object({
            isActive: Joi.boolean().optional().messages({
                'boolean.base': APICodes.ISACTIVE_MUST_BE_BOOLEAN.message
            }),
            masterCommunityId: Joi.number().integer().optional().messages({
                'number.base': APICodes.MASTER_COMMUNITY_ID_MUST_BE_NUMBER.message
            }),
            communityId: Joi.number().integer().optional().messages({
                'number.base': APICodes.COMMUNITY_ID_MUST_BE_NUMBER.message
            }),
            towerId: Joi.number().integer().optional().allow(null).messages({
                'number.base': APICodes.TOWER_ID_MUST_BE_NUMBER.message
            })
        })
    };

    // Email Recipients Validation Methods
    getEmailRecipientsList = Joi.object({
        search: Joi.string().optional().allow('').default('').description(APICodes.SEARCH_EMAIL_DESCRIPTION.message),
        masterCommunityIds: Joi.string().optional().allow('').default('').description(APICodes.MASTER_COMMUNITY_IDS_DESCRIPTION.message),
        communityIds: Joi.string().optional().allow('').default('').description(APICodes.COMMUNITY_IDS_DESCRIPTION.message),
        towerIds: Joi.string().optional().allow('').default('').description(APICodes.TOWER_IDS_DESCRIPTION.message),
        isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional().description(APICodes.IS_ACTIVE_FILTER_DESCRIPTION.message),
        startDate: Joi.date().iso().optional().description(APICodes.START_DATE_DESCRIPTION.message),
        endDate: Joi.date().iso().optional().description(APICodes.END_DATE_DESCRIPTION.message),
        sortBy: Joi.string().valid('id', 'masterCommunityId', 'communityId', 'towerId', 'isActive', 'createdAt', 'updatedAt').default('createdAt').optional().description(APICodes.SORT_FIELD_DESCRIPTION.message),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').optional().description(APICodes.SORT_ORDER_FILTER_DESCRIPTION.message),
        page: Joi.number().min(1).default(1).optional().description(APICodes.PAGE_FILTER_DESCRIPTION.message),
        per_page: Joi.number().min(1).max(100).default(20).optional().description(APICodes.PER_PAGE_FILTER_DESCRIPTION.message)
    });

    createEmailRecipients = Joi.object({
        masterCommunityId: Joi.number().required().messages({
            'any.required': APICodes.MASTER_COMMUNITY_REQUIRED.message,
            'number.base': APICodes.MASTER_COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        communityId: Joi.number().required().messages({
            'any.required': APICodes.COMMUNITY_REQUIRED.message,
            'number.base': APICodes.COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        towerId: Joi.number().optional().allow(null).messages({
            'number.base': APICodes.TOWER_ID_MUST_BE_NUMBER.message
        }),
        mipRecipients: Joi.string().required().messages({
            'any.required': APICodes.MIP_RECIPIENTS_REQUIRED.message,
            'string.empty': APICodes.MIP_RECIPIENTS_CANNOT_BE_EMPTY.message
        }),
        mopRecipients: Joi.string().required().messages({
            'any.required': APICodes.MOP_RECIPIENTS_REQUIRED.message,
            'string.empty': APICodes.MOP_RECIPIENTS_CANNOT_BE_EMPTY.message
        }),
        isActive: Joi.boolean().default(true)
    });

    updateEmailRecipients = Joi.object({
        masterCommunityId: Joi.number().integer().optional().messages({
            'number.base': APICodes.MASTER_COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        communityId: Joi.number().integer().optional().messages({
            'number.base': APICodes.COMMUNITY_ID_MUST_BE_NUMBER.message
        }),
        towerId: Joi.number().integer().optional().allow(null).messages({
            'number.base': APICodes.TOWER_ID_MUST_BE_NUMBER.message
        }),
        mipRecipients: Joi.string().optional().messages({
            'string.empty': APICodes.MIP_RECIPIENTS_CANNOT_BE_EMPTY.message
        }),
        mopRecipients: Joi.string().optional().messages({
            'string.empty': APICodes.MOP_RECIPIENTS_CANNOT_BE_EMPTY.message
        }),
        isActive: Joi.boolean().optional()
    });

    getEmailRecipientsById = Joi.object({
        id: Joi.number().required().messages({
            'any.required': APICodes.EMAIL_RECIPIENTS_ID_REQUIRED.message,
            'number.base': APICodes.EMAIL_RECIPIENTS_ID_MUST_BE_NUMBER.message
        })
    });


}
