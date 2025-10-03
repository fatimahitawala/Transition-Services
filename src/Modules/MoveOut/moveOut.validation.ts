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
            // Required when action=approve (enforced in service to keep middleware simple)
            moveOutDate: Joi.date().optional(),
            // Required when action=cancel (enforced in service)
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
            reason: Joi.string().allow('', null).optional().default("N/A")
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

    public getUserDetailsByUnitParams = {
        params: Joi.object().keys({
            unitId: Joi.number().required(),
        })
    }
}
