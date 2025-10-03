import { AccountRenewalRequests } from '../../../Entities/AccountRenewalRequests.entity';
import { AccountRenewalRequestDetailsTenant } from '../../../Entities/AccountRenewalRequestDetailsTenant.entity';
import { AccountRenewalRequestDetailsHhoOwner } from '../../../Entities/AccountRenewalRequestDetailsHhoOwner.entity';
import { AccountRenewalRequestDetailsHhoCompany } from '../../../Entities/AccountRenewalRequestDetailsHhoCompany.entity';
import { AccountRenewalRequestDocuments } from '../../../Entities/AccountRenewalRequestDocuments.entity';
import { AccountRenewalRequestLogs } from '../../../Entities/AccountRenewalRequestLogs.entity';
import { MoveInRequests } from '../../../Entities/MoveInRequests.entity';
import { MoveOutRequests } from '../../../Entities/MoveOutRequests.entity';
import { UnitBookings } from '../../../Entities/UnitBookings.entity';
import { Users } from '../../../Entities/Users.entity';
import { Units } from '../../../Entities/Units.entity';
import { OccupancyRequestTemplates } from '../../../Entities/OccupancyRequestTemplates.entity';
import { ACCOUNT_RENEWAL_USER_TYPES, MOVE_REQUEST_STATUS, MOVE_IN_AND_OUT_REQUEST_STATUS, TransitionRequestActionByTypes, TRANSITION_DOCUMENT_TYPES } from '../../../Entities/EntityTypes';
import ApiError from '../../../Common/Utils/ApiError';
import { APICodes } from '../../../Common/Constants';
import { logger } from '../../../Common/Utils/logger';
import httpStatus from 'http-status';
import { getPaginationInfo } from '../../../Common/Utils/paginationUtils';
import { executeInTransaction } from '../../../Common/Utils/transactionUtil';
import { uploadFile } from '../../../Common/Utils/azureBlobStorage';
import { Not, In, IsNull } from 'typeorm';

export class RenewalService {
  
