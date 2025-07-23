import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';

export class DocumentsController {
    private service = new DocumentsService();

    health(req: Request, res: Response) {
        const result = this.service.health();
        res.status(200).json(result);
    }
}
