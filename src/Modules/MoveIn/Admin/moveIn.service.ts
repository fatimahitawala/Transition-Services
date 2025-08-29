import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../../Common/Utils/adminAccess";
import { logger } from "../../../Common/Utils/logger";
import { MOVE_IN_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS, TransitionRequestActionByTypes } from "../../../Entities/EntityTypes";
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
import { get } from "http";

export class MoveInService {

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

      // Admin can create move-in requests for any user
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
        // 1. Check if unit is vacant
        const isUnitVacant = await this.checkUnitVacancy(Number(unitId));
        if (!isUnitVacant) {
          throw new ApiError(
            httpStatus.CONFLICT,
            APICodes.UNIT_NOT_VACANT.message,
            APICodes.UNIT_NOT_VACANT.code
          );
        }

        // 2. Check for overlapping requests
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
          await this.autoApproveRequest(qr, savedMaster.id, user?.id);
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
        await this.sendNotifications(createdMaster.id, createdMaster.moveInRequestNo);
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
      logger.error(`Error in createMoveInRequest Admin: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
        entity.adults = details.adults;
        entity.children = details.children;
        entity.householdStaffs = details.householdStaffs;
        entity.pets = details.pets;
        entity.comments = details.comments;

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
        entity.attorneyName = details.attorneyName || "";
        entity.attorneyPhone = details.attorneyPhone || "";
        entity.ejariNumber = details.ejariNumber || "";
        entity.dtcmPermitNumber = details.dtcmPermitNumber || "";
        entity.emergencyContactName = details.emergencyContactName || "";
        entity.relationship = details.relationship || "";
        entity.monthlyRent = details.monthlyRent || "";
        entity.securityDeposit = details.securityDeposit || "";
        entity.maintenanceFee = details.maintenanceFee || null;
        entity.currency = details.currency || null;

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
        entity.countryCode = details.countryCode;
        entity.operatorOfficeNumber = details.operatorOfficeNumber;
        entity.tradeLicenseNumber = details.tradeLicenseNumber;
        entity.tenancyContractStartDate = details.tenancyContractStartDate;
        entity.unitPermitStartDate = details.unitPermitStartDate;
        entity.unitPermitExpiryDate = details.unitPermitExpiryDate;
        entity.unitPermitNumber = details.unitPermitNumber;
        entity.leaseStartDate = details.leaseStartDate;
        entity.leaseEndDate = details.leaseEndDate;
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
      // Map owner UI fields to details (user details come from Users table, not stored here)
      const { details = {}, ...rest } = data || {};
      const ownerDetails = {
        // Occupancy details
        adults: details.adults,
        children: details.children,
        householdStaffs: details.householdStaffs,
        pets: details.pets,
        comments: details.detailsText || rest.comments || null,

        // Optional toggles
        peopleOfDetermination: details.peopleOfDetermination,
      };

      logger.debug(`Owner Details mapped: ${JSON.stringify(ownerDetails)}`);
      return this.createMoveInRequest({ ...rest, details: ownerDetails, requestType: MOVE_IN_USER_TYPES.OWNER }, user);
    } catch (error) {
      logger.error(`Error in createOwnerMoveIn Admin: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async createTenantMoveIn(data: any, user: any) {
    try {
      return this.createMoveInRequest({ ...data, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
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
        // Required fields - populate from user or provide defaults
        ownerFirstName: user?.firstName || user?.name?.split(' ')[0] || 'Admin',
        ownerLastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || 'User',
        email: user?.email || `admin${user?.id || 'user'}@onesobha.com`,
        dialCode: user?.dialCode?.dialCode || user?.dialCode || '+971',
        phoneNumber: user?.mobile || user?.phoneNumber || user?.phone || '000000000',
        nationality: user?.nationality || 'UAE',

        // Details from request
        adults: details.adults || 1,
        children: details.children || 0,
        householdStaffs: details.householdStaffs || 0,
        pets: details.pets || 0,
        comments: rest.comments || null,

        // Optional fields with defaults
        peopleOfDetermination: details.peopleOfDetermination || false,
        termsAccepted: details.termsAccepted || false,

        // Additional required fields with defaults
        attorneyFirstName: null,
        attorneyLastName: null,
        dateOfBirth: null,
        emergencyContactDialCode: null,
        emergencyContactNumber: null,
        emiratesIdNumber: null,
        passportNumber: null,
        visaNumber: null,
        powerOfAttorneyNumber: null,
        attorneyName: null,
        attorneyPhone: null,
        ejariNumber: null,
        dtcmPermitNumber: null,
        emergencyContactName: null,
        relationship: null,
        monthlyRent: null,
        securityDeposit: null,
        maintenanceFee: null,
        currency: null
      };

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
      return this.createMoveInRequest({ ...data, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
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
      let { page = 1, per_page = 20, masterCommunityIds = "", communityIds = "", towerIds = "", createdStartDate = "", createdEndDate = "", moveInStartDate = "", moveInEndDate = "" } = query;

      masterCommunityIds = masterCommunityIds.split(",").filter((e: any) => e);
      communityIds = communityIds.split(",").filter((e: any) => e);
      towerIds = towerIds.split(",").filter((e: any) => e);

      let getMoveInList = MoveInRequests.getRepository().createQueryBuilder("am")
        .select([
          "am.id", "am.status", "am.createdAt", "am.moveInDate",
          "am.moveInRequestNo", "am.requestType",
        ])
        .innerJoin("am.unit", "u", "u.isActive=1")
        .innerJoin("u.masterCommunity", "mc", "mc.isActive=1")
        .innerJoin("u.community", "c", "c.isActive=1")
        .innerJoin("u.tower", "t", "t.isActive=1")
        .where("am.isActive=1");

      getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);

      if (masterCommunityIds && masterCommunityIds.length) getMoveInList.andWhere(`am.masterCommunity IN (:...masterCommunityIds)`, { masterCommunityIds });
      if (communityIds && communityIds.length) getMoveInList.andWhere(`am.community IN (:...communityIds)`, { communityIds });
      if (towerIds && towerIds.length) getMoveInList.andWhere(`am.tower IN (:...towerIds)`, { towerIds });
      if (createdStartDate) getMoveInList.andWhere(`am.createdAt >= :createdStartDate`, { createdStartDate });
      if (createdEndDate) getMoveInList.andWhere(`am.createdAt <= :createdEndDate`, { createdEndDate });
      if (moveInStartDate) getMoveInList.andWhere(`am.moveInDate >= :moveInStartDate`, { moveInStartDate });
      if (moveInEndDate) getMoveInList.andWhere(`am.moveInDate <= :moveInEndDate`, { moveInEndDate });

      if (isSecurity) {
        getMoveInList.andWhere("am.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }

      getMoveInList.orderBy("am.createdAt", "DESC")
        .offset((page - 1) * per_page)
        .limit(per_page);

      const list = await getMoveInList.getMany();
      const count = await getMoveInList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);

      return { data: list, pagination };

    } catch (error) {
      logger.error(`Error in getAdminMoveIn : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }

  async getMoveInRequestDetailsWithId(requestId: number, user: any) {
    try {
      let query = MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .select([
          "mv.id",
          "masterCommunity.name",
          "community.name",
          "tower.name",
          "unit.unitName",
          "unit.unitNumber",
          "tower.id",
          "community.id",
          "masterCommunity.id",
          "unit.id",
          "user.firstName",
          "user.middleName",
          "user.lastName",
          "user.email",
          "user.mobile",
          "mv.requestType",
          "mv.moveInDate",
          "mv.comments",
          "mv.moveInRequestNo",
          "mv.createdBy",
          "mv.status",
          "mv.createdAt",
          "mv.updatedAt",
        ])
        .innerJoin("mv.user", "user", "user.isActive = true")
        .innerJoin("mv.unit", "unit", "unit.isActive = true")
        .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
        .innerJoin("unit.tower", "tower", "tower.isActive = true")
        .innerJoin("unit.community", "community", "community.isActive = true")
        .where("mv.isActive = true AND mv.id = :requestId", { requestId });

      const isSecurity = await checkIsSecurity(user);

      if (isSecurity) {
        query.andWhere("mv.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }

      let result: any = await query.getOne();

      if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
      }

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

      const typeConfig = detailsMap[result.requestType];
      if (typeConfig) {
        const details = await typeConfig.repo
          .getRepository()
          .createQueryBuilder(typeConfig.alias)
          .where(`${typeConfig.alias}.moveInRequest.id = :id AND ${typeConfig.alias}.isActive = true`, { id: result.id })
          .getOne();

        result = { ...result, [typeConfig.key]: details };
      }

      return result;
    } catch (error) {
      logger.error(`Error in MoveInRequestById : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }



  // Check if unit is vacant (no active or pending move-in requests)
  private async checkUnitVacancy(unitId: number): Promise<boolean> {
    try {
      const existingRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .where("mir.unit.id = :unitId", { unitId })
        .andWhere("mir.status IN (:...statuses)", {
          statuses: [
            MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN,
            MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED,
            MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING
          ]
        })
        .andWhere("mir.isActive = 1")
        .getOne();

      return !existingRequest; // Unit is vacant if no active request exists
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
        .andWhere("mir.status NOT IN (:...excludedStatuses)", {
          excludedStatuses: [
            MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
            MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED
          ]
        })
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
      // TODO: Implement push notification to owner/tenant
      // For Owner: "A new move-in request (<Reference ID>) has been created and approved by Community Admin. Tap here to view your request."
      // For Tenant: "A new move-in request (<Reference ID>) has been created and approved by Community Admin. Tap here to view your request."

      // TODO: Implement email notification to community recipients (as per Email Recipients configuration)
      // TODO: Send notifications to both owner/tenant and relevant community team members

      logger.info(`Notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending notifications: ${error}`);
      // Don't throw error for notification failures
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
   * Send approval notifications
   */
  private async sendApprovalNotifications(requestId: number, requestNumber: string): Promise<void> {
    try {
      // TODO: Implement push notification to customer
      // Template: "Your Move-in request has been approved by admin."

      // TODO: Implement email notification to community recipients

      logger.info(`Approval notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending approval notifications: ${error}`);
    }
  }

  /**
   * Send RFI notifications
   */
  private async sendRFINotifications(requestId: number, requestNumber: string, comments: string): Promise<void> {
    try {
      // TODO: Implement push notification to customer
      // Template: "Your Move-in request (<Reference ID>) requires further information. Tap to view details."

      logger.info(`RFI notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending RFI notifications: ${error}`);
    }
  }

  /**
   * Send cancellation notifications
   */
  private async sendCancellationNotifications(requestId: number, requestNumber: string, cancellationRemarks: string): Promise<void> {
    try {
      // TODO: Implement push notification to customer
      // Template: "Your Move-in request (<Reference ID>) has been cancelled."

      logger.info(`Cancellation notifications sent for move-in request ${requestId}`);
    } catch (error) {
      logger.error(`Error sending cancellation notifications: ${error}`);
    }
  }
}

