import express from 'express';
import testHistoryController from './testHistory.controller';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';
import { TestHistoryValidation } from './testHistory.validation';
import { validate } from '../../Common/Middlewares/validate';
import { catchAsync } from '../../Common/Middlewares/catchAsync';

const router = express.Router();
const auth = new AuthMiddleware();
const testHistoryValidation = new TestHistoryValidation();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONSOLIDATED TRANSITION HISTORY ROUTE - TEST/MOCK DATA FOR UI INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Single unified endpoint that handles ALL transition history scenarios
 * Returns dummy data for testing UI integration without database dependency
 * 
 * ───────────────────────────────────────────────────────────────────────────
 * QUERY PARAMETERS
 * ───────────────────────────────────────────────────────────────────────────
 * 
 * @param {string} type - History view type
 *    Options: 'all' | 'user-visible' | 'milestones' | 'latest-status' | 'summary'
 *    Default: 'all'
 * 
 * @param {string} transitionType - Type of transition
 *    Options: 'move-in' | 'move-out' | 'renewal' | 'all'
 *    Default: 'move-in'
 * 
 * @param {string} requestType - Alias for transitionType
 *    Options: 'move-in' | 'move-out' | 'renewal'
 * 
 * @param {string} trackingId - Specific tracking ID
 *    Example: 'TR-20250109-00001'
 * 
 * @param {string} medium - Filter by platform
 *    Options: 'mobile' | 'web' | 'system' | 'cron-job'
 * 
 * @param {string} startDate - Start date for filtering (ISO format)
 *    Example: '2025-01-01'
 * 
 * @param {string} endDate - End date for filtering (ISO format)
 *    Example: '2025-01-31'
 * 
 * @param {number} limit - Pagination limit
 *    Default: 50
 * 
 * @param {number} offset - Pagination offset
 *    Default: 0
 * 
 * ───────────────────────────────────────────────────────────────────────────
 * USAGE EXAMPLES
 * ───────────────────────────────────────────────────────────────────────────
 * 
 * 1️⃣  Get Move-In History (Default):
 *     GET /api/v1/test-history
 *     GET /api/v1/test-history?transitionType=move-in
 *     GET /api/v1/test-history?trackingId=TR-20250109-00001
 * 
 * 2️⃣  Get Move-Out History:
 *     GET /api/v1/test-history?transitionType=move-out
 *     GET /api/v1/test-history?requestType=move-out
 *     GET /api/v1/test-history?trackingId=TR-20250115-00002
 * 
 * 3️⃣  Get Renewal History:
 *     GET /api/v1/test-history?transitionType=renewal
 *     GET /api/v1/test-history?requestType=renewal
 *     GET /api/v1/test-history?trackingId=TR-20250120-00003
 * 
 * 4️⃣  Get All Types Combined:
 *     GET /api/v1/test-history?transitionType=all
 * 
 * 5️⃣  Get User-Visible History Only:
 *     GET /api/v1/test-history?type=user-visible
 *     GET /api/v1/test-history?transitionType=move-in&type=user-visible
 * 
 * 6️⃣  Get Milestones Only:
 *     GET /api/v1/test-history?type=milestones
 *     GET /api/v1/test-history?transitionType=move-out&type=milestones
 * 
 * 7️⃣  Get Latest Status:
 *     GET /api/v1/test-history?type=latest-status
 *     GET /api/v1/test-history?trackingId=TR-20250109-00001&type=latest-status
 * 
 * 8️⃣  Get Summary Report:
 *     GET /api/v1/test-history?type=summary&startDate=2025-01-01&endDate=2025-01-31
 * 
 * 9️⃣  Filter by Medium:
 *     GET /api/v1/test-history?medium=mobile
 *     GET /api/v1/test-history?medium=web&transitionType=move-in
 * 
 * 🔟 Paginated Results:
 *     GET /api/v1/test-history?limit=5&offset=0
 *     GET /api/v1/test-history?transitionType=move-in&limit=10&offset=10
 * 
 * ───────────────────────────────────────────────────────────────────────────
 * DUMMY DATA TRACKING IDS
 * ───────────────────────────────────────────────────────────────────────────
 * - Move-In:  TR-20250109-00001 (8 history records - complete journey)
 * - Move-Out: TR-20250115-00002 (2 history records)
 * - Renewal:  TR-20250120-00003 (1 history record)
 * 
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * @route   GET /api/v1/test-history
 * @desc    Consolidated endpoint for all transition history (DUMMY DATA)
 * @access  Private (Authenticated users)
 */
