import { AccountRenewalRequests } from '../../../Entities/AccountRenewalRequests.entity';
import { AccountRenewalRequestDetailsTenant } from '../../../Entities/AccountRenewalRequestDetailsTenant.entity';
import { AccountRenewalRequestDetailsHhoOwner } from '../../../Entities/AccountRenewalRequestDetailsHhoOwner.entity';
import { AccountRenewalRequestDetailsHhoCompany } from '../../../Entities/AccountRenewalRequestDetailsHhoCompany.entity';
import { AccountRenewalRequestDocuments } from '../../../Entities/AccountRenewalRequestDocuments.entity';
import { AccountRenewalRequestLogs } from '../../../Entities/AccountRenewalRequestLogs.entity';
import { MoveInRequests } from '../../../Entities/MoveInRequests.entity';
import { MoveOutRequests } from '../../../Entities/MoveOutRequests.entity';
import { UnitBookings } from '../../../Entities/UnitBookings.entity';
import { UserRoles } from '../../../Entities/UserRoles.entity';
import { Users } from '../../../Entities/Users.entity';
import { Units } from '../../../Entities/Units.entity';
import { OccupancyRequestTemplates } from '../../../Entities/OccupancyRequestTemplates.entity';
import { FileUploads } from '../../../Entities/FileUploads.entity';
import { ACCOUNT_RENEWAL_USER_TYPES, MOVE_REQUEST_STATUS, MOVE_IN_AND_OUT_REQUEST_STATUS, TransitionRequestActionByTypes, TRANSITION_DOCUMENT_TYPES, OCUPANCY_REQUEST_TYPES } from '../../../Entities/EntityTypes';
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
   * Get all renewal requests for mobile user
   */
  async getMobileRenewal(query: any, user: any) {
    try {
      let { page = 1, per_page = 10, status = "", unitIds = "", requestId = "" } = query;

      // Debug logging
      logger.debug(`getMobileRenewal query params: ${JSON.stringify(query)}, userId: ${user?.id}`);
      unitIds = unitIds ? unitIds.split(",").filter((e: any) => e) : [];
      
      let getRenewalList = AccountRenewalRequests.getRepository()
        .createQueryBuilder('arr')
        .leftJoinAndSelect('arr.unit', 'u')
        .leftJoinAndSelect('u.masterCommunity', 'mc')
        .leftJoinAndSelect('u.community', 'c')
        .leftJoinAndSelect('u.tower', 't')
        .addSelect('arr.createdAt')
        .addSelect('arr.updatedAt')
        .addSelect('arr.createdBy')
        .addSelect('arr.updatedBy')
        .where('arr.isActive = true AND arr.user = :userId', { userId: user?.id });

      // Apply filters if provided
      if (status) {
        getRenewalList.andWhere('arr.status = :status', { status });
      }

      if (unitIds && unitIds.length) {
        getRenewalList.andWhere('arr.unit IN (:...units)', { units: unitIds.map((x: any) => Number(x)).filter((n: any) => !isNaN(n)) });
      }

      if (requestId) {
        getRenewalList.andWhere('arr.id = :requestId', { requestId: Number(requestId) });
      }

      // Get total count
      const count = await getRenewalList.getCount();

      // Get paginated results with ordering
      getRenewalList.orderBy('arr.createdAt', 'DESC')
        .offset((page - 1) * per_page)
        .limit(per_page);

      // Debug logging
      logger.debug(`Final query: ${getRenewalList.getQuery()}`);
      logger.debug(`Query parameters: ${JSON.stringify(getRenewalList.getParameters())}`);

      const list = await getRenewalList.getMany();
      logger.debug(`Query executed successfully, found ${list.length} records`);

      // Transform the response to include unit data
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
        masterCommunityId: item.unit?.masterCommunity?.id,
        masterCommunityName: item.unit?.masterCommunity?.name,
        communityId: item.unit?.community?.id,
        communityName: item.unit?.community?.name,
        towerId: item.unit?.tower?.id,
        towerName: item.unit?.tower?.name
      }));

      const pagination = getPaginationInfo(page, per_page, count);

      return {
        data: transformedList,
        pagination,
      };
    } catch (error: any) {
      logger.error(`RENEWAL | GET MOBILE LIST ERROR: ${error.message}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR?.message || 'Unknown error occurred', APICodes.UNKNOWN_ERROR?.code || 'EC001');
    }
  }

  /**
   * Get renewal request details for mobile user
   */
  async getMobileRenewalRequestDetails(requestId: number, user: any) {
    try {
      logger.debug(`getMobileRenewalRequestDetails - requestId: ${requestId}, userId: ${user?.id}`);

      // Get the main renewal request with basic details
      const renewalRequest = await AccountRenewalRequests.getRepository()
        .createQueryBuilder('arr')
        .leftJoinAndSelect('arr.unit', 'u', 'u.isActive = true')
        .leftJoinAndSelect('u.masterCommunity', 'mc', 'mc.isActive = true')
        .leftJoinAndSelect('u.community', 'c', 'c.isActive = true')
        .leftJoinAndSelect('u.tower', 't', 't.isActive = true')
        .leftJoinAndSelect('arr.user', 'user', 'user.isActive = true')
        .leftJoinAndSelect('arr.moveInRequest', 'mir')
        .addSelect('arr.createdAt')
        .addSelect('arr.updatedAt')
        .addSelect('arr.createdBy')
        .addSelect('arr.updatedBy')
        .where('arr.id = :requestId', { requestId })
        .andWhere('arr.user = :userId', { userId: user?.id })
        .andWhere('arr.isActive = true')
        .getOne();

      if (!renewalRequest) {
        logger.warn(`Renewal request not found - requestId: ${requestId}`);
        return null;
      }

      // Get request-specific details based on type
      let requestDetails: any = null;
      switch (renewalRequest.requestType) {
        case ACCOUNT_RENEWAL_USER_TYPES.TENANT:
          requestDetails = await AccountRenewalRequestDetailsTenant.getRepository()
            .createQueryBuilder('details')
            .where('details.accountRenewalRequest.id = :id AND details.isActive = true', { id: requestId })
            .getOne();
          break;
        case ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER:
          requestDetails = await AccountRenewalRequestDetailsHhoOwner.getRepository()
            .createQueryBuilder('details')
            .where('details.accountRenewalRequest.id = :id AND details.isActive = true', { id: requestId })
            .getOne();
          break;
        case ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY:
          requestDetails = await AccountRenewalRequestDetailsHhoCompany.getRepository()
            .createQueryBuilder('details')
            .where('details.accountRenewalRequest.id = :id AND details.isActive = true', { id: requestId })
            .getOne();
          break;
      }

      // Get documents
      const documents = await AccountRenewalRequestDocuments.getRepository()
        .createQueryBuilder('doc')
        .leftJoinAndSelect('doc.file', 'file')
        .where('doc.accountRenewalRequest.id = :id AND doc.isActive = true', { id: requestId })
        .getMany();

      logger.debug(`Found ${documents.length} documents for requestId: ${requestId}`);

      return {
        ...renewalRequest,
        details: requestDetails,
        documents,
      };
    } catch (error: any) {
      logger.error(`RENEWAL | GET MOBILE DETAILS ERROR: ${error.message}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR?.message || 'Unknown error occurred', APICodes.UNKNOWN_ERROR?.code || 'EC001');
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
    const userRole = await UserRoles.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        isActive: true
      }
    });

    if (!userRole) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        APICodes.RENEWAL_UNIT_NOT_LINKED.message,
        APICodes.RENEWAL_UNIT_NOT_LINKED.code
      );
    }
  }

  /**
   * Check for duplicate active renewal
   * Only block if there's an APPROVED request (active/finalized renewal)
   * Allow creating new requests to replace pending/open ones
   */
  private async checkDuplicateRenewal(unitId: number, userId: number): Promise<void> {
    const existingRenewal = await AccountRenewalRequests.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        status: MOVE_REQUEST_STATUS.APPROVED,
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
   * Check for move-out conflict - specifically check for approved move-out requests
   */
  private async checkMoveOutConflict(unitId: number, userId: number): Promise<void> {
    const approvedMoveOutRequest = await MoveOutRequests.findOne({
      where: {
        unit: { id: unitId },
        user: { id: userId },
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
        isActive: true
      }
    });

    if (approvedMoveOutRequest) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Move-out request is already raised for this unit and it is approved. Cannot create renewal request.',
        'MOVE_OUT_ALREADY_APPROVED'
      );
    }
  }

  /**
   * Validate MIP template exists
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
        templateType: OCUPANCY_REQUEST_TYPES.MOVE_IN
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
   * Send notification
   */
  private async sendNotification(userId: number, templateSlug: string, data: any): Promise<void> {
    try {
      const { addNotification, addAdminNotification } = await import('../../../Common/Utils/notification');
      await addNotification(userId, templateSlug, data, {});
      await addAdminNotification(userId, `${templateSlug}_to_admin`, data, {});
      logger.info(`Notifications sent for template ${templateSlug}`);
    } catch (error) {
      logger.error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Handle document uploads
   */
  private async handleDocumentUploads(
    renewalRequestId: number,
    files: any,
    userId: number,
    queryRunner: any
  ): Promise<void> {
    if (!files || Object.keys(files).length === 0) return;

    const documentTypes = Object.keys(files);

    for (const docType of documentTypes) {
      const fileArray = Array.isArray(files[docType]) ? files[docType] : [files[docType]];
      
      for (const file of fileArray) {
        try {
          // Upload to Azure Blob Storage
          const uploadedFile = await uploadFile(file.originalname, file, `renewal/${renewalRequestId}/${docType}/`, userId);

          // Create RenewalRequestDocument record
          const docRecord = new AccountRenewalRequestDocuments();
          docRecord.accountRenewalRequest = { id: renewalRequestId } as any;
          docRecord.user = { id: userId } as any;
          docRecord.file = uploadedFile as any;
          docRecord.documentType = docType as any;
          docRecord.isActive = true;
          docRecord.createdBy = userId;
          docRecord.updatedBy = userId;
          
          await AccountRenewalRequestDocuments.save(docRecord);

          logger.info(`Document uploaded: ${docType} for renewal request ${renewalRequestId}`);
        } catch (error) {
          logger.error(`Failed to upload document ${docType}: ${error}`);
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            APICodes.RENEWAL_DOCUMENT_UPLOAD_FAILED.message,
            APICodes.RENEWAL_DOCUMENT_UPLOAD_FAILED.code
          );
        }
      }
    }
  }

  /**
   * Create tenant renewal request (Mobile)
   */
  async createTenantRenewal(body: any, user: any) {
    try {
      const { 
        unitId, 
        tenancyContractEndDate, 
        adults, 
        children, 
        householdStaffs, 
        pets,
        determinationComments
      } = body;

      logger.info(`RENEWAL | CREATE TENANT | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

      // Validations as per BRD - BEFORE transaction (like admin pattern)
      await this.validateUnitLinkage(unitId, user.id);
      await this.checkDuplicateRenewal(unitId, user.id);
      await this.checkMoveOutConflict(unitId, user.id);
      // await this.validateMIPTemplate(unitId);

      // Generate request number
      const requestNumber = await this.generateRenewalRequestNumber();

      let savedRequest: any;
      let tenantDetails: any;

      await executeInTransaction(async (qr: any) => {

        // Create main renewal request with OPEN status (mobile requests need admin approval)
        const renewalRequest = new AccountRenewalRequests();
        renewalRequest.accountRenewalRequestNo = requestNumber;
        renewalRequest.requestType = ACCOUNT_RENEWAL_USER_TYPES.TENANT;
        renewalRequest.user = { id: user.id } as any;
        renewalRequest.unit = { id: unitId } as any;
        renewalRequest.status = MOVE_REQUEST_STATUS.OPEN; // Mobile requests need approval
        renewalRequest.moveInDate = tenancyContractEndDate; // Store end date as moveInDate
        renewalRequest.createdBy = user.id;
        renewalRequest.updatedBy = user.id;
        renewalRequest.isActive = true;

        savedRequest = await qr.manager.save(AccountRenewalRequests, renewalRequest);

        // Create tenant-specific details - use saved entity instance directly (like admin pattern)
        tenantDetails = new AccountRenewalRequestDetailsTenant();
        tenantDetails.accountRenewalRequest = savedRequest; // Use entity instance, not ID
        tenantDetails.tenancyContractEndDate = tenancyContractEndDate;
        tenantDetails.adults = adults;
        tenantDetails.children = children;
        tenantDetails.householdStaffs = householdStaffs;
        tenantDetails.pets = pets;
        if (determinationComments) {
          tenantDetails.determinationComments = determinationComments;
        }
        tenantDetails.createdBy = user.id;
        tenantDetails.updatedBy = user.id;
        tenantDetails.isActive = true;

        await qr.manager.save(AccountRenewalRequestDetailsTenant, tenantDetails);

        // Create log entry
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = savedRequest; // Use entity instance
        log.requestType = ACCOUNT_RENEWAL_USER_TYPES.TENANT;
        log.status = MOVE_REQUEST_STATUS.OPEN;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = "";
        log.comments = 'Renewal request submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });

        await qr.manager.save(log);

        // Send notification to admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | TENANT CREATED | REQUEST: ${requestNumber}`);
      });

      // Return clean object with primitive values only (avoid circular references)
      return {
        id: savedRequest.id,
        accountRenewalRequestNo: requestNumber,
        status: savedRequest.status,
        requestType: savedRequest.requestType,
        message: 'Request Submitted Successfully!'
      };
    } catch (error: any) {
      logger.error(`RENEWAL | CREATE TENANT ERROR: ${error.message || error}`);
      logger.error(`RENEWAL | CREATE TENANT ERROR STACK: ${error.stack}`);
      // Re-throw as clean error to avoid circular references
      if (error instanceof ApiError) {
        throw error;
      }
      // Safely extract error code without accessing potentially circular object properties
      const errorCode = typeof error?.code === 'string' ? error.code : null;
      const apiCode = errorCode ? 
        Object.values(APICodes as Record<string, any>).find((item: any) => item.code === errorCode) || APICodes.UNKNOWN_ERROR 
        : APICodes.UNKNOWN_ERROR;
      // Use original error message if available, otherwise use apiCode message
      const errorMessage = error?.message || apiCode?.message || 'Unknown error occurred';
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage, apiCode?.code || 'EC001');
    }
  }

  /**
   * Create HHO owner renewal request (Mobile)
   */
  async createHhoOwnerRenewal(body: any, user: any) {
    try {
      const { 
        unitId, 
        dtcmPermitEndDate
      } = body;

      logger.info(`RENEWAL | CREATE HHO OWNER | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

      // Validations as per BRD - BEFORE transaction (like admin pattern)
      await this.validateUnitLinkage(unitId, user.id);
      await this.checkDuplicateRenewal(unitId, user.id);
      await this.checkMoveOutConflict(unitId, user.id);
      // await this.validateMIPTemplate(unitId);

      // Generate request number
      const requestNumber = await this.generateRenewalRequestNumber();

      let savedRequest: any;
      let hhoOwnerDetails: any;

      await executeInTransaction(async (qr: any) => {

        // Create main renewal request with OPEN status (mobile requests need admin approval)
        const renewalRequest = new AccountRenewalRequests();
        renewalRequest.accountRenewalRequestNo = requestNumber;
        renewalRequest.requestType = ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER;
        renewalRequest.user = { id: user.id } as any;
        renewalRequest.unit = { id: unitId } as any;
        renewalRequest.status = MOVE_REQUEST_STATUS.OPEN; // Mobile requests need approval
        renewalRequest.moveInDate = dtcmPermitEndDate; // Store end date as moveInDate
        renewalRequest.createdBy = user.id;
        renewalRequest.updatedBy = user.id;
        renewalRequest.isActive = true;

        savedRequest = await qr.manager.save(AccountRenewalRequests, renewalRequest);

        // Create HHO owner-specific details - use saved entity instance directly (like admin pattern)
        hhoOwnerDetails = new AccountRenewalRequestDetailsHhoOwner();
        hhoOwnerDetails.accountRenewalRequest = savedRequest; // Use entity instance, not ID
        hhoOwnerDetails.dtcmPermitEndDate = dtcmPermitEndDate;
        hhoOwnerDetails.createdBy = user.id;
        hhoOwnerDetails.updatedBy = user.id;
        hhoOwnerDetails.isActive = true;

        await qr.manager.save(AccountRenewalRequestDetailsHhoOwner, hhoOwnerDetails);

        // Create log entry
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = savedRequest; // Use entity instance
        log.requestType = ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER;
        log.status = MOVE_REQUEST_STATUS.OPEN;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = "";
        log.comments = 'Renewal request submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });

        await qr.manager.save(log);

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHO OWNER CREATED | REQUEST: ${requestNumber}`);
      });

      // Return clean object with primitive values only (avoid circular references)
      return {
        id: savedRequest.id,
        accountRenewalRequestNo: requestNumber,
        status: savedRequest.status,
        requestType: savedRequest.requestType,
        message: 'Request Submitted Successfully!'
      };
    } catch (error: any) {
      logger.error(`RENEWAL | CREATE HHO OWNER ERROR: ${error.message || error}`);
      logger.error(`RENEWAL | CREATE HHO OWNER ERROR STACK: ${error.stack}`);
      // Re-throw as clean error to avoid circular references
      if (error instanceof ApiError) {
        throw error;
      }
      // Safely extract error code without accessing potentially circular object properties
      const errorCode = typeof error?.code === 'string' ? error.code : null;
      const apiCode = errorCode ? 
        Object.values(APICodes as Record<string, any>).find((item: any) => item.code === errorCode) || APICodes.UNKNOWN_ERROR 
        : APICodes.UNKNOWN_ERROR;
      // Use original error message if available, otherwise use apiCode message
      const errorMessage = error?.message || apiCode?.message || 'Unknown error occurred';
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage, apiCode?.code || 'EC001');
    }
  }

  /**
   * Create HHC company renewal request (Mobile)
   */
  async createHhcCompanyRenewal(body: any, user: any) {
    try {
      const { 
        unitId, 
        leaseContractEndDate, 
        dtcmPermitEndDate, 
        permitExpiry
      } = body;

      logger.info(`RENEWAL | CREATE HHC COMPANY | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

      // Validations as per BRD - BEFORE transaction (like admin pattern)
      await this.validateUnitLinkage(unitId, user.id);
      await this.checkDuplicateRenewal(unitId, user.id);
      await this.checkMoveOutConflict(unitId, user.id);
      // await this.validateMIPTemplate(unitId);

      // Generate request number
      const requestNumber = await this.generateRenewalRequestNumber();

      let savedRequest: any;
      let hhcCompanyDetails: any;

      await executeInTransaction(async (qr: any) => {

        // Create main renewal request with OPEN status (mobile requests need admin approval)
        const renewalRequest = new AccountRenewalRequests();
        renewalRequest.accountRenewalRequestNo = requestNumber;
        renewalRequest.requestType = ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY;
        renewalRequest.user = { id: user.id } as any;
        renewalRequest.unit = { id: unitId } as any;
        renewalRequest.status = MOVE_REQUEST_STATUS.OPEN; // Mobile requests need approval
        renewalRequest.moveInDate = leaseContractEndDate; // Store end date as moveInDate
        renewalRequest.createdBy = user.id;
        renewalRequest.updatedBy = user.id;
        renewalRequest.isActive = true;

        savedRequest = await qr.manager.save(AccountRenewalRequests, renewalRequest);

        // Create HHC company-specific details - use saved entity instance directly (like admin pattern)
        hhcCompanyDetails = new AccountRenewalRequestDetailsHhoCompany();
        hhcCompanyDetails.accountRenewalRequest = savedRequest; // Use entity instance, not ID
        hhcCompanyDetails.leaseContractEndDate = leaseContractEndDate;
        hhcCompanyDetails.dtcmPermitEndDate = dtcmPermitEndDate;
        hhcCompanyDetails.permitExpiry = permitExpiry;
        hhcCompanyDetails.createdBy = user.id;
        hhcCompanyDetails.updatedBy = user.id;
        hhcCompanyDetails.isActive = true;

        await qr.manager.save(AccountRenewalRequestDetailsHhoCompany, hhcCompanyDetails);

        // Create log entry
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = savedRequest; // Use entity instance
        log.requestType = ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY;
        log.status = MOVE_REQUEST_STATUS.OPEN;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = "";
        log.comments = 'Renewal request submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });

        await qr.manager.save(log);

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHC COMPANY CREATED | REQUEST: ${requestNumber}`);
      });

      // Return clean object with primitive values only (avoid circular references)
      return {
        id: savedRequest.id,
        accountRenewalRequestNo: requestNumber,
        status: savedRequest.status,
        requestType: savedRequest.requestType,
        message: 'Request Submitted Successfully!'
      };
    } catch (error: any) {
      logger.error(`RENEWAL | CREATE HHC COMPANY ERROR: ${error.message || error}`);
      logger.error(`RENEWAL | CREATE HHC COMPANY ERROR STACK: ${error.stack}`);
      // Re-throw as clean error to avoid circular references
      if (error instanceof ApiError) {
        throw error;
      }
      // Safely extract error code without accessing potentially circular object properties
      const errorCode = typeof error?.code === 'string' ? error.code : null;
      const apiCode = errorCode ? 
        Object.values(APICodes as Record<string, any>).find((item: any) => item.code === errorCode) || APICodes.UNKNOWN_ERROR 
        : APICodes.UNKNOWN_ERROR;
      // Use original error message if available, otherwise use apiCode message
      const errorMessage = error?.message || apiCode?.message || 'Unknown error occurred';
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage, apiCode?.code || 'EC001');
    }
  }

  /**
   * Update tenant renewal request (Mobile - only in RFI_PENDING status)
   */
  async updateTenantRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        logger.info(`RENEWAL | UPDATE TENANT | MOBILE | REQUEST: ${requestId} | USER: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, user: { id: user.id }, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Mobile users can only edit in RFI_PENDING status (as per BRD)
        if (renewalRequest.status !== MOVE_REQUEST_STATUS.RFI_PENDING) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.message,
            APICodes.RENEWAL_REQUEST_NOT_EDITABLE.code
          );
        }

        // Update tenant details (all fields except unit details)
        const tenantDetails = await AccountRenewalRequestDetailsTenant.findOne({
          where: { accountRenewalRequest: { id: requestId } }
        });

        if (tenantDetails) {
          Object.assign(tenantDetails, {
            tenancyContractEndDate: body.tenancyContractEndDate || tenantDetails.tenancyContractEndDate,
            adults: body.adults !== undefined ? body.adults : tenantDetails.adults,
            children: body.children !== undefined ? body.children : tenantDetails.children,
            householdStaffs: body.householdStaffs !== undefined ? body.householdStaffs : tenantDetails.householdStaffs,
            pets: body.pets !== undefined ? body.pets : tenantDetails.pets,
            ...(body.determinationComments !== undefined && { determinationComments: body.determinationComments }),
            updatedBy: user.id
          });
          await tenantDetails.save();
        }

        // Update main request
        if (body.tenancyContractEndDate) {
          renewalRequest.moveInDate = body.tenancyContractEndDate;
        }
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED; // Change to RFI_SUBMITTED
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Handle new document uploads
        if (body.files) {
          await this.handleDocumentUploads(renewalRequest.id, body.files, user.id, queryRunner);
        }

        // Create log
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = renewalRequest;
        log.requestType = renewalRequest.requestType;
        log.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = JSON.stringify(body);
        log.comments = 'RFI response submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });
        await queryRunner.manager.save(log);

        // Notify admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | TENANT UPDATED | REQUEST: ${requestId}`);

        return {
          id: Number(renewalRequest.id),
          accountRenewalRequestNo: String(renewalRequest.accountRenewalRequestNo),
          status: String(renewalRequest.status),
          message: 'Request updated and resubmitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE TENANT ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Update HHO owner renewal request (Mobile)
   */
  async updateHhoOwnerRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        logger.info(`RENEWAL | UPDATE HHO OWNER | MOBILE | REQUEST: ${requestId} | USER: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, user: { id: user.id }, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        if (renewalRequest.status !== MOVE_REQUEST_STATUS.RFI_PENDING) {
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
            dtcmPermitEndDate: body.dtcmPermitEndDate || hhoOwnerDetails.dtcmPermitEndDate,
            updatedBy: user.id
          });
          await hhoOwnerDetails.save();
        }

        if (body.dtcmPermitEndDate) {
          renewalRequest.moveInDate = body.dtcmPermitEndDate;
        }
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Handle document uploads
        if (body.files) {
          await this.handleDocumentUploads(renewalRequest.id, body.files, user.id, queryRunner);
        }

        // Create log
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = renewalRequest;
        log.requestType = renewalRequest.requestType;
        log.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = JSON.stringify(body);
        log.comments = 'RFI response submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });
        await queryRunner.manager.save(log);

        // Notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | HHO OWNER UPDATED | REQUEST: ${requestId}`);

        return {
          id: Number(renewalRequest.id),
          accountRenewalRequestNo: String(renewalRequest.accountRenewalRequestNo),
          status: String(renewalRequest.status),
          message: 'Request updated and resubmitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHO OWNER ERROR: ${error.message}`);
        if (error instanceof ApiError) {
          throw error;
        }
        // Safely extract error code without accessing potentially circular object properties
        const errorCode = typeof error?.code === 'string' ? error.code : null;
        const apiCode = errorCode ? 
          Object.values(APICodes as Record<string, any>).find((item: any) => item.code === errorCode) || APICodes.UNKNOWN_ERROR 
          : APICodes.UNKNOWN_ERROR;
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
      }
    });
  }

  /**
   * Update HHC company renewal request (Mobile)
   */
  async updateHhcCompanyRenewal(requestId: number, body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        logger.info(`RENEWAL | UPDATE HHC COMPANY | MOBILE | REQUEST: ${requestId} | USER: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, user: { id: user.id }, isActive: true }
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        if (renewalRequest.status !== MOVE_REQUEST_STATUS.RFI_PENDING) {
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
            leaseContractEndDate: body.leaseContractEndDate || hhcCompanyDetails.leaseContractEndDate,
            dtcmPermitEndDate: body.dtcmPermitEndDate || hhcCompanyDetails.dtcmPermitEndDate,
            permitExpiry: body.permitExpiry || hhcCompanyDetails.permitExpiry,
            updatedBy: user.id
          });
          await hhcCompanyDetails.save();
        }

        if (body.leaseContractEndDate) {
          renewalRequest.moveInDate = body.leaseContractEndDate;
        }
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Handle document uploads
        if (body.files) {
          await this.handleDocumentUploads(renewalRequest.id, body.files, user.id, queryRunner);
        }

        // Create log
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = renewalRequest;
        log.requestType = renewalRequest.requestType;
        log.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = JSON.stringify(body);
        log.comments = 'RFI response submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });
        await queryRunner.manager.save(log);

        // Notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | HHC COMPANY UPDATED | REQUEST: ${requestId}`);

        return {
          id: Number(renewalRequest.id),
          accountRenewalRequestNo: String(renewalRequest.accountRenewalRequestNo),
          status: String(renewalRequest.status),
          message: 'Request updated and resubmitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHC COMPANY ERROR: ${error.message}`);
        if (error instanceof ApiError) {
          throw error;
        }
        // Safely extract error code without accessing potentially circular object properties
        const errorCode = typeof error?.code === 'string' ? error.code : null;
        const apiCode = errorCode ? 
          Object.values(APICodes as Record<string, any>).find((item: any) => item.code === errorCode) || APICodes.UNKNOWN_ERROR 
          : APICodes.UNKNOWN_ERROR;
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
      }
    });
  }

  /**
   * Cancel renewal request by user (Mobile)
   */
  async cancelRenewalRequest(requestId: number, body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        const { reason, comments } = body;
        
        logger.info(`RENEWAL | CANCEL REQUEST | MOBILE | REQUEST: ${requestId} | USER: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, user: { id: user.id }, isActive: true },
          relations: ['unit']
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Users can only cancel requests that are in certain statuses
        const cancellableStatuses = [
          MOVE_REQUEST_STATUS.OPEN,
          MOVE_REQUEST_STATUS.RFI_PENDING,
          MOVE_REQUEST_STATUS.RFI_SUBMITTED
        ];

        if (!cancellableStatuses.includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Cannot cancel renewal request in current status',
            'RENEWAL_REQUEST_NOT_CANCELLABLE'
          );
        }

        // Update status to USER_CANCELLED
        renewalRequest.status = MOVE_REQUEST_STATUS.USER_CANCELLED;
        renewalRequest.comments = `${comments || ''}`.trim();
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Create log
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = renewalRequest;
        log.requestType = renewalRequest.requestType;
        log.status = MOVE_REQUEST_STATUS.USER_CANCELLED;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = `User Cancellation Reason: ${reason}`;
        log.comments = comments || 'Request cancelled by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString(),
          reason: reason
        });
        await queryRunner.manager.save(log);

        // Send notification to admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_user_cancelled', {
        //   requestId: renewalRequest.accountRenewalRequestNo,
        //   reason: reason
        // });

        logger.info(`RENEWAL | USER CANCELLED | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: Number(renewalRequest.id),
          accountRenewalRequestNo: String(renewalRequest.accountRenewalRequestNo),
          status: String(renewalRequest.status),
          message: 'Account Renewal Request Cancelled Successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CANCEL ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Submit RFI response for renewal request by user (Mobile)
   */
  async submitRFI(requestId: number, body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        const { comments, additionalInfo } = body;
        
        logger.info(`RENEWAL | SUBMIT RFI | MOBILE | REQUEST: ${requestId} | USER: ${user.id}`);

        const renewalRequest = await AccountRenewalRequests.findOne({
          where: { id: requestId, user: { id: user.id }, isActive: true },
          relations: ['unit']
        });

        if (!renewalRequest) {
          throw new ApiError(
            httpStatus.NOT_FOUND,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.message,
            APICodes.RENEWAL_REQUEST_NOT_FOUND.code
          );
        }

        // Can only submit RFI if status is RFI_PENDING
        if (renewalRequest.status !== MOVE_REQUEST_STATUS.RFI_PENDING) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Renewal request is not in RFI pending status. Only requests with RFI pending status can be submitted.',
            'INVALID_STATUS_FOR_RFI_SUBMISSION'
          );
        }

        // Update status to RFI_SUBMITTED
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        renewalRequest.comments = `${comments || ''}`.trim();
        renewalRequest.additionalInfo = additionalInfo || '';
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Create log
        const log = new AccountRenewalRequestLogs();
        log.accountRenewalRequest = renewalRequest;
        log.requestType = renewalRequest.requestType;
        log.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.user = { id: user.id } as any;
        log.changes = JSON.stringify({
          comments: comments,
          additionalInfo: additionalInfo,
          previousStatus: MOVE_REQUEST_STATUS.RFI_PENDING,
          newStatus: MOVE_REQUEST_STATUS.RFI_SUBMITTED
        });
        log.comments = 'RFI response submitted by customer';
        log.details = JSON.stringify({
          actionBy: TransitionRequestActionByTypes.USER,
          timestamp: new Date().toISOString()
        });
        await queryRunner.manager.save(log);

        // Send notification to admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | RFI SUBMITTED | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: Number(renewalRequest.id),
          accountRenewalRequestNo: String(renewalRequest.accountRenewalRequestNo),
          status: String(renewalRequest.status),
          message: 'RFI response submitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | SUBMIT RFI ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Upload documents for renewal request (Mobile)
   */
  async uploadDocuments(requestId: number, files: any, body: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the renewal request with user relationship
      const renewalRequest = await AccountRenewalRequests.getRepository()
        .createQueryBuilder("arr")
        .leftJoinAndSelect("arr.user", "user")
        .where("arr.id = :requestId AND arr.isActive = true", { requestId })
        .getOne();

      if (!renewalRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.RENEWAL_REQUEST_NOT_FOUND.message, APICodes.RENEWAL_REQUEST_NOT_FOUND.code);
      }

      // Verify the request belongs to the user
      if (renewalRequest.user?.id !== user?.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      // Check request type and enforce document restrictions
      const isTenantRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.TENANT;
      const isHhoOwnerRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER;
      const isHhcCompanyRenewal = renewalRequest.requestType === ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY;

      if (isTenantRenewal) {
        // For Tenant Renewal, only allow Ejari document (required)
        const allowedDocumentTypes = [
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
        // For HHO Owner Renewal, only allow DTCM permit (required)
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT
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
        // For HHC Company Renewal, no documents are required or allowed
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Document upload is not allowed for HHC company renewal. No documents are required for this renewal type.',
          'DOCUMENT_UPLOAD_NOT_ALLOWED'
        );
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

              logger.info(`RENEWAL | DOCUMENT UPLOADED | REQUEST: ${requestId} | TYPE: ${docType} | FILE: ${(uploadedFile as any).fileName}`);
            } catch (fileError: any) {
              logger.error(`RENEWAL | DOCUMENT UPLOAD ERROR | REQUEST: ${requestId} | TYPE: ${docType} | ERROR: ${fileError.message}`);
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
      const log = new AccountRenewalRequestLogs();
      log.accountRenewalRequest = renewalRequest;
      log.requestType = renewalRequest.requestType;
      log.status = renewalRequest.status;
      log.actionBy = TransitionRequestActionByTypes.USER;
      log.user = { id: user.id } as any;
      log.changes = JSON.stringify({ uploadedDocuments: uploadedDocuments.map(doc => ({ type: doc.documentType, fileName: doc.fileName })) });
      log.comments = 'Documents uploaded by customer';
      log.details = JSON.stringify({
        actionBy: TransitionRequestActionByTypes.USER,
        timestamp: new Date().toISOString()
      });
      await AccountRenewalRequestLogs.save(log);

      logger.info(`RENEWAL | DOCUMENTS UPLOADED | REQUEST: ${requestId} | COUNT: ${uploadedDocuments.length}`);

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
