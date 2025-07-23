import { Request, Response } from 'express';
import { MoveOutService } from './moveOut.service';

export class MoveOutController {
    private service = new MoveOutService();

    health(req: Request, res: Response) {
        const result = this.service.health();
        res.status(200).json(result);
    }
}
