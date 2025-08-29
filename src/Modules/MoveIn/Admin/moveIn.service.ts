import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../../Common/Utils/adminAccess";
import { logger } from "../../../Common/Utils/logger";
import { MOVE_IN_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS, ActionByTypes } from "../../../Entities/EntityTypes";
import { MoveInRequestDetailsHhcCompany } from "../../../Entities/MoveInRequestDetailsHhcCompany.entity";
import { MoveInRequestDetailsHhoOwner } from "../../../Entities/MoveInRequestDetailsHhoOwner.entity";
import { MoveInRequestDetailsTenant } from "../../../Entities/MoveInRequestDetailsTenant.entity";
import { MoveInRequestDetailsOwner } from "../../../Entities/MoveInRequestDetailsOwner.entity";
import { MoveInRequestLogs } from "../../../Entities/MoveInRequestLogs.entity";
import { MoveInRequestDocuments } from "../../../Entities/MoveInRequestDocuments.entity";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes/transition";
import { uploadFile } from "../../../Common/Utils/azureBlobStorage";
import { executeInTransaction } from "../../../Common/Utils/transactionUtil";
import { Units } from "../../../Entities/Units.entity";

export class MoveInService {
  createMoveInRequest(body: any) {
    throw new Error("Method not implemented.");
  }

