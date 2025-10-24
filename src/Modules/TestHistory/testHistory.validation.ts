import Joi from 'joi';
import { APICodes } from '../../Common/Constants';

export class TestHistoryValidation {
    /**
     * Validation for unified history endpoint
     * Validates all query parameters for the test history API
     */
    getUnifiedHistory = Joi.object({
        // Transition type filtering
        transitionType: Joi.string()
            .valid('move-in', 'move-out', 'renewal', 'all')
            .optional()
            .default('move-in')
            .description('Type of transition to retrieve history for')
            .messages({
                'string.base': 'Transition type must be a string',
                'any.only': 'Transition type must be one of: move-in, move-out, renewal, all'
            }),

        // Alias for transitionType
        requestType: Joi.string()
            .valid('move-in', 'move-out', 'renewal')
            .optional()
            .description('Alias for transitionType parameter')
            .messages({
                'string.base': 'Request type must be a string',
                'any.only': 'Request type must be one of: move-in, move-out, renewal'
            }),

        // History view type
        type: Joi.string()
            .valid('all', 'user-visible', 'milestones', 'latest-status', 'summary')
            .optional()
            .default('all')
            .description('Filter history view type')
            .messages({
                'string.base': 'Type must be a string',
                'any.only': 'Type must be one of: all, user-visible, milestones, latest-status, summary'
            }),

        // Tracking ID filter
        trackingId: Joi.string()
            .pattern(/^TR-\d{8}-\d{5}$/)
            .optional()
            .description('Specific tracking ID in format: TR-YYYYMMDD-XXXXX')
            .messages({
                'string.base': 'Tracking ID must be a string',
                'string.pattern.base': 'Tracking ID must be in format: TR-YYYYMMDD-XXXXX (e.g., TR-20250109-00001)'
            }),

        // Unit ID filter
        unitId: Joi.number()
            .integer()
            .positive()
            .optional()
            .description('Unit ID to filter history')
            .messages({
                'number.base': 'Unit ID must be a number',
                'number.integer': 'Unit ID must be an integer',
                'number.positive': 'Unit ID must be positive'
            }),

        // Medium filter
        medium: Joi.string()
            .valid('mobile', 'web', 'system', 'cron-job')
            .optional()
            .description('Filter by platform/medium')
            .messages({
                'string.base': 'Medium must be a string',
                'any.only': 'Medium must be one of: mobile, web, system, cron-job'
            }),

        // Filter by method (deprecated but kept for backwards compatibility)
        filterBy: Joi.string()
            .valid('trackingId', 'unit', 'medium', 'requestType')
            .optional()
            .description('Filter method (deprecated, use specific filters instead)')
            .messages({
                'string.base': 'Filter by must be a string',
                'any.only': 'Filter by must be one of: trackingId, unit, medium, requestType'
            }),

        // Date range filtering
        startDate: Joi.date()
            .iso()
            .optional()
            .description('Start date for filtering (ISO format)')
            .messages({
                'date.base': 'Start date must be a valid date',
                'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
            }),

        endDate: Joi.date()
            .iso()
            .optional()
            .min(Joi.ref('startDate'))
            .description('End date for filtering (ISO format, must be after start date)')
            .messages({
                'date.base': 'End date must be a valid date',
                'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
                'date.min': 'End date must be after or equal to start date'
            }),

        // Pagination
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .description('Number of records per page (1-100)')
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100'
            }),

        offset: Joi.number()
            .integer()
            .min(0)
            .optional()
            .default(0)
            .description('Pagination offset (0-indexed)')
            .messages({
                'number.base': 'Offset must be a number',
                'number.integer': 'Offset must be an integer',
                'number.min': 'Offset must be 0 or greater'
            }),

        // Common pagination parameters (aliases)
        page: Joi.number()
            .integer()
            .min(1)
            .optional()
            .description('Page number (1-indexed, alternative to offset)')
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),

        per_page: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .optional()
            .description('Records per page (alternative to limit)')
            .messages({
                'number.base': 'Per page must be a number',
                'number.integer': 'Per page must be an integer',
                'number.min': 'Per page must be at least 1',
                'number.max': 'Per page cannot exceed 100'
            })
    }).custom((value, helpers) => {
        // Custom validation: If summary type is used, ensure date range is provided
        if (value.type === 'summary' && (!value.startDate || !value.endDate)) {
            return helpers.warn('summary-without-dates', {
                message: 'When using type=summary, it is recommended to provide startDate and endDate for accurate reporting'
            });
        }

        // Convert page/per_page to offset/limit for consistency
        if (value.page && value.per_page) {
            value.offset = (value.page - 1) * value.per_page;
            value.limit = value.per_page;
        } else if (value.page) {
            value.offset = (value.page - 1) * (value.limit || 50);
        } else if (value.per_page) {
            value.limit = value.per_page;
        }

        return value;
    });
}

