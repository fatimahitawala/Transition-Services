import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export function validateMoveIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // TODO: Add validation logic
  next();
}

export class MoveInvalidation {
  public getMobileMoveIn = {
    query: Joi.object().keys({
      page: Joi.number().optional(),
      per_page: Joi.number().optional(),
      masterCommunityIds: Joi.string().optional(),
      communityIds: Joi.string().optional(),
      towerIds: Joi.string().optional(),
      amenityTypeIds: Joi.string().optional(),
      names: Joi.string().optional(),
      amenityIds: Joi.string().optional(),
      withAccess: Joi.boolean().optional(),
    }),
  };
}
