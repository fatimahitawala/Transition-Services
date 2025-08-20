import Joi from 'joi';

export class DocumentsValidation {
    
    getWelcomePackList = Joi.object({
        search: Joi.string().optional().description('Search term for master community, community, or tower ID'),
        masterCommunityIds: Joi.string().required().description('Filter by master community IDs (comma-separated) - Required'),
        communityIds: Joi.string().optional().description('Filter by community IDs (comma-separated)'),
        towerIds: Joi.string().optional().description('Filter by tower IDs (comma-separated)'),
        isActive: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().description('Filter by active status (true/false). If not specified, shows all records (both active and inactive)'),
        startDate: Joi.date().iso().optional().description('Filter by start date (ISO format)'),
        endDate: Joi.date().iso().optional().description('Filter by end date (ISO format)'),
        sortBy: Joi.string().valid('id', 'masterCommunityId', 'communityId', 'towerId', 'isActive', 'createdAt', 'updatedAt').optional().description('Sort field'),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional().description('Sort order (ASC/DESC)'),
        page: Joi.number().min(1).optional().description('Page number (default: 1)'),
        per_page: Joi.number().min(1).max(100).optional().description('Items per page (default: 20, max: 100)'),
        includeFile: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().default(false).description('Include file content in response (true/false)')
    });

    createWelcomePack = Joi.object({
        masterCommunityId: Joi.string().required().messages({
            'any.required': 'Master Community is required',
            'string.empty': 'Master Community ID cannot be empty'
        }),
        communityId: Joi.string().required().messages({
            'any.required': 'Community is required',
            'string.empty': 'Community ID cannot be empty'
        }),
        towerId: Joi.string().optional().allow(''),
        templateString: Joi.string().optional(),
        isActive: Joi.string().valid('true', 'false', true, false).default('true')
    });

    getWelcomePackById = Joi.object({
        id: Joi.number().required().messages({
            'any.required': 'Welcome Pack ID is required',
            'number.base': 'Welcome Pack ID must be a number'
        }),
        includeFile: Joi.boolean().optional().default(false).description('Include file content in response')
    });

    updateWelcomePack = Joi.object({
        isActive: Joi.alternatives().try(
            Joi.boolean(),
            Joi.string().valid('true', 'false')
        ).optional().messages({
            'alternatives.types': 'Status must be true, false, "true", or "false"'
        })
    });

    // Welcome Kit PDF Generation Validation
    generateWelcomeKit = Joi.object({
        residentName: Joi.string().required().messages({
            'any.required': 'Resident name is required',
            'string.empty': 'Resident name cannot be empty'
        }),
        unitNumber: Joi.string().required().messages({
            'any.required': 'Unit number is required',
            'string.empty': 'Unit number cannot be empty'
        }),
        buildingName: Joi.string().required().messages({
            'any.required': 'Building name is required',
            'string.empty': 'Building name cannot be empty'
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
            'any.required': 'Template type is required and must be either "move-in" or "move-out"',
            'string.empty': 'Template type cannot be empty',
            'any.only': 'Template type must be either "move-in" or "move-out"'
        }),
        page: Joi.number().integer().min(1).default(1),
        per_page: Joi.number().integer().min(1).max(100).default(20),
        masterCommunityIds: Joi.string().optional(),
        communityIds: Joi.string().optional(),
        towerIds: Joi.string().optional(),
        search: Joi.string().optional(),
        isActive: Joi.boolean().optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        sortBy: Joi.string().valid('id', 'createdAt', 'updatedAt', 'templateType').default('createdAt'),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
        includeFile: Joi.boolean().default(false)
    });

    createTemplate = Joi.object({
        masterCommunityId: Joi.number().integer().required(),
        communityId: Joi.number().integer().required(),
        towerId: Joi.number().integer().optional().allow(null),
        templateType: Joi.string().valid('move-in', 'move-out').required(),
        isActive: Joi.boolean().default(true)
    });

