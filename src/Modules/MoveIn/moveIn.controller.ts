import { Request, Response } from 'express';
import { MoveInService } from './moveIn.service';

export class MoveInController {
    private service = new MoveInService();

    health(req: Request, res: Response) {
        const result = this.service.health();
        res.status(200).json(result);
    }
}
