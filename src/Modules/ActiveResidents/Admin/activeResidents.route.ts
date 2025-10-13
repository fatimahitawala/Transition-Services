import express from 'express';
import controller from './activeResidents.controller';
import { validate } from '../../../Common/Middlewares/validate';
import { catchAsync } from '../../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../../Common/Middlewares/AuthMiddleware';
import ActiveResidentsValidation from './activeResidents.validation';

const router = express.Router();
const auth = new AuthMiddleware();
const validation = new ActiveResidentsValidation();

router.get('/', auth.auth(), validate(validation.list), catchAsync(controller.list));
router.get('/:userRoleId', auth.auth(), validate(validation.details), catchAsync(controller.details));
router.get('/:userRoleId/assets', auth.auth(), validate(validation.details), catchAsync(controller.assets));

export default router;

/**
 * @swagger
 * tags:
 *   - name: Admin Active Residents
 *     description: APIs for managing active residents (Admin)
 */

/**
 * @swagger
 * /admin/active-residents:
 *   get:
 *     summary: Active residents list
 *     tags: [Admin Active Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: per_page
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: masterCommunity
 *         schema: { type: integer }
 *       - in: query
 *         name: community
 *         schema: { type: integer }
 *       - in: query
 *         name: tower
 *         schema: { type: integer }
 *       - in: query
 *         name: unit
 *         schema: { type: integer }
 *       - in: query
 *         name: residentType
 *         schema: { type: string, enum: [owner, tenant, hho, hhc] }
 *     responses:
 *       200:
 *         description: Listing success
 */

/**
 * @swagger
 * /admin/active-residents/{userRoleId}:
 *   get:
 *     summary: Active resident details by userRoleId
 *     tags: [Admin Active Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userRoleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /admin/active-residents/{userRoleId}/assets:
 *   get:
 *     summary: Access cards and parking details for active resident
 *     tags: [Admin Active Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userRoleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Success
 */
