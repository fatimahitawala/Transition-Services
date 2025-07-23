import { Request, Response, NextFunction } from 'express';

export function validateDocumentUpload(req: Request, res: Response, next: NextFunction) {
    // TODO: Add validation logic
    next();
}
