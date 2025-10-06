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
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code);
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
   * Create audit log
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
        accountRenewalRequest: renewalRequest,
        requestType: renewalRequest.requestType,
        status,
        actionBy,
        user: user,
        comments: comments || '',
        changes: changes || '',
        details: JSON.stringify({ actionBy, timestamp: new Date() })
      });
      await log.save();
    } catch (error) {
      logger.error(`Failed to create renewal log: ${error}`);
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
          const docRecord = AccountRenewalRequestDocuments.create({
            accountRenewalRequest: { id: renewalRequestId } as any,
            user: { id: userId } as any,
            file: uploadedFile as any,
            documentType: docType,
            isActive: true,
            createdBy: userId,
            updatedBy: userId
          });
          await docRecord.save();

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
    return executeInTransaction(async (queryRunner: any) => {
      try {
        const { 
          unitId, 
          tenancyContractEndDate, 
          adults, 
          children, 
          householdStaffs, 
          pets, 
          peopleOfDetermination, 
          peopleOfDeterminationDetails,
          acceptTerms,
          files
        } = body;

        logger.info(`RENEWAL | CREATE TENANT | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

        // Validate terms acceptance
        if (!acceptTerms) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.message,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.code
          );
        }

        // Validations
        await this.validateUnitLinkage(unitId, user.id);
        await this.checkDuplicateRenewal(unitId, user.id);
        await this.checkMoveOutConflict(unitId, user.id);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with NEW status (mobile requests need admin approval)
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.TENANT,
          user: { id: user.id } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.OPEN, // NEW status for mobile
          moveInDate: tenancyContractEndDate,
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
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          dialCode: user.dialCode || '',
          phoneNumber: user.phoneNumber || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await tenantDetails.save();

        // Handle document uploads inline
        if (files) {
          await this.handleDocumentUploads(savedRequest.id, files, user.id, queryRunner);
        }

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.OPEN,
          TransitionRequestActionByTypes.USER,
          user,
          'Renewal request submitted by customer'
        );

        // Send notification to admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | TENANT CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType,
          message: 'Request Submitted Successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE TENANT ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Create HHO owner renewal request (Mobile)
   */
  async createHhoOwnerRenewal(body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        const { 
          unitId, 
          dtcmExpiryDate,
          adults,
          children,
          householdStaffs,
          pets,
          peopleOfDetermination,
          acceptTerms,
          files
        } = body;

        logger.info(`RENEWAL | CREATE HHO OWNER | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

        // Validate terms acceptance
        if (!acceptTerms) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.message,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.code
          );
        }

        // Validations
        await this.validateUnitLinkage(unitId, user.id);
        await this.checkDuplicateRenewal(unitId, user.id);
        await this.checkMoveOutConflict(unitId, user.id);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with NEW status
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.HHO_OWNER,
          user: { id: user.id } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.OPEN,
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
          adults: adults || 0,
          children: children || 0,
          householdStaffs: householdStaffs || 0,
          pets: pets || 0,
          ownerFirstName: user.firstName || '',
          ownerLastName: user.lastName || '',
          email: user.email || '',
          dialCode: user.dialCode || '',
          phoneNumber: user.phoneNumber || '',
          nationality: user.nationality || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await hhoOwnerDetails.save();

        // Handle document uploads
        if (files) {
          await this.handleDocumentUploads(savedRequest.id, files, user.id, queryRunner);
        }

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.OPEN,
          TransitionRequestActionByTypes.USER,
          user,
          'Renewal request submitted by customer'
        );

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHO OWNER CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType,
          message: 'Request Submitted Successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE HHO OWNER ERROR: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Create HHC company renewal request (Mobile)
   */
  async createHhcCompanyRenewal(body: any, user: any) {
    return executeInTransaction(async (queryRunner: any) => {
      try {
        const { 
          unitId, 
          leaseContractEndDate, 
          dtcmExpiryDate, 
          tradeLicenseExpiryDate,
          adults,
          children,
          householdStaffs,
          pets,
          acceptTerms,
          files
        } = body;

        logger.info(`RENEWAL | CREATE HHC COMPANY | MOBILE | USER: ${user.id} | UNIT: ${unitId}`);

        // Validate terms acceptance
        if (!acceptTerms) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.message,
            APICodes.RENEWAL_TERMS_NOT_ACCEPTED.code
          );
        }

        // Validations
        await this.validateUnitLinkage(unitId, user.id);
        await this.checkDuplicateRenewal(unitId, user.id);
        await this.checkMoveOutConflict(unitId, user.id);
        await this.validateMIPTemplate(unitId);

        // Generate request number
        const requestNumber = await this.generateRenewalRequestNumber();

        // Create main renewal request with NEW status
        const renewalRequest = AccountRenewalRequests.create({
          accountRenewalRequestNo: requestNumber,
          requestType: ACCOUNT_RENEWAL_USER_TYPES.HHO_COMPANY,
          user: { id: user.id } as any,
          unit: { id: unitId } as any,
          status: MOVE_REQUEST_STATUS.OPEN,
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
          companyName: body.companyName || user.companyName || '',
          companyEmail: body.companyEmail || user.email || '',
          tradeLicenseNumber: body.tradeLicenseNumber || '',
          createdBy: user.id,
          updatedBy: user.id
        });

        await hhcCompanyDetails.save();

        // Handle document uploads
        if (files) {
          await this.handleDocumentUploads(savedRequest.id, files, user.id, queryRunner);
        }

        // Create log entry
        await this.createRenewalLog(
          savedRequest,
          MOVE_REQUEST_STATUS.OPEN,
          TransitionRequestActionByTypes.USER,
          user,
          'Renewal request submitted by customer'
        );

        // Send notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_submitted', {
        //   requestId: requestNumber,
        //   unitNumber: savedRequest.unit?.unitNumber || ''
        // });

        logger.info(`RENEWAL | HHC COMPANY CREATED | REQUEST: ${requestNumber}`);

        return {
          id: savedRequest.id,
          accountRenewalRequestNo: requestNumber,
          status: savedRequest.status,
          requestType: savedRequest.requestType,
          message: 'Request Submitted Successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CREATE HHC COMPANY ERROR: ${error.message}`);
        throw error;
      }
    });
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
            peopleOfDetermination: body.peopleOfDetermination !== undefined ? body.peopleOfDetermination : tenantDetails.peopleOfDetermination,
            peopleOfDeterminationDetails: body.peopleOfDeterminationDetails || tenantDetails.peopleOfDeterminationDetails,
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
        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.RFI_SUBMITTED,
          TransitionRequestActionByTypes.USER,
          user,
          'RFI response submitted by customer',
          JSON.stringify(body)
        );

        // Notify admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | TENANT UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status,
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
            dtcmExpiryDate: body.dtcmExpiryDate || hhoOwnerDetails.dtcmExpiryDate,
            adults: body.adults !== undefined ? body.adults : hhoOwnerDetails.adults,
            children: body.children !== undefined ? body.children : hhoOwnerDetails.children,
            householdStaffs: body.householdStaffs !== undefined ? body.householdStaffs : hhoOwnerDetails.householdStaffs,
            pets: body.pets !== undefined ? body.pets : hhoOwnerDetails.pets,
            updatedBy: user.id
          });
          await hhoOwnerDetails.save();
        }

        if (body.dtcmExpiryDate) {
          renewalRequest.moveInDate = body.dtcmExpiryDate;
        }
        renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Handle document uploads
        if (body.files) {
          await this.handleDocumentUploads(renewalRequest.id, body.files, user.id, queryRunner);
        }

        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.RFI_SUBMITTED,
          TransitionRequestActionByTypes.USER,
          user,
          'RFI response submitted by customer',
          JSON.stringify(body)
        );

        // Notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | HHO OWNER UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status,
          message: 'Request updated and resubmitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHO OWNER ERROR: ${error.message}`);
        throw error;
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
            dtcmExpiryDate: body.dtcmExpiryDate || hhcCompanyDetails.dtcmExpiryDate,
            tradeLicenseExpiryDate: body.tradeLicenseExpiryDate || hhcCompanyDetails.tradeLicenseExpiryDate,
            companyName: body.companyName || hhcCompanyDetails.companyName,
            companyEmail: body.companyEmail || hhcCompanyDetails.companyEmail,
            tradeLicenseNumber: body.tradeLicenseNumber || hhcCompanyDetails.tradeLicenseNumber,
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

        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.RFI_SUBMITTED,
          TransitionRequestActionByTypes.USER,
          user,
          'RFI response submitted by customer',
          JSON.stringify(body)
        );

        // Notification - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_rfi_submitted', {
        //   requestId: renewalRequest.accountRenewalRequestNo
        // });

        logger.info(`RENEWAL | HHC COMPANY UPDATED | REQUEST: ${requestId}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status,
          message: 'Request updated and resubmitted successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | UPDATE HHC COMPANY ERROR: ${error.message}`);
        throw error;
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

        // Cannot cancel if already cancelled or approved
        if ([
          MOVE_REQUEST_STATUS.CANCELLED, 
          MOVE_REQUEST_STATUS.USER_CANCELLED,
          MOVE_REQUEST_STATUS.APPROVED
        ].includes(renewalRequest.status)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.RENEWAL_REQUEST_CANCELLATION_NOT_ALLOWED.message,
            APICodes.RENEWAL_REQUEST_CANCELLATION_NOT_ALLOWED.code
          );
        }

        // Update status to USER_CANCELLED (different from admin cancel)
        renewalRequest.status = MOVE_REQUEST_STATUS.USER_CANCELLED;
        renewalRequest.comments = `${reason}. ${comments || ''}`.trim();
        renewalRequest.updatedBy = user.id;
        await renewalRequest.save();

        // Create log
        await this.createRenewalLog(
          renewalRequest,
          MOVE_REQUEST_STATUS.USER_CANCELLED,
          TransitionRequestActionByTypes.USER,
          user,
          renewalRequest.comments,
          `User Cancellation Reason: ${reason}`
        );

        // Send notification to admin - Commented out as per request - can be incorporated later if needed
        // await this.sendNotification(user.id, 'account_renewal_user_cancelled', {
        //   requestId: renewalRequest.accountRenewalRequestNo,
        //   reason: reason
        // });

        logger.info(`RENEWAL | USER CANCELLED | REQUEST: ${renewalRequest.accountRenewalRequestNo}`);

        return {
          id: renewalRequest.id,
          accountRenewalRequestNo: renewalRequest.accountRenewalRequestNo,
          status: renewalRequest.status,
          message: 'Account Renewal Request Cancelled Successfully!'
        };
      } catch (error: any) {
        logger.error(`RENEWAL | CANCEL ERROR: ${error.message}`);
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
      await this.createRenewalLog(
        renewalRequest,
        renewalRequest.status,
        TransitionRequestActionByTypes.USER,
        user,
        'Documents uploaded by customer',
        JSON.stringify({ uploadedDocuments: uploadedDocuments.map(doc => ({ type: doc.documentType, fileName: doc.fileName })) })
      );

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

  /**
   * Submit RFI response for renewal request (Mobile)
   */
  async submitRFI(requestId: number, rfiData: { comments: string; additionalInfo?: string }, user: any) {
    try {
      // Get the renewal request
      const renewalRequest = await AccountRenewalRequests.getRepository()
        .createQueryBuilder("arr")
        .leftJoinAndSelect("arr.user", "user")
        .where("arr.id = :requestId AND arr.isActive = true", { requestId })
        .getOne();

      if (!renewalRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.RENEWAL_REQUEST_NOT_FOUND.message, APICodes.RENEWAL_REQUEST_NOT_FOUND.code);
      }

      // Check if request belongs to the user
      if (renewalRequest.user.id !== user.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      // Check if request is in RFI pending status
      if (renewalRequest.status !== MOVE_REQUEST_STATUS.RFI_PENDING) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Renewal request is not in RFI pending status. Only requests with RFI pending status can be submitted.',
          'INVALID_STATUS_FOR_RFI_SUBMISSION'
        );
      }

      // Update request status to RFI submitted
      renewalRequest.status = MOVE_REQUEST_STATUS.RFI_SUBMITTED;
      renewalRequest.updatedBy = user.id;
      renewalRequest.updatedAt = new Date();

      await renewalRequest.save();

      // Create log entry
      await this.createRenewalLog(
        renewalRequest,
        renewalRequest.status,
        TransitionRequestActionByTypes.USER,
        user,
        'RFI response submitted by customer',
        JSON.stringify({ 
          comments: rfiData.comments, 
          additionalInfo: rfiData.additionalInfo || '',
          previousStatus: MOVE_REQUEST_STATUS.RFI_PENDING,
          newStatus: MOVE_REQUEST_STATUS.RFI_SUBMITTED
        })
      );

      logger.info(`RENEWAL | RFI SUBMITTED | REQUEST: ${requestId} | USER: ${user.id}`);

      return {
        requestId,
        status: renewalRequest.status,
        message: 'RFI response submitted successfully. Admin will review your submission.'
      };
    } catch (error: any) {
      logger.error(`RENEWAL | SUBMIT RFI ERROR: ${error.message}`);
      throw error;
    }
  }
}