    getTemplateById = Joi.object({
        id: Joi.number().integer().required(),
        includeFile: Joi.boolean().default(false)
    });

    getUnifiedHistory = Joi.object({
        templateType: Joi.string().valid('move-in', 'move-out', 'welcome-pack', 'recipient-mail').required().messages({
            'any.required': 'Template type is required and must be one of: move-in, move-out, welcome-pack, recipient-mail',
            'string.empty': 'Template type cannot be empty',
            'any.only': 'Template type must be one of: move-in, move-out, welcome-pack, recipient-mail'
        }),
        id: Joi.number().integer().required().messages({
            'any.required': 'Template ID is required',
            'number.base': 'Template ID must be a number'
        })
    });

    updateTemplate = Joi.object({
        isActive: Joi.boolean().optional().messages({
            'boolean.base': 'isActive must be a boolean value'
        }),
        masterCommunityId: Joi.number().integer().optional().messages({
            'number.base': 'masterCommunityId must be a number'
        }),
        communityId: Joi.number().integer().optional().messages({
            'number.base': 'communityId must be a number'
        }),
        towerId: Joi.number().integer().optional().allow(null).messages({
            'number.base': 'towerId must be a number'
        }),
        templateType: Joi.string().valid('move-in', 'move-out').optional().messages({
            'any.only': 'templateType must be either "move-in" or "move-out"'
        })
    });

    // Email Recipients Validation Methods
    getEmailRecipientsList = Joi.object({
        search: Joi.string().optional().description('Search term for master community, community, tower, or email addresses'),
        masterCommunityIds: Joi.string().optional().description('Filter by master community IDs (comma-separated)'),
        communityIds: Joi.string().optional().description('Filter by community IDs (comma-separated)'),
        towerIds: Joi.string().optional().description('Filter by tower IDs (comma-separated)'),
        isActive: Joi.boolean().optional().description('Filter by active status (true/false)'),
        startDate: Joi.date().iso().optional().description('Filter by start date (ISO format)'),
        endDate: Joi.date().iso().optional().description('Filter by end date (ISO format)'),
        sortBy: Joi.string().valid('id', 'masterCommunityId', 'communityId', 'towerId', 'isActive', 'createdAt', 'updatedAt').optional().description('Sort field'),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional().description('Sort order (ASC/DESC)'),
        page: Joi.number().min(1).optional().description('Page number (default: 1)'),
        per_page: Joi.number().min(1).max(100).optional().description('Items per page (default: 20, max: 100)')
    });

    createEmailRecipients = Joi.object({
        masterCommunityId: Joi.number().required().messages({
            'any.required': 'Master Community ID is required',
            'number.base': 'Master Community ID must be a number'
        }),
        communityId: Joi.number().required().messages({
            'any.required': 'Community ID is required',
            'number.base': 'Community ID must be a number'
        }),
        towerId: Joi.number().optional().allow(null).messages({
            'number.base': 'Tower ID must be a number'
        }),
        mipRecipients: Joi.string().required().messages({
            'any.required': 'MIP Email Recipients is required',
            'string.empty': 'MIP Email Recipients cannot be empty'
        }),
        mopRecipients: Joi.string().required().messages({
            'any.required': 'MOP Email Recipients is required',
            'string.empty': 'MOP Email Recipients cannot be empty'
        }),
        isActive: Joi.boolean().default(true)
    });

    updateEmailRecipients = Joi.object({
        mipRecipients: Joi.string().optional().messages({
            'string.empty': 'MIP Email Recipients cannot be empty'
        }),
        mopRecipients: Joi.string().optional().messages({
            'string.empty': 'MOP Email Recipients cannot be empty'
        }),
        isActive: Joi.boolean().optional()
    });

    getEmailRecipientsById = Joi.object({
        id: Joi.number().required().messages({
            'any.required': 'Email Recipients ID is required',
            'number.base': 'Email Recipients ID must be a number'
        })
    });


}
