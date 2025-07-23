import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';

export class WebhookController {
    private service = new WebhookService();

    health(req: Request, res: Response) {
        const result = this.service.health();
        res.status(200).json(result);
    }
}
