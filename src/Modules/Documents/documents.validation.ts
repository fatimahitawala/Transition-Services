import Joi from 'joi';

export class DocumentsValidation {
    
    getWelcomePackList = Joi.object({
        search: Joi.string().optional().description('Search term for master community, community, or tower ID'),
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
        })
    });

    updateWelcomePack = Joi.object({
        isActive: Joi.boolean().required().messages({
            'any.required': 'Status is required',
            'boolean.base': 'Status must be true or false'
        })
    });
}