  // Implement the proper createMoveIn method based on Mobile service
  async createMoveIn(data: any, user: any) {
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

      const tempRequestNumber = this.generateRequestNumber(unit?.unitNumber);

      let createdMaster: MoveInRequests | undefined;
      let createdDetails: any = null;

      await executeInTransaction(async (qr: any) => {
        // Create master record
        const master = qr.manager.create(MoveInRequests, {
          moveInRequestNo: tempRequestNumber,
          requestType,
          user: { id: user?.id } as any,
          unit: { id: unitId } as any,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN,
          moveInDate: moveInDate ? new Date(moveInDate) : null,
          comments: comments || null,
          additionalInfo: additionalInfo || null,
          createdBy: user?.id,
          updatedBy: user?.id,
          isActive: true,
        });
        const savedMaster = await qr.manager.save(MoveInRequests, master);

        // Update request number to final format MIN-<unitNumber>-<id>
        const finalRequestNumber = `MIN-${unit?.unitNumber}-${savedMaster.id}`;
        await qr.manager.update(MoveInRequests, { id: savedMaster.id }, { moveInRequestNo: finalRequestNumber });
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

        // Create initial log
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: createdMaster as MoveInRequests,
          requestType,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN,
          changes: null,
          user: { id: user?.id } as any,
          actionBy: ActionByTypes.COMMUNITY_ADMIN,
          details: details ? JSON.stringify(details) : null,
          comments: comments || null,
          createdBy: user?.id,
          updatedBy: user?.id,
        });
        await qr.manager.save(MoveInRequestLogs, log);
      });

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
      };
    } catch (error: any) {
      logger.error(`Error in createMoveIn Admin: ${JSON.stringify(error)}`);
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
        const entity = qr.manager.create(MoveInRequestDetailsTenant, {
          moveInRequest: master,
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          dialCode: details.dialCode,
          phoneNumber: details.phoneNumber,
          nationality: details.nationality,
          adults: details.adults,
          children: details.children,
          householdStaffs: details.householdStaffs,
          pets: details.pets,
          // peopleOfDetermination is persisted as column exists; termsAccepted not stored in tenant table
          peopleOfDetermination: details.peopleOfDetermination,
          emiratesIdNumber: details.emiratesIdNumber,
          emiratesIdExpiryDate: details.emiratesIdExpiryDate,
          tenancyContractStartDate: details.tenancyContractStartDate,
          tenancyContractEndDate: details.tenancyContractEndDate,
          createdBy: userId,
          updatedBy: userId,
          isActive: true,
        });
        return await qr.manager.save(MoveInRequestDetailsTenant, entity);
      }
      case MOVE_IN_USER_TYPES.OWNER: {
        const entity = qr.manager.create(MoveInRequestDetailsOwner, {
          moveInRequest: master,
          
          // Occupancy details
          adults: details.adults,
          children: details.children,
          householdStaffs: details.householdStaffs,
          pets: details.pets,
          comments: details.comments,
          
          // Optional fields with defaults (user personal info comes from Users table)
          emergencyContactDialCode: null,
          emergencyContactNumber: null,
          emiratesIdNumber: null,
          passportNumber: null,
          visaNumber: null,
          companyName: null,
          tradeLicenseNumber: null,
          companyAddress: null,
          companyPhone: null,
          companyEmail: null,
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
          currency: null,
          
          createdBy: userId,
          updatedBy: userId,
          isActive: true,
        });
        return await qr.manager.save(MoveInRequestDetailsOwner, entity);
      }
      case MOVE_IN_USER_TYPES.HHO_OWNER: {
        const entity = qr.manager.create(MoveInRequestDetailsHhoOwner, {
          moveInRequest: master,
          // Required fields
          ownerFirstName: details.ownerFirstName,
          ownerLastName: details.ownerLastName,
          email: details.email,
          dialCode: details.dialCode,
          phoneNumber: details.phoneNumber,
          nationality: details.nationality,
          
          // Details from request
          adults: details.adults,
          children: details.children,
          householdStaffs: details.householdStaffs,
          pets: details.pets,
          comments: details.comments,
          
          // Optional fields
          peopleOfDetermination: details.peopleOfDetermination,
          termsAccepted: details.termsAccepted,
          
          // Additional fields with defaults
          attorneyFirstName: details.attorneyFirstName || null,
          attorneyLastName: details.attorneyLastName || null,
          dateOfBirth: details.dateOfBirth || null,
          emergencyContactDialCode: details.emergencyContactDialCode || null,
          emergencyContactNumber: details.emergencyContactNumber || null,
          emiratesIdNumber: details.emiratesIdNumber || null,
          passportNumber: details.passportNumber || null,
          visaNumber: details.visaNumber || null,
          powerOfAttorneyNumber: details.powerOfAttorneyNumber || null,
          attorneyName: details.attorneyName || null,
          attorneyPhone: details.attorneyPhone || null,
          ejariNumber: details.ejariNumber || null,
          dtcmPermitNumber: details.dtcmPermitNumber || null,
          emergencyContactName: details.emergencyContactName || null,
          relationship: details.relationship || null,
          monthlyRent: details.monthlyRent || null,
          securityDeposit: details.securityDeposit || null,
          maintenanceFee: details.maintenanceFee || null,
          currency: details.currency || null,
          
          createdBy: userId,
          updatedBy: userId,
          isActive: true,
        });
        return await qr.manager.save(MoveInRequestDetailsHhoOwner, entity);
      }
      case MOVE_IN_USER_TYPES.HHO_COMPANY: {
        const entity = qr.manager.create(MoveInRequestDetailsHhcCompany, {
          moveInRequest: master,
          name: details.name, // Now map directly to the name field
          companyName: details.company,
          companyEmail: details.companyEmail,
          countryCode: details.countryCode,
          operatorOfficeNumber: details.operatorOfficeNumber,
          tradeLicenseNumber: details.tradeLicenseNumber,
          tenancyContractStartDate: details.tenancyContractStartDate,
          unitPermitStartDate: details.unitPermitStartDate,
          unitPermitExpiryDate: details.unitPermitExpiryDate,
          unitPermitNumber: details.unitPermitNumber,
          leaseStartDate: details.leaseStartDate,
          leaseEndDate: details.leaseEndDate,
          nationality: details.nationality,
          emiratesIdNumber: details.emiratesIdNumber,
          emiratesIdExpiryDate: details.emiratesIdExpiryDate,
          createdBy: userId,
          updatedBy: userId,
          isActive: true,
        });
        return await qr.manager.save(MoveInRequestDetailsHhcCompany, entity);
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
      return this.createMoveIn({ ...rest, details: ownerDetails, requestType: MOVE_IN_USER_TYPES.OWNER }, user);
    } catch (error) {
      logger.error(`Error in createOwnerMoveIn Admin: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async createTenantMoveIn(data: any, user: any) {
    try {
      return this.createMoveIn({ ...data, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
    } catch (error) {
      logger.error(`Error in createTenantMoveIn Admin: ${JSON.stringify(error)}`);
      throw error;
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
      return this.createMoveIn({ ...rest, details: hhoOwnerDetails, requestType: MOVE_IN_USER_TYPES.HHO_OWNER }, user);
    } catch (error) {
      logger.error(`Error in createHhoOwnerMoveIn Admin: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async createHhcCompanyMoveIn(data: any, user: any) {
    try {
      return this.createMoveIn({ ...data, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
    } catch (error) {
      logger.error(`Error in createHhcCompanyMoveIn Admin: ${JSON.stringify(error)}`);
      throw error;
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
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'emiratesIdFront', document: document });
        }

        // Handle Emirates ID Back
        if (files?.[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-back/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'emiratesIdBack', document: document });
        }

        // Handle Ejari
        if (files?.[TRANSITION_DOCUMENT_TYPES.EJARI]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.EJARI][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/ejari/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.EJARI,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'ejari', document: document });
        }

        // Handle Unit Permit
        if (files?.[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/unit-permit/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'unitPermit', document: document });
        }

        // Handle Company Trade License
        if (files?.[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/company-trade-license/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'companyTradeLicense', document: document });
        }

        // Handle Title Deed
        if (files?.[TRANSITION_DOCUMENT_TYPES.TITLE_DEED]?.length) {
          const file = files[TRANSITION_DOCUMENT_TYPES.TITLE_DEED][0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/title-deed/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.TITLE_DEED,
            createdBy: user?.id,
            updatedBy: user?.id,
          });
          
          await qr.manager.save(document);
          uploadedDocuments.push({ type: 'titleDeed', document: document });
        }

        // Handle Other documents
        if (files?.[TRANSITION_DOCUMENT_TYPES.OTHER]?.length) {
          for (const file of files[TRANSITION_DOCUMENT_TYPES.OTHER]) {
            const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/other/`, user?.id);
            
            const document = qr.manager.create(MoveInRequestDocuments, {
              moveInRequest: { id: requestId } as any,
              user: { id: user?.id } as any,
              file: uploadedFile,
              documentType: TRANSITION_DOCUMENT_TYPES.OTHER,
              createdBy: user?.id,
              updatedBy: user?.id,
            });
            
            await qr.manager.save(document);
            uploadedDocuments.push({ type: 'other', document: document });
          }
        }

        // Log the document upload action
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: { id: requestId } as any,
          action: 'DOCUMENTS_UPLOADED',
          actionBy: user?.id,
          actionByType: 'ADMIN',
          comments: `Documents uploaded by admin: ${uploadedDocuments.map(d => d.type).join(', ')}`,
          createdBy: user?.id,
          updatedBy: user?.id,
        });
        
        await qr.manager.save(log);
      });

      return {
        success: true,
        message: 'Documents uploaded successfully',
        uploadedDocuments,
        requestId,
      };
    } catch (error) {
      logger.error(`Error in uploadDocuments Admin: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async getAllMoveInRequestList(query: any) {
    try {
      const { page = 1, per_page = 20 } = query;
      const skip = (page - 1) * per_page;
      const getMoveInRequestList = await MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .where("mv.isActive= true", {});
      const count = await getMoveInRequestList.getCount();
      const data = await getMoveInRequestList.offset(skip).limit(per_page).getMany();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data, pagination };
    } catch (error) {
      logger.error(`Error in MoveInRequestList : ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
    }
  }

  async getAdminMoveIn(query: any, user: any) {
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
      } = query;

      masterCommunityIds = masterCommunityIds.split(",").filter((e: any) => e);
      communityIds = communityIds.split(",").filter((e: any) => e);
      towerIds = towerIds.split(",").filter((e: any) => e);

      let whereClause = "am.isActive = true";

      if (masterCommunityIds && masterCommunityIds.length)
        whereClause += ` AND am.masterCommunity IN (:...masterCommunityIds)`;

      if (communityIds && communityIds.length)
        whereClause += ` AND am.community IN (:...communityIds)`;

      if (towerIds && towerIds.length)
        whereClause += ` AND am.tower IN (:...towerIds)`;

      if (createdStartDate) whereClause += ` AND am.createdAt >= :createdStartDate`;

      if (createdEndDate) whereClause += ` AND am.createdAt <= :createdEndDate`;

      if (moveInStartDate) whereClause += ` AND am.moveInDate >= :moveInStartDate`;

      if (moveInEndDate) whereClause += ` AND am.moveInDate <= :moveInEndDate`;

      let getMoveInList = MoveInRequests.getRepository()
        .createQueryBuilder("am")
        .select([
          "am.status",
          "am.createdAt",
          "am.moveInDate",
          "am.moveInRequestNo",
          "am.requestType",
        ])
        .where(whereClause, {
          masterCommunityIds,
          communityIds,
          towerIds,
          startDate: query.startDate,
          endDate: query.endDate,
        });

      getMoveInList.innerJoinAndSelect("am.unit", "u", "u.isActive=1");
      getMoveInList.innerJoinAndSelect("u.masterCommunity", "mc", "mc.isActive=1");
      getMoveInList.innerJoinAndSelect("u.community", "c", "c.isActive=1");
      getMoveInList.innerJoinAndSelect("u.tower", "t", "t.isActive=1");

      getMoveInList.where(whereClause, { masterCommunityIds, communityIds, towerIds });

      getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, query.user);

      if (isSecurity) {
        getMoveInList.andWhere("am.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
      }
      getMoveInList.offset((page - 1) * per_page).limit(per_page);

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

  async getMoveInRequestById(requestId: number, user: any) {
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
}

