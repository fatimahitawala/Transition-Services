import { Request, Response } from 'express';
import { TestHistoryService } from './testHistory.service';
import { successResponseWithData } from '../../Common/Utils/apiResponse';
import { APICodes } from '../../Common/Constants/apiCodes.en';

const testHistoryService = new TestHistoryService();

export class TestHistoryController {
    /**
     * CONSOLIDATED UNIFIED HISTORY ENDPOINT
     * Handles all transition types: move-in, move-out, renewal
     * Returns dummy data for UI integration testing
     * 
     * Query Parameters:
     * - type: 'all' | 'user-visible' | 'milestones' | 'latest-status' | 'summary'
     * - transitionType: 'move-in' | 'move-out' | 'renewal' | 'all'
     * - requestType: 'move-in' | 'move-out' | 'renewal' (alias for transitionType)
     * - trackingId: Specific tracking ID to filter
     * - medium: 'mobile' | 'web' | 'system' | 'cron-job'
     * - startDate, endDate: Date range filtering
     * - limit, offset: Pagination
     */
    async getUnifiedHistory(req: Request, res: Response) {
        const { query } = req;
        
        const result = await testHistoryService.getUnifiedHistory(query);
        
        return successResponseWithData(res, APICodes.COMMON_SUCCESS, result);
    }
}

export default new TestHistoryController();

