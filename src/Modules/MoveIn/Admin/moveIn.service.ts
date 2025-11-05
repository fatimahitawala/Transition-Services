import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../../Common/Utils/adminAccess";
import { logger } from "../../../Common/Utils/logger";
import { MOVE_IN_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS } from "../../../Entities/EntityTypes";
import { MoveInRequestDetailsHhcCompany } from "../../../Entities/MoveInRequestDetailsHhcCompany.entity";
import { MoveInRequestDetailsHhoOwner } from "../../../Entities/MoveInRequestDetailsHhoOwner.entity";
import { MoveInRequestDetailsTenant } from "../../../Entities/MoveInRequestDetailsTenant.entity";
import { MoveInRequestDetailsOwner } from "../../../Entities/MoveInRequestDetailsOwner.entity";
import { MoveInRequestLogs } from "../../../Entities/MoveInRequestLogs.entity";
import { MoveInRequestDocuments } from "../../../Entities/MoveInRequestDocuments.entity";
import { TRANSITION_DOCUMENT_TYPES, TransitionRequestActionByTypes } from "../../../Entities/EntityTypes/transition";
import { uploadFile } from "../../../Common/Utils/azureBlobStorage";
import { executeInTransaction } from "../../../Common/Utils/transactionUtil";
import { Units } from "../../../Entities/Units.entity";
import { UnitBookings } from "../../../Entities/UnitBookings.entity";
import config from "../../../Common/Config/config";
import { EmailService, MoveInEmailData } from "../../Email/email.service";
import { OccupancyRequestWelcomePack } from "../../../Entities/OccupancyRequestWelcomePack.entity";
import { OccupancyRequestTemplates } from "../../../Entities/OccupancyRequestTemplates.entity";
import { OccupancyRequestEmailRecipients } from "../../../Entities/OccupancyRequestEmailRecipients.entity";
import { IsNull } from "typeorm";
import { Users } from "../../../Entities/Users.entity";
import { CommonService } from "../../Common/common.service";

export class MoveInService {
  private emailService: EmailService;
  private commonService = new CommonService();

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Validate Welcome Pack and MIP configuration for move-in requests
   * Users cannot create move-in requests if Welcome Pack or MIP are inactive
   */
  private async validateWelcomePackAndMIP(unitId: number): Promise<void> {
    try {
      logger.info(`Validating Welcome Pack and MIP for unit: ${unitId}`);
      
      // Get unit information with community hierarchy
      const unit = await Units.getRepository()
        .createQueryBuilder('unit')
        .addSelect('unit.isActive')
        .leftJoinAndSelect('unit.masterCommunity', 'masterCommunity')
        .leftJoinAndSelect('unit.community', 'community')
        .leftJoinAndSelect('unit.tower', 'tower')
        .where('unit.id = :unitId', { unitId })
        .getOne();

      if (!unit) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          'Unit not found',
          'UNIT_NOT_FOUND'
        );
      }

