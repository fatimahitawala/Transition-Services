import { Request, Response } from 'express';
import { RenewalService } from './renewal.service';

export class RenewalController {
    private service = new RenewalService();

    health(req: Request, res: Response) {
        const result = this.service.health();
        res.status(200).json(result);
    }
}
