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
import { get } from "http";
import config from "../../../Common/Config/config";
import { EmailService, MoveInEmailData } from "../../Email/email.service";

export class MoveInService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
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
        // 1. Allow multiple OPEN requests; block only if an APPROVED request already exists
        const isUnitAvailableForNewRequest = await this.checkUnitAvailabilityForNewRequest(Number(unitId));
        if (!isUnitAvailableForNewRequest) {
          throw new ApiError(
            httpStatus.CONFLICT,
            APICodes.UNIT_NOT_VACANT.message,
            APICodes.UNIT_NOT_VACANT.code
          );
        }

        // 2. Overlap: allow overlaps for OPEN/PENDING; only block if an APPROVED request exists
        const overlapCheck = await this.checkOverlappingRequests(Number(unitId), new Date(moveInDate));
        if (overlapCheck.hasOverlap) {
          throw new ApiError(
            httpStatus.CONFLICT,
            APICodes.OVERLAPPING_REQUESTS.message,
            APICodes.OVERLAPPING_REQUESTS.code
          );
        }

        // 3. Check if MIP template and Welcome pack exist
        const mipWelcomePackCheck = await this.checkMIPAndWelcomePack(Number(unitId));
        if (!mipWelcomePackCheck.hasMIP) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.MIP_TEMPLATE_NOT_AVAILABLE.message,
            APICodes.MIP_TEMPLATE_NOT_AVAILABLE.code
          );
        }
        if (!mipWelcomePackCheck.hasWelcomePack) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.WELCOME_PACK_NOT_AVAILABLE.message,
            APICodes.WELCOME_PACK_NOT_AVAILABLE.code
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
        master.user = { id: user?.id } as any;
        master.unit = { id: unitId } as any;
        master.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
        master.moveInDate = moveInDate ? new Date(moveInDate) : new Date();
        master.comments = comments || null;
        master.additionalInfo = additionalInfo || null;
        master.createdBy = user?.id;
        master.updatedBy = user?.id;
        master.isActive = true;

        const savedMaster = await MoveInRequests.save(master);

        // Update request number to final format MIN-<unitNumber>-<id>
        const finalRequestNumber = `MIN-${unit?.unitNumber}-${savedMaster.id}`;
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
      } else {
        logger.error(`=== EMAIL NOTIFICATION SKIPPED ===`);
        logger.error(`createdMaster is null/undefined - no email will be sent`);
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
      const driverMsg = error?.driverError?.sqlMessage || error?.sqlMessage || error?.message || APICodes.UNKNOWN_ERROR.message;
      const driverCode = error?.driverError?.code || error?.code || APICodes.UNKNOWN_ERROR.code;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, driverMsg, driverCode);
    }
  }

  // Helper method to get unit by ID
  private async getUnitById(id: number) {
    try {
      return await Units.getRepository()
        .createQueryBuilder("ut")
        .innerJoinAndSelect("ut.masterCommunity", "mc", "mc.isActive = 1")
        .innerJoinAndSelect("ut.community", "c", "c.isActive = 1")
        .innerJoinAndSelect("ut.tower", "t", "t.isActive = 1")
        .where("ut.id = :id AND ut.isActive = 1", { id })
        .getOne();
    } catch (error) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes.UNKNOWN_ERROR.message,
        APICodes.UNKNOWN_ERROR.code,
        error
      );
    }
  }

  // Helper method to generate request number
  private generateRequestNumber(unitNumber?: string | number): string {
    const suffix = `${Date.now()}`;
    return `MIN-${unitNumber ?? 'UNIT'}-${suffix}`;
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

        // Optional fields
        // entity.peopleOfDetermination = details.peopleOfDetermination;
        // entity.termsAccepted = details.termsAccepted;

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
      
      // Map owner UI fields to details (user details come from Users table, not stored here)
      const { details = {}, ...rest } = data || {};
      const ownerDetails = {
        // Occupancy details
        adults: details.adults,
        children: details.children,
        householdStaffs: details.householdStaffs,
        pets: details.pets,
        peopleOfDetermination: details.peopleOfDetermination,
        // Store detailsText in comments field when peopleOfDetermination is true
        comments: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
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

        // Store detailsText in comments field when peopleOfDetermination is true
        comments: details.peopleOfDetermination && details.detailsText ? details.detailsText : (rest.comments || null),
      };

      logger.debug(`Tenant Details mapped: ${JSON.stringify(tenantDetails)}`);
      return this.createMoveInRequest({ ...rest, details: tenantDetails, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
    } catch (error) {
      logger.error(`Error in createTenantMoveIn Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  async createHhoOwnerMoveIn(data: any, user: any) {
    try {
      // Map HHO Owner UI fields to details
      const { details = {}, ...rest } = data || {};
      const hhoOwnerDetails = {
        // Owner identity: use UI values if present, else fallback to admin user
        ownerFirstName: rest.ownerFirstName || user?.firstName || user?.name?.split(' ')?.[0] || 'Admin',
        ownerLastName: rest.ownerLastName || user?.lastName || user?.name?.split(' ')?.slice(1).join(' ') || 'User',
        email: rest.email || user?.email || `admin${user?.id || 'user'}@onesobha.com`,
        dialCode: rest.dialCode || user?.dialCode?.dialCode || user?.dialCode || '+971',
        phoneNumber: rest.phoneNumber || user?.mobile || user?.phoneNumber || user?.phone || '000000000',
        nationality: rest.nationality || user?.nationality || 'UAE',

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
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  async createHhcCompanyMoveIn(data: any, user: any) {
    try {
      const { details: _ignoredDetails = {}, ...rest } = data || {};
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
      } as any;

      // Do not merge external details; ignore termsAccepted or any details from request body
      return this.createMoveInRequest({ ...rest, details: { ...hhcCompanyDetails }, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
    } catch (error) {
      logger.error(`Error in createHhcCompanyMoveIn Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }



  // Check if unit is available for a new move-in request (no APPROVED request exists)
  private async checkUnitAvailabilityForNewRequest(unitId: number): Promise<boolean> {
    try {
      const existingApprovedRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .where("mir.unit.id = :unitId", { unitId })
        .andWhere("mir.status = :approvedStatus", { approvedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED })
        .andWhere("mir.isActive = 1")
        .getOne();

      // Unit is available if there is NO approved request
      return !existingApprovedRequest;
    } catch (error) {
      logger.error(`Error checking unit vacancy: ${error}`);
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
      // TODO: Implement MIP template check
      // TODO: Implement Welcome pack check
      // For now, return true to allow development
      return { hasMIP: true, hasWelcomePack: true };
    } catch (error) {
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

  // Send notifications to owner/tenant and community recipients
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

      // Get the primary recipient and CC emails based on request type
      const emailRecipients = await this.getEmailRecipients(moveInRequest);
      
      if (!emailRecipients || !emailRecipients.primary.email) {
        logger.error(`EMAIL ERROR: No primary email recipient found for ${moveInRequest.requestType} request ${requestId}, unitId: ${moveInRequest.unit?.id}`);
        return;
      }

      logger.info(`EMAIL DATA: Primary: ${emailRecipients.primary.firstName} ${emailRecipients.primary.lastName} (${emailRecipients.primary.email})`);
      if (emailRecipients.cc && emailRecipients.cc.length > 0) {
        logger.info(`EMAIL DATA: CC: ${emailRecipients.cc.join(', ')}`);
      }
      logger.info(`EMAIL DATA: Unit: ${moveInRequest.unit?.unitName} in ${moveInRequest.unit?.community?.name}`);
      logger.info(`EMAIL DATA: Status: ${moveInRequest.status}`);

      // Prepare email data
      const emailData: MoveInEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: moveInRequest.status, // Use actual current status
        requestType: moveInRequest.requestType,
        userDetails: {
          firstName: emailRecipients.primary.firstName,
          lastName: emailRecipients.primary.lastName,
          email: emailRecipients.primary.email
        },
        ccEmails: emailRecipients.cc,
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
        comments: moveInRequest.comments || ''
      };

      logger.info(`EMAIL PAYLOAD: ${JSON.stringify(emailData)}`);

      // Check if this is an auto-approved request (status should be 'approved')
      if (moveInRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
        logger.info(`SENDING APPROVAL EMAIL with welcome pack for auto-approved request`);
        await this.emailService.sendMoveInApprovalEmail(emailData);
      } else {
        logger.info(`SENDING STATUS EMAIL for status: ${moveInRequest.status}`);
        await this.emailService.sendMoveInStatusEmail(emailData);
      }

      logger.info(`=== EMAIL NOTIFICATION SUCCESS ===`);
      logger.info(`Notifications sent successfully for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`=== EMAIL NOTIFICATION ERROR ===`);
      logger.error(`Error sending notifications for request ${requestId}:`, error);
      logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      logger.error(`=== EMAIL NOTIFICATION ERROR END ===`);
      // Don't throw error for notification failures to avoid breaking the move-in process
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

      // Check for overlapping requests
      const overlapCheck = await this.checkOverlappingRequests(moveInRequest.unit.id, moveInRequest.moveInDate);
      if (overlapCheck.hasOverlap) {
        throw new ApiError(
          httpStatus.CONFLICT,
          APICodes.OVERLAPPING_REQUESTS.message,
          APICodes.OVERLAPPING_REQUESTS.code
        );
      }

      // Check MIP template availability
      const mipCheck = await this.checkMIPAndWelcomePack(moveInRequest.unit.id);
      if (!mipCheck.hasMIP) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.MIP_TEMPLATE_NOT_AVAILABLE.message,
          APICodes.MIP_TEMPLATE_NOT_AVAILABLE.code
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
        // Update request status to Approved
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
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

      // Send approval notifications
      await this.sendApprovalNotifications(requestId, moveInRequest.moveInRequestNo);

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

      // Validate comments (mandatory)
      if (!comments || comments.trim().length === 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.COMMENTS_REQUIRED.message,
          APICodes.COMMENTS_REQUIRED.code
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
      if (moveInRequest.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          APICodes.CANNOT_MARK_RFI_STATUS.message,
          APICodes.CANNOT_MARK_RFI_STATUS.code
        );
      }

      await executeInTransaction(async (qr: any) => {
        // Update request status to RFI Pending
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING,
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
        // Update request status to Cancelled
        await MoveInRequests.update({ id: requestId }, {
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
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
          moveInDate: actualMoveInDate,
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
   * Get email recipients (primary and CC) based on request type
   */
  private async getEmailRecipients(moveInRequest: any): Promise<{primary: {firstName: string, lastName: string, email: string}, cc: string[]} | null> {
    try {
      logger.info(`Getting email recipients for ${moveInRequest.requestType} request ${moveInRequest.id}, unitId: ${moveInRequest.unit?.id}`);

      const unitId = moveInRequest.unit?.id;
      let primary = null;
      let cc: string[] = [];

      // Get unit owner email from unit_bookings (always needed for CC in tenant requests)
      const ownerInfo = await this.getUnitOwnerFromBookings(unitId);

      switch (moveInRequest.requestType) {
        case MOVE_IN_USER_TYPES.OWNER: {
          // For owner requests: primary = owner, no CC
          if (ownerInfo) {
            primary = ownerInfo;
            logger.info(`Owner request: Primary email set to owner from unit_bookings`);
          }
          break;
        }
        
        case MOVE_IN_USER_TYPES.TENANT: {
          // For tenant requests: primary = tenant, CC = owner
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
            
            // Add owner as CC
            if (ownerInfo && ownerInfo.email) {
              cc.push(ownerInfo.email);
              logger.info(`Tenant request: Owner email added to CC (${ownerInfo.email})`);
            }
          }
          break;
        }
        
        case MOVE_IN_USER_TYPES.HHO_OWNER: {
          // For HHO owner requests: primary = HHO owner, CC = unit owner
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
            
            // Add unit owner as CC
            if (ownerInfo && ownerInfo.email && ownerInfo.email !== hhoDetails.email) {
              cc.push(ownerInfo.email);
              logger.info(`HHO Owner request: Unit owner email added to CC (${ownerInfo.email})`);
            }
          }
          break;
        }
        
        case MOVE_IN_USER_TYPES.HHO_COMPANY: {
          // For HHC company requests: primary = companyEmail, CC = unit owner
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
            
            // Add unit owner as CC
            if (ownerInfo && ownerInfo.email) {
              cc.push(ownerInfo.email);
              logger.info(`HHC Company request: Unit owner email added to CC (${ownerInfo.email})`);
            }
          }
          break;
        }
      }

      if (!primary) {
        logger.error(`No primary email recipient found for ${moveInRequest.requestType} request ${moveInRequest.id}`);
        return null;
      }

      return { primary, cc };
    } catch (error) {
      logger.error(`Error getting email recipients for request ${moveInRequest.id}:`, error);
      return null;
    }
  }

  /**
   * Get unit owner information from unit_bookings table
   */
  private async getUnitOwnerFromBookings(unitId: number): Promise<{firstName: string, lastName: string, email: string} | null> {
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
   * Send approval notifications
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

      // Prepare email data
      const emailData: MoveInEmailData = {
        requestId: requestId,
        requestNumber: requestNumber,
        status: 'approved',
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
        comments: moveInRequest.comments || ''
      };

      // Send approval email with welcome pack attachment
      await this.emailService.sendMoveInApprovalEmail(emailData);

      logger.info(`Approval notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending approval notifications: ${error}`);
      // Don't throw error to avoid breaking the approval process
    }
  }

  /**
   * Send RFI notifications
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

      // Send RFI email (without attachment)
      await this.emailService.sendMoveInStatusEmail(emailData);

      logger.info(`RFI notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending RFI notifications: ${error}`);
      // Don't throw error to avoid breaking the RFI process
    }
  }

  /**
   * Send cancellation notifications
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

      // Send cancellation email (without attachment)
      await this.emailService.sendMoveInStatusEmail(emailData);

      logger.info(`Cancellation notifications sent for move-in request ${requestId}`);
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
          comments: data.comments || null,
          additionalInfo: data.additionalInfo || null,
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
          // peopleOfDetermination: data.details?.peopleOfDetermination || false, // Not available in Owner entity
          comments: data.details?.detailsText ?? data.comments ?? null,
          updatedBy: user?.id,
        })
        .where('moveInRequestId = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      return { id: requestId, message: 'Owner move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateOwnerMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
          comments: data.details?.detailsText ?? data.comments ?? null,
          updatedBy: user?.id,
        })
        .where('moveInRequestId = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      return { id: requestId, message: 'Tenant move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateTenantMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
        .where('moveInRequestId = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      return { id: requestId, message: 'HHO unit move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateHhoOwnerMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
        .where('moveInRequestId = :requestId', { requestId })
        .execute();

      // Log the update
      await this.logMoveInRequestAction(requestId, 'UPDATE', 'Request updated by admin', user);

      return { id: requestId, message: 'HHC company move-in request updated successfully' };
    } catch (error: any) {
      logger.error(`Error in updateHhcCompanyMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
}