      // Check if unit is active
      if (!unit.isActive) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit ${unit.unitNumber} is not active`,
          'EC223'
        );
      }

      const { masterCommunity, community, tower } = unit;
      
      logger.info(`Unit hierarchy - Master Community: ${masterCommunity?.id}, Community: ${community?.id}, Tower: ${tower?.id}`);

      // Check Welcome Pack configuration with fallback logic
      let welcomePack = null;
      
      // First Priority: Check for exact match (Master Community + Community + Tower + Active)
      if (tower?.id) {
        const exactMatchQuery = OccupancyRequestWelcomePack.getRepository()
          .createQueryBuilder('welcomePack')
          .where('welcomePack.isActive = true')
          .andWhere('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId: masterCommunity.id })
          .andWhere('welcomePack.communityId = :communityId', { communityId: community.id })
          .andWhere('welcomePack.towerId = :towerId', { towerId: tower.id });
        
        welcomePack = await exactMatchQuery.getOne();
        logger.info(`Welcome Pack exact match (with tower) check: ${welcomePack ? 'Found' : 'Not found'}`);
      }
      
      // Fallback: If not found with tower, check for broader match (Master Community + Community + Active)
      if (!welcomePack) {
        const fallbackQuery = OccupancyRequestWelcomePack.getRepository()
          .createQueryBuilder('welcomePack')
          .where('welcomePack.isActive = true')
          .andWhere('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId: masterCommunity.id })
          .andWhere('welcomePack.communityId = :communityId', { communityId: community.id })
          .andWhere('welcomePack.towerId IS NULL');
        
        welcomePack = await fallbackQuery.getOne();
        logger.info(`Welcome Pack fallback (without tower) check: ${welcomePack ? 'Found' : 'Not found'}`);
      }

      if (!welcomePack) {
        logger.error(`Welcome Pack not found or inactive for unit: ${unitId}`);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.WELCOME_PACK_NOT_CONFIGURED.message,
          APICodes.WELCOME_PACK_NOT_CONFIGURED.code
        );
      }

      logger.info(`Welcome Pack found: ${welcomePack.id}`);

      // Check MIP (Move-In Process) template configuration with fallback logic
      let mipConfig = null;
      
      // First Priority: Check for exact match (Master Community + Community + Tower + Active)
      if (tower?.id) {
        const exactMatchQuery = OccupancyRequestTemplates.getRepository()
          .createQueryBuilder('mip')
          .where('mip.isActive = true')
          .andWhere('mip.templateType = :templateType', { templateType: 'move-in' })
          .andWhere('mip.masterCommunityId = :masterCommunityId', { masterCommunityId: masterCommunity.id })
          .andWhere('mip.communityId = :communityId', { communityId: community.id })
          .andWhere('mip.towerId = :towerId', { towerId: tower.id });
        
        mipConfig = await exactMatchQuery.getOne();
        logger.info(`MIP template exact match (with tower) check: ${mipConfig ? 'Found' : 'Not found'}`);
      }
      
      // Fallback: If not found with tower, check for broader match (Master Community + Community + Active)
      if (!mipConfig) {
        const fallbackQuery = OccupancyRequestTemplates.getRepository()
          .createQueryBuilder('mip')
          .where('mip.isActive = true')
          .andWhere('mip.templateType = :templateType', { templateType: 'move-in' })
          .andWhere('mip.masterCommunityId = :masterCommunityId', { masterCommunityId: masterCommunity.id })
          .andWhere('mip.communityId = :communityId', { communityId: community.id })
          .andWhere('mip.towerId IS NULL');
        
        mipConfig = await fallbackQuery.getOne();
        logger.info(`MIP template fallback (without tower) check: ${mipConfig ? 'Found' : 'Not found'}`);
      }

      if (!mipConfig) {
        logger.error(`MIP template not found or inactive for unit: ${unitId}`);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.MIP_NOT_CONFIGURED.message,
          APICodes.MIP_NOT_CONFIGURED.code
        );
      }

      logger.info(`MIP template found: ${mipConfig.id}`);
      logger.info(`Welcome Pack and MIP validation passed for unit: ${unitId}`);

    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error validating Welcome Pack and MIP for unit ${unitId}: ${error.message}`);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to validate Welcome Pack and MIP configuration',
        'VALIDATION_ERROR'
      );
    }
  }

  async createMoveInRequest(data: any, user: any) {
    try {
      const {
        unitId,
        requestType,
        moveInDate,
        comments,
        additionalInfo,
        details,
        userId, // User ID from payload for the request owner
        // Tenant personal info (required for tenant flow)
        firstName,
        lastName,
        email,
        dialCode,
        phoneNumber,
        emiratesIdNumber,
        emiratesIdExpiryDate,
        tenancyContractStartDate,
        tenancyContractEndDate,
        // HHC Company specific fields
        name,
        company,
        companyEmail,
        countryCode,
        operatorOfficeNumber,
        tradeLicenseNumber,
        unitPermitStartDate,
        unitPermitExpiryDate,
        unitPermitNumber,
        leaseStartDate,
        leaseEndDate,
        nationality,
      } = data;

      // Only admin users can create move-in requests
      if (!user?.isAdmin) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      if (!unitId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.INVALID_DATA.message,
          APICodes.INVALID_DATA.code
        );
      }

      if (!Object.values(MOVE_IN_USER_TYPES).includes(requestType)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.INVALID_DATA.message,
          APICodes.INVALID_DATA.code
        );
      }

      const unit = await this.getUnitById(Number(unitId));
      if (!unit) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.UNIT_NOT_FOUND.message,
          APICodes.UNIT_NOT_FOUND.code
        );
      }

      // Business Logic Validations for Owner, Tenant, HHO-Unit, and HHO-Company Move-in Requests
      if (requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT || requestType === MOVE_IN_USER_TYPES.HHO_OWNER || requestType === MOVE_IN_USER_TYPES.HHO_COMPANY) {
        // 1. Check MIP template availability FIRST before other validations
        const mipCheck = await this.checkMIPAndWelcomePack(Number(unitId));
        if (!mipCheck.hasMIP) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.MIP_NOT_CONFIGURED.message,
            APICodes.MIP_NOT_CONFIGURED.code
          );
        }

        // 2. Allow multiple OPEN requests; block only if an APPROVED request already exists
        await this.checkUnitAvailabilityForNewRequest(Number(unitId));

        // 3. Overlap: allow overlaps for OPEN/PENDING; only block if an APPROVED request exists
        const overlapCheck = await this.checkOverlappingRequests(Number(unitId), new Date(moveInDate));
        if (overlapCheck.hasOverlap) {
          throw new ApiError(
            httpStatus.CONFLICT,
            APICodes.OVERLAPPING_REQUESTS.message,
            APICodes.OVERLAPPING_REQUESTS.code
          );
        }
      }

      const tempRequestNumber = this.generateRequestNumber(unit?.unitNumber);

      let createdMaster: MoveInRequests | undefined;
      let createdDetails: any = null;

      await executeInTransaction(async (qr: any) => {
        // Create master record
        const master = new MoveInRequests();
        master.moveInRequestNo = tempRequestNumber;
        master.requestType = requestType;
        master.user = { id: userId } as any;
        master.unit = { id: unitId } as any;
        master.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
        master.moveInDate = moveInDate ? new Date(moveInDate) : new Date();
        master.comments = comments || null;
        master.additionalInfo = additionalInfo || null;
        master.createdBy = user?.id;
        master.updatedBy = user?.id;
        master.isActive = true;

        const savedMaster = await MoveInRequests.save(master);

        // Update request number to final format MIP-<unitNumber>-<id>
        const finalRequestNumber = `MIP-${unit?.unitNumber}-${savedMaster.id}`;
        await MoveInRequests.update({ id: savedMaster.id }, { moveInRequestNo: finalRequestNumber });
        savedMaster.moveInRequestNo = finalRequestNumber as any;
        createdMaster = savedMaster;

        // Create detail record based on request type
        let detailsData;

        if (requestType === MOVE_IN_USER_TYPES.HHO_OWNER) {
          // For HHO Owner, use the mapped details directly
          detailsData = details;
        } else {
          // For other types, create the detailsData object
          detailsData = {
            ...details,
            // Tenant personal info (if provided on tenant flow)
            firstName,
            lastName,
            email,
            dialCode,
            phoneNumber,
            nationality, // Add nationality from root level
            adults: details.adults,
            children: details.children,
            householdStaffs: details.householdStaffs,
            pets: details.pets,
            // peopleOfDetermination is persisted as column exists; termsAccepted not stored in tenant table
            peopleOfDetermination: details.peopleOfDetermination,
            emiratesIdNumber,
            emiratesIdExpiryDate,
            tenancyContractStartDate: tenancyContractStartDate,
            tenancyContractEndDate: tenancyContractEndDate,
            // HHC Company specific fields
            name,
            company,
            companyEmail,
            countryCode,
            operatorOfficeNumber,
            tradeLicenseNumber,
            unitPermitStartDate: details.unitPermitStartDate,
            unitPermitExpiryDate: details.unitPermitExpiryDate,
            unitPermitNumber: details.unitPermitNumber,
            leaseStartDate: details.leaseStartDate,
            leaseEndDate: details.leaseEndDate,
          };
        }

        createdDetails = await this.createDetailsRecord(qr, requestType, createdMaster as MoveInRequests, detailsData, user?.id);

        // Auto-approve owner, tenant, HHO-Unit, and HHO-Company move-in requests
        if (requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT || requestType === MOVE_IN_USER_TYPES.HHO_OWNER || requestType === MOVE_IN_USER_TYPES.HHO_COMPANY) {
          logger.info(`Auto-approving ${requestType} move-in request ${savedMaster.id}`);
          await this.autoApproveRequest(qr, savedMaster.id, user?.id);

          // Update the in-memory object to reflect the approved status
          savedMaster.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
          createdMaster = savedMaster;

          logger.info(`Move-in request ${savedMaster.id} auto-approved, status updated to: ${savedMaster.status}`);
        }

        // Create initial log
        const log = new MoveInRequestLogs();
        log.moveInRequest = createdMaster as MoveInRequests;
        log.requestType = requestType;
        log.status = (requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT || requestType === MOVE_IN_USER_TYPES.HHO_OWNER || requestType === MOVE_IN_USER_TYPES.HHO_COMPANY) ? MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED : MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
        log.changes = "";
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        log.details = details ? JSON.stringify(details) : "";
        log.comments = comments || null;

        await MoveInRequestLogs.save(log);
      });

      // Send notifications after successful creation
      if (createdMaster) {
        logger.info(`=== TRIGGERING EMAIL NOTIFICATIONS ===`);
        logger.info(`Request ID: ${createdMaster.id}, Request Number: ${createdMaster.moveInRequestNo}`);
        logger.info(`Request Status: ${createdMaster.status}`);
        logger.info(`Request Type: ${requestType}`);
        logger.info(`Is Auto-approved: ${requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT}`);

        await this.sendNotifications(createdMaster.id, createdMaster.moveInRequestNo);

        // In-app notifications for auto-approved creation (Admin + Customer)
        try {
          if (createdMaster.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
            const fullRequest = await MoveInRequests.getRepository()
              .createQueryBuilder('mir')
              .leftJoinAndSelect('mir.unit', 'unit')
              .leftJoinAndSelect('unit.masterCommunity', 'masterCommunity')
              .leftJoinAndSelect('unit.community', 'community')
              .leftJoinAndSelect('unit.tower', 'tower')
              .leftJoinAndSelect('mir.user', 'user')
              .where('mir.id = :id', { id: createdMaster.id })
              .getOne();

            if (fullRequest) {
              const moveInDateStr = fullRequest.moveInDate
                ? new Date(fullRequest.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
                : '';
              const residentType =
                fullRequest.requestType === MOVE_IN_USER_TYPES.OWNER ? 'Owner' :
                fullRequest.requestType === MOVE_IN_USER_TYPES.TENANT ? 'Tenant' :
                fullRequest.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? 'HHO Owner' :
                fullRequest.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'HHO Company' : String(fullRequest.requestType);

              const templateData: any = {
                '<request_id>': fullRequest.moveInRequestNo,
                '<request_ID>': fullRequest.moveInRequestNo,
                '<move_in_date>': moveInDateStr,
                '<resident_type>': residentType,
                '<unit_number>': fullRequest.unit?.unitNumber || '',
                '<tower_name>': fullRequest.unit?.tower?.name || '',
                '<community_name>': fullRequest.unit?.community?.name || '',
                '<master_community_name>': fullRequest.unit?.masterCommunity?.name || '',
              };

              const payload: any = {
                user_id: fullRequest.user?.id,
                unit_id: fullRequest.unit?.id,
                status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
                slug: 'move-in',
                request_id: fullRequest.moveInRequestNo,
              };

              const { addNotification, addAdminNotification } = await import('../../../Common/Utils/notification');

              // Admin in-app: auto-approved created
              await addAdminNotification(user?.id || 0, 'move_in_auto_approved_created_to_admin', templateData, payload);
              logger.info(`Admin auto-approved creation notification queued for ${fullRequest.moveInRequestNo}`);

              // Customer in-app: auto-approved (owner vs tenant style)
              const userTemplateSlug = [MOVE_IN_USER_TYPES.OWNER, MOVE_IN_USER_TYPES.HHO_OWNER].includes(fullRequest.requestType as any)
                ? 'move_in_auto_approved_to_user_owner'
                : 'move_in_auto_approved_to_user_tenant';
              await addNotification(fullRequest.user.id, userTemplateSlug, templateData, payload);
              logger.info(`User auto-approved notification queued (${userTemplateSlug}) for ${fullRequest.moveInRequestNo}`);
            }
          }
        } catch (notifyErr) {
          logger.error(`Failed creating auto-approved in-app notifications for ${createdMaster.moveInRequestNo}: ${notifyErr}`);
        }
      } else {
        logger.error(`=== EMAIL NOTIFICATION SKIPPED ===`);
        logger.error(`createdMaster is null/undefined - no email will be sent`);
      }

      // Push to Salesforce for admin-created auto-approved move-ins
      try {
        if (createdMaster && [
          MOVE_IN_USER_TYPES.OWNER,
          MOVE_IN_USER_TYPES.TENANT,
          MOVE_IN_USER_TYPES.HHO_OWNER,
          MOVE_IN_USER_TYPES.HHO_COMPANY,
        ].includes(requestType as any) && createdMaster.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
          const userRec = await Users.getRepository().findOne({ where: { id: (createdMaster as any)?.user?.id || userId } });
          const unitRec = await Units.getRepository().createQueryBuilder('u')
            .select(['u.id', 'u.unitName', 'u.unitNumber', 'u.salesForceId'])
            .where('u.id = :id', { id: unitId })
            .getOne();

          const cc = (userRec?.dialCode?.dialCode || '').toString();
          const normCC = cc ? (cc.startsWith('+') ? cc : `+${cc}`) : null;

          const typeOfTenantMap: Record<string, string> = {
            owner: 'HomeOwner',
            tenant: 'Tenant',
            hho_owner: 'HHO',
            hho_company: 'Company',
            hho: 'HHO',
            company: 'Company',
          };

          const reqTypeKey = String(requestType || '').toLowerCase();

          const payload = {
            salutation: (userRec as any)?.honorific || null,
            firstName: (userRec as any)?.firstName || null,
            lastName: (userRec as any)?.lastName || null,
            primaryMobileCountryCode: normCC,
            primaryMobileNumber: (userRec as any)?.mobile || null,
            alternativeMobileCountryCode: null,
            alternativeMobileNumber: (userRec as any)?.alternativeMobile || null,
            primaryEmail: (userRec as any)?.email || null,
            alternateEmail: (userRec as any)?.alternativeEmail || null,
            unitId: (unitRec as any)?.salesForceId || '',
            nationality: (userRec as any)?.nationality?.name || (userRec as any)?.nationality || null,
            typeOfTenant: typeOfTenantMap[reqTypeKey] || null,
            moveInDate: (createdMaster as any)?.moveInDate ? new Date((createdMaster as any).moveInDate).toISOString().slice(0, 10) : null,
            moveOutDate: null,
            ejariStartDate: (createdDetails as any)?.tenancyContractStartDate ? new Date((createdDetails as any).tenancyContractStartDate).toISOString().slice(0, 10) : null,
            ejariEndDate: (createdDetails as any)?.tenancyContractEndDate ? new Date((createdDetails as any).tenancyContractEndDate).toISOString().slice(0, 10) : null,
            requestRaisedDate: (createdMaster as any)?.createdAt ? new Date((createdMaster as any).createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            dtcmStartDate: (createdDetails as any)?.dtcmStartDate ? new Date((createdDetails as any).dtcmStartDate).toISOString().slice(0, 10) : null,
            dtcmEndDate: (createdDetails as any)?.dtcmExpiryDate ? new Date((createdDetails as any).dtcmExpiryDate).toISOString().slice(0, 10) : null,
            requestApprovedDate: new Date().toISOString().slice(0, 10),
            request_type: 'move-in' as const,
            status: 'approve',
            mobile_app_reference: (createdMaster as any)?.moveInRequestNo,
          };

          await this.commonService.sendResidentToSalesforce(payload);
        }
      } catch (e) {
        logger.error(`Salesforce push (admin-create move-in approval) failed: ${e}`);
      }

      logger.info(`MOVE-IN CREATED BY ADMIN: ${createdMaster?.moveInRequestNo} for unit ${unitId} by admin ${user?.id}`);

      const response = createdMaster as MoveInRequests;
      return {
        id: response.id,
        moveInRequestNo: response.moveInRequestNo,
        status: response.status,
        requestType: response.requestType,
        moveInDate: response.moveInDate,
        unit: response.unit,
        details: createdDetails,
        isAutoApproved: (requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT || requestType === MOVE_IN_USER_TYPES.HHO_OWNER || requestType === MOVE_IN_USER_TYPES.HHO_COMPANY),
        // Include move-in permit URL for owner, tenant, HHO-Unit, and HHO-Company requests (generated after approval)
        moveInPermitUrl: (requestType === MOVE_IN_USER_TYPES.OWNER || requestType === MOVE_IN_USER_TYPES.TENANT || requestType === MOVE_IN_USER_TYPES.HHO_OWNER || requestType === MOVE_IN_USER_TYPES.HHO_COMPANY) ? await this.generateMoveInPermit(response.id) : null,
      };
    } catch (error: any) {
      // Log full error and surface meaningful message/code when possible
      logger.error(`Error in createMoveInRequest Admin: ${JSON.stringify(error)}`);
      if (error instanceof ApiError) {
        throw error;
      }
      const driverMsg = error?.driverError?.sqlMessage || error?.sqlMessage || error?.message || APICodes.UNKNOWN_ERROR?.message || 'Unknown error occurred';
      const driverCode = error?.driverError?.code || error?.code || APICodes.UNKNOWN_ERROR?.code || 'EC001';
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, driverMsg, driverCode);
    }
  }

  // Helper method to get unit by ID
  private async getUnitById(id: number) {
    try {
      return await Units.getRepository()
        .createQueryBuilder("ut")
        .addSelect("ut.isActive")
        .innerJoinAndSelect("ut.masterCommunity", "mc", "mc.isActive = 1")
        .innerJoinAndSelect("ut.community", "c", "c.isActive = 1")
        .innerJoinAndSelect("ut.tower", "t", "t.isActive = 1")
        .where("ut.id = :id", { id })
        .getOne();
    } catch (error) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR?.message || 'Unknown error occurred',
        APICodes.UNKNOWN_ERROR?.code || 'EC001'
      );
    }
  }

  // Helper method to generate request number
  private generateRequestNumber(unitNumber?: string | number): string {
    const suffix = `${Date.now()}`;
    return `MIP-${unitNumber ?? 'UNIT'}-${suffix}`;
  }

  // Helper method to create details record based on request type
  private async createDetailsRecord(qr: any, requestType: MOVE_IN_USER_TYPES, master: MoveInRequests, details: any, userId: number) {
    switch (requestType) {
      case MOVE_IN_USER_TYPES.TENANT: {
        const entity = new MoveInRequestDetailsTenant();
        entity.moveInRequest = master;
        entity.firstName = details.firstName;
        entity.lastName = details.lastName;
        entity.email = details.email;
        entity.dialCode = details.dialCode;
        entity.phoneNumber = details.phoneNumber;
        entity.nationality = details.nationality;
        entity.adults = details.adults;
        entity.children = details.children;
        entity.householdStaffs = details.householdStaffs;
        entity.pets = details.pets;
        // peopleOfDetermination is persisted as column exists; termsAccepted not stored in tenant table
        entity.peopleOfDetermination = details.peopleOfDetermination;
        entity.determination_text = details.determination_text || null;
        entity.emiratesIdNumber = details.emiratesIdNumber;
        entity.emiratesIdExpiryDate = details.emiratesIdExpiryDate;
        entity.tenancyContractStartDate = details.tenancyContractStartDate;
        entity.tenancyContractEndDate = details.tenancyContractEndDate;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await MoveInRequestDetailsTenant.save(entity);
      }
      case MOVE_IN_USER_TYPES.OWNER: {
        const entity = new MoveInRequestDetailsOwner();
        entity.moveInRequest = master;

        // Occupancy details
        entity.adults = details.adults;
        entity.children = details.children;
        entity.householdStaffs = details.householdStaffs;
        entity.pets = details.pets;
        entity.comments = details.comments;
        entity.peopleOfDetermination = details.peopleOfDetermination || false;
        entity.determination_text = details.determination_text || null;

        // Optional fields with defaults (user personal info comes from Users table)
        entity.emergencyContactDialCode = "";
        entity.emergencyContactNumber = "";
        entity.emiratesIdNumber = "";
        entity.passportNumber = "";
        entity.visaNumber = "";
        entity.companyName = "";
        entity.tradeLicenseNumber = "";
        entity.companyAddress = "";
        entity.companyPhone = "";
        entity.companyEmail = "";
        entity.powerOfAttorneyNumber = "";
        entity.attorneyName = "";
        entity.attorneyPhone = "";
        entity.ejariNumber = "";
        entity.dtcmPermitNumber = "";
        entity.emergencyContactName = "";
        entity.relationship = "";
        entity.monthlyRent = 0;
        entity.securityDeposit = 0;
        entity.maintenanceFee = 0;
        entity.currency = "";

        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await MoveInRequestDetailsOwner.save(entity);
      }
      case MOVE_IN_USER_TYPES.HHO_OWNER: {
        const entity = new MoveInRequestDetailsHhoOwner();
        entity.moveInRequest = master;
        // Required fields
        entity.ownerFirstName = details.ownerFirstName;
        entity.ownerLastName = details.ownerLastName;
        entity.email = details.email;
        entity.dialCode = details.dialCode;
        entity.phoneNumber = details.phoneNumber;
        entity.nationality = details.nationality;

        // Details from request
        entity.adults = details.adults ?? 0;
        entity.children = details.children ?? 0;
        entity.householdStaffs = details.householdStaffs ?? 0;
        entity.pets = details.pets ?? 0;
        entity.comments = details.comments;

        // Permit fields
        entity.unitPermitNumber = details.unitPermitNumber ?? null;
        entity.unitPermitStartDate = details.unitPermitStartDate ?? null;
        entity.unitPermitExpiryDate = details.unitPermitExpiryDate ?? null;

        // People of determination fields
        entity.peopleOfDetermination = details.peopleOfDetermination || false;
        entity.determination_text = details.determination_text || null;

        // Additional fields with defaults
        entity.attorneyFirstName = details.attorneyFirstName || null;
        entity.attorneyLastName = details.attorneyLastName || null;
        entity.dateOfBirth = details.dateOfBirth || null;
        entity.emergencyContactDialCode = details.emergencyContactDialCode || null;
        entity.emergencyContactNumber = details.emergencyContactNumber || null;
        entity.emiratesIdNumber = details.emiratesIdNumber || null;
        entity.passportNumber = details.passportNumber || null;
        entity.visaNumber = details.visaNumber || null;
        entity.powerOfAttorneyNumber = details.powerOfAttorneyNumber || null;
        entity.attorneyName = details.attorneyName ?? "";
        entity.attorneyPhone = details.attorneyPhone ?? "";
        entity.ejariNumber = details.ejariNumber ?? "";
        entity.dtcmPermitNumber = details.dtcmPermitNumber ?? "";
        entity.emergencyContactName = details.emergencyContactName ?? "";
        entity.relationship = details.relationship ?? "";
        entity.monthlyRent = details.monthlyRent ?? null;
        entity.securityDeposit = details.securityDeposit ?? null;
        entity.maintenanceFee = details.maintenanceFee ?? null;
        entity.currency = details.currency ?? null;

        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await MoveInRequestDetailsHhoOwner.save(entity);
      }
      case MOVE_IN_USER_TYPES.HHO_COMPANY: {
        const entity = new MoveInRequestDetailsHhcCompany();
        entity.moveInRequest = master;
        entity.name = details.name; // Now map directly to the name field
        entity.companyName = details.company;
        entity.companyEmail = details.companyEmail;
        entity.operatorOfficeNumber = details.operatorOfficeNumber;
        entity.tradeLicenseNumber = details.tradeLicenseNumber;
        entity.tradeLicenseExpiryDate = details.tradeLicenseExpiryDate;
        entity.tenancyContractStartDate = details.tenancyContractStartDate;
        entity.unitPermitStartDate = details.unitPermitStartDate;
        entity.unitPermitExpiryDate = details.unitPermitExpiryDate;
        entity.unitPermitNumber = details.unitPermitNumber;
        entity.leaseStartDate = details.leaseStartDate;
        entity.leaseEndDate = details.leaseEndDate;
        entity.dtcmStartDate = details.dtcmStartDate;
        entity.dtcmExpiryDate = details.dtcmExpiryDate;
        entity.nationality = details.nationality;
        entity.emiratesIdNumber = details.emiratesIdNumber;
        entity.emiratesIdExpiryDate = details.emiratesIdExpiryDate;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await MoveInRequestDetailsHhcCompany.save(entity);
      }
      default:
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.INVALID_DATA.message,
          APICodes.INVALID_DATA.code
        );
    }
  }

  // New Admin-specific move-in request methods
  async createOwnerMoveIn(data: any, user: any) {
    try {
      logger.info(`=== CREATE OWNER MOVE-IN START ===`);
      logger.info(`Input data: ${JSON.stringify(data)}`);
      logger.info(`User: ${JSON.stringify(user)}`);

      // Validate Welcome Pack and MIP before proceeding
      if (data.unitId) {
        await this.validateWelcomePackAndMIP(Number(data.unitId));
        logger.info(`Welcome Pack and MIP validation passed for owner move-in, unit: ${data.unitId}`);
      }

      // Map owner UI fields to details (user details come from Users table, not stored here)
      const { details = {}, ...rest } = data || {};
      const ownerDetails = {
        // Occupancy details
        adults: details.adults,
        children: details.children,
        householdStaffs: details.householdStaffs,
        pets: details.pets,
        peopleOfDetermination: details.peopleOfDetermination,
        // Store detailsText in determination_text field when peopleOfDetermination is true
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
      };

      logger.info(`Owner Details mapped: ${JSON.stringify(ownerDetails)}`);
      logger.info(`Calling createMoveInRequest with OWNER type...`);

      const result = await this.createMoveInRequest({ ...rest, details: ownerDetails, requestType: MOVE_IN_USER_TYPES.OWNER }, user);

      logger.info(`=== CREATE OWNER MOVE-IN SUCCESS ===`);
      logger.info(`Created move-in request: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      logger.error(`=== CREATE OWNER MOVE-IN ERROR ===`);
      logger.error(`Error in createOwnerMoveIn Admin: ${JSON.stringify(error)}`);
      logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      logger.error(`=== CREATE OWNER MOVE-IN ERROR END ===`);
      throw error;
    }
  }

  async createTenantMoveIn(data: any, user: any) {
    try {
      logger.info(`=== CREATE TENANT MOVE-IN START (ADMIN) ===`);
      logger.info(`Unit ID: ${data.unitId}`);
      
      // Validate Welcome Pack and MIP before proceeding
      if (data.unitId) {
        await this.validateWelcomePackAndMIP(Number(data.unitId));
        logger.info(`Welcome Pack and MIP validation passed for tenant move-in, unit: ${data.unitId}`);
      }
      
      // Map tenant UI fields to details (user details come from Users table, not stored here)
      const { details = {}, ...rest } = data || {};
      const tenantDetails = {
        // Personal details
        firstName: details.firstName || rest.firstName,
        lastName: details.lastName || rest.lastName,
        email: details.email || rest.email,
        dialCode: details.dialCode || rest.dialCode,
        phoneNumber: details.phoneNumber || rest.phoneNumber,
        nationality: details.nationality || rest.nationality,
        emiratesIdNumber: details.emiratesIdNumber || rest.emiratesIdNumber,
        emiratesIdExpiryDate: details.emiratesIdExpiryDate || rest.emiratesIdExpiryDate,
        tenancyContractStartDate: details.tenancyContractStartDate || rest.tenancyContractStartDate,
        tenancyContractEndDate: details.tenancyContractEndDate || rest.tenancyContractEndDate,

        // Occupancy details
        adults: details.adults,
        children: details.children,
        householdStaffs: details.householdStaffs,
        pets: details.pets,
        peopleOfDetermination: details.peopleOfDetermination,
        termsAccepted: details.termsAccepted,

        // Store detailsText in determination_text field when peopleOfDetermination is true
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
      };

      logger.debug(`Tenant Details mapped: ${JSON.stringify(tenantDetails)}`);
      return this.createMoveInRequest({ ...rest, details: tenantDetails, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
    } catch (error) {
      logger.error(`Error in createTenantMoveIn Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  async createHhoOwnerMoveIn(data: any, user: any) {
    try {
      logger.info(`=== CREATE HHO OWNER MOVE-IN START (ADMIN) ===`);
      logger.info(`Unit ID: ${data.unitId}`);
      
      // Validate Welcome Pack and MIP before proceeding
      if (data.unitId) {
        await this.validateWelcomePackAndMIP(Number(data.unitId));
        logger.info(`Welcome Pack and MIP validation passed for HHO owner move-in, unit: ${data.unitId}`);
      }
      
      // Map HHO Owner UI fields to details
      const { details = {}, ...rest } = data || {};
      const hhoOwnerDetails = {
        // Owner identity: use UI values if present, else fallback to admin user
        ownerFirstName: rest.ownerFirstName || user?.firstName || user?.name?.split(' ')?.[0] || 'Admin',
        ownerLastName: rest.ownerLastName || user?.lastName || user?.name?.split(' ')?.slice(1).join(' ') || 'User',
        email: rest.email || user?.email || `admin${user?.id || 'user'}@${process.env.ADMIN_EMAIL_DOMAIN || 'onesobha.com'}`,
        dialCode: rest.dialCode || user?.dialCode?.dialCode || user?.dialCode || '+971',
        phoneNumber: rest.phoneNumber || user?.mobile || user?.phoneNumber || user?.phone || '000000000',
        nationality: rest.nationality || user?.nationality || 'UAE',

        // People of Determination fields
        peopleOfDetermination: details.peopleOfDetermination,
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,

        // Comments
        comments: rest.comments || null,

        // Permit fields from request
        unitPermitNumber: details.unitPermitNumber,
        unitPermitStartDate: details.unitPermitStartDate,
        unitPermitExpiryDate: details.unitPermitExpiryDate,
      } as any;

      logger.debug(`HHO Owner Details mapped: ${JSON.stringify(hhoOwnerDetails)}`);
      return this.createMoveInRequest({ ...rest, details: hhoOwnerDetails, requestType: MOVE_IN_USER_TYPES.HHO_OWNER }, user);
    } catch (error) {
      logger.error(`Error in createHhoOwnerMoveIn Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  async createHhcCompanyMoveIn(data: any, user: any) {
    try {
      logger.info(`=== CREATE HHC COMPANY MOVE-IN START (ADMIN) ===`);
      logger.info(`Unit ID: ${data.unitId}`);
      
      // Validate Welcome Pack and MIP before proceeding
      if (data.unitId) {
        await this.validateWelcomePackAndMIP(Number(data.unitId));
        logger.info(`Welcome Pack and MIP validation passed for HHC company move-in, unit: ${data.unitId}`);
      }
      
      const { details = {}, ...rest } = data || {};
      const hhcCompanyDetails = {
        name: rest.name,
        company: rest.company, // Keep as 'company' since createDetailsRecord expects this field name
        companyEmail: rest.companyEmail,
        operatorOfficeNumber: rest.operatorOfficeNumber,
        tradeLicenseNumber: rest.tradeLicenseNumber,
        tradeLicenseExpiryDate: rest.tradeLicenseExpiryDate,
        tenancyContractStartDate: rest.tenancyContractStartDate,
        unitPermitStartDate: rest.unitPermitStartDate,
        unitPermitExpiryDate: rest.unitPermitExpiryDate,
        unitPermitNumber: rest.unitPermitNumber,
        leaseStartDate: rest.leaseStartDate,
        leaseEndDate: rest.leaseEndDate,
        dtcmStartDate: rest.dtcmStartDate,
        dtcmExpiryDate: rest.dtcmExpiryDate,
        nationality: rest.nationality,
        emiratesIdNumber: rest.emiratesIdNumber,
        emiratesIdExpiryDate: rest.emiratesIdExpiryDate,
        
        // People of Determination fields
        peopleOfDetermination: details.peopleOfDetermination,
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
      } as any;

      // Do not merge external details; ignore termsAccepted or any details from request body
      return this.createMoveInRequest({ ...rest, details: { ...hhcCompanyDetails }, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
    } catch (error) {
      logger.error(`Error in createHhcCompanyMoveIn Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  // Document upload method for Admin
  async uploadDocuments(requestId: number, files: any, body: any, user: any) {
    try {
      // Admin can upload documents for any move-in request
      if (!user?.isAdmin) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.NOT_FOUND.message,
          APICodes.NOT_FOUND.code
        );
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Emirates ID Front
        if (files?.[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-front/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'emiratesIdFront', document: document });
        }

        // Handle Emirates ID Back
        if (files?.[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-back/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'emiratesIdBack', document: document });
        }

        // Handle Ejari
        if (files?.[TRANSITION_DOCUMENT_TYPES.EJARI]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.EJARI][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/ejari/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.EJARI;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'ejari', document: document });
        }

        // Handle Unit Permit
        if (files?.[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/unit-permit/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'unitPermit', document: document });
        }

        // Handle Company Trade License
        if (files?.[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/company-trade-license/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'companyTradeLicense', document: document });
        }

        // Handle Title Deed
        if (files?.[TRANSITION_DOCUMENT_TYPES.TITLE_DEED]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.TITLE_DEED][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/title-deed/`, user?.id);

          const document = new MoveInRequestDocuments();
          document.moveInRequest = { id: requestId } as any;
          document.user = { id: user?.id } as any;
          document.file = uploadedFile as any;
          document.documentType = TRANSITION_DOCUMENT_TYPES.TITLE_DEED;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;

          await MoveInRequestDocuments.save(document);
          uploadedDocuments.push({ type: 'titleDeed', document: document });
        }

        // Handle Other documents
        if (files?.[TRANSITION_DOCUMENT_TYPES.OTHER]?.length) {
          for (const file of files[TRANSITION_DOCUMENT_TYPES.OTHER]) {
            const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/other/`, user?.id);

            const document = new MoveInRequestDocuments();
            document.moveInRequest = { id: requestId } as any;
            document.user = { id: user?.id } as any;
            document.file = uploadedFile as any;
            document.documentType = TRANSITION_DOCUMENT_TYPES.OTHER;
            document.createdBy = user?.id;
            document.updatedBy = user?.id;

            await MoveInRequestDocuments.save(document);
            uploadedDocuments.push({ type: 'other', document: document });
          }
        }

        // Log the document upload action
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        log.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
        log.changes = 'DOCUMENTS_UPLOADED';
        log.comments = `Documents uploaded by admin: ${uploadedDocuments.map(d => d.type).join(', ')}`;

        await MoveInRequestLogs.save(log);
      });

      return {
        uploadedDocuments,
        requestId,
      };
    } catch (error) {
      logger.error(`Error in uploadDocuments Admin: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async getAllMoveInRequestList(query: any, user: any) {
    try {
      const isSecurity = await checkIsSecurity(user);
      let {
        page = 1,
        per_page = 20,
        masterCommunityIds = "",
        communityIds = "",
        towerIds = "",
        createdStartDate = "",
        createdEndDate = "",
        moveInStartDate = "",
        moveInEndDate = "",
        status = "",
        search = "",
        requestId = "",
        unitNumber = "",
        requestType = "",
        sortBy = "createdAt",
        sortOrder = "DESC"
      } = query;

      // Debug: Log the exact query parameters received
      logger.debug(`=== ADMIN MOVE-IN REQUEST DEBUG ===`);
      logger.debug(`Raw query object: ${JSON.stringify(query)}`);
      logger.debug(`Query keys: ${Object.keys(query).join(', ')}`);
      logger.debug(`User object: ${JSON.stringify(user)}`);
      logger.debug(`User isAdmin: ${user?.isAdmin}`);
      logger.debug(`=====================================`);

      masterCommunityIds = masterCommunityIds ? masterCommunityIds.split(",").filter((e: any) => e) : [];
      communityIds = communityIds ? communityIds.split(",").filter((e: any) => e) : [];
      towerIds = towerIds ? towerIds.split(",").filter((e: any) => e) : [];

      let getMoveInList = MoveInRequests.getRepository().createQueryBuilder("am")
        .leftJoinAndSelect("am.unit", "u", "u.isActive=1")
        .leftJoinAndSelect("u.masterCommunity", "mc", "mc.isActive=1")
        .leftJoinAndSelect("u.community", "c", "c.isActive=1")
        .leftJoinAndSelect("u.tower", "t", "t.isActive=1")
        .addSelect("am.createdAt")
        .addSelect("am.updatedAt")
        .addSelect("am.createdBy")
        .addSelect("am.updatedBy")
        .where("am.isActive=1");

      // Only apply permission filtering for non-admin users
      if (!user?.isAdmin) {
        getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      // Apply filters
      if (masterCommunityIds && masterCommunityIds.length) getMoveInList.andWhere(`mc.id IN (:...masterCommunityIds)`, { masterCommunityIds });
      if (communityIds && communityIds.length) getMoveInList.andWhere(`c.id IN (:...communityIds)`, { communityIds });
      if (towerIds && towerIds.length) getMoveInList.andWhere(`t.id IN (:...towerIds)`, { towerIds });

      // Date range filters - handle both start and end dates properly
      if (createdStartDate) {
        const startDate = new Date(createdStartDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        getMoveInList.andWhere(`am.createdAt >= :createdStartDate`, { createdStartDate: startDate });
        logger.debug(`Created Start Date filter: ${createdStartDate} -> ${startDate.toISOString()}`);
      }
      if (createdEndDate) {
        const endDate = new Date(createdEndDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        getMoveInList.andWhere(`am.createdAt <= :createdEndDate`, { createdEndDate: endDate });
        logger.debug(`Created End Date filter: ${createdEndDate} -> ${endDate.toISOString()}`);
      }
      if (moveInStartDate) {
        const startDate = new Date(moveInStartDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        getMoveInList.andWhere(`am.moveInDate >= :moveInStartDate`, { moveInStartDate: startDate });
        logger.debug(`Move-in Start Date filter: ${moveInStartDate} -> ${startDate.toISOString()}`);
      }
      if (moveInEndDate) {
        const endDate = new Date(moveInEndDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        getMoveInList.andWhere(`am.moveInDate <= :moveInEndDate`, { moveInEndDate: endDate });
        logger.debug(`Move-in End Date filter: ${moveInEndDate} -> ${endDate.toISOString()}`);
      }

      if (status) getMoveInList.andWhere(`am.status = :status`, { status });
      if (requestId) getMoveInList.andWhere(`am.moveInRequestNo = :requestId`, { requestId });
      if (unitNumber) getMoveInList.andWhere(`u.unitNumber LIKE :unitNumber`, { unitNumber: `%${unitNumber}%` });
      if (requestType) getMoveInList.andWhere(`am.requestType = :requestType`, { requestType });

      // Search functionality
      if (search) {
        getMoveInList.andWhere(`(
          am.moveInRequestNo LIKE :search OR 
          u.unitNumber LIKE :search OR 
          u.unitName LIKE :search OR 
          mc.name LIKE :search OR 
          c.name LIKE :search OR 
          t.name LIKE :search
        )`, { search: `%${search}%` });
      }

      if (isSecurity) {
        getMoveInList.andWhere("am.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }

      // Apply sorting
      const validSortFields = {
        'id': 'am.id',
        'createdAt': 'am.createdAt',
        'updatedAt': 'am.updatedAt',
        'moveInDate': 'am.moveInDate',
        'status': 'am.status',
        'masterCommunityId': 'mc.id',
        'communityId': 'c.id',
        'towerId': 't.id',
        'unitNumber': 'u.unitNumber',
        'ownerName': 'am.moveInRequestNo', // Fallback to request number
        'tenantName': 'am.moveInRequestNo', // Fallback to request number
        'createdBy': 'am.createdBy',
        'updatedBy': 'am.updatedBy'
      } as const;

      const sortField = (sortBy && sortBy in validSortFields) ? validSortFields[sortBy as keyof typeof validSortFields] : 'am.createdAt';
      const sortDirection = (typeof sortOrder === 'string' && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

      getMoveInList.orderBy(sortField, sortDirection)
        .offset((page - 1) * per_page)
        .limit(per_page);

      // Debug: Log the final query
      logger.debug(`Final query: ${getMoveInList.getQuery()}`);
      logger.debug(`Query parameters: ${JSON.stringify(getMoveInList.getParameters())}`);

      const list = await getMoveInList.getMany();
      const count = await getMoveInList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);

      // Debug: Log the results
      logger.debug(`Total items found: ${count}, List length: ${list.length}`);
      logger.debug(`First few items: ${JSON.stringify(list.slice(0, 2))}`);

      // Debug: Log unit data specifically
      if (list.length > 0) {
        const firstItem = list[0] as any;
        logger.debug(`Unit data for first item: unitId=${firstItem.unit?.id}, unitNumber=${firstItem.unit?.unitNumber}, unitName=${firstItem.unit?.unitName}`);
      }

      // Transform the response to match mobile format
      const transformedList = list.map((item: any) => ({
        id: item.id,
        moveInRequestNo: item.moveInRequestNo,
        requestType: item.requestType,
        status: item.status,
        moveInDate: item.moveInDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
        unit: item.unit ? {
          id: item.unit.id,
          unitNumber: item.unit.unitNumber,
          floorNumber: item.unit.floorNumber,
          unitName: item.unit.unitName
        } : {},
        masterCommunityId: item.unit?.masterCommunity?.id,
        masterCommunityName: item.unit?.masterCommunity?.name,
        communityId: item.unit?.community?.id,
        communityName: item.unit?.community?.name,
        towerId: item.unit?.tower?.id,
        towerName: item.unit?.tower?.name
      }));

      return { data: transformedList, pagination };

    } catch (error) {
      logger.error(`Error in getAdminMoveIn : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }

  async getMoveInRequestDetailsWithId(requestId: number, user: any) {
    try {
      logger.debug(`getMoveInRequestDetailsWithId - requestId: ${requestId}, userId: ${user?.id}`);

      // Get the main move-in request with basic details
      let query = MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .leftJoinAndSelect("mv.user", "user", "user.isActive = true")
        .leftJoinAndSelect("mv.unit", "u", "u.isActive = true")
        .leftJoinAndSelect("u.masterCommunity", "mc", "mc.isActive = true")
        .leftJoinAndSelect("u.tower", "t", "t.isActive = true")
        .leftJoinAndSelect("u.community", "c", "c.isActive = true")
        .where("mv.isActive = true AND mv.id = :requestId", { requestId });

      const isSecurity = await checkIsSecurity(user);

      if (isSecurity) {
        query.andWhere("mv.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }

      let result: any = await query.getOne();

      if (!result) {
        logger.warn(`Move-in request not found - requestId: ${requestId}`);
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
      }

      // Get all type-specific details (always include all types, even if empty)
      const detailsMap: Record<string, { repo: any; alias: string; key: string }> = {
        [MOVE_IN_USER_TYPES.HHO_COMPANY]: {
          repo: MoveInRequestDetailsHhcCompany,
          alias: "moveInCompany",
          key: "moveInCompanyDetails",
        },
        [MOVE_IN_USER_TYPES.HHO_OWNER]: {
          repo: MoveInRequestDetailsHhoOwner,
          alias: "moveInHHO",
          key: "moveInHHOOwnerDetails",
        },
        [MOVE_IN_USER_TYPES.TENANT]: {
          repo: MoveInRequestDetailsTenant,
          alias: "moveInTenant",
          key: "moveInTenantDetails",
        },
        [MOVE_IN_USER_TYPES.OWNER]: {
          repo: MoveInRequestDetailsOwner,
          alias: "moveInOwner",
          key: "moveInOwnerDetails",
        },
      };

      // Initialize all detail types as empty objects
      result.moveInOwnerDetails = {};
      result.moveInTenantDetails = {};
      result.moveInHHOOwnerDetails = {};
      result.moveInCompanyDetails = {};

      // Fetch details for all types
      for (const [requestType, config] of Object.entries(detailsMap)) {
        try {
          const details = await config.repo
            .getRepository()
            .createQueryBuilder(config.alias)
            .where(`${config.alias}.moveInRequest.id = :id AND ${config.alias}.isActive = true`, { id: result.id })
            .getOne();

          if (details) {
            // Remove the moveInRequest relation and other metadata fields
            const { moveInRequest, createdBy, updatedBy, isActive, createdAt, updatedAt, ...cleanDetails } = details;
            result[config.key] = cleanDetails;
          }
        } catch (error) {
          logger.warn(`Error fetching ${config.key} for requestId ${requestId}: ${error}`);
          // Keep as empty object if there's an error
        }
      }

      // Get documents if any
      const documents = await MoveInRequestDocuments.getRepository()
        .createQueryBuilder("doc")
        .select([
          "doc.id",
          "doc.documentType",
          "doc.expiryDate",
          "doc.userId",
          "doc.fileId",
          "doc.createdAt",
          "doc.updatedAt",
          "file.id",
          "file.fileName",
          "file.filePath",
          "file.fileType",
          "file.fileSize",
          "file.fileExtension",
          "file.fileOriginalName",
          "file.createdAt"
        ])
        .leftJoin("doc.file", "file")
        .where("doc.moveInRequestId = :id AND doc.isActive = true", { id: result.id })
        .getMany();

      logger.debug(`Found ${documents.length} documents for requestId: ${requestId}`);

      // Add full file URL to each document
      result.documents = documents.map(doc => ({
        ...doc,
        file: doc.file ? {
          ...doc.file,
          fileUrl: `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/application/${doc.file.filePath}`
        } : null
      }));

      // Construct unit object from joined data
      result.unit = result.unit ? {
        id: result.unit.id,
        unitNumber: result.unit.unitNumber,
        floorNumber: result.unit.floorNumber,
        unitName: result.unit.unitName,
        masterCommunity: result.unit.masterCommunity ? {
          id: result.unit.masterCommunity.id,
          name: result.unit.masterCommunity.name
        } : null,
        community: result.unit.community ? {
          id: result.unit.community.id,
          name: result.unit.community.name
        } : null,
        tower: result.unit.tower ? {
          id: result.unit.tower.id,
          name: result.unit.tower.name
        } : null
      } : {};

      // Remove sensitive fields from user object
      if (result.user) {
        const { password, ...cleanUser } = result.user;
        result.user = cleanUser;
      }

      logger.debug(`Successfully retrieved move-in request details for requestId: ${requestId}`);
      return result;

    } catch (error: any) {
      logger.error(`Error in getMoveInRequestDetailsWithId: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }



  // Check if unit is available for a new move-in request
  private async checkUnitAvailabilityForNewRequest(unitId: number): Promise<boolean> {
    try {
      logger.info(`[CHECK_UNIT_AVAILABILITY] Starting validation for unitId: ${unitId}`);
      
      // Check unit status conditions
      const unit = await Units.getRepository()
        .createQueryBuilder("unit")
        .addSelect("unit.isActive")
        .where("unit.id = :unitId", { unitId })
        .getOne();

      logger.info(`[CHECK_UNIT_AVAILABILITY] Unit fetched - unitId: ${unitId}, found: ${!!unit}`);

      if (!unit) {
        logger.error(`[CHECK_UNIT_AVAILABILITY] Unit not found: ${unitId}`);
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `Unit ${unitId} not found`,
          "EC404"
        );
      }

      // Log all unit properties
      logger.info(`[CHECK_UNIT_AVAILABILITY] Unit details - unitId: ${unitId}, unitNumber: ${unit.unitNumber}, unitName: ${unit.unitName}`);
      logger.info(`[CHECK_UNIT_AVAILABILITY] Unit status values - isActive: ${unit.isActive} (type: ${typeof unit.isActive}), availabilityStatus: '${unit.availabilityStatus}', occupancyStatus: '${unit.occupancyStatus}'`);
      
      // Validate unit status conditions
      logger.debug(`Unit ${unitId} debug - isActive: ${unit.isActive}, type: ${typeof unit.isActive}, availabilityStatus: ${unit.availabilityStatus}, occupancyStatus: ${unit.occupancyStatus}`);
      
      // Check 1: isActive
      logger.info(`[CHECK_UNIT_AVAILABILITY] Checking isActive - Value: ${unit.isActive}, Expected: true`);
      if (!unit.isActive) {
        logger.error(`[CHECK_UNIT_AVAILABILITY] VALIDATION FAILED - Unit ${unit.unitNumber} (ID: ${unitId}) is not active - Value: ${unit.isActive}, Type: ${typeof unit.isActive}`);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit ${unit.unitNumber} not available`,
          APICodes.UNIT_NOT_VACANT.code
        );
      }
      logger.info(`[CHECK_UNIT_AVAILABILITY] ✓ isActive check passed - Value: ${unit.isActive}`);

      // Check 2: availabilityStatus
      logger.info(`[CHECK_UNIT_AVAILABILITY] Checking availabilityStatus - Value: '${unit.availabilityStatus}', Expected: 'Available'`);
      if (unit.availabilityStatus !== 'Available') {
        logger.error(`[CHECK_UNIT_AVAILABILITY] VALIDATION FAILED - Unit ${unit.unitNumber} (ID: ${unitId}) availability status is not 'Available': '${unit.availabilityStatus}'`);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit ${unit.unitNumber} not available`,
          APICodes.UNIT_NOT_VACANT.code
        );
      }
      logger.info(`[CHECK_UNIT_AVAILABILITY] ✓ availabilityStatus check passed - Value: '${unit.availabilityStatus}'`);

      // Check 3: occupancyStatus
      logger.info(`[CHECK_UNIT_AVAILABILITY] Checking occupancyStatus - Value: '${unit.occupancyStatus}', Expected: 'vacant'`);
      if (unit.occupancyStatus !== 'vacant') {
        logger.error(`[CHECK_UNIT_AVAILABILITY] VALIDATION FAILED - Unit ${unit.unitNumber} (ID: ${unitId}) occupancy status is not 'vacant': '${unit.occupancyStatus}'`);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit ${unit.unitNumber} not available`,
          APICodes.UNIT_NOT_VACANT.code
        );
      }
      logger.info(`[CHECK_UNIT_AVAILABILITY] ✓ occupancyStatus check passed - Value: '${unit.occupancyStatus}'`);

      // Check 4: existing approved request
      logger.info(`[CHECK_UNIT_AVAILABILITY] Checking for existing approved move-in requests for unitId: ${unitId}`);
      const existingApprovedRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .where("mir.unit.id = :unitId", { unitId })
        .andWhere("mir.status = :approvedStatus", { approvedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED })
        .andWhere("mir.isActive = 1")
        .getOne();

      logger.info(`[CHECK_UNIT_AVAILABILITY] Existing approved request check - Found: ${!!existingApprovedRequest}, RequestId: ${existingApprovedRequest?.id || 'N/A'}`);

      if (existingApprovedRequest) {
        logger.error(`[CHECK_UNIT_AVAILABILITY] VALIDATION FAILED - Unit ${unit.unitNumber} (ID: ${unitId}) already has an approved move-in request: ${existingApprovedRequest.id}, RequestNo: ${existingApprovedRequest.moveInRequestNo}`);
        throw new ApiError(
          httpStatus.CONFLICT,
          `Unit ${unit.unitNumber} not available`,
          APICodes.UNIT_NOT_VACANT.code
        );
      }
      logger.info(`[CHECK_UNIT_AVAILABILITY] ✓ No existing approved requests found`);

      logger.info(`[CHECK_UNIT_AVAILABILITY] ✓✓✓ ALL VALIDATIONS PASSED for unitId: ${unitId}`);
      return true;
    } catch (error: any) {
      // If it's already an ApiError (our specific validation errors), re-throw it
      if (error.isOperational) {
        throw error;
      }
      // Only catch unexpected errors
      logger.error(`Error checking unit availability: ${error}`);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code
      );
    }
  }

  // Check for overlapping move-in requests
  private async checkOverlappingRequests(unitId: number, moveInDate: Date): Promise<{ hasOverlap: boolean; count: number; requests: any[] }> {
    try {
      const overlappingRequests = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .where("mir.unit.id = :unitId", { unitId })
        // Only consider APPROVED requests as blocking for overlap purposes
        .andWhere("mir.status = :approvedStatus", { approvedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED })
        .andWhere("mir.isActive = 1")
        .getMany();

      const hasOverlap = overlappingRequests.length > 0;

      return {
        hasOverlap,
        count: overlappingRequests.length,
        requests: overlappingRequests
      };
    } catch (error) {
      logger.error(`Error checking overlapping requests: ${error}`);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code
      );
    }
  }

  // Check if MIP template and Welcome pack exist for the unit
  private async checkMIPAndWelcomePack(unitId: number): Promise<{ hasMIP: boolean; hasWelcomePack: boolean }> {
    try {
      // Use the existing validateWelcomePackAndMIP method which validates both
      await this.validateWelcomePackAndMIP(unitId);
      return { hasMIP: true, hasWelcomePack: true };
    } catch (error) {
      // If validation fails, return false
      if (error instanceof ApiError) {
        logger.error(`Error checking MIP and Welcome pack: ${error.message}`);
        return { hasMIP: false, hasWelcomePack: false };
      }
      logger.error(`Error checking MIP and Welcome pack: ${error}`);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code
      );
    }
  }

  // Auto-approve move-in request for owner and tenant
  private async autoApproveRequest(qr: any, requestId: number, userId: number): Promise<void> {
    try {
      // Update status to approved
      await MoveInRequests.update({ id: requestId }, {
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
        updatedBy: userId,
        updatedAt: new Date()
      });

      // Create approval log
      const approvalLog = new MoveInRequestLogs();
      approvalLog.moveInRequest = { id: requestId } as any;
      approvalLog.requestType = MOVE_IN_USER_TYPES.OWNER; // This will be updated based on actual request type
      approvalLog.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
      approvalLog.changes = "Request auto-approved by system";
      approvalLog.user = { id: userId } as any;
      approvalLog.actionBy = TransitionRequestActionByTypes.SYSTEM;
      approvalLog.details = "Move-in request auto-approved for owner/tenant";
      approvalLog.comments = "Auto-approved as per business rules";

      await MoveInRequestLogs.save(approvalLog);

      logger.info(`Move-in request ${requestId} auto-approved`);
    } catch (error) {
      logger.error(`Error auto-approving request: ${error}`);
      throw error;
    }
  }

  // Generate move-in permit
  private async generateMoveInPermit(requestId: number): Promise<string> {
    try {
      // TODO: Implement move-in permit generation
      // This should generate a PDF permit with request details
      const permitUrl = `move-in-permit-${requestId}.pdf`;
      logger.info(`Move-in permit generated for request ${requestId}`);
      return permitUrl;
    } catch (error) {
      logger.error(`Error generating move-in permit: ${error}`);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.MOVE_IN_PERMIT_GENERATION_FAILED.message,
        APICodes.MOVE_IN_PERMIT_GENERATION_FAILED.code
      );
    }
  }

  /**
   * EMAIL NOTIFICATION DISPATCHER
   * =============================
   * Central method for sending move-in request notifications via email
   * 
   * Purpose:
   * - Handles all email notifications for move-in requests
   * - Determines appropriate email recipients based on request type
   * - Prepares comprehensive email data for template processing
   * - Sends appropriate email type based on request status
   * 
   * Email Types Sent:
   * - Status emails: For confirmations, RFIs, cancellations, updates
   * - Approval emails: For approved requests with attachments
   * 
   * Recipient Logic (NO CC to unit owners):
   * - Owner requests: Primary = unit owner only
   * - Tenant requests: Primary = tenant only
   * - HHO requests: Primary = HHO owner only
   * - HHC requests: Primary = company email only
   * 
   * @param {number} requestId - Unique move-in request identifier
   * @param {string} requestNumber - Human-readable request number
   * @returns {Promise<void>}
   * 
   * @throws {Error} - When email sending fails
   */
  private async sendNotifications(requestId: number, requestNumber: string): Promise<void> {
    try {
      logger.info(`=== EMAIL NOTIFICATION START ===`);
      logger.info(`Sending notifications for move-in request ${requestId} (${requestNumber})`);

      // Get move-in request details for email
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .where("mir.id = :requestId", { requestId })
        .getOne();

      if (!moveInRequest) {
        logger.error(`EMAIL ERROR: Move-in request not found for requestId: ${requestId}`);
        return;
      }

      // Check if user exists for the request
      if (!moveInRequest.user) {
        logger.error(`EMAIL ERROR: No user found for request ${requestId}`);
        return;
      }

      // Get MIP recipients from occupancy_request_email_recipients table
      const mipRecipients = await this.getMIPRecipients(
        moveInRequest.unit?.masterCommunity?.id || 0,
        moveInRequest.unit?.community?.id || 0,
        moveInRequest.unit?.tower?.id
      );

      logger.info(`Found ${mipRecipients.length} MIP recipients: ${mipRecipients.join(', ')}`);

      // Prepare base email data
      const baseEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: moveInRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED ? 'Approved' : moveInRequest.status,
        requestType: moveInRequest.requestType,
        unitDetails: {
          unitNumber: moveInRequest.unit?.unitNumber || '',
          unitName: moveInRequest.unit?.unitName || '',
          masterCommunityId: moveInRequest.unit?.masterCommunity?.id || 0,
          communityId: moveInRequest.unit?.community?.id || 0,
          towerId: moveInRequest.unit?.tower?.id || undefined,
          masterCommunityName: moveInRequest.unit?.masterCommunity?.name || '',
          communityName: moveInRequest.unit?.community?.name || '',
          towerName: moveInRequest.unit?.tower?.name || undefined
        },
        moveInDate: moveInRequest.moveInDate,
        comments: moveInRequest.comments || '',
        ccEmails: [] // No CC functionality
      };

      // Only send emails for approved status
      if (moveInRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
        // EMAIL 1: Send to the user who raised the request (from move_in_requests.user)
        if (moveInRequest.user && moveInRequest.user.email) {
          const userEmailData: MoveInEmailData = {
            ...baseEmailData,
            userDetails: {
              firstName: moveInRequest.user.firstName || '',
              lastName: moveInRequest.user.lastName || '',
              email: moveInRequest.user.email
            },
            isRecipientEmail: false // This is a user email, not recipient email
          };

          logger.info(`Sending approval email to user: ${moveInRequest.user.email}`);
          await this.emailService.sendMoveInApprovalEmail(userEmailData);
        } else {
          logger.warn(`No user email found for request ${requestId}, skipping user email`);
        }

        // EMAIL 2: Send to MIP recipients (if any)
        if (mipRecipients.length > 0) {
          const mipEmailData: MoveInEmailData = {
            ...baseEmailData,
            userDetails: {
              firstName: moveInRequest.user?.firstName || 'Community',
              lastName: moveInRequest.user?.lastName || 'Management',
              email: mipRecipients // Send to all MIP recipients
            },
            isRecipientEmail: true // This is a recipient email, not user email
          };

          logger.info(`Sending approval email to MIP recipients: ${mipRecipients.join(', ')}`);
          await this.emailService.sendMoveInApprovalEmail(mipEmailData);
        } else {
          logger.warn(`No MIP recipients found for request ${requestId}, skipping MIP recipient email`);
        }
      } else {
        logger.info(`Request ${requestId} status is ${moveInRequest.status}, skipping email notifications (only approved status sends emails)`);
      }

      logger.info(`=== EMAIL NOTIFICATION SUCCESS ===`);
      logger.info(`Sent emails for request ${requestId} - User email and ${mipRecipients.length} MIP recipient emails`);
      logger.info(`Notifications sent successfully for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`=== EMAIL NOTIFICATION ERROR ===`);
      logger.error(`Error sending notifications for request ${requestId}:`, error);
      logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      logger.error(`=== EMAIL NOTIFICATION ERROR END ===`);
      // Don't throw error for notification failures to avoid breaking the move-in process
    }
  }

  // Collect Ejari/DTCM dates from corresponding detail tables for Salesforce payload
  private async getMoveInDatesForSalesforce(
    requestId: number,
    requestType: MOVE_IN_USER_TYPES
  ): Promise<{ ejariStartDate: string | null; ejariEndDate: string | null; dtcmStartDate: string | null; dtcmEndDate: string | null }> {
    const toDate = (d?: Date | string | null) => d ? new Date(d as any).toISOString().slice(0, 10) : null;

    try {
      if (requestType === MOVE_IN_USER_TYPES.TENANT) {
        const row = await MoveInRequestDetailsTenant.getRepository()
          .createQueryBuilder('t')
          .leftJoin('t.moveInRequest', 'mir')
          .select(['t.tenancyContractStartDate', 't.tenancyContractEndDate'])
          .where('mir.id = :requestId', { requestId })
          .getOne();
        return {
          ejariStartDate: toDate((row as any)?.tenancyContractStartDate || null),
          ejariEndDate: toDate((row as any)?.tenancyContractEndDate || null),
          dtcmStartDate: null,
          dtcmEndDate: null,
        };
      }

      if (requestType === MOVE_IN_USER_TYPES.HHO_COMPANY) {
        const row = await MoveInRequestDetailsHhcCompany.getRepository()
          .createQueryBuilder('c')
          .leftJoin('c.moveInRequest', 'mir')
          .select(['c.dtcmStartDate', 'c.dtcmExpiryDate'])
          .where('mir.id = :requestId', { requestId })
          .getOne();
        return {
          ejariStartDate: null,
          ejariEndDate: null,
          dtcmStartDate: toDate((row as any)?.dtcmStartDate || null),
          dtcmEndDate: toDate((row as any)?.dtcmExpiryDate || null),
        };
      }

      // OWNER and HHO_OWNER flows do not carry Ejari/DTCM dates
      return { ejariStartDate: null, ejariEndDate: null, dtcmStartDate: null, dtcmEndDate: null };
    } catch (e) {
      logger.error(`Failed to read move-in detail dates for Salesforce payload: ${e}`);
      return { ejariStartDate: null, ejariEndDate: null, dtcmStartDate: null, dtcmEndDate: null };
    }
  }

  // ==================== STATUS MANAGEMENT METHODS ====================

  /**
   * Approve move-in request (UC-136)
   * Business Rules:
   * - Only requests in Submitted, RFI Submitted status can be approved
   * - No active overlapping move-in request exists for the same unit
   * - MIP template must be active for the unit
   * - SLA: Move-in request max 30 days validity
   */
  async approveMoveInRequest(requestId: number, comments: string, user: any) {
    try {
      // Check admin permissions
      if (!user?.isAdmin) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.message,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.code
        );
      }

      // Validate request status
      if (![MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN, MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_SUBMITTED].includes(moveInRequest.status)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANNOT_APPROVE_STATUS.message,
          APICodes.CANNOT_APPROVE_STATUS.code
        );
      }

      // Check MIP template availability FIRST before other validations
      const mipCheck = await this.checkMIPAndWelcomePack(moveInRequest.unit.id);
      if (!mipCheck.hasMIP) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.MIP_NOT_CONFIGURED.message,
          APICodes.MIP_NOT_CONFIGURED.code
        );
      }

      // Validate unit availability status before approval
      const isUnitAvailable = await this.checkUnitAvailabilityForNewRequest(moveInRequest.unit.id);
      if (!isUnitAvailable) {
        throw new ApiError(
          httpStatus.CONFLICT,
          APICodes.UNIT_NOT_VACANT.message,
          APICodes.UNIT_NOT_VACANT.code
        );
      }

      // Check for overlapping requests
      const overlapCheck = await this.checkOverlappingRequests(moveInRequest.unit.id, moveInRequest.moveInDate);
      if (overlapCheck.hasOverlap) {
        throw new ApiError(
          httpStatus.CONFLICT,
          APICodes.OVERLAPPING_REQUESTS.message,
          APICodes.OVERLAPPING_REQUESTS.code
        );
      }

      // Check if move-in date is within 30 days (SLA validation)
      const moveInDate = new Date(moveInRequest.moveInDate);
      const today = new Date();
      const daysDifference = Math.ceil((moveInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDifference > 30) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.MOVE_IN_DATE_TOO_FAR.message,
          APICodes.MOVE_IN_DATE_TOO_FAR.code
        );
      }

      await executeInTransaction(async (qr: any) => {
        // Update request status to Approved and save comments
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
          comments: comments || '',
          updatedBy: user?.id,
          updatedAt: new Date()
        });

        // Create approval log
        const approvalLog = new MoveInRequestLogs();
        approvalLog.moveInRequest = { id: requestId } as any;
        approvalLog.requestType = moveInRequest.requestType;
        approvalLog.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
        approvalLog.changes = `Request approved by ${user?.firstName || 'Admin'}`;
        approvalLog.user = { id: user?.id } as any;
        approvalLog.actionBy = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        approvalLog.details = JSON.stringify({ comments, action: 'APPROVED' });
        approvalLog.comments = comments || '';

        await MoveInRequestLogs.save(approvalLog);

        // Generate move-in permit
        const permitUrl = await this.generateMoveInPermit(requestId);

        // Update request with permit URL
        //await MoveInRequests.update({ id: requestId }, {
        //  moveInPermitUrl: permitUrl
        //});
      });

      // Send in-app notification to requester (owner/tenant/company)
      try {
        const templateSlug = [MOVE_IN_USER_TYPES.OWNER, MOVE_IN_USER_TYPES.HHO_OWNER].includes(moveInRequest.requestType)
          ? 'move_in_request_approval_to_owner'
          : 'move_in_request_approval_to_tenant';

        const residentType =
          moveInRequest.requestType === MOVE_IN_USER_TYPES.OWNER ? 'Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.TENANT ? 'Tenant' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? 'HHO Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'HHO Company' : String(moveInRequest.requestType);

        const moveInDateStr = moveInRequest.moveInDate
          ? new Date(moveInRequest.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
          : '';

        const templateData: any = {
          '<request_id>': moveInRequest.moveInRequestNo,
          '<request_ID>': moveInRequest.moveInRequestNo, // support either placeholder variant
          '<move_in_date>': moveInDateStr,
          '<resident_type>': residentType,
          '<unit_number>': moveInRequest.unit?.unitNumber || '',
          '<tower_name>': moveInRequest.unit?.tower?.name || '',
          '<community_name>': moveInRequest.unit?.community?.name || '',
          '<master_community_name>': moveInRequest.unit?.masterCommunity?.name || '',
        };

        const payload: any = {
          user_id: moveInRequest.user.id,
          unit_id: moveInRequest.unit?.id,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
          slug: 'move-in',
          request_id: moveInRequest.moveInRequestNo,
        };

        // Lazy import to avoid circular deps at top
        const { addNotification } = await import('../../../Common/Utils/notification');
        await addNotification(moveInRequest.user.id, templateSlug, templateData, payload);
        logger.info(`In-app notification queued for move-in approval (${templateSlug}) for request ${requestId}`);
      } catch (notifyErr) {
        logger.error(`Failed to create in-app notification for move-in approval ${requestId}: ${notifyErr}`);
      }

      // Send approval email notifications
      await this.sendApprovalNotifications(requestId, moveInRequest.moveInRequestNo);

      // Push to Salesforce on approval
      try {
        const userRec = moveInRequest.user || (await Users.getRepository().findOne({ where: { id: (moveInRequest as any)?.user?.id } }));
        const unitRec = moveInRequest.unit || (await Units.getRepository().findOne({ where: { id: (moveInRequest as any)?.unit?.id } }));
        const { ejariStartDate, ejariEndDate, dtcmStartDate, dtcmEndDate } = await this.getMoveInDatesForSalesforce(requestId, moveInRequest.requestType);

        const cc = (userRec?.dialCode?.dialCode || '').toString();
        const normCC = cc ? (cc.startsWith('+') ? cc : `+${cc}`) : null;

        const typeOfTenantMap: Record<string, string> = {
          owner: 'HomeOwner',
          tenant: 'Tenant',
          hho_owner: 'HHO',
          hho_company: 'Company',
          hho: 'HHO',
          company: 'Company',
        };
        const reqTypeKey = String(moveInRequest.requestType || '').toLowerCase();

        const payload = {
          salutation: (userRec as any)?.honorific || null,
          firstName: (userRec as any)?.firstName || null,
          lastName: (userRec as any)?.lastName || null,
          primaryMobileCountryCode: normCC,
          primaryMobileNumber: (userRec as any)?.mobile || null,
          alternativeMobileCountryCode: null,
          alternativeMobileNumber: (userRec as any)?.alternativeMobile || null,
          primaryEmail: (userRec as any)?.email || null,
          alternateEmail: (userRec as any)?.alternativeEmail || null,
          unitId: (unitRec as any)?.salesForceId || '',
          nationality: (userRec as any)?.nationality?.name || (userRec as any)?.nationality || null,
          typeOfTenant: typeOfTenantMap[reqTypeKey] || null,
          moveInDate: moveInRequest.moveInDate ? new Date(moveInRequest.moveInDate).toISOString().slice(0, 10) : null,
          moveOutDate: null,
          ejariStartDate,
          ejariEndDate,
          requestRaisedDate: (moveInRequest as any)?.createdAt ? new Date((moveInRequest as any).createdAt).toISOString().slice(0, 10) : null,
          dtcmStartDate,
          dtcmEndDate,
          requestApprovedDate: new Date().toISOString().slice(0, 10),
          request_type: 'move-in' as const,
          status: 'approve',
          mobile_app_reference: moveInRequest.moveInRequestNo,
        } as const;

        await this.commonService.sendResidentToSalesforce(payload);
      } catch (e) {
        logger.error(`Salesforce push (move-in approval) failed: ${e}`);
      }

      logger.info(`Move-in request ${requestId} approved by admin ${user?.id}`);

      return {
        requestId,
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
        moveInPermitUrl: await this.generateMoveInPermit(requestId)
      };
    } catch (error: any) {
      logger.error(`Error approving move-in request: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Mark move-in request as RFI (UC-135)
   * Business Rules:
   * - Only requests in Submitted status can be marked as RFI
   * - Admin must provide remarks
   * - Status transition: Submitted → RFI Pending
   */
  async markRequestAsRFI(requestId: number, comments: string, user: any) {
    try {
      // Check admin permissions
      if (!user?.isAdmin) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Comments are now optional - no validation needed

      // Get the move-in request
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.message,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.code
        );
      }

      // Validate request status - allow both OPEN and RFI_SUBMITTED to be marked as RFI
      if (![MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN, MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_SUBMITTED].includes(moveInRequest.status)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANNOT_MARK_RFI_STATUS.message,
          APICodes.CANNOT_MARK_RFI_STATUS.code
        );
      }

      await executeInTransaction(async (qr: any) => {
        // Update request status to RFI Pending and save comments
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING,
          comments: comments,
          updatedBy: user?.id,
          updatedAt: new Date()
        });

        // Create RFI log
        const rfiLog = new MoveInRequestLogs();
        rfiLog.moveInRequest = { id: requestId } as any;
        rfiLog.requestType = moveInRequest.requestType;
        rfiLog.status = MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING;
        rfiLog.changes = `Request marked as RFI by ${user?.firstName || 'Admin'}`;
        rfiLog.user = { id: user?.id } as any;
        rfiLog.actionBy = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        rfiLog.details = JSON.stringify({ comments, action: 'RFI_PENDING' });
        rfiLog.comments = comments;

        await MoveInRequestLogs.save(rfiLog);
      });

      // Send RFI notifications
      await this.sendRFINotifications(requestId, moveInRequest.moveInRequestNo, comments);

      // In-app notification to customer about RFI Pending
      try {
        const moveInDateStr = moveInRequest.moveInDate
          ? new Date(moveInRequest.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
          : '';
        const residentType =
          moveInRequest.requestType === MOVE_IN_USER_TYPES.OWNER ? 'Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.TENANT ? 'Tenant' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? 'HHO Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'HHO Company' : String(moveInRequest.requestType);

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const templateData: any = {
          '<request_id>': moveInRequest.moveInRequestNo,
          '<request_ID>': moveInRequest.moveInRequestNo,
          '<date>': dateStr,
          '<time>': timeStr,
          '<resident_type>': residentType,
          '<unit_number>': moveInRequest.unit?.unitNumber || '',
          '<tower_name>': (moveInRequest as any).unit?.tower?.name || '',
          '<community_name>': (moveInRequest as any).unit?.community?.name || '',
          '<master_community_name>': (moveInRequest as any).unit?.masterCommunity?.name || '',
          '<comment_from_admin>': comments || ''
        };

        const payload: any = {
          user_id: moveInRequest.user?.id,
          unit_id: moveInRequest.unit?.id,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING,
          slug: 'move-in',
          request_id: moveInRequest.moveInRequestNo,
        };

        const { addNotification } = await import('../../../Common/Utils/notification');
        await addNotification(moveInRequest.user.id, 'move_in_rfi_pending_to_user', templateData, payload);
        logger.info(`In-app RFI Pending notification queued for user for request ${requestId}`);
      } catch (notifyErr) {
        logger.error(`Failed to create in-app RFI Pending notification for ${requestId}: ${notifyErr}`);
      }

      logger.info(`Move-in request ${requestId} marked as RFI by admin ${user?.id}`);

      return {
        requestId,
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING
      };
    } catch (error: any) {
      logger.error(`Error marking request as RFI: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Cancel/Reject move-in request (UC-138)
   * Business Rules:
   * - Only requests in Submitted, RFI Submitted, or Approved status can be cancelled
   * - Cancellation remarks are mandatory
   * - Status changes to Cancelled
   */
  async cancelMoveInRequest(requestId: number, cancellationRemarks: string, user: any) {
    try {
      // Check admin permissions
      if (!user?.isAdmin) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Validate cancellation remarks (mandatory)
      if (!cancellationRemarks || cancellationRemarks.trim().length === 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANCELLATION_REMARKS_REQUIRED.message,
          APICodes.CANCELLATION_REMARKS_REQUIRED.code
        );
      }

      // Get the move-in request
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.message,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.code
        );
      }

      // Validate request status
      const allowedStatuses = [
        MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN,
        MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_SUBMITTED,
        MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED
      ];

      if (!allowedStatuses.includes(moveInRequest.status)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANNOT_CANCEL_STATUS.message,
          APICodes.CANNOT_CANCEL_STATUS.code
        );
      }

      await executeInTransaction(async (qr: any) => {
        // Update request status to Cancelled and save cancellation remarks
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
          comments: cancellationRemarks,
          updatedBy: user?.id,
          updatedAt: new Date()
        });

        // Create cancellation log
        const cancellationLog = new MoveInRequestLogs();
        cancellationLog.moveInRequest = { id: requestId } as any;
        cancellationLog.requestType = moveInRequest.requestType;
        cancellationLog.status = MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED;
        cancellationLog.changes = `Request cancelled by ${user?.firstName || 'Admin'}`;
        cancellationLog.user = { id: user?.id } as any;
        cancellationLog.actionBy = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        cancellationLog.details = JSON.stringify({ cancellationRemarks, action: 'CANCELLED' });
        cancellationLog.comments = cancellationRemarks;

        await MoveInRequestLogs.save(cancellationLog);
      });

      // Send cancellation notifications
      await this.sendCancellationNotifications(requestId, moveInRequest.moveInRequestNo, cancellationRemarks);

      // In-app notification to customer about Admin Cancellation
      try {
        const moveInDateStr = moveInRequest.moveInDate
          ? new Date(moveInRequest.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
          : '';
        const residentType =
          moveInRequest.requestType === MOVE_IN_USER_TYPES.OWNER ? 'Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.TENANT ? 'Tenant' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? 'HHO Owner' :
          moveInRequest.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'HHO Company' : String(moveInRequest.requestType);

        const cancellationDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });

        const templateData: any = {
          '<request_id>': moveInRequest.moveInRequestNo,
          '<request_ID>': moveInRequest.moveInRequestNo,
          '<move_in_date>': moveInDateStr,
          '<cancellation_date>': cancellationDate,
          '<resident_type>': residentType,
          '<unit_number>': moveInRequest.unit?.unitNumber || '',
          '<tower_name>': moveInRequest.unit?.tower?.name || '',
          '<community_name>': moveInRequest.unit?.community?.name || '',
          '<master_community_name>': moveInRequest.unit?.masterCommunity?.name || '',
          '<comment_from_admin>': cancellationRemarks || ''
        };

        const payload: any = {
          user_id: moveInRequest.user?.id,
          unit_id: moveInRequest.unit?.id,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
          slug: 'move-in',
          request_id: moveInRequest.moveInRequestNo,
        };

        const { addNotification } = await import('../../../Common/Utils/notification');
        await addNotification(moveInRequest.user.id, 'move_in_admin_cancelled_to_user', templateData, payload);
        logger.info(`Admin-cancelled in-app notification queued for user for request ${requestId}`);
      } catch (notifyErr) {
        logger.error(`Failed to create in-app Admin-cancelled notification for ${requestId}: ${notifyErr}`);
      }

      logger.info(`Move-in request ${requestId} cancelled by admin ${user?.id}`);

      return {
        requestId,
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED
      };
    } catch (error: any) {
      logger.error(`Error cancelling move-in request: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Close move-in request by security (UC-139)
   * Business Rules:
   * - Only requests in Approved status can be closed
   * - Security team can close requests
   * - Unit is linked to user and marked as occupied
   * - Previous user access is invalidated
   */
  async closeMoveInRequest(requestId: number, closureRemarks: string, actualMoveInDate: Date, user: any) {
    try {
      // Check if user is security or admin
      const isSecurity = await checkIsSecurity(user);
      if (!user?.isAdmin && !isSecurity) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.SECURITY_OR_ADMIN_REQUIRED.message,
          APICodes.SECURITY_OR_ADMIN_REQUIRED.code
        );
      }

      // Validate closure remarks (mandatory)
      if (!closureRemarks || closureRemarks.trim().length === 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CLOSURE_REMARKS_REQUIRED.message,
          APICodes.CLOSURE_REMARKS_REQUIRED.code
        );
      }

      // Validate actual move-in date
      if (!actualMoveInDate) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.ACTUAL_MOVE_IN_DATE_REQUIRED.message,
          APICodes.ACTUAL_MOVE_IN_DATE_REQUIRED.code
        );
      }

      // Get the move-in request
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.message,
          APICodes.MOVE_IN_REQUEST_NOT_FOUND.code
        );
      }

      // Validate request status
      if (moveInRequest.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANNOT_CLOSE_STATUS.message,
          APICodes.CANNOT_CLOSE_STATUS.code
        );
      }

      // Check if MIP is still valid (within 30 days of approval)
      const approvalDate = moveInRequest.updatedAt || moveInRequest.createdAt;
      const daysSinceApproval = Math.ceil((new Date().getTime() - new Date(approvalDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceApproval > 30) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.MOVE_IN_PERMIT_EXPIRED.message,
          APICodes.MOVE_IN_PERMIT_EXPIRED.code
        );
      }

      await executeInTransaction(async (qr: any) => {
        // Update request status to Closed
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED,
          updatedBy: user?.id,
          updatedAt: new Date()
        });

        // Create closure log
        const closureLog = new MoveInRequestLogs();
        closureLog.moveInRequest = { id: requestId } as any;
        closureLog.requestType = moveInRequest.requestType;
        closureLog.status = MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED;
        closureLog.changes = `Request closed by ${isSecurity ? 'Security' : 'Admin'}`;
        closureLog.user = { id: user?.id } as any;
        closureLog.actionBy = isSecurity ? TransitionRequestActionByTypes.SECURITY : TransitionRequestActionByTypes.COMMUNITY_ADMIN;
        closureLog.details = JSON.stringify({ closureRemarks, actualMoveInDate, action: 'CLOSED' });
        closureLog.comments = closureRemarks;

        await MoveInRequestLogs.save(closureLog);

        // TODO: Link unit to user and mark as occupied
        // TODO: Invalidate previous user access (access cards, amenity bookings)
        // TODO: Add to Active Residents list
      });

      // In-app admin notification: closed by security/admin
      try {
        const fullRequest = await MoveInRequests.getRepository()
          .createQueryBuilder('mir')
          .leftJoinAndSelect('mir.unit', 'unit')
          .leftJoinAndSelect('unit.masterCommunity', 'masterCommunity')
          .leftJoinAndSelect('unit.community', 'community')
          .leftJoinAndSelect('unit.tower', 'tower')
          .leftJoinAndSelect('mir.user', 'user')
          .where('mir.id = :id', { id: requestId })
          .getOne();

        if (fullRequest) {
          const moveInDateStr = fullRequest.moveInDate
            ? new Date(fullRequest.moveInDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
            : '';
          const residentType =
            fullRequest.requestType === MOVE_IN_USER_TYPES.OWNER ? 'Owner' :
            fullRequest.requestType === MOVE_IN_USER_TYPES.TENANT ? 'Tenant' :
            fullRequest.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? 'HHO Owner' :
            fullRequest.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'HHO Company' : String(fullRequest.requestType);

          const templateData: any = {
            '<request_id>': fullRequest.moveInRequestNo,
            '<request_ID>': fullRequest.moveInRequestNo,
            '<move_in_date>': moveInDateStr,
            '<resident_type>': residentType,
            '<unit_number>': fullRequest.unit?.unitNumber || '',
            '<tower_name>': fullRequest.unit?.tower?.name || '',
            '<community_name>': fullRequest.unit?.community?.name || '',
            '<master_community_name>': fullRequest.unit?.masterCommunity?.name || '',
          };

          const payload: any = {
            user_id: fullRequest.user?.id,
            unit_id: fullRequest.unit?.id,
            status: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED,
            slug: 'move-in',
            request_id: fullRequest.moveInRequestNo,
          };

          const { addAdminNotification } = await import('../../../Common/Utils/notification');
          await addAdminNotification(user?.id || 0, 'move_in_closed_by_security_to_admin', templateData, payload);
          logger.info(`Closed-by-security/admin in-app admin notification queued for ${fullRequest.moveInRequestNo}`);
        }
      } catch (notifyErr) {
        logger.error(`Failed to send closed-by-security/admin in-app notification for ${requestId}: ${notifyErr}`);
      }

      logger.info(`Move-in request ${requestId} closed by ${isSecurity ? 'security' : 'admin'} ${user?.id}`);

      return {
        requestId,
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED,
        actualMoveInDate
      };
    } catch (error: any) {
      logger.error(`Error closing move-in request: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * EMAIL RECIPIENT DETERMINATION LOGIC
   * ====================================
   * Determines primary email recipients based on move-in request type
   * 
   * Purpose:
   * - Identifies appropriate email recipients for different request types
   * - NO CC functionality - only primary recipients
   * - Handles various request types with specific recipient rules
   * - Ensures proper email routing for notifications
   * 
   * Request Type Logic (NO CC):
   * - OWNER: Primary = unit owner from unit_bookings only
   * - TENANT: Primary = tenant from request details only
   * - HHO_OWNER: Primary = HHO owner from request details only
   * - HHO_COMPANY: Primary = company email from request details only
   * 
   * Data Sources:
   * - Unit owner: Retrieved from unit_bookings table
   * - Tenant details: Retrieved from MoveInRequestDetailsTenant
   * - HHO details: Retrieved from MoveInRequestDetailsHhoOwner
   * - Company details: Retrieved from MoveInRequestDetailsHhcCompany
   * 
   * @param {any} moveInRequest - Complete move-in request object with relations
   * @returns {Promise<{primary: {firstName: string, lastName: string, email: string}, cc: string[]} | null>}
   *          - Recipient object with primary email only (cc will always be empty array)
   */
  private async getEmailRecipients(moveInRequest: any): Promise<{ primary: { firstName: string, lastName: string, email: string }, cc: string[] } | null> {
    try {
      logger.info(`Getting email recipients for ${moveInRequest.requestType} request ${moveInRequest.id}, unitId: ${moveInRequest.unit?.id}`);

      const unitId = moveInRequest.unit?.id;
      let primary = null;
      let cc: string[] = []; // Always empty - no CC functionality

      switch (moveInRequest.requestType) {
        case MOVE_IN_USER_TYPES.OWNER: {
          // For owner requests: primary = owner only
          const ownerInfo = await this.getUnitOwnerFromBookings(unitId);
          if (ownerInfo) {
            primary = ownerInfo;
            logger.info(`Owner request: Primary email set to owner from unit_bookings`);
          }
          break;
        }

        case MOVE_IN_USER_TYPES.TENANT: {
          // For tenant requests: primary = tenant only
          const tenantDetails = await MoveInRequestDetailsTenant.getRepository()
            .createQueryBuilder("tenant")
            .where("tenant.move_in_request_id = :requestId", { requestId: moveInRequest.id })
            .andWhere("tenant.is_active = true")
            .getOne();

          if (tenantDetails && tenantDetails.email) {
            primary = {
              firstName: tenantDetails.firstName || '',
              lastName: tenantDetails.lastName || '',
              email: tenantDetails.email
            };
            logger.info(`Tenant request: Primary email set to tenant (${tenantDetails.email})`);
          }
          break;
        }

        case MOVE_IN_USER_TYPES.HHO_OWNER: {
          // For HHO owner requests: primary = HHO owner only
          const hhoDetails = await MoveInRequestDetailsHhoOwner.getRepository()
            .createQueryBuilder("hho")
            .where("hho.move_in_request_id = :requestId", { requestId: moveInRequest.id })
            .andWhere("hho.is_active = true")
            .getOne();

          if (hhoDetails && hhoDetails.email) {
            primary = {
              firstName: hhoDetails.ownerFirstName || '',
              lastName: hhoDetails.ownerLastName || '',
              email: hhoDetails.email
            };
            logger.info(`HHO Owner request: Primary email set to HHO owner (${hhoDetails.email})`);
          }
          break;
        }

        case MOVE_IN_USER_TYPES.HHO_COMPANY: {
          // For HHC company requests: primary = company email only
          const companyDetails = await MoveInRequestDetailsHhcCompany.getRepository()
            .createQueryBuilder("company")
            .where("company.move_in_request_id = :requestId", { requestId: moveInRequest.id })
            .andWhere("company.is_active = true")
            .getOne();

          if (companyDetails && companyDetails.companyEmail) {
            primary = {
              firstName: companyDetails.name || '',
              lastName: '',
              email: companyDetails.companyEmail
            };
            logger.info(`HHC Company request: Primary email set to company (${companyDetails.companyEmail})`);
          }
          break;
        }
      }

      if (!primary) {
        logger.error(`No primary email recipient found for ${moveInRequest.requestType} request ${moveInRequest.id}`);
        return null;
      }

      return { primary, cc: [] }; // Always return empty CC array
    } catch (error) {
      logger.error(`Error getting email recipients for request ${moveInRequest.id}:`, error);
      return null;
    }
  }

  /**
   * MIP RECIPIENTS RETRIEVAL
   * ========================
   * Retrieves MIP email recipients from occupancy_request_email_recipients table
   * 
   * Purpose:
   * - Gets community-specific MIP recipients for approval emails
   * - Implements hierarchical fallback: Tower → Community → Master Community
   * - Parses comma-separated email addresses from mipRecipients column
   * 
   * Hierarchy Logic:
   * 1. Tower-specific recipients (most specific)
   * 2. Community-level recipients (fallback)
   * 3. Master community recipients (final fallback)
   * 
   * Email Processing:
   * - Splits comma-separated email addresses
   * - Trims whitespace from each email
   * - Filters out empty strings
   * - Returns array of valid email addresses
   * 
   * @param {number} masterCommunityId - Master community identifier
   * @param {number} communityId - Community identifier
   * @param {number} [towerId] - Tower identifier (optional)
   * @returns {Promise<string[]>} - Array of MIP recipient email addresses
   */
  private async getMIPRecipients(
    masterCommunityId: number,
    communityId: number,
    towerId?: number
  ): Promise<string[]> {
    try {
      logger.info(`Getting MIP recipients for MC:${masterCommunityId}, C:${communityId}, T:${towerId}`);
      
      let recipients = null;
      
      // 1. First try: Tower-specific recipients
      if (towerId) {
        recipients = await OccupancyRequestEmailRecipients.findOne({
          where: {
            masterCommunity: { id: masterCommunityId },
            community: { id: communityId },
            tower: { id: towerId },
            isActive: true
          }
        });
        
        if (recipients) {
          logger.info(`Found tower-specific MIP recipients for tower: ${towerId}`);
        }
      }
      
      // 2. Second try: Community-level recipients
      if (!recipients) {
        recipients = await OccupancyRequestEmailRecipients.findOne({
          where: {
            masterCommunity: { id: masterCommunityId },
            community: { id: communityId },
            tower: IsNull(),
            isActive: true
          }
        });
        
        if (recipients) {
          logger.info(`Found community-level MIP recipients for community: ${communityId}`);
        }
      }
      
      // 3. Third try: Master community level recipients
      if (!recipients) {
        recipients = await OccupancyRequestEmailRecipients.findOne({
          where: {
            masterCommunity: { id: masterCommunityId },
            community: IsNull(),
            tower: IsNull(),
            isActive: true
          }
        });
        
        if (recipients) {
          logger.info(`Found master community MIP recipients for masterCommunity: ${masterCommunityId}`);
        }
      }
      
      if (!recipients || !recipients.mipRecipients) {
        logger.warn(`No MIP recipients found for MC:${masterCommunityId}, C:${communityId}, T:${towerId}`);
        return [];
      }
      
      // Parse comma-separated email addresses
      const emailList = recipients.mipRecipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      logger.info(`Parsed MIP recipients: ${emailList.join(', ')}`);
      return emailList;
      
    } catch (error) {
      logger.error(`Error getting MIP recipients for MC:${masterCommunityId}, C:${communityId}, T:${towerId}:`, error);
      return [];
    }
  }

  /**
   * UNIT OWNER INFORMATION RETRIEVAL
   * ================================
   * Retrieves unit owner information from unit_bookings table
   * 
   * Purpose:
   * - Gets unit owner details for CC email functionality
   * - Used for tenant, HHO, and HHC request notifications
   * - Ensures unit owners are informed about move-in activities
   * 
   * Data Source:
   * - unit_bookings table with active bookings
   * - Gets latest booking for the unit
   * - Extracts customer name and email information
   * 
   * Name Processing:
   * - Splits customerName into firstName and lastName
   * - Handles cases where only first name is provided
   * - Provides fallback names if customerName is empty
   * 
   * @param {number} unitId - Unit identifier
   * @returns {Promise<{firstName: string, lastName: string, email: string} | null>}
   *          - Unit owner information or null if not found
   */
  private async getUnitOwnerFromBookings(unitId: number): Promise<{ firstName: string, lastName: string, email: string } | null> {
    try {
      logger.info(`Getting unit owner from unit_bookings for unitId: ${unitId}`);

      const unitBooking = await UnitBookings.getRepository()
        .createQueryBuilder("ub")
        .where("ub.unit.id = :unitId", { unitId })
        .andWhere("ub.isActive = true")
        .orderBy("ub.createdAt", "DESC") // Get the latest booking
        .getOne();

      if (unitBooking && unitBooking.customerEmail) {
        // Split customerName into firstName and lastName
        const nameParts = (unitBooking.customerName || '').split(' ');
        const firstName = nameParts[0] || 'Property';
        const lastName = nameParts.slice(1).join(' ') || 'Owner';

        logger.info(`Found unit owner from unit_bookings: ${firstName} ${lastName} (${unitBooking.customerEmail})`);

        return {
          firstName: firstName,
          lastName: lastName,
          email: unitBooking.customerEmail
        };
      } else {
        logger.warn(`No unit booking found for unitId: ${unitId} or customerEmail is missing`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting unit owner from unit_bookings for unitId ${unitId}:`, error);
      return null;
    }
  }

  /**
   * APPROVAL EMAIL NOTIFICATION SENDER
   * =================================
   * Sends approval emails for move-in requests with attachments
   * 
   * Purpose:
   * - Sends TWO separate approval emails:
   *   1. To the user who raised the request (primary recipient)
   *   2. To MIP recipients from occupancy_request_email_recipients table
   * - Includes MIP template and welcome pack attachments
   * - No CC recipients for approval emails
   * 
   * Email Features:
   * - Detailed approval information
   * - MIP template PDF attachment (generated dynamically)
   * - Welcome pack PDF attachment (from Azure Blob Storage)
   * - Separate emails for user and MIP recipients
   * 
   * Process:
   * 1. Retrieves complete move-in request details
   * 2. Gets MIP recipients from occupancy_request_email_recipients table
   * 3. Prepares email data for both recipient groups
   * 4. Sends two separate approval emails via EmailService
   * 
   * @param {number} requestId - Unique move-in request identifier
   * @param {string} requestNumber - Human-readable request number
   * @returns {Promise<void>}
   * 
   * @throws {Error} - When email sending fails
   */
  private async sendApprovalNotifications(requestId: number, requestNumber: string): Promise<void> {
    try {
      // Get move-in request details for email
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .where("mir.id = :requestId", { requestId })
        .getOne();

      if (!moveInRequest || !moveInRequest.user) {
        logger.error(`Move-in request or user not found for requestId: ${requestId}`);
        return;
      }

      // Get MIP recipients from occupancy_request_email_recipients table
      const mipRecipients = await this.getMIPRecipients(
        moveInRequest.unit?.masterCommunity?.id || 0,
        moveInRequest.unit?.community?.id || 0,
        moveInRequest.unit?.tower?.id
      );

      logger.info(`Found ${mipRecipients.length} MIP recipients: ${mipRecipients.join(', ')}`);

      // Prepare base email data
      const baseEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: 'Approved',
        requestType: moveInRequest.requestType,
        unitDetails: {
          unitNumber: moveInRequest.unit?.unitNumber || '',
          unitName: moveInRequest.unit?.unitName || '',
          masterCommunityId: moveInRequest.unit?.masterCommunity?.id || 0,
          communityId: moveInRequest.unit?.community?.id || 0,
          towerId: moveInRequest.unit?.tower?.id || undefined,
          masterCommunityName: moveInRequest.unit?.masterCommunity?.name || '',
          communityName: moveInRequest.unit?.community?.name || '',
          towerName: moveInRequest.unit?.tower?.name || undefined
        },
        moveInDate: moveInRequest.moveInDate,
        comments: moveInRequest.comments || '',
        ccEmails: [] // No CC functionality
      };

      // EMAIL 1: Send to the user who raised the request
      const userEmailData: MoveInEmailData = {
        ...baseEmailData,
        userDetails: {
          firstName: moveInRequest.user.firstName || '',
          lastName: moveInRequest.user.lastName || '',
          email: moveInRequest.user.email || ''
        },
        ccEmails: [], // No CC for approval emails
        isRecipientEmail: false // This is a user email, not recipient email
      };

      logger.info(`Sending approval email to user: ${moveInRequest.user.email}`);
      await this.emailService.sendMoveInApprovalEmail(userEmailData);

      // EMAIL 2: Send to MIP recipients (if any)
      if (mipRecipients.length > 0) {
        const mipEmailData: MoveInEmailData = {
          ...baseEmailData,
          userDetails: {
            firstName: moveInRequest.user?.firstName || 'Community',
            lastName: moveInRequest.user?.lastName || 'Management',
            email: mipRecipients // Send to all MIP recipients
          },
          ccEmails: [], // No CC for approval emails
          isRecipientEmail: true // This is a recipient email, not user email
        };

        logger.info(`Sending approval email to MIP recipients: ${mipRecipients.join(', ')}`);
        await this.emailService.sendMoveInApprovalEmail(mipEmailData);
      } else {
        logger.warn(`No MIP recipients found for request ${requestId}, skipping MIP recipient email`);
      }

      logger.info(`Approval notifications sent for move-in request ${requestId} - User email and ${mipRecipients.length} MIP recipient emails`);
    } catch (error) {
      logger.error(`Error sending approval notifications: ${error}`);
      // Don't throw error to avoid breaking the approval process
    }
  }

  /**
   * RFI (REQUEST FOR INFORMATION) EMAIL NOTIFICATION SENDER
   * ======================================================
   * Sends RFI emails when admin requests additional information
   * 
   * Purpose:
   * - Notifies users when additional information is required
   * - Provides specific comments about what information is needed
   * - Maintains communication flow during request processing
   * 
   * Email Features:
   * - RFI-specific messaging and styling
   * - Admin comments explaining required information
   * - Clear next steps for user action
   * - CC to unit owners for tenant/HHO/HHC requests
   * 
   * Process:
   * 1. Retrieves complete move-in request details
   * 2. Determines email recipients based on request type
   * 3. Prepares email data with RFI status and comments
   * 4. Sends RFI notification email via EmailService
   * 
   * @param {number} requestId - Unique move-in request identifier
   * @param {string} requestNumber - Human-readable request number
   * @param {string} comments - Admin comments explaining required information
   * @returns {Promise<void>}
   * 
   * @throws {Error} - When email sending fails
   */
  private async sendRFINotifications(requestId: number, requestNumber: string, comments: string): Promise<void> {
    try {
      // Get move-in request details for email
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .where("mir.id = :requestId", { requestId })
        .getOne();

      if (!moveInRequest || !moveInRequest.user) {
        logger.error(`Move-in request or user not found for requestId: ${requestId}`);
        return;
      }

      // Prepare email data
      const emailData: MoveInEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: 'rfi-pending',
        userDetails: {
          firstName: moveInRequest.user.firstName || '',
          lastName: moveInRequest.user.lastName || '',
          email: moveInRequest.user.email || ''
        },
        unitDetails: {
          unitNumber: moveInRequest.unit?.unitNumber || '',
          unitName: moveInRequest.unit?.unitName || '',
          masterCommunityId: moveInRequest.unit?.masterCommunity?.id || 0,
          communityId: moveInRequest.unit?.community?.id || 0,
          towerId: moveInRequest.unit?.tower?.id || undefined,
          masterCommunityName: moveInRequest.unit?.masterCommunity?.name || '',
          communityName: moveInRequest.unit?.community?.name || '',
          towerName: moveInRequest.unit?.tower?.name || undefined
        },
        moveInDate: moveInRequest.moveInDate,
        comments: comments
      };

      // Send RFI email (without attachment) - DISABLED: Only approval emails should be sent
      // await this.emailService.sendMoveInStatusEmail(emailData);

      logger.info(`RFI notification - Email skipped for request ${requestId} (only approval emails are sent)`);
    } catch (error) {
      logger.error(`Error sending RFI notifications: ${error}`);
      // Don't throw error to avoid breaking the RFI process
    }
  }

  /**
   * CANCELLATION EMAIL NOTIFICATION SENDER
   * =====================================
   * Sends cancellation emails when admin cancels move-in requests
   * 
   * Purpose:
   * - Notifies users when their move-in request has been cancelled
   * - Provides cancellation remarks explaining the reason
   * - Maintains transparency in the cancellation process
   * 
   * Email Features:
   * - Cancellation-specific messaging and styling
   * - Admin cancellation remarks explaining the reason
   * - Information about next steps or alternatives
   * - CC to unit owners for tenant/HHO/HHC requests
   * 
   * Process:
   * 1. Retrieves complete move-in request details
   * 2. Determines email recipients based on request type
   * 3. Prepares email data with cancellation status and remarks
   * 4. Sends cancellation notification email via EmailService
   * 
   * @param {number} requestId - Unique move-in request identifier
   * @param {string} requestNumber - Human-readable request number
   * @param {string} cancellationRemarks - Admin remarks explaining cancellation reason
   * @returns {Promise<void>}
   * 
   * @throws {Error} - When email sending fails
   */
  private async sendCancellationNotifications(requestId: number, requestNumber: string, cancellationRemarks: string): Promise<void> {
    try {
      // Get move-in request details for email
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .leftJoinAndSelect("mir.unit", "unit")
        .leftJoinAndSelect("unit.masterCommunity", "masterCommunity")
        .leftJoinAndSelect("unit.community", "community")
        .leftJoinAndSelect("unit.tower", "tower")
        .where("mir.id = :requestId", { requestId })
        .getOne();

      if (!moveInRequest || !moveInRequest.user) {
        logger.error(`Move-in request or user not found for requestId: ${requestId}`);
        return;
      }

      // Prepare email data
      const emailData: MoveInEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: 'cancelled',
        userDetails: {
          firstName: moveInRequest.user.firstName || '',
          lastName: moveInRequest.user.lastName || '',
          email: moveInRequest.user.email || ''
        },
        unitDetails: {
          unitNumber: moveInRequest.unit?.unitNumber || '',
          unitName: moveInRequest.unit?.unitName || '',
          masterCommunityId: moveInRequest.unit?.masterCommunity?.id || 0,
          communityId: moveInRequest.unit?.community?.id || 0,
          towerId: moveInRequest.unit?.tower?.id || undefined,
          masterCommunityName: moveInRequest.unit?.masterCommunity?.name || '',
          communityName: moveInRequest.unit?.community?.name || '',
          towerName: moveInRequest.unit?.tower?.name || undefined
        },
        moveInDate: moveInRequest.moveInDate,
        comments: cancellationRemarks
      };

      // Send cancellation email (without attachment) - DISABLED: Only approval emails should be sent
      // await this.emailService.sendMoveInStatusEmail(emailData);

      logger.info(`Cancellation notification - Email skipped for request ${requestId} (only approval emails are sent)`);
    } catch (error) {
      logger.error(`Error sending cancellation notifications: ${error}`);
      // Don't throw error to avoid breaking the cancellation process
    }
  }

  // ==================== UPDATE METHODS ====================

  /**
   * Update owner move-in request (Admin)
   */
  async updateOwnerMoveIn(requestId: number, data: any, user: any) {
    try {
      // Check if request exists and is editable
      const request = await this.ensureEditableByAdmin(requestId, user);

      // Update the main request
      await MoveInRequests.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          unit: data.unitId ? { id: data.unitId } : undefined,
          moveInDate: data.moveInDate,
          status: data.status,
          user: { id: data.userId },
          updatedBy: user?.id,
        })
        .where('id = :requestId', { requestId })
        .execute();

      // Update owner details
      await MoveInRequestDetailsOwner.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          adults: data.details?.adults,
          children: data.details?.children,
          householdStaffs: data.details?.householdStaffs,
          pets: data.details?.pets,
          peopleOfDetermination: data.details?.peopleOfDetermination || false,
          determination_text: data.details?.detailsText || null,
          updatedBy: user?.id,
        })
        .where('move_in_request_id = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      // Send email notifications about the update
      const updatedRequest = await MoveInRequests.findOne({ where: { id: requestId } });
      if (updatedRequest) {
        await this.sendNotifications(requestId, updatedRequest.moveInRequestNo);
      }

      return { id: requestId, message: 'Owner move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateOwnerMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  /**
   * Update tenant move-in request (Admin)
   */
  async updateTenantMoveIn(requestId: number, data: any, user: any) {
    try {
      // Check if request exists and is editable
      const request = await this.ensureEditableByAdmin(requestId, user);

      // Update the main request
      await MoveInRequests.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          unit: data.unitId ? { id: data.unitId } : undefined,
          moveInDate: data.moveInDate,
          status: data.status,
          comments: data.comments || null,
          additionalInfo: data.additionalInfo || null,
          user: { id: data.userId },
          updatedBy: user?.id,
        })
        .where('id = :requestId', { requestId })
        .execute();

      // Update tenant details
      await MoveInRequestDetailsTenant.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          dialCode: data.dialCode,
          phoneNumber: data.phoneNumber,
          nationality: data.nationality,
          emiratesIdNumber: data.emiratesIdNumber,
          emiratesIdExpiryDate: data.emiratesIdExpiryDate,
          tenancyContractStartDate: data.tenancyContractStartDate,
          tenancyContractEndDate: data.tenancyContractEndDate,
          adults: data.details?.adults,
          children: data.details?.children,
          householdStaffs: data.details?.householdStaffs,
          pets: data.details?.pets,
          peopleOfDetermination: data.details?.peopleOfDetermination || false,
          determination_text: data.details?.detailsText || null,
          comments: data.comments || null,
          updatedBy: user?.id,
        })
        .where('move_in_request_id = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      // Send email notifications about the update
      const updatedRequest = await MoveInRequests.findOne({ where: { id: requestId } });
      if (updatedRequest) {
        await this.sendNotifications(requestId, updatedRequest.moveInRequestNo);
      }

      return { id: requestId, message: 'Tenant move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateTenantMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  /**
   * Update HHO unit move-in request (Admin)
   */
  async updateHhoOwnerMoveIn(requestId: number, data: any, user: any) {
    try {
      // Check if request exists and is editable
      const request = await this.ensureEditableByAdmin(requestId, user);

      // Update the main request
      await MoveInRequests.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          unit: data.unitId ? { id: data.unitId } : undefined,
          moveInDate: data.moveInDate,
          status: data.status,
          comments: data.comments || null,
          additionalInfo: data.additionalInfo || null,
          user: { id: data.userId },
          updatedBy: user?.id,
        })
        .where('id = :requestId', { requestId })
        .execute();

      // Update HHO owner details
      await MoveInRequestDetailsHhoOwner.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          ownerFirstName: data.ownerFirstName || undefined,
          ownerLastName: data.ownerLastName || undefined,
          email: data.email || undefined,
          dialCode: data.dialCode || undefined,
          phoneNumber: data.phoneNumber || undefined,
          nationality: data.nationality || undefined,
          unitPermitNumber: data.details?.unitPermitNumber,
          unitPermitStartDate: data.details?.unitPermitStartDate,
          unitPermitExpiryDate: data.details?.unitPermitExpiryDate,
          comments: data.comments ?? null,
          updatedBy: user?.id,
        })
        .where('move_in_request_id = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      // Send email notifications about the update
      const updatedRequest = await MoveInRequests.findOne({ where: { id: requestId } });
      if (updatedRequest) {
        await this.sendNotifications(requestId, updatedRequest.moveInRequestNo);
      }

      return { id: requestId, message: 'HHO unit move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateHhoOwnerMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  /**
   * Update HHC company move-in request (Admin)
   */
  async updateHhcCompanyMoveIn(requestId: number, data: any, user: any) {
    try {
      // Check if request exists and is editable
      const request = await this.ensureEditableByAdmin(requestId, user);

      // Update the main request
      await MoveInRequests.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          unit: data.unitId ? { id: data.unitId } : undefined,
          moveInDate: data.moveInDate,
          status: data.status,
          comments: data.comments || null,
          additionalInfo: data.additionalInfo || null,
          user: { id: data.userId },
          updatedBy: user?.id,
        })
        .where('id = :requestId', { requestId })
        .execute();

      // Update HHC company details
      await MoveInRequestDetailsHhcCompany.getRepository()
        .createQueryBuilder()
        .update()
        .set({
          name: data.name,
          companyName: data.company,
          companyEmail: data.companyEmail,
          operatorOfficeNumber: data.operatorOfficeNumber,
          tradeLicenseNumber: data.tradeLicenseNumber,
          tradeLicenseExpiryDate: data.tradeLicenseExpiryDate,
          nationality: data.nationality,
          emiratesIdNumber: data.emiratesIdNumber,
          emiratesIdExpiryDate: data.emiratesIdExpiryDate,
          tenancyContractStartDate: data.tenancyContractStartDate || null,
          unitPermitStartDate: data.unitPermitStartDate,
          unitPermitExpiryDate: data.unitPermitExpiryDate,
          unitPermitNumber: data.unitPermitNumber,
          leaseStartDate: data.leaseStartDate,
          leaseEndDate: data.leaseEndDate,
          dtcmStartDate: data.dtcmStartDate || null,
          dtcmExpiryDate: data.dtcmExpiryDate || null,
          comments: data.comments ?? null,
          updatedBy: user?.id,
        })
        .where('move_in_request_id = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      // Send email notifications about the update
      const updatedRequest = await MoveInRequests.findOne({ where: { id: requestId } });
      if (updatedRequest) {
        await this.sendNotifications(requestId, updatedRequest.moveInRequestNo);
      }

      return { id: requestId, message: 'HHC company move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateHhcCompanyMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message || 'Unknown error occurred', apiCode?.code || 'EC001');
    }
  }

  /**
   * Ensure request is editable by admin (check status validation)
   */
  private async ensureEditableByAdmin(requestId: number, user: any) {
    // Only admin users can edit move-in requests
    if (!user?.isAdmin) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        APICodes.INVALID_USER_ROLE.message,
        APICodes.INVALID_USER_ROLE.code
      );
    }

    const request = await MoveInRequests.getRepository()
      .createQueryBuilder('mir')
      .where('mir.id = :requestId AND mir.isActive = true', { requestId })
      .getOne();

    if (!request) {
      throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
    }

    // Admin can edit requests in new, rfi-pending, or rfi-submitted status
    if (request.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN &&
      request.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING &&
      request.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_SUBMITTED) {
      throw new ApiError(httpStatus.BAD_REQUEST,
        "Request can only be updated when status is 'new', 'rfi-pending', or 'rfi-submitted'",
        APICodes.VALIDATION_ERROR.code);
    }

    return request;
  }

  /**
   * Log move-in request action
   */
  private async logMoveInRequestAction(requestId: number, action: string, remarks: string, user: any) {
    try {
      const log = new MoveInRequestLogs();
      log.moveInRequest = { id: requestId } as any;
      log.requestType = MOVE_IN_USER_TYPES.OWNER; // Use a valid enum value
      log.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN; // Use a valid enum value
      log.changes = action;
      log.user = { id: user?.id } as any;
      log.actionBy = TransitionRequestActionByTypes.SUPER_ADMIN;
      log.details = remarks;
      log.comments = remarks;
      await log.save();
    } catch (error) {
      logger.error(`Error logging move-in request action: ${error}`);
    }
  }
  /**
   * Process move-in(Unit allocation)
   */
  async moveInUnitAllocation(body: any) {
    try {
      const { requestId } = body;

      logger.info(`=== MOVE-IN UNIT ALLOCATION START ===`);
      logger.info(`Processing move-in ticket for request: ${requestId}`);
      logger.info(`Request body: ${JSON.stringify(body)}`);
      
      logger.info(`Querying move-in request with ID: ${requestId}`);
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder('mir')
        .leftJoinAndSelect('mir.unit', 'unit')
        .leftJoinAndSelect('mir.user', 'user')
        .where('mir.id = :requestId AND mir.isActive = true', { requestId })
        .getOne();
      
      logger.info(`Move-in request query completed. Found: ${!!moveInRequest}`);
      if (!moveInRequest) {
        logger.error(`Move-in request not found for ID: ${requestId}`);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Move-in request not found',
          'MOVE_IN_REQUEST_NOT_FOUND'
        );
      }

      logger.info(`Move-in request found:`, {
        id: moveInRequest.id,
        requestType: moveInRequest.requestType,
        status: moveInRequest.status,
        moveInDate: moveInRequest.moveInDate,
        unitId: moveInRequest.unit?.id,
        userId: moveInRequest.user?.id,
        hasUnit: !!moveInRequest.unit,
        hasUser: !!moveInRequest.user,
        createdBy: moveInRequest.createdBy,
        updatedBy: moveInRequest.updatedBy,
      });
      if (!moveInRequest.unit) {
        logger.error(`Unit relationship not loaded for move-in request: ${moveInRequest.id}`);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Unit information not found for move-in request',
          'UNIT_RELATIONSHIP_NOT_FOUND'
        );
      }

      if (!moveInRequest.user) {
        logger.error(`User relationship not loaded for move-in request: ${moveInRequest.id}`);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'User information not found for move-in request',
          'USER_RELATIONSHIP_NOT_FOUND'
        );
      }
     
      // Step 1: Find unit by unitId
      const unitEntity = await Units.getRepository()
        .createQueryBuilder('u')
        .where('u.id = :unitId AND u.isActive = true', { unitId: moveInRequest.unit.id })
        .getOne();

      if (!unitEntity) {
        logger.error(`Unit not found for ID: ${moveInRequest.unit.id}`);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Unit not found',
          'UNIT_NOT_FOUND'
        );
      }

      logger.info(`Unit found:`, {
        id: unitEntity.id,
        unitNumber: unitEntity.unitNumber,
        unitName: unitEntity.unitName,
        currentOccupancyStatus: unitEntity.occupancyStatus
      });

      // Step 3: Determine occupancy role based on request type
      const { OccupancyStatus } = await import('../../../Entities/EntityTypes/unit');
      const { UserRoles } = await import('../../../Entities/UserRoles.entity');
      const { Roles } = await import('../../../Entities/Roles.entity');

      let occupancyRoleSlug: string;
      switch (moveInRequest.requestType) {
        case MOVE_IN_USER_TYPES.TENANT:
          occupancyRoleSlug = OccupancyStatus.TENANT;
          break;
        case MOVE_IN_USER_TYPES.OWNER:
          occupancyRoleSlug = OccupancyStatus.OWNER;
          break;
        case MOVE_IN_USER_TYPES.HHO_OWNER:
          occupancyRoleSlug = OccupancyStatus.HHO;
          break;
        case MOVE_IN_USER_TYPES.HHO_COMPANY:
          occupancyRoleSlug = OccupancyStatus.HHC;
          break;
        default:
          occupancyRoleSlug = OccupancyStatus.VACANT;
      }

      logger.info(`Determined occupancy role: ${occupancyRoleSlug} for request type: ${moveInRequest.requestType}`);

      // Step 4: Get role ID by slug
      logger.info(`Looking for role with slug: ${occupancyRoleSlug}`);
      const role = await Roles.getRepository()
        .createQueryBuilder('r')
        .where('r.slug = :slug AND r.isActive = true', { slug: occupancyRoleSlug })
        .getOne();

      if (!role) {
        logger.error(`Role not found for slug: ${occupancyRoleSlug}`);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Role not found',
          'ROLE_NOT_FOUND'
        );
      }

      logger.info(`Role found:`, {
        id: role.id,
        slug: role.slug,
        roleName: role.roleName
      });

      // Step 5: Get owner role ID for comparison
      logger.info(`Looking for owner role with slug: ${OccupancyStatus.OWNER}`);
      const ownerRole = await Roles.getRepository()
        .createQueryBuilder('r')
        .where('r.slug = :slug AND r.isActive = true', { slug: OccupancyStatus.OWNER })
        .getOne();

      logger.info(`Owner role found:`, {
        id: ownerRole?.id,
        slug: ownerRole?.slug,
        roleName: ownerRole?.roleName
      });

      // Execute transaction for user role management and unit status update
      logger.info(`Starting transaction for user role management and unit status update`);
      await executeInTransaction(async () => {
        // Step 6: Remove existing non-owner roles
        logger.info(`Deactivating existing non-owner roles for unit: ${unitEntity.id}, excluding owner role: ${ownerRole?.id || 0}`);
        const deactivateResult = await UserRoles.getRepository()
          .createQueryBuilder()
          .update(UserRoles)
          .set({ isActive: false })
          .where('unit = :unitId AND role != :ownerRoleId', {
            unitId: unitEntity.id,
            ownerRoleId: ownerRole?.id || 0
          })
          .execute();
        
        logger.info(`Deactivated ${deactivateResult.affected} existing non-owner roles`);

        // Step 7: Determine dates for user role
        let startDate: Date;
        let endDate: Date | null = null;

        // Get date details from move-in request details
        logger.info(`Getting move-in request details for request: ${moveInRequest.id}, type: ${moveInRequest.requestType}`);
        const requestDetails = await this.getMoveInRequestDetails(moveInRequest.id, moveInRequest.requestType);
        
        if (requestDetails) {
          logger.info(`Request details found:`, {
            hasLeaseStartDate: 'leaseStartDate' in requestDetails && !!requestDetails.leaseStartDate,
            hasLeaseStartDateHO: 'leaseStartDateHO' in requestDetails && !!(requestDetails as any).leaseStartDateHO,
            hasLeaseEndDate: 'leaseEndDate' in requestDetails && !!requestDetails.leaseEndDate,
            hasLeaseEndDateHO: 'leaseEndDateHO' in requestDetails && !!(requestDetails as any).leaseEndDateHO
          });
        } else {
          logger.info(`No request details found for request: ${moveInRequest.id}`);
        }
        
        // Start date priority: leaseStartDate → leaseStartDateHO → moveInDate
        if (requestDetails && 'leaseStartDate' in requestDetails && requestDetails.leaseStartDate) {
          startDate = new Date(requestDetails.leaseStartDate as Date);
          logger.info(`Using leaseStartDate as start date: ${startDate}`);
        } else if (requestDetails && 'leaseStartDateHO' in requestDetails && (requestDetails as any).leaseStartDateHO) {
          startDate = new Date((requestDetails as any).leaseStartDateHO as Date);
          logger.info(`Using leaseStartDateHO as start date: ${startDate}`);
        } else {
          startDate = new Date(moveInRequest.moveInDate);
          logger.info(`Using moveInDate as start date: ${startDate}`);
        }

        // End date priority: leaseEndDate → leaseEndDateHO
        if (requestDetails && 'leaseEndDate' in requestDetails && requestDetails.leaseEndDate) {
          endDate = new Date(requestDetails.leaseEndDate as Date);
          logger.info(`Using leaseEndDate as end date: ${endDate}`);
        } else if (requestDetails && 'leaseEndDateHO' in requestDetails && (requestDetails as any).leaseEndDateHO) {
          endDate = new Date((requestDetails as any).leaseEndDateHO as Date);
          logger.info(`Using leaseEndDateHO as end date: ${endDate}`);
        } else {
          logger.info(`No end date found, setting to null`);
        }

        // Step 8: Check if user role already exists
        logger.info(`Checking for existing user role for user: ${moveInRequest.user.id}, unit: ${unitEntity.id}`);
        const existingRole = await UserRoles.getRepository()
          .createQueryBuilder('ur')
          .where('ur.isActive = true')
          .andWhere('ur.unit = :unit', { unit: unitEntity.id })
          .andWhere('ur.user = :user', { user: moveInRequest.user.id })
          .getOne();

        if (existingRole) {
          logger.info(`Existing user role found:`, {
            id: existingRole.id,
            currentEndDate: existingRole.endDate,
            newEndDate: endDate
          });
          
          // Update existing role end date if different
          if (endDate && existingRole.endDate !== endDate) {
            logger.info(`Updating existing role end date from ${existingRole.endDate} to ${endDate}`);
            await UserRoles.getRepository()
              .createQueryBuilder()
              .update(UserRoles)
              .set({ endDate: endDate })
              .where('id = :id', { id: existingRole.id })
              .execute();
            logger.info(`Successfully updated existing role end date`);
          } else {
            logger.info(`No update needed for existing role`);
          }
        } else {
          // Create new user role
          logger.info(`Creating new user role for user: ${moveInRequest.user.id}, unit: ${unitEntity.id}, role: ${role.id}`);
          
          // Determine the user ID for createdBy and updatedBy fields
          const currentUserId = moveInRequest.updatedBy || moveInRequest.user.id;
          logger.info(`Using user ID ${currentUserId} for createdBy and updatedBy fields`);
          logger.info(`moveInRequest.createdBy: ${moveInRequest.createdBy}, moveInRequest.updatedBy: ${moveInRequest.updatedBy}, moveInRequest.user.id: ${moveInRequest.user.id}`);
          
          const newUserRole = new UserRoles();
          newUserRole.user = moveInRequest.user;
          newUserRole.role = role;
          newUserRole.unit = unitEntity;
          newUserRole.startDate = startDate;
          newUserRole.endDate = endDate as Date;
          // Use fallback values to ensure we have valid numbers
          newUserRole.createdBy = moveInRequest.createdBy || moveInRequest.user.id || 1;
          newUserRole.updatedBy = moveInRequest.createdBy || moveInRequest.user.id || 1;
          newUserRole.isActive = true;
          
          logger.info(`Setting createdBy: ${newUserRole.createdBy}, updatedBy: ${newUserRole.updatedBy}`);
          
          const savedUserRole = await newUserRole.save();
          logger.info(`Successfully created new user role:`, {
            id: savedUserRole.id,
            userId: savedUserRole.user?.id,
            unitId: savedUserRole.unit?.id,
            roleId: savedUserRole.role?.id,
            startDate: savedUserRole.startDate,
            endDate: savedUserRole.endDate,
            isActive: savedUserRole.isActive  
          });
        }
      

        // Step 9: Update unit occupancy status
        logger.info(`Updating unit occupancy status from ${unitEntity.occupancyStatus} to ${occupancyRoleSlug}`);
        const unitUpdateResult = await Units.getRepository()
          .createQueryBuilder()
          .update(Units)
          .set({ 
            occupancyStatus: occupancyRoleSlug,
            updatedBy: moveInRequest.updatedBy
          })
          .where('id = :unitId', { unitId: unitEntity.id })
          .execute();
        logger.info(`Unit occupancy status updated successfully:`, { 
          unitId: unitEntity.id,
          oldStatus: unitEntity.occupancyStatus,
          newStatus: occupancyRoleSlug,
          affectedRows: unitUpdateResult.affected
        });
        // Step 10: Update move-in request comments
        logger.info(`Updating move-in request: ${moveInRequest.id}`);
        const requestUpdateResult = await MoveInRequests.getRepository()
          .createQueryBuilder()
          .update(MoveInRequests)
          .set({ 
            //comments: comments,
            updatedBy: moveInRequest.updatedBy
          })
          .where('id = :requestId', { requestId: moveInRequest.id })
          .execute();
        
        logger.info(`Move-in request updated successfully:`, {
          requestId: moveInRequest.id,
          affectedRows: requestUpdateResult.affected
        });
      });

      logger.info(`=== MOVE-IN UNIT ALLOCATION SUCCESS ===`);
      logger.info(`Successfully processed move-in request for unit: ${unitEntity.id}`);

      const response = {
        success: true,
        message: 'Move-in ticket processed successfully',
        unitId: unitEntity.id,
        unitNumber: unitEntity.unitNumber,
        occupancyStatus: occupancyRoleSlug,
        moveInRequestId: moveInRequest.id,
        userId: moveInRequest.user.id
      };

      logger.info(`Response data:`, response);
      return response;

    } catch (error: any) {
      logger.error(`=== MOVE-IN UNIT ALLOCATION ERROR ===`);
      logger.error(`Error processing move-in request: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
      logger.error(`Request body that caused error: ${JSON.stringify(body)}`);
      
      if (error instanceof ApiError) {
        logger.error(`API Error details:`, {
          statusCode: error.statusCode,
          message: error.message,
          code: error.code
        });
        throw error;
      }
      
      const apiError = new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Move-in request processing failure',
        'INTEGRATION_FAILURE'
      );
      
      logger.error(`Created API Error:`, {
        statusCode: apiError.statusCode,
        message: apiError.message,
        code: apiError.code
      });
      
      throw apiError;
    }
  }
    /**
   * Get move-in request details based on request type
   */
  private async getMoveInRequestDetails(requestId: number, requestType: string) {
    try {
      logger.info(`Getting move-in request details for requestId: ${requestId}, type: ${requestType}`);
      
      let details = null;
      switch (requestType) {
        case MOVE_IN_USER_TYPES.OWNER:
          details = await MoveInRequestDetailsOwner.getRepository()
            .createQueryBuilder('mir')
            .where('mir.moveInRequest = :requestId', { requestId })
            .getOne();
          break;
        
        case MOVE_IN_USER_TYPES.TENANT:
          details = await MoveInRequestDetailsTenant.getRepository()
            .createQueryBuilder('mir')
            .where('mir.moveInRequest = :requestId', { requestId })
            .getOne();
          break;
        
        case MOVE_IN_USER_TYPES.HHO_OWNER:
          details = await MoveInRequestDetailsHhoOwner.getRepository()
            .createQueryBuilder('mir')
            .where('mir.moveInRequest = :requestId', { requestId })
            .getOne();
          break;
        
        case MOVE_IN_USER_TYPES.HHO_COMPANY:
          details = await MoveInRequestDetailsHhcCompany.getRepository()
            .createQueryBuilder('mir')
            .where('mir.moveInRequest = :requestId', { requestId })
            .getOne();
          break;
        
        default:
          logger.info(`Unknown request type: ${requestType}, returning null`);
          return null;
      }
      
      if (details) {
        logger.info(`Found move-in request details for ${requestType}:`, {
          id: details.id,
          hasLeaseStartDate: 'leaseStartDate' in details && !!details.leaseStartDate,
          hasLeaseEndDate: 'leaseEndDate' in details && !!details.leaseEndDate,
          hasLeaseStartDateHO: 'leaseStartDateHO' in details && !!(details as any).leaseStartDateHO,
          hasLeaseEndDateHO: 'leaseEndDateHO' in details && !!(details as any).leaseEndDateHO
        });
      } else {
        logger.info(`No move-in request details found for ${requestType}`);
      }
      
      return details;
    } catch (error) {
      logger.error(`Error getting move-in request details for requestId: ${requestId}, type: ${requestType}:`, error);
      return null;
    }
  }

}
