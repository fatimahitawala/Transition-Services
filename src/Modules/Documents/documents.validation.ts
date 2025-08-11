import Joi from 'joi';

export class DocumentsValidation {
    
    getWelcomePackList = Joi.object({
        search: Joi.string().optional().description('Search term for master community, community, or tower ID'),
        masterCommunityIds: Joi.string().required().description('Filter by master community IDs (comma-separated) - Required'),
        communityIds: Joi.string().optional().description('Filter by community IDs (comma-separated)'),
        towerIds: Joi.string().optional().description('Filter by tower IDs (comma-separated)'),
        isActive: Joi.boolean().optional().description('Filter by active status (true/false)'),
        startDate: Joi.date().iso().optional().description('Filter by start date (ISO format)'),
        endDate: Joi.date().iso().optional().description('Filter by end date (ISO format)'),
        sortBy: Joi.string().valid('id', 'masterCommunityId', 'communityId', 'towerId', 'isActive', 'createdAt', 'updatedAt').optional().description('Sort field'),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional().description('Sort order (ASC/DESC)'),
        page: Joi.number().min(1).optional().description('Page number (default: 1)'),
        per_page: Joi.number().min(1).max(100).optional().description('Items per page (default: 20, max: 100)'),
        includeFile: Joi.boolean().optional().default(false).description('Include file content in response')
    });

    createWelcomePack = Joi.object({
        masterCommunityId: Joi.number().required().messages({
            'any.required': 'Master Community is required',
            'number.base': 'Master Community ID must be a number'
        }),
        communityId: Joi.number().required().messages({
            'any.required': 'Community is required',
            'number.base': 'Community ID must be a number'
        }),
        towerId: Joi.number().optional(),
        templateString: Joi.string().optional(),
        isActive: Joi.boolean().default(true)
    });

    getWelcomePackById = Joi.object({
        id: Joi.number().required().messages({
            'any.required': 'Welcome Pack ID is required',
            'number.base': 'Welcome Pack ID must be a number'
        }),
        includeFile: Joi.boolean().optional().default(false).description('Include file content in response')
    });

    updateWelcomePack = Joi.object({
        isActive: Joi.boolean().required().messages({
            'any.required': 'Status is required',
            'boolean.base': 'Status must be true or false'
        })
    });



    // Consolidated template validation methods
    getTemplateList = Joi.object({
        templateType: Joi.string().valid('move-in', 'move-out').optional(),
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

    updateTemplate = Joi.object({
        isActive: Joi.boolean().optional()
    });
}
