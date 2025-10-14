import Joi from 'joi';

export class ActiveResidentsValidation {
  list = {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      per_page: Joi.number().integer().min(1).max(100).default(10),
      search: Joi.string().allow('', null),
      masterCommunity: Joi.number().integer().optional(),
      community: Joi.number().integer().optional(),
      tower: Joi.number().integer().optional(),
      unit: Joi.number().integer().optional(),
      residentType: Joi.string().valid('owner', 'tenant', 'hho', 'hhc').optional(),
    })
  };

  details = {
    params: Joi.object({
      userRoleId: Joi.number().integer().min(1).required(),
    })
  };
}

export default ActiveResidentsValidation;

