import Joi from 'joi';

export class EmailValidation {
    sendMoveInStatusEmail = {
        body: Joi.object().keys({
            requestId: Joi.number().required(),
            requestNumber: Joi.string().required(),
            status: Joi.string().required(),
            userDetails: Joi.object().keys({
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                email: Joi.string().email().required()
            }).required(),
            unitDetails: Joi.object().keys({
                unitNumber: Joi.string().required(),
                unitName: Joi.string().required(),
                masterCommunityId: Joi.number().required(),
                communityId: Joi.number().required(),
                towerId: Joi.number().optional().allow(null),
                masterCommunityName: Joi.string().required(),
                communityName: Joi.string().required(),
                towerName: Joi.string().optional().allow(null, '')
            }).required(),
            moveInDate: Joi.date().optional(),
            comments: Joi.string().optional().allow(null, ''),
            additionalInfo: Joi.any().optional()
        })
    };

    sendMoveInApprovalEmail = {
        body: Joi.object().keys({
            requestId: Joi.number().required(),
            requestNumber: Joi.string().required(),
            status: Joi.string().required(),
            userDetails: Joi.object().keys({
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                email: Joi.string().email().required()
            }).required(),
            unitDetails: Joi.object().keys({
                unitNumber: Joi.string().required(),
                unitName: Joi.string().required(),
                masterCommunityId: Joi.number().required(),
                communityId: Joi.number().required(),
                towerId: Joi.number().optional().allow(null),
                masterCommunityName: Joi.string().required(),
                communityName: Joi.string().required(),
                towerName: Joi.string().optional().allow(null, '')
            }).required(),
            moveInDate: Joi.date().optional(),
            comments: Joi.string().optional().allow(null, ''),
            additionalInfo: Joi.any().optional()
        })
    };

    testEmail = {
        body: Joi.object().keys({
            to: Joi.string().email().required(),
            subject: Joi.string().required(),
            content: Joi.string().required()
        })
    };
}
