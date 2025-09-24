import Joi from 'joi';

export class MoveOutValidation {

    public getMoveOutRequestById = {
        params: Joi.object().keys({
            requestId: Joi.number().required()
        })
    }

    public adminApproveOrCancelRequest = {
        params: Joi.object().keys({
            action: Joi.string().valid('approve', 'cancel').required(),
            requestId: Joi.number().required()
        }),
        body: Joi.object().keys({
            moveOutDate: Joi.date().required(),
            reason: Joi.string().allow('', null).optional().default("N/A")
        })
    }

    public cancelMoveOutRequestByUser = {
        params: Joi.object().keys({
            requestId: Joi.number().required()
        }),
        body: Joi.object().keys({
            reason: Joi.string().allow('', null).optional().default("N/A")
        })
    }

    public closeMoveOutRequestBySecurity = {
        params: Joi.object().keys({
            requestId: Joi.number().required()
        }),
        body: Joi.object().keys({
            moveOutDate: Joi.date().required(),
        })
    }

    public createMoveOutRequestByUser = {
        body: Joi.object().keys({
            unitId: Joi.number().required(),
            moveOutDate: Joi.date().required(),
            comments: Joi.string().allow('', null).optional().default("N/A")
        })
    }

    public createMoveOutRequestByAdmin = {
        body: Joi.object().keys({
            unitId: Joi.number().required(),
            userId: Joi.number().required(),
            moveOutDate: Joi.date().required(),
            comments: Joi.string().allow('', null).optional().default("N/A")
        })
    }
}