router.get(
    '/', 
    auth.auth(), 
    validate(testHistoryValidation.getUnifiedHistory), 
    catchAsync(testHistoryController.getUnifiedHistory)
);

/**
 * @swagger
 * tags:
 *   - name: History
 *     description: Transition History endpoints for tracking lifecycle of move-in, move-out, and renewal requests (Currently using DUMMY DATA for UI testing. Database integration coming soon.)
 */

/**
 * @swagger
 * /test-history:
 *   get:
 *     summary: Get Transition History (DUMMY DATA for UI Testing)
 *     description: |
 *       **🔧 TEST ENDPOINT - Returns dummy/mock data for UI integration testing**
 *       
 *       Single unified endpoint that handles ALL transition history scenarios without database dependency.
 *       This endpoint is designed for frontend developers to test the UI before database integration is completed.
 *       
 *       **Supports:**
 *       - Move-In history (default)
 *       - Move-Out history
 *       - Renewal history
 *       - Combined view of all types
 *       
 *       **Features:**
 *       - User-visible filtering (what residents see)
 *       - Milestones filtering (major status changes)
 *       - Latest status retrieval
 *       - Summary statistics
 *       - Medium filtering (mobile/web/system)
 *       - Pagination support
 *       
 *       **Note:** This will be replaced with real database integration in future releases.
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transitionType
 *         schema:
 *           type: string
 *           enum: [move-in, move-out, renewal, all]
 *           default: move-in
 *         description: |
 *           Type of transition to retrieve history for
 *           - **move-in**: Move-in requests (default, 8 sample records)
 *           - **move-out**: Move-out requests (2 sample records)
 *           - **renewal**: Renewal requests (1 sample record)
 *           - **all**: Combined history from all types
 *         example: move-in
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [move-in, move-out, renewal]
 *         description: Alias for transitionType parameter
 *         example: move-in
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, user-visible, milestones, latest-status, summary]
 *           default: all
 *         description: |
 *           Filter history view type
 *           - **all**: All history records (default)
 *           - **user-visible**: Only records visible to end users (created, approved, rejected, cancelled, rfi-raised, rfi-submitted, closed)
 *           - **milestones**: Major status changes only (created, approved, rejected, closed)
 *           - **latest-status**: Only the most recent history record
 *           - **summary**: Aggregated statistics and summary report
 *         example: user-visible
 *       - in: query
 *         name: trackingId
 *         schema:
 *           type: string
 *         description: |
 *           Specific tracking ID to filter history
 *           
 *           **Sample Tracking IDs:**
 *           - TR-20250109-00001 (Move-in with 8 records)
 *           - TR-20250115-00002 (Move-out with 2 records)
 *           - TR-20250120-00003 (Renewal with 1 record)
 *         example: TR-20250109-00001
 *       - in: query
 *         name: medium
 *         schema:
 *           type: string
 *           enum: [mobile, web, system, cron-job]
 *         description: Filter history by platform/medium used
 *         example: mobile
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *         example: 2025-01-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *         example: 2025-01-31
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records per page
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Pagination offset (0-indexed)
 *         example: 0
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "COMMON_SUCCESS"
 *                 message:
 *                   type: string
 *                   example: "Success."
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           transitionType:
 *                             type: string
 *                             enum: [move-in, move-out, renewal]
 *                             example: move-in
 *                           moveInRequestId:
 *                             type: integer
 *                             nullable: true
 *                             example: 123
 *                           moveOutRequestId:
 *                             type: integer
 *                             nullable: true
 *                             example: null
 *                           renewalRequestId:
 *                             type: integer
 *                             nullable: true
 *                             example: null
 *                           action:
 *                             type: string
 *                             enum: [created, approved, rejected, cancelled, user-cancelled, closed, rfi-raised, rfi-submitted, updated, status-changed, document-uploaded, document-rejected, comment-added, assigned, reassigned]
 *                             example: created
 *                           actionByType:
 *                             type: string
 *                             enum: [user, community-admin, super-admin, system, security]
 *                             example: user
 *                           actionBy:
 *                             type: integer
 *                             example: 1001
 *                           actionByUser:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1001
 *                               firstName:
 *                                 type: string
 *                                 example: John
 *                               lastName:
 *                                 type: string
 *                                 example: Doe
 *                               email:
 *                                 type: string
 *                                 example: john.doe@example.com
 *                               phoneNumber:
 *                                 type: string
 *                                 example: "+971501234567"
 *                           remarks:
 *                             type: string
 *                             nullable: true
 *                             example: "Move-in request created by resident"
 *                           details:
 *                             type: object
 *                             nullable: true
 *                             example:
 *                               unitNumber: "A-101"
 *                               buildingName: "Tower A"
 *                               communityName: "Sobha Hartland"
 *                           requestPayload:
 *                             type: object
 *                             nullable: true
 *                           previousStatus:
 *                             type: string
 *                             enum: [new, rfi-pending, rfi-submitted, approved, user-cancelled, cancelled, closed]
 *                             nullable: true
 *                             example: null
 *                           newStatus:
 *                             type: string
 *                             enum: [new, rfi-pending, rfi-submitted, approved, user-cancelled, cancelled, closed]
 *                             nullable: true
 *                             example: new
 *                           medium:
 *                             type: string
 *                             enum: [mobile, web, system, cron-job]
 *                             nullable: true
 *                             example: mobile
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-09T10:00:00.000Z"
 *                           trackingId:
 *                             type: string
 *                             example: "TR-20250109-00001"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 8
 *                         limit:
 *                           type: integer
 *                           example: 50
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: false
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         trackingId:
 *                           type: string
 *                           example: "TR-20250109-00001"
 *                         type:
 *                           type: string
 *                           example: "all"
 *                         filterBy:
 *                           type: string
 *                           example: "trackingId"
 *                         transitionType:
 *                           type: string
 *                           example: "move-in"
 *             examples:
 *               move_in_history:
 *                 summary: Get Move-In History (Default)
 *                 value:
 *                   success: true
 *                   code: "COMMON_SUCCESS"
 *                   message: "Success."
 *                   data:
 *                     success: true
 *                     data:
 *                       - id: 1
 *                         transitionType: "move-in"
 *                         action: "created"
 *                         actionByType: "user"
 *                         remarks: "Move-in request created by resident"
 *                         newStatus: "new"
 *                         medium: "mobile"
 *                         trackingId: "TR-20250109-00001"
 *                       - id: 7
 *                         transitionType: "move-in"
 *                         action: "approved"
 *                         actionByType: "community-admin"
 *                         remarks: "Move-in request approved"
 *                         newStatus: "approved"
 *                         medium: "web"
 *                         trackingId: "TR-20250109-00001"
 *                     pagination:
 *                       total: 8
 *                       limit: 50
 *                       offset: 0
 *                       hasMore: false
 *               user_visible_history:
 *                 summary: Get User-Visible History Only
 *                 value:
 *                   success: true
 *                   code: "COMMON_SUCCESS"
 *                   message: "Success."
 *                   data:
 *                     success: true
 *                     data:
 *                       - id: 1
 *                         action: "created"
 *                         trackingId: "TR-20250109-00001"
 *                       - id: 4
 *                         action: "rfi-raised"
 *                         trackingId: "TR-20250109-00001"
 *                       - id: 7
 *                         action: "approved"
 *                         trackingId: "TR-20250109-00001"
 *                     pagination:
 *                       total: 6
 *                       limit: 50
 *                       offset: 0
 *               latest_status:
 *                 summary: Get Latest Status
 *                 value:
 *                   success: true
 *                   code: "COMMON_SUCCESS"
 *                   message: "Success."
 *                   data:
 *                     success: true
 *                     data:
 *                       - id: 8
 *                         transitionType: "move-in"
 *                         action: "closed"
 *                         newStatus: "closed"
 *                         trackingId: "TR-20250109-00001"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */

export default router;

