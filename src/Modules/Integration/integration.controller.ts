import { Request, Response } from 'express';
import { IntegrationService } from './integration.service';

export class IntegrationController {
    private service = new IntegrationService();

    // Health check endpoint
    async health(req: Request, res: Response) {
        try {
            const result = await this.service.processWebhookHealth(req.body);
            res.status(200).json({ success: true, result });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ error: true, message: errorMessage });
        }
    }

    // Add more integration endpoints as needed
}