  /**
   * Get all renewal requests for admin with filters
   */
  async getAdminRenewal(query: any, user: any) {
    try {
      let { 
        page = 1, 
        per_page = 20,
        masterCommunityIds = "",
        communityIds = "",
        towerIds = "",
        createdStartDate = "",
        createdEndDate = "",
        status = "",
        search = "",
        requestId = "",
        unitNumber = "",
        requestType = "",
        sortBy = "createdAt",
        sortOrder = "DESC"
      } = query;

      // Debug logging
      logger.debug(`=== ADMIN RENEWAL REQUEST DEBUG ===`);
      logger.debug(`Raw query object: ${JSON.stringify(query)}`);
      logger.debug(`User object: ${JSON.stringify(user)}`);
      logger.debug(`User isAdmin: ${user?.isAdmin}`);
      logger.debug(`=====================================`);

      // Parse comma-separated IDs
      masterCommunityIds = masterCommunityIds ? masterCommunityIds.split(",").filter((e: any) => e) : [];
      communityIds = communityIds ? communityIds.split(",").filter((e: any) => e) : [];
      towerIds = towerIds ? towerIds.split(",").filter((e: any) => e) : [];
      
      // Build query with explicit joins and selections
      let getRenewalList = AccountRenewalRequests.getRepository()
        .createQueryBuilder('arr')
        .leftJoinAndSelect('arr.unit', 'u', 'u.isActive=1')
        .leftJoinAndSelect('u.masterCommunity', 'mc', 'mc.isActive=1')
        .leftJoinAndSelect('u.community', 'c', 'c.isActive=1')
        .leftJoinAndSelect('u.tower', 't', 't.isActive=1')
        .leftJoinAndSelect('arr.user', 'user')
        .leftJoinAndSelect('arr.moveInRequest', 'mir')
        .addSelect('arr.createdAt')
        .addSelect('arr.updatedAt')
        .addSelect('arr.createdBy')
        .addSelect('arr.updatedBy')
        .where('arr.isActive=1');

      // Only apply permission filtering for non-admin users
      if (!user?.isAdmin) {
        const { checkAdminPermission } = await import('../../../Common/Utils/adminAccess');
        getRenewalList = checkAdminPermission(getRenewalList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      // Apply filters
      if (masterCommunityIds && masterCommunityIds.length) {
        getRenewalList.andWhere(`mc.id IN (:...masterCommunityIds)`, { masterCommunityIds });
      }
      if (communityIds && communityIds.length) {
        getRenewalList.andWhere(`c.id IN (:...communityIds)`, { communityIds });
      }
      if (towerIds && towerIds.length) {
        getRenewalList.andWhere(`t.id IN (:...towerIds)`, { towerIds });
      }

      // Date range filters - handle both start and end dates properly
      if (createdStartDate) {
        const startDate = new Date(createdStartDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        getRenewalList.andWhere(`arr.createdAt >= :createdStartDate`, { createdStartDate: startDate });
        logger.debug(`Created Start Date filter: ${createdStartDate} -> ${startDate.toISOString()}`);
      }
      if (createdEndDate) {
        const endDate = new Date(createdEndDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        getRenewalList.andWhere(`arr.createdAt <= :createdEndDate`, { createdEndDate: endDate });
        logger.debug(`Created End Date filter: ${createdEndDate} -> ${endDate.toISOString()}`);
      }

      if (status) getRenewalList.andWhere(`arr.status = :status`, { status });
      if (requestId) getRenewalList.andWhere(`arr.accountRenewalRequestNo = :requestId`, { requestId });
      if (unitNumber) getRenewalList.andWhere(`u.unitNumber LIKE :unitNumber`, { unitNumber: `%${unitNumber}%` });
      if (requestType) getRenewalList.andWhere(`arr.requestType = :requestType`, { requestType });

      // Search functionality
      if (search) {
        getRenewalList.andWhere(`(
          arr.accountRenewalRequestNo LIKE :search OR 
          u.unitNumber LIKE :search OR 
          u.unitName LIKE :search OR 
          mc.name LIKE :search OR 
          c.name LIKE :search OR 
          t.name LIKE :search
        )`, { search: `%${search}%` });
      }

      // Apply sorting with valid field mapping
      const validSortFields = {
        'id': 'arr.id',
        'createdAt': 'arr.createdAt',
        'updatedAt': 'arr.updatedAt',
        'status': 'arr.status',
        'masterCommunityId': 'mc.id',
        'communityId': 'c.id',
        'towerId': 't.id',
        'unitNumber': 'u.unitNumber',
        'createdBy': 'arr.createdBy',
        'updatedBy': 'arr.updatedBy'
      } as const;

      const sortField = (sortBy && sortBy in validSortFields) ? validSortFields[sortBy as keyof typeof validSortFields] : 'arr.createdAt';
      const sortDirection = (typeof sortOrder === 'string' && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

      getRenewalList.orderBy(sortField, sortDirection)
        .offset((page - 1) * per_page)
        .limit(per_page);

      // Debug: Log the final query
      logger.debug(`Final query: ${getRenewalList.getQuery()}`);
      logger.debug(`Query parameters: ${JSON.stringify(getRenewalList.getParameters())}`);

      // Get results
      const list = await getRenewalList.getMany();
      const count = await getRenewalList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);

      // Debug: Log the results
      logger.debug(`Total items found: ${count}, List length: ${list.length}`);
      
      // Transform the response to match expected format
      const transformedList = list.map((item: any) => ({
        id: item.id,
        accountRenewalRequestNo: item.accountRenewalRequestNo,
        requestType: item.requestType,
        status: item.status,
        moveInDate: item.moveInDate,
        moveOutDate: item.moveOutDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
        unit: item.unit ? {
          id: item.unit.id,
          unitNumber: item.unit.unitNumber,
          floorNumber: item.unit.floorNumber,
          unitName: item.unit.unitName
        } : null,
        masterCommunityId: item.unit?.masterCommunity?.id || null,
        masterCommunityName: item.unit?.masterCommunity?.name || null,
        communityId: item.unit?.community?.id || null,
        communityName: item.unit?.community?.name || null,
        towerId: item.unit?.tower?.id || null,
        towerName: item.unit?.tower?.name || null
      }));

      return {
        data: transformedList,
        pagination,
      };
    } catch (error: any) {
      logger.error(`RENEWAL | GET ADMIN LIST ERROR: ${error.message}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code);
    }
  }

  /**
   * Get renewal request details for admin with logs
   */
  async getAdminRenewalRequestDetails(requestId: number, user: any) {
    try {
      const renewalRequest = await AccountRenewalRequests.getRepository()
        .createQueryBuilder('renewal')
        .leftJoinAndSelect('renewal.unit', 'unit')
        .leftJoinAndSelect('unit.community', 'community')
        .leftJoinAndSelect('unit.tower', 'tower')
        .leftJoinAndSelect('unit.masterCommunity', 'masterCommunity')
        .leftJoinAndSelect('renewal.user', 'requestUser')
        .leftJoinAndSelect('renewal.moveInRequest', 'moveInRequest')
        .where('renewal.id = :requestId', { requestId })
        .andWhere('renewal.isActive = :isActive', { isActive: true })
        .getOne();

      if (!renewalRequest) {
        return null;
      }

      // Get request-specific details based on type
      let requestDetails: any = null;
      switch (renewalRequest.requestType) {
        case ACCOUNT_RENEWAL_USER_TYPES.TENANT:
          requestDetails = await AccountRenewalRequestDetailsTenant.findOne({ 
            where: { accountRenewalRequest: { id: requestId } } 
          });
          break;
        case ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER:
          requestDetails = await AccountRenewalRequestDetailsHhoOwner.findOne({ 
            where: { accountRenewalRequest: { id: requestId } } 
          });
          break;
        case ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY:
          requestDetails = await AccountRenewalRequestDetailsHhoCompany.findOne({ 
            where: { accountRenewalRequest: { id: requestId } } 
          });
          break;
      }

      // Get documents
      const documents = await AccountRenewalRequestDocuments.find({
        where: { accountRenewalRequest: { id: requestId }, isActive: true },
        relations: ['file']
      });

      // Get logs (history)
      const logs = await AccountRenewalRequestLogs.find({
        where: { accountRenewalRequest: { id: requestId } },
        relations: ['user'],
        order: { timestamp: 'DESC' }
      });

      return {
        ...renewalRequest,
        details: requestDetails,
        documents,
        logs,
      };
    } catch (error: any) {
      logger.error(`RENEWAL | GET ADMIN DETAILS ERROR: ${error.message}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code);
    }
  }

  /**
   * Generate unique account renewal request number
   */
  private async generateRenewalRequestNumber(): Promise<string> {
    const count = await AccountRenewalRequests.count();
    const requestNumber = `ARR-${String(count + 1).padStart(6, '0')}`;
    return requestNumber;
  }

  /**
   * Validate unit is occupied and linked to user
   */
  private async validateUnitLinkage(unitId: number, userId: number): Promise<void> {
    const unitBooking = await UnitBookings.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        isActive: true
      }
    });

    if (!unitBooking) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        APICodes.RENEWAL_UNIT_NOT_LINKED.message,
        APICodes.RENEWAL_UNIT_NOT_LINKED.code
      );
    }
  }

  /**
   * Check for duplicate active renewal
   */
  private async checkDuplicateRenewal(unitId: number, userId: number): Promise<void> {
    const existingRenewal = await AccountRenewalRequests.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        status: Not(In([MOVE_REQUEST_STATUS.CANCELLED, MOVE_REQUEST_STATUS.USER_CANCELLED])),
        isActive: true
      }
    });

    if (existingRenewal) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        APICodes.RENEWAL_REQUEST_ALREADY_EXISTS.message,
        APICodes.RENEWAL_REQUEST_ALREADY_EXISTS.code
      );
    }
  }

  /**
   * Check for move-out conflict
   */
  private async checkMoveOutConflict(unitId: number, userId: number): Promise<void> {
    const moveOutRequest = await MoveOutRequests.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        status: Not(In([MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED, MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED])),
        isActive: true
      }
    });

    if (moveOutRequest) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        APICodes.RENEWAL_MOVE_OUT_EXISTS.message,
        APICodes.RENEWAL_MOVE_OUT_EXISTS.code
      );
    }
  }

  /**
   * Validate MIP template exists for the unit
   */
  private async validateMIPTemplate(unitId: number): Promise<void> {
    const unit = await Units.findOne({
      where: { id: unitId },
      relations: ['tower', 'community', 'masterCommunity']
    });

    if (!unit) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        APICodes.UNIT_NOT_FOUND.message,
        APICodes.UNIT_NOT_FOUND.code
      );
    }

    const mipTemplate = await OccupancyRequestTemplates.findOne({
      where: {
        masterCommunity: unit.masterCommunity ? { id: unit.masterCommunity.id } : IsNull(),
        community: unit.community ? { id: unit.community.id } : IsNull(),
        tower: unit.tower ? { id: unit.tower.id } : IsNull(),
        isActive: true,
        templateType: 'move-in'
      }
    });

    if (!mipTemplate) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        APICodes.RENEWAL_MIP_TEMPLATE_NOT_FOUND.message,
        APICodes.RENEWAL_MIP_TEMPLATE_NOT_FOUND.code
      );
    }
  }

  /**
   * Create audit log for renewal action
   */
  private async createRenewalLog(
    renewalRequest: AccountRenewalRequests,
    status: MOVE_REQUEST_STATUS,
    actionBy: TransitionRequestActionByTypes,
    user: any,
    comments?: string,
    changes?: string
  ): Promise<void> {
    try {
      const log = AccountRenewalRequestLogs.create({
        moveInRequest: renewalRequest.moveInRequest,
        accountRenewalRequest: renewalRequest,
        requestType: renewalRequest.requestType,
        status,
        actionBy,
        user: user,
        comments: comments || '',
        changes: changes || '',
        details: JSON.stringify({ actionBy, timestamp: new Date() })
      });
      await AccountRenewalRequestLogs.save(log);
    } catch (error) {
      logger.error(`Failed to create renewal log: ${error}`);
    }
  }

  /**
   * Update user Emirates ID if empty
   */
  private async updateUserEmiratesId(userId: number, emiratesId: string): Promise<void> {
    if (!emiratesId) return;

    try {
      const user = await Users.findOne({ where: { id: userId } });
      if (user && !user.eidNumber) {
        await Users.update({ id: userId }, { eidNumber: emiratesId });
        logger.info(`Updated Emirates ID for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to update Emirates ID: ${error}`);
    }
  }

  /**
   * Mark parent move-in as renewed
   */
  private async markMoveInAsRenewed(unitId: number, userId: number): Promise<void> {
    try {
      await MoveInRequests.update(
        {
          unit: { id: unitId },
          user: { id: userId },
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED,
          isActive: true
        },
        { status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED }
      );
      logger.info(`Marked move-in as renewed for user ${userId}, unit ${unitId}`);
    } catch (error) {
      logger.error(`Failed to mark move-in as renewed: ${error}`);
    }
  }

  /**
   * Send notification to user
   */
  private async sendNotification(userId: number, templateSlug: string, data: any): Promise<void> {
    try {
      const { addNotification } = await import('../../../Common/Utils/notification');
      await addNotification(userId, templateSlug, data, {});
      logger.info(`Notification sent to user ${userId} with template ${templateSlug}`);
    } catch (error) {
      logger.error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Create tenant renewal request
   */
  async createTenantRenewal(body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        const { unitId, userId, tenancyContractEndDate, adults, children, householdStaffs, pets, peopleOfDetermination, peopleOfDeterminationDetails } = body;

        logger.info(`RENEWAL | CREATE TENANT | ADMIN | USER: ${user.id} | UNIT: ${unitId} | FOR USER: ${userId}`);

        // Validations as per BRD
        await this.validateUnitLinkage(unitId, userId);
        await this.checkDuplicateRenewal(unitId, userId);
        await this.checkMoveOutConflict(unitId, userId);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with AUTO-APPROVED status (as per BRD)
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.TENANT,
          user: { id: userId } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.APPROVED, // Auto-approved as per BRD
          moveInDate: tenancyContractEndDate, // Store end date as moveInDate
          createdBy: user.id,
          updatedBy: user.id,
          isActive: true
        });

        const savedRequest = await renewalRequest.save();

        // Create tenant-specific details
        const tenantDetails = AccountRenewalRequestDetailsTenant.create({
          accountRenewalRequest: savedRequest,
          tenancyContractEndDate,
          adults: adults || 1,
          children: children || 0,
          householdStaffs: householdStaffs || 0,
          pets: pets || 0,
          peopleOfDetermination: peopleOfDetermination || false,
          peopleOfDeterminationDetails: peopleOfDeterminationDetails || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await tenantDetails.save();

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.APPROVED,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          'Renewal request created and auto-approved by admin'
        );

        // Mark parent move-in as renewed
        await this.markMoveInAsRenewed(unitId, userId);

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(userId, 'account_renewal_created', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | TENANT CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE TENANT ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Create HHO owner renewal request
   */
  async createHhoOwnerRenewal(body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        const { unitId, userId, dtcmExpiryDate } = body;

        logger.info(`RENEWAL | CREATE HHO OWNER | ADMIN | USER: ${user.id} | UNIT: ${unitId} | FOR USER: ${userId}`);

        // Validations as per BRD
        await this.validateUnitLinkage(unitId, userId);
        await this.checkDuplicateRenewal(unitId, userId);
        await this.checkMoveOutConflict(unitId, userId);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with AUTO-APPROVED status
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER,
          user: { id: userId } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.APPROVED,
          moveInDate: dtcmExpiryDate,
          createdBy: user.id,
          updatedBy: user.id,
          isActive: true
        });

        const savedRequest = await renewalRequest.save();

        // Create HHO owner-specific details
        const hhoOwnerDetails = AccountRenewalRequestDetailsHhoOwner.create({
          accountRenewalRequest: savedRequest,
          dtcmExpiryDate,
          dubaITourismUnitPermitExpiryDate: body.dubaITourismUnitPermitExpiryDate,
          ownerFirstName: body.ownerFirstName || '',
          ownerLastName: body.ownerLastName || '',
          email: body.email || '',
          dialCode: body.dialCode || '',
          phoneNumber: body.phoneNumber || '',
          nationality: body.nationality || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await hhoOwnerDetails.save();

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.APPROVED,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          'Renewal request created and auto-approved by admin'
        );

        // Mark parent move-in as renewed
        await this.markMoveInAsRenewed(unitId, userId);

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(userId, 'account_renewal_created', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHO OWNER CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE HHO OWNER ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Create HHC company renewal request
   */
  async createHhcCompanyRenewal(body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        const { unitId, userId, leaseContractEndDate, dtcmExpiryDate, tradeLicenseExpiryDate } = body;

        logger.info(`RENEWAL | CREATE HHC COMPANY | ADMIN | USER: ${user.id} | UNIT: ${unitId} | FOR USER: ${userId}`);

        // Validations as per BRD
        await this.validateUnitLinkage(unitId, userId);
        await this.checkDuplicateRenewal(unitId, userId);
        await this.checkMoveOutConflict(unitId, userId);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with AUTO-APPROVED status
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY,
          user: { id: userId } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.APPROVED,
          moveInDate: leaseContractEndDate,
          createdBy: user.id,
          updatedBy: user.id,
          isActive: true
        });

        const savedRequest = await renewalRequest.save();

        // Create HHC company-specific details
        const hhcCompanyDetails = AccountRenewalRequestDetailsHhoCompany.create({
          accountRenewalRequest: savedRequest,
          leaseContractEndDate,
          dtcmExpiryDate,
          tradeLicenseExpiryDate,
          companyName: body.companyName || '',
          companyEmail: body.companyEmail || '',
          tradeLicenseNumber: body.tradeLicenseNumber || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await hhcCompanyDetails.save();

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.APPROVED,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          'Renewal request created and auto-approved by admin'
        );

        // Mark parent move-in as renewed
        await this.markMoveInAsRenewed(unitId, userId);

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(userId, 'account_renewal_created', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHC COMPANY CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE HHC COMPANY ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Update tenant renewal request
   */
  async updateTenantRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        logger.info(`RENEWAL | UPDATE TENANT | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        // Get existing renewal request
        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Can only edit requests in NEW or RFI_PENDING status (as per BRD)
        if (![MOVE_REQUEST_STATUS.OPEN, MOVE_REQUEST_STATUS.RFI_PENDING].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.message,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.code
          );
        }

        // Update tenant details
        const tenantDetails = await AccountRenewalRequestDetailsTenant.findOne({
          where: { accountRenewalRequest: { id: requestId } }
        });

        if (tenantDetails) {
          Object.assign(tenantDetails, {
            ...body,
            updatedBy: user.id
          });
          await tenantDetails.save();
        }

        // Update main request if tenancy end date changed
        if (body.tenancyContractEndDate) {
          renewalRequest.moveInDate = body.tenancyContractEndDate;
          renewalRequest.updatedBy = user.id;
          await renewalRequest.save();
        }

        // Create log
        await this.createRenewalLog(
          renewalRequest,
          renewalRequest.status,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          body.comments || 'Renewal request updated by admin',
          JSON.stringify(body)
        );

        logger.info(`RENEWAL | TENANT UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE TENANT ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Update HHO owner renewal request
   */
  async updateHhoOwnerRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        logger.info(`RENEWAL | UPDATE HHO OWNER | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        if (![MOVE_REQUEST_STATUS.OPEN, MOVE_REQUEST_STATUS.RFI_PENDING].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.message,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.code
          );
        }

        const hhoOwnerDetails = await AccountRenewalRequestDetailsHhoOwner.findOne({
          where: { accountRenewalRequest: { id: requestId } }
        });

        if (hhoOwnerDetails) {
          Object.assign(hhoOwnerDetails, {
            ...body,
            updatedBy: user.id
          });
          await hhoOwnerDetails.save();
        }

        if (body.dtcmExpiryDate) {
          renewalRequest.moveInDate = body.dtcmExpiryDate;
          renewalRequest.updatedBy = user.id;
          await renewalRequest.save();
        }

        await this.createRenewalLog(
          renewalRequest,
          renewalRequest.status,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          body.comments || 'Renewal request updated by admin',
          JSON.stringify(body)
        );

        logger.info(`RENEWAL | HHO OWNER UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHO OWNER ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Update HHC company renewal request
   */
  async updateHhcCompanyRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        logger.info(`RENEWAL | UPDATE HHC COMPANY | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        if (![MOVE_REQUEST_STATUS.OPEN, MOVE_REQUEST_STATUS.RFI_PENDING].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.message,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.code
          );
        }

        const hhcCompanyDetails = await AccountRenewalRequestDetailsHhoCompany.findOne({
          where: { accountRenewalRequest: { id: requestId } }
        });

        if (hhcCompanyDetails) {
          Object.assign(hhcCompanyDetails, {
            ...body,
            updatedBy: user.id
          });
          await hhcCompanyDetails.save();
        }

        if (body.leaseContractEndDate) {
          renewalRequest.moveInDate = body.leaseContractEndDate;
          renewalRequest.updatedBy = user.id;
          await renewalRequest.save();
        }

        await this.createRenewalLog(
          renewalRequest,
          renewalRequest.status,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          body.comments || 'Renewal request updated by admin',
          JSON.stringify(body)
        );

        logger.info(`RENEWAL | HHC COMPANY UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHC COMPANY ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Approve renewal request (from mobile app submission)
   */
  async approveRenewalRequest(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        logger.info(`RENEWAL | APPROVE REQUEST | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true },
          relations: ['user', 'unit']
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Can only approve requests in NEW or RFI_SUBMITTED status
        if (![MOVE_REQUEST_STATUS.OPEN, MOVE_REQUEST_STATUS.RFI_SUBMITTED].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_APPROVAL_NOT_ALLOWED.message,
            APICodes.RENEWAL_REQUEST_APPROVAL_NOT_ALLOWED.code
          );
        }

        // Update status to approved
        renewalRequest.status = MOVE_REQUEST_STATUS.APPROVED;
        renewalRequest.comments = body.comments || '';
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Get details for Emirates ID update
        let emiratesId = '';
        switch (renewalRequest.requestType) {
          case ACCOUNT_RENEWAL_USER_TYPES.TENANT:
            const tenantDetails = await AccountRenewalRequestDetailsTenant.findOne({
              where: { accountRenewalRequest: { id: requestId } }
            });
            emiratesId = tenantDetails?.emiratesIdNumber || '';
            break;
          case ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER:
            const hhoDetails = await AccountRenewalRequestDetailsHhoOwner.findOne({
              where: { accountRenewalRequest: { id: requestId } }
            });
            emiratesId = hhoDetails?.emiratesIdNumber || '';
            break;
          case ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY:
            // HHC Company doesn't have emiratesIdNumber field
            break;
        }

        // Update user Emirates ID if empty (as per BRD)
        if (emiratesId) {
          await this.updateUserEmiratesId(renewalRequest.user.id, emiratesId);
        }

        // Mark parent move-in as renewed
        await this.markMoveInAsRenewed(renewalRequest.unit.id, renewalRequest.user.id);

        // Create log
        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.APPROVED,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          body.comments || 'Renewal request approved by admin'
        );

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(renewalRequest.user.id, 'account_renewal_approved', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | APPROVED | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | APPROVE ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Mark request as RFI (Request For Information)
   */
  async markRequestAsRFI(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        const { rfiReason, comments } = body;
        
        logger.info(`RENEWAL | MARK AS RFI | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true },
          relations: ['user']
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Can only mark as RFI if status is NEW or RFI_SUBMITTED (as per BRD)
        if (![MOVE_REQUEST_STATUS.OPEN, MOVE_REQUEST_STATUS.RFI_SUBMITTED].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_INVALID_STATUS.message,
            APICodes.RENEWAL_REQUEST_INVALID_STATUS.code
          );
        }

        // Update status to RFI_PENDING
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_PENDING;
        renewalRequest.comments = `${rfiReason}. ${comments || ''}`.trim();
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Create log
        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.RFI_PENDING,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          renewalRequest.comments,
          `RFI Reason: ${rfiReason}`
        );

        // Send notification to user - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(renewalRequest.user.id, 'account_renewal_rfi_pending', {
        //   requestId: renewalRequest.accountRenewalRequestNo,
        //   rfiReason: rfiReason
        // });

        logger.info(`RENEWAL | MARKED AS RFI | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | MARK AS RFI ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Cancel renewal request
   */
  async cancelRenewalRequest(requestId: number, body: any, user: any) {
    return executeInTransaction(async (qr: any) => {
      try {
        const { reason, comments } = body;
        
        logger.info(`RENEWAL | CANCEL REQUEST | REQUEST: ${requestId} | ADMIN: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, isActive: true },
          relations: ['user', 'unit']
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Cannot cancel if already cancelled or if unit has been allocated (as per BRD)
        if ([MOVE_REQUEST_STATUS.CANCELLED, MOVE_REQUEST_STATUS.USER_CANCELLED].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_CANCELLATION_NOT_ALLOWED.message,
            APICodes.RENEWAL_REQUEST_CANCELLATION_NOT_ALLOWED.code
          );
        }

        // Update status to CANCELLED
        renewalRequest.status = MOVE_REQUEST_STATUS.CANCELLED;
        renewalRequest.comments = `${reason}. ${comments || ''}`.trim();
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Create log
        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.CANCELLED,
          TransitionRequestActionByTypes.COMMUNITY_ADMIN,
          user,
          renewalRequest.comments,
          `Cancellation Reason: ${reason}`
        );

        // Mark parent move-in as expired (as per BRD - cancelled renewal means expired move-in)
        try {
          await MoveInRequests.update(
            {
              unit: { id: renewalRequest.unit.id },
              user: { id: renewalRequest.user.id },
              status: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED,
              isActive: true
            },
            { status: 'expired' as any }
          );
        } catch (error) {
          logger.error(`Failed to mark move-in as expired: ${error}`);
        }

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(renewalRequest.user.id, 'account_renewal_cancelled', {
        //   requestId: renewalRequest.accountRenewalRequestNo,
        //   reason: reason
        // });

        logger.info(`RENEWAL | CANCELLED | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CANCEL ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Close renewal request - NOT APPLICABLE as per BRD
   * Renewals don't have a closure process like move-in
   * Once approved, the renewal is complete and unit linking is extended
   */
  async closeRenewalRequest(requestId: number, body: any, user: any) {
    logger.warn(`RENEWAL | CLOSE REQUEST CALLED | REQUEST: ${requestId} - This operation is not applicable for renewals`);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      APICodes.RENEWAL_REQUEST_INVALID_STATUS.message,
      APICodes.RENEWAL_REQUEST_INVALID_STATUS.code
    );
  }

  /**
   * Upload documents for renewal request (Admin)
   */
  async uploadDocuments(requestId: number, files: any, body: any, user: any) {
    try {
      // Only admin users can upload documents for renewal requests
      if (!user?.isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the renewal request
      const renewalRequest = await AccountRenewalRequests.getRepository()
        .createQueryBuilder("arr")
        .leftJoinAndSelect("arr.user", "user")
        .where("arr.id = :requestId AND arr.isActive = true", { requestId })
        .getOne();

      if (!renewalRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.RENEWAL_REQUEST_NOT_FOUND.message, APICodes.RENEWAL_REQUEST_NOT_FOUND.code);
      }

      // Check request type and enforce document restrictions
      const isTenantRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.TENANT;
      const isHhoOwnerRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER;
      const isHhcCompanyRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY;

      if (isTenantRenewal) {
        // For Tenant Renewal, only allow the 3 required documents
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
          TRANSITION_DOCUMENT_TYPES.EJARI
        ];

        const uploadedTypes = Object.keys(files || {});
        const invalidTypes = uploadedTypes.filter(type => !allowedDocumentTypes.includes(type as TRANSITION_DOCUMENT_TYPES));
        
        if (invalidTypes.length > 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid document types for tenant renewal: ${invalidTypes.join(', ')}. Allowed types: ${allowedDocumentTypes.join(', ')}`,
            'INVALID_DOCUMENT_TYPES'
          );
        }
      }

      if (isHhoOwnerRenewal) {
        // For HHO Owner Renewal, allow more document types similar to move-in
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
          TRANSITION_DOCUMENT_TYPES.EJARI,
          TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT,
          TRANSITION_DOCUMENT_TYPES.TITLE_DEED,
          TRANSITION_DOCUMENT_TYPES.OTHER
        ];

        const uploadedTypes = Object.keys(files || {});
        const invalidTypes = uploadedTypes.filter(type => !allowedDocumentTypes.includes(type as TRANSITION_DOCUMENT_TYPES));
        
        if (invalidTypes.length > 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid document types for HHO owner renewal: ${invalidTypes.join(', ')}. Allowed types: ${allowedDocumentTypes.join(', ')}`,
            'INVALID_DOCUMENT_TYPES'
          );
        }
      }

      if (isHhcCompanyRenewal) {
        // For HHC Company Renewal, allow more document types
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
          TRANSITION_DOCUMENT_TYPES.EJARI,
          TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE,
          TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT,
          TRANSITION_DOCUMENT_TYPES.TITLE_DEED,
          TRANSITION_DOCUMENT_TYPES.OTHER
        ];

        const uploadedTypes = Object.keys(files || {});
        const invalidTypes = uploadedTypes.filter(type => !allowedDocumentTypes.includes(type as TRANSITION_DOCUMENT_TYPES));
        
        if (invalidTypes.length > 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid document types for HHC company renewal: ${invalidTypes.join(', ')}. Allowed types: ${allowedDocumentTypes.join(', ')}`,
            'INVALID_DOCUMENT_TYPES'
          );
        }
      }

      const uploadedDocuments: any[] = [];

      if (files && Object.keys(files).length > 0) {
        const documentTypes = Object.keys(files);

        for (const docType of documentTypes) {
          const fileArray = Array.isArray(files[docType]) ? files[docType] : [files[docType]];
          
          for (const file of fileArray) {
            try {
              // Upload to Azure Blob Storage
              const uploadedFile = await uploadFile(file.originalname, file, `renewal/${requestId}/${docType}/`, user.id);

              // Check if upload was successful
              if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
                throw new ApiError(
                  httpStatus.INTERNAL_SERVER_ERROR,
                  `Failed to upload document ${docType}`,
                  'DOCUMENT_UPLOAD_FAILED'
                );
              }

              // Create RenewalRequestDocument record
              const docRecord = new AccountRenewalRequestDocuments();
              docRecord.accountRenewalRequest = renewalRequest;
              docRecord.documentType = docType as TRANSITION_DOCUMENT_TYPES;
              docRecord.file = uploadedFile as any;
              docRecord.createdBy = user.id;
              docRecord.updatedBy = user.id;
              docRecord.isActive = true;

              const savedDoc = await docRecord.save();
              
              uploadedDocuments.push({
                id: savedDoc.id,
                documentType: docType,
                fileName: (uploadedFile as any).fileName,
                fileUrl: (uploadedFile as any).fileUrl,
                fileType: (uploadedFile as any).fileType,
                fileSize: (uploadedFile as any).fileSize,
                fileExtension: (uploadedFile as any).fileExtension,
                fileOriginalName: (uploadedFile as any).fileOriginalName
              });

              logger.info(`RENEWAL | DOCUMENT UPLOADED | ADMIN REQUEST: ${requestId} | TYPE: ${docType} | FILE: ${(uploadedFile as any).fileName}`);
            } catch (fileError: any) {
              logger.error(`RENEWAL | DOCUMENT UPLOAD ERROR | ADMIN REQUEST: ${requestId} | TYPE: ${docType} | ERROR: ${fileError.message}`);
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                `Failed to upload document ${docType}: ${fileError.message}`,
                'DOCUMENT_UPLOAD_FAILED'
              );
            }
          }
        }
      }

      // Create log entry
      await this.createRenewalLog(
        renewalRequest,
        renewalRequest.status,
        TransitionRequestActionByTypes.SUPER_ADMIN,
        user,
        'Documents uploaded by admin',
        JSON.stringify({ uploadedDocuments: uploadedDocuments.map(doc => ({ type: doc.documentType, fileName: doc.fileName })) })
      );

      logger.info(`RENEWAL | DOCUMENTS UPLOADED | ADMIN REQUEST: ${requestId} | COUNT: ${uploadedDocuments.length}`);

      return {
        uploadedDocuments,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`
      };
    } catch (error: any) {
      logger.error(`RENEWAL | UPLOAD DOCUMENTS ERROR: ${error.message}`);
      throw error;
    }
  }
}
