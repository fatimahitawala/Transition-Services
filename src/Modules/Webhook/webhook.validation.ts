import { Request, Response, NextFunction } from 'express';

export function validateWebhook(req: Request, res: Response, next: NextFunction) {
    // TODO: Add validation logic
    next();
}
