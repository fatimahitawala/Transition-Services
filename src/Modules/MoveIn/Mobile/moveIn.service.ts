import httpStatus from "http-status";
import ApiError from "../../../Common/Utils/ApiError";
import { APICodes } from "../../../Common/Constants";
import { MoveInRequests } from "../../../Entities/MoveInRequests.entity";
import { getPaginationInfo } from "../../../Common/Utils/paginationUtils";
import { Units } from "../../../Entities/Units.entity";
import { executeInTransaction } from "../../../Common/Utils/transactionUtil";
import {
  MOVE_IN_AND_OUT_REQUEST_STATUS,
  MOVE_IN_USER_TYPES,
  TransitionRequestActionByTypes,
} from "../../../Entities/EntityTypes";
import { MoveInRequestDetailsTenant } from "../../../Entities/MoveInRequestDetailsTenant.entity";
import { MoveInRequestDetailsOwner } from "../../../Entities/MoveInRequestDetailsOwner.entity";
import { MoveInRequestDetailsHhoOwner } from "../../../Entities/MoveInRequestDetailsHhoOwner.entity";
import { MoveInRequestDetailsHhcCompany } from "../../../Entities/MoveInRequestDetailsHhcCompany.entity";
import { MoveInRequestLogs } from "../../../Entities/MoveInRequestLogs.entity";
import { logger } from "../../../Common/Utils/logger";
import { stringToBoolean } from "../../../Common/Utils/common-utility";
import { MoveInRequestDocuments } from "../../../Entities/MoveInRequestDocuments.entity";
import { TRANSITION_DOCUMENT_TYPES } from "../../../Entities/EntityTypes";
import { uploadFile } from "../../../Common/Utils/azureBlobStorage";
import config from "../../../Common/Config/config";

export class MoveInService {
  // Removed old generic placeholder createMoveInRequest

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
        peopleOfDetermination: details.peopleOfDetermination,
        // Store detailsText in determination_text field when peopleOfDetermination is true
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
        comments: rest.comments || null,
      };

      logger.debug(`Owner Details mapped: ${JSON.stringify(ownerDetails)}`);
      return this.createMoveIn({ ...rest, details: ownerDetails, requestType: MOVE_IN_USER_TYPES.OWNER }, user);
    } catch (error) {
      logger.error(`Error in createOwnerMoveIn Mobile: ${JSON.stringify(error)}`);
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
        
        // Store detailsText in determination_text field when peopleOfDetermination is true
        determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
        comments: rest.comments || null,
      };

      logger.debug(`Tenant Details mapped: ${JSON.stringify(tenantDetails)}`);
      return this.createMoveIn({ ...rest, details: tenantDetails, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
    } catch (error) {
      logger.error(`Error in createTenantMoveIn Mobile: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async createHhoOwnerMoveIn(data: any, user: any) {
    // Map HHO Owner UI fields to details - owner details come from root level
    const { details = {}, ...rest } = data || {};
    const hhoDetails = {
      // Required owner identity fields from root level (required by validation)
      ownerFirstName: rest.ownerFirstName,
      ownerLastName: rest.ownerLastName,
      email: rest.email,
      dialCode: rest.dialCode,
      phoneNumber: rest.phoneNumber,
      nationality: rest.nationality,

      // Permit fields coming from the mobile UI payload
      unitPermitNumber: details.unitPermitNumber,
      unitPermitStartDate: details.unitPermitStartDate,
      unitPermitExpiryDate: details.unitPermitExpiryDate,

      // Determination details
      peopleOfDetermination: details.peopleOfDetermination,
      determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
      termsAccepted: details.termsAccepted,
      
      // Optional comment
      comments: rest.comments || null,
    };

    return this.createMoveIn({ ...rest, details: hhoDetails, requestType: MOVE_IN_USER_TYPES.HHO_OWNER }, user);
  }

  async createHhcCompanyMoveIn(data: any, user: any) {
    // Map determination details for HHC Company
    const { details = {}, ...rest } = data || {};
    const hhcDetails = {
      // Determination details (must be set before spread operator)
      peopleOfDetermination: details.peopleOfDetermination,
      determination_text: details.peopleOfDetermination && details.detailsText ? details.detailsText : null,
      termsAccepted: details.termsAccepted,
      // Spread other details after setting determination fields
      ...details,
    };
    
    return this.createMoveIn({ ...rest, details: hhcDetails, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
  }



  // ============ UPDATE METHODS ============
  async updateOwnerMoveIn(requestId: number, data: any, user: any) {
    return this.updateMoveIn(requestId, { ...data, requestType: MOVE_IN_USER_TYPES.OWNER }, user);
  }

  async updateTenantMoveIn(requestId: number, data: any, user: any) {
    return this.updateMoveIn(requestId, { ...data, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
  }

  async updateHhoOwnerMoveIn(requestId: number, data: any, user: any) {
    return this.updateMoveIn(requestId, { ...data, requestType: MOVE_IN_USER_TYPES.HHO_OWNER }, user);
  }

  async updateHhcCompanyMoveIn(requestId: number, data: any, user: any) {
    return this.updateMoveIn(requestId, { ...data, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
  }



  async uploadHhcCompanyDocuments(requestId: number, files: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Emirates ID Front
        if (files?.emiratesIdFront?.[0]) {
          const file = files.emiratesIdFront[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-front/`, user?.id);

          if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
            throw new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR,
              APICodes.FILE_UPLOAD_ERROR.message,
              APICodes.FILE_UPLOAD_ERROR.code
            );
          }

          const document = new MoveInRequestDocuments();
          document.documentType = TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT;
          document.user = { id: user?.id } as any;
          document.moveInRequest = { id: requestId } as any;
          document.file = { id: (uploadedFile as any).id } as any;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;
          document.isActive = true;

          const savedDoc = await document.save();
          uploadedDocuments.push({ type: 'emiratesIdFront', document: savedDoc });
        }

        // Handle Emirates ID Back
        if (files?.emiratesIdBack?.[0]) {
          const file = files.emiratesIdBack[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-back/`, user?.id);

          if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
          }

          const document = new MoveInRequestDocuments();
          document.documentType = TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK;
          document.user = { id: user?.id } as any;
          document.moveInRequest = { id: requestId } as any;
          document.file = { id: (uploadedFile as any).id } as any;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;
          document.isActive = true;

          const savedDoc = await document.save();
          uploadedDocuments.push({ type: 'emiratesIdBack', document: savedDoc });
        }

        // Handle Company Trade License
        if (files?.companyTradeLicense?.[0]) {
          const file = files.companyTradeLicense[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/company-trade-license/`, user?.id);

          if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
          }

          const document = new MoveInRequestDocuments();
          document.documentType = TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE;
          document.user = { id: user?.id } as any;
          document.moveInRequest = { id: requestId } as any;
          document.file = { id: (uploadedFile as any).id } as any;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;
          document.isActive = true;

          const savedDoc = await document.save();
          uploadedDocuments.push({ type: 'companyTradeLicense', document: savedDoc });
        }

        // Handle Unit Permit
        if (files?.unitPermit?.[0]) {
          const file = files.unitPermit[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/unit-permit/`, user?.id);

          if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
            throw new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR,
              APICodes.FILE_UPLOAD_ERROR.message,
              APICodes.FILE_UPLOAD_ERROR.code
            );
          }

          const document = new MoveInRequestDocuments();
          document.documentType = TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT;
          document.user = { id: user?.id } as any;
          document.moveInRequest = { id: requestId } as any;
          document.file = { id: (uploadedFile as any).id } as any;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;
          document.isActive = true;

          const savedDoc = await document.save();
          uploadedDocuments.push({ type: 'unitPermit', document: savedDoc });
        }

        // Create log entry
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.requestType = moveInRequest.requestType;
        log.status = moveInRequest.status;
        log.changes = `Documents uploaded: ${uploadedDocuments.map(d => d.type).join(', ')}`;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = JSON.stringify(uploadedDocuments);
        log.comments = `Documents uploaded for move-in request ${requestId}`;

        await log.save();
      });

      logger.info(`DOCUMENTS UPLOADED: ${uploadedDocuments.length} documents for move-in request ${requestId} by user ${user?.id}`);

      return {
        requestId,
        uploadedDocuments: uploadedDocuments.length,
        documents: uploadedDocuments.map(d => ({
          type: d.type,
          documentId: d.document.id,
          fileName: d.document.file?.fileOriginalName
        }))
      };
    } catch (error: any) {
      logger.error(`Error in uploadHhcCompanyDocuments: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  // Single comprehensive document upload method (following AmenityRegistration pattern)
  async uploadDocuments(requestId: number, files: any, body: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      // Check if this is a Tenant Move-In request and enforce document restrictions
      const isTenantMoveIn = moveInRequest.requestType === 'tenant';
      const isHhcCompanyMoveIn = moveInRequest.requestType === 'hho_company';

      if (isTenantMoveIn) {
        // For Tenant Move-In, only allow the 3 required documents
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
          TRANSITION_DOCUMENT_TYPES.EJARI
        ];

        // Check if any non-allowed documents are being uploaded
        const uploadedDocumentTypes = Object.keys(files || {}).filter(key =>
          files[key] && files[key].length > 0
        );

        const invalidDocumentTypes = uploadedDocumentTypes.filter(docType =>
          !allowedDocumentTypes.includes(docType as TRANSITION_DOCUMENT_TYPES)
        );

        if (invalidDocumentTypes.length > 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.INVALID_DOCUMENT_TYPES_FOR_TENANT.message,
            APICodes.INVALID_DOCUMENT_TYPES_FOR_TENANT.code
          );
        }

        // Check if any non-allowed document IDs are being linked
        const linkedDocumentTypes = Object.keys(body || {}).filter(key =>
          key.endsWith('-file') && body[key] !== undefined && body[key] !== '' && body[key] !== '0'
        ).map(key => key.replace('-file', ''));

        const invalidLinkedTypes = linkedDocumentTypes.filter(docType =>
          !allowedDocumentTypes.includes(docType as TRANSITION_DOCUMENT_TYPES)
        );

        if (invalidLinkedTypes.length > 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            APICodes.INVALID_LINKED_DOCUMENT_TYPES_FOR_TENANT.message,
            APICodes.INVALID_LINKED_DOCUMENT_TYPES_FOR_TENANT.code
          );
        }
      }

      if (isHhcCompanyMoveIn) {
        // For HHC Company Move-In, only allow the 4 required documents
        const allowedDocumentTypes = [
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
          TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
          TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE,
          TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT
        ];

        // Check if any non-allowed documents are being uploaded
        const uploadedDocumentTypes = Object.keys(files || {}).filter(key =>
          files[key] && files[key].length > 0
        );

        const invalidDocumentTypes = uploadedDocumentTypes.filter(docType =>
          !allowedDocumentTypes.includes(docType as TRANSITION_DOCUMENT_TYPES)
        );

        if (invalidDocumentTypes.length > 0) {
          throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DOCUMENT_TYPES_FOR_HHC_COMPANY.message, APICodes.INVALID_DOCUMENT_TYPES_FOR_HHC_COMPANY.code);
        }

        // Check if any non-allowed document IDs are being linked
        const linkedDocumentTypes = Object.keys(body || {}).filter(key =>
          key.endsWith('-file') && body[key] !== undefined && body[key] !== '' && body[key] !== '0'
        ).map(key => key.replace('-file', ''));

        const invalidLinkedTypes = linkedDocumentTypes.filter(docType =>
          !allowedDocumentTypes.includes(docType as TRANSITION_DOCUMENT_TYPES)
        );

        if (invalidLinkedTypes.length > 0) {
          throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_LINKED_DOCUMENT_TYPES_FOR_HHC_COMPANY.message, APICodes.INVALID_LINKED_DOCUMENT_TYPES_FOR_HHC_COMPANY.code);
        }
      }

      // Track uploaded documents for logging
      const uploadedDocuments: Array<{ type: string; documentType: string }> = [];

      // Handle Emirates ID Front (Required for Tenant)
      if (body?.[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`] !== '') {
        await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT}-file`], TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT, requestId, user?.id);
        uploadedDocuments.push({ type: 'emiratesIdFront', documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT });
      } else if (files?.[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT]?.length) {
        const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT][0].originalname, files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT][0], `move-in/${requestId}/emirates-id-front/`, user?.id);
        await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT, requestId, user?.id);
        uploadedDocuments.push({ type: 'emiratesIdFront', documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT });
      }

      // Handle Emirates ID Back (Required for Tenant)
      if (body?.[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`] !== '') {
        await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK}-file`], TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK, requestId, user?.id);
        uploadedDocuments.push({ type: 'emiratesIdBack', documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK });
      } else if (files?.[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK]?.length) {
        const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK][0].originalname, files[TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK][0], `move-in/${requestId}/emirates-id-back/`, user?.id);
        await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK, requestId, user?.id);
        uploadedDocuments.push({ type: 'emiratesIdBack', documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK });
      }

      // Handle Ejari (Required for Tenant)
      if (body?.[`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`] !== '') {
        await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.EJARI}-file`], TRANSITION_DOCUMENT_TYPES.EJARI, requestId, user?.id);
        uploadedDocuments.push({ type: 'ejari', documentType: TRANSITION_DOCUMENT_TYPES.EJARI });
      } else if (files?.[TRANSITION_DOCUMENT_TYPES.EJARI]?.length) {
        const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.EJARI][0].originalname, files[TRANSITION_DOCUMENT_TYPES.EJARI][0], `move-in/${requestId}/ejari/`, user?.id);
        await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.EJARI, requestId, user?.id);
        uploadedDocuments.push({ type: 'ejari', documentType: TRANSITION_DOCUMENT_TYPES.EJARI });
      }

      // Handle Unit Permit (Required for HHC Company, Optional for Owner/HHO Owner)
      if ((isHhcCompanyMoveIn || (!isTenantMoveIn && !isHhcCompanyMoveIn)) && (body?.[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`] || files?.[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT]?.length)) {
        if (body?.[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`] !== '') {
          await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT}-file`], TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT, requestId, user?.id);
          uploadedDocuments.push({ type: 'unitPermit', documentType: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT });
        } else if (files?.[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT]?.length) {
          const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT][0].originalname, files[TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT][0], `move-in/${requestId}/unit-permit/`, user?.id);
          await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT, requestId, user?.id);
          uploadedDocuments.push({ type: 'unitPermit', documentType: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT });
        }
      }

      // Handle Company Trade License (Required for HHC Company, Optional for Owner/HHO Owner)
      if ((isHhcCompanyMoveIn || (!isTenantMoveIn && !isHhcCompanyMoveIn)) && (body?.[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`] || files?.[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE]?.length)) {
        if (body?.[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`] !== '') {
          await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE}-file`], TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE, requestId, user?.id);
          uploadedDocuments.push({ type: 'companyTradeLicense', documentType: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE });
        } else if (files?.[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE]?.length) {
          const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE][0].originalname, files[TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE][0], `move-in/${requestId}/company-trade-license/`, user?.id);
          await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE, requestId, user?.id);
          uploadedDocuments.push({ type: 'companyTradeLicense', documentType: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE });
        }
      }

      // Handle Title Deed (Optional for Owner/HHO Owner, not for Tenant or HHC Company)
      if (!isTenantMoveIn && !isHhcCompanyMoveIn && (body?.[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`] || files?.[TRANSITION_DOCUMENT_TYPES.TITLE_DEED]?.length)) {
        if (body?.[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`] !== '') {
          await this.updateMoveInRequestDocuments(body[`${TRANSITION_DOCUMENT_TYPES.TITLE_DEED}-file`], TRANSITION_DOCUMENT_TYPES.TITLE_DEED, requestId, user?.id);
          uploadedDocuments.push({ type: 'titleDeed', documentType: TRANSITION_DOCUMENT_TYPES.TITLE_DEED });
        } else if (files?.[TRANSITION_DOCUMENT_TYPES.TITLE_DEED]?.length) {
          const uploadedFile: any = await uploadFile(files[TRANSITION_DOCUMENT_TYPES.TITLE_DEED][0].originalname, files[TRANSITION_DOCUMENT_TYPES.TITLE_DEED][0], `move-in/${requestId}/title-deed/`, user?.id);
          await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.TITLE_DEED, requestId, user?.id);
          uploadedDocuments.push({ type: 'titleDeed', documentType: TRANSITION_DOCUMENT_TYPES.TITLE_DEED });
        }
      }

      // Handle Other Documents (Optional for Owner/HHO Owner, not for Tenant or HHC Company)
      if (!isTenantMoveIn && !isHhcCompanyMoveIn && (body?.[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] || files?.[TRANSITION_DOCUMENT_TYPES.OTHER]?.length)) {
        if (body?.[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] && body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] !== '0' && body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] !== 0 && body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] !== '') {
          const otherIds = Array.isArray(body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`]) ?
            body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`] :
            [body[`${TRANSITION_DOCUMENT_TYPES.OTHER}-file`]];

          for (const id of otherIds) {
            await this.updateMoveInRequestDocuments(id, TRANSITION_DOCUMENT_TYPES.OTHER, requestId, user?.id);
            uploadedDocuments.push({ type: 'other', documentType: TRANSITION_DOCUMENT_TYPES.OTHER });
          }
        } else if (files?.[TRANSITION_DOCUMENT_TYPES.OTHER]?.length) {
          for (const file of files[TRANSITION_DOCUMENT_TYPES.OTHER]) {
            const uploadedFile: any = await uploadFile(file.originalname, file, `move-in/${requestId}/other-documents/`, user?.id);
            await this.updateMoveInRequestDocuments(uploadedFile.id, TRANSITION_DOCUMENT_TYPES.OTHER, requestId, user?.id);
            uploadedDocuments.push({ type: 'other', documentType: TRANSITION_DOCUMENT_TYPES.OTHER });
          }
        }
      }

      // Create log entry in move_in_request_logs table
      if (uploadedDocuments.length > 0) {
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.requestType = moveInRequest.requestType;
        log.status = moveInRequest.status;
        log.changes = `Documents uploaded: ${uploadedDocuments.map(d => d.type).join(', ')}`;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = JSON.stringify(uploadedDocuments);
        log.comments = `Documents uploaded for move-in request ${requestId}`;

        await log.save();
      }

      logger.info(`DOCUMENTS UPLOADED: ${uploadedDocuments.length} documents for move-in request ${requestId} by user ${user?.id}`);

      return {
        requestId,
        message: "Documents uploaded successfully",
        uploadedDocuments: uploadedDocuments.length,
        documents: uploadedDocuments.map(d => d.type)
      };
    } catch (error: any) {
      logger.error(`Error in uploadDocuments: ${JSON.stringify(error)}`);

      // If it's already an ApiError, re-throw it directly
      if (error instanceof ApiError) {
        throw error;
      }

      // For other errors, convert to generic error
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  // Helper method to update move-in request documents (following AmenityRegistration pattern)
  private async updateMoveInRequestDocuments(fileId: number, documentType: string, requestId: number, userId: number) {
    const document = new MoveInRequestDocuments();
    document.documentType = documentType;
    document.user = { id: userId } as any;
    document.moveInRequest = { id: requestId } as any;
    document.file = { id: fileId } as any;
    document.createdBy = userId;
    document.updatedBy = userId;
    document.isActive = true;

    return await MoveInRequestDocuments.save(document);
  }



  async uploadOtherDocuments(requestId: number, files: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Other Documents (up to 4 files)
        if (files?.otherDocuments && Array.isArray(files.otherDocuments)) {
          for (let i = 0; i < files.otherDocuments.length; i++) {
            const file = files.otherDocuments[i];
            const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/other-documents/`, user?.id);

            if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                APICodes.FILE_UPLOAD_ERROR.message,
                APICodes.FILE_UPLOAD_ERROR.code
              );
            }

            const document = new MoveInRequestDocuments();
            document.documentType = TRANSITION_DOCUMENT_TYPES.OTHER;
            document.user = { id: user?.id } as any;
            document.moveInRequest = { id: requestId } as any;
            document.file = { id: (uploadedFile as any).id } as any;
            document.createdBy = user?.id;
            document.updatedBy = user?.id;
            document.isActive = true;

            const savedDoc = await document.save();
            uploadedDocuments.push({ type: `otherDocument${i + 1}`, document: savedDoc });
          }
        }

        // Create log entry
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.requestType = moveInRequest.requestType;
        log.status = moveInRequest.status;
        log.changes = `Other documents uploaded: ${uploadedDocuments.length} files`;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = JSON.stringify(uploadedDocuments);
        log.comments = `Other documents uploaded for move-in request ${requestId}`;

        await log.save();
      });

      logger.info(`OTHER DOCUMENTS UPLOADED: ${uploadedDocuments.length} documents for move-in request ${requestId} by user ${user?.id}`);

      return {
        requestId,
        uploadedDocuments: uploadedDocuments.length,
        documents: uploadedDocuments.map(d => ({
          type: d.type,
          documentId: d.document.id,
          fileName: d.document.file?.fileOriginalName
        }))
      };
    } catch (error: any) {
      logger.error(`Error in uploadOtherDocuments: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  async uploadTitleDeedDocuments(requestId: number, files: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Title Deed
        if (files?.titleDeed?.[0]) {
          const file = files.titleDeed[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/title-deed/`, user?.id);

          if (!uploadedFile || typeof uploadedFile === 'object' && 'status' in uploadedFile && !uploadedFile.status) {
            throw new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR,
              APICodes.FILE_UPLOAD_ERROR.message,
              APICodes.FILE_UPLOAD_ERROR.code
            );
          }

          const document = new MoveInRequestDocuments();
          document.documentType = TRANSITION_DOCUMENT_TYPES.TITLE_DEED;
          document.user = { id: user?.id } as any;
          document.moveInRequest = { id: requestId } as any;
          document.file = { id: (uploadedFile as any).id } as any;
          document.createdBy = user?.id;
          document.updatedBy = user?.id;
          document.isActive = true;

          const savedDoc = await document.save();
          uploadedDocuments.push({ type: 'titleDeed', document: savedDoc });
        }

        // Create log entry
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.requestType = moveInRequest.requestType;
        log.status = moveInRequest.status;
        log.changes = `Title deed document uploaded`;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = JSON.stringify(uploadedDocuments);
        log.comments = `Title deed document uploaded for move-in request ${requestId}`;

        await log.save();
      });

      logger.info(`TITLE DEED DOCUMENT UPLOADED: for move-in request ${requestId} by user ${user?.id}`);

      return {
        requestId,
        uploadedDocuments: uploadedDocuments.length,
        documents: uploadedDocuments.map(d => ({
          type: d.type,
          documentId: d.document.id,
          fileName: d.document.file?.fileOriginalName
        }))
      };
    } catch (error: any) {
      logger.error(`Error in uploadTitleDeedDocuments: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }



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
        userEmail,
        middleName,
        mobileNumber,
        name,
        company,
        companyEmail,
        countryCode,
        operatorOfficeNumber,
        tradeLicenseNumber,
        tradeLicenseExpiryDate,
        unitPermitStartDate,
        unitPermitExpiryDate,
        unitPermitNumber,
        leaseStartDate,
        leaseEndDate,
        dtcmStartDate,
        dtcmExpiryDate,
        nationality,
      } = data;

      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
      }

      if (!unitId) {
        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
      }

      if (!Object.values(MOVE_IN_USER_TYPES).includes(requestType)) {
        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
      }

      const unit = await this.getUnitById(Number(unitId));
      if (!unit) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.UNIT_NOT_FOUND.message, APICodes.UNIT_NOT_FOUND.code);
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
        master.moveInDate = moveInDate ? new Date(moveInDate) : null as any;
        master.comments = comments || null as any;
        master.additionalInfo = additionalInfo || null as any;
        master.createdBy = user?.id;
        master.updatedBy = user?.id;
        master.isActive = true;

        const savedMaster = await master.save();

        // Update request number to final format MIN-<unitNumber>-<id>
        const finalRequestNumber = `MIN-${unit?.unitNumber}-${savedMaster.id}`;
        await MoveInRequests.update({ id: savedMaster.id }, { moveInRequestNo: finalRequestNumber });
        savedMaster.moveInRequestNo = finalRequestNumber as any;
        createdMaster = savedMaster;

        // Create detail record based on request type
        const detailsData = {
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
          userEmail,
          middleName,
          mobileNumber,
          name,
          company,
          companyEmail,
          countryCode,
          operatorOfficeNumber,
          tradeLicenseNumber,
          tradeLicenseExpiryDate,
          unitPermitStartDate: details.unitPermitStartDate || unitPermitStartDate,
          unitPermitExpiryDate: details.unitPermitExpiryDate || unitPermitExpiryDate,
          unitPermitNumber: details.unitPermitNumber || unitPermitNumber,
          leaseStartDate: details.leaseStartDate || leaseStartDate,
          leaseEndDate: details.leaseEndDate || leaseEndDate,
          dtcmStartDate,
          dtcmExpiryDate,
        };
        createdDetails = await this.createDetailsRecord(qr, requestType, createdMaster as MoveInRequests, detailsData, user?.id);

        // Create initial log
        const log = new MoveInRequestLogs();
        log.moveInRequest = createdMaster as MoveInRequests;
        log.requestType = requestType;
        log.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
        log.changes = null as any;
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = details ? JSON.stringify(details) : null as any;
        log.comments = comments || null as any;

        await log.save();
      });

      logger.info(`MOVE-IN CREATED: ${createdMaster?.moveInRequestNo} for unit ${unitId} by user ${user?.id}`);

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
      logger.error(`Error in createMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  private async ensureEditableByOwner(requestId: number, user: any) {
    const mir = await MoveInRequests.getRepository()
      .createQueryBuilder('mir')
      .leftJoinAndSelect('mir.user', 'user')
      .where('mir.id = :requestId AND mir.isActive = true', { requestId })
      .getOne();
    if (!mir) {
      throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
    }
    if (mir.user?.id !== user?.id) {
      throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
    }
    if (mir.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN && mir.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_PENDING && mir.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.RFI_SUBMITTED) {
      throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANNOT_UPDATE_MOBILE_STATUS.message, APICodes.CANNOT_UPDATE_MOBILE_STATUS.code);
    }
    return mir;
  }

  private async updateMoveIn(requestId: number, data: any, user: any) {
    try {
      const existing = await this.ensureEditableByOwner(requestId, user);

      const {
        unitId,
        requestType,
        moveInDate,
        status,
        comments,
        additionalInfo,
        details,
        // Owner fields for HHO Owner
        ownerFirstName,
        ownerLastName,
        firstName,
        lastName,
        email,
        dialCode,
        phoneNumber,
        emiratesIdNumber,
        emiratesIdExpiryDate,
        tenancyContractStartDate,
        tenancyContractEndDate,
        name,
        company,
        companyEmail,
        countryCode,
        operatorCountryCode,
        operatorOfficeNumber,
        tradeLicenseNumber,
        tradeLicenseExpiryDate,
        unitPermitStartDate,
        unitPermitExpiryDate,
        unitPermitNumber,
        leaseStartDate,
        leaseEndDate,
        dtcmStartDate,
        dtcmExpiryDate,
        nationality,
      } = data;

      await executeInTransaction(async (qr: any) => {
        // Update master
        await MoveInRequests.update({ id: requestId }, {
          unit: unitId ? ({ id: unitId } as any) : (undefined as any),
          moveInDate: moveInDate ? new Date(moveInDate) : (undefined as any),
          status: status || (undefined as any),
          comments: comments ?? (undefined as any),
          additionalInfo: additionalInfo ?? (undefined as any),
          updatedBy: user?.id,
        } as any);

        // Update details by type
        switch (requestType) {
          case MOVE_IN_USER_TYPES.TENANT: {
            await MoveInRequestDetailsTenant.getRepository()
              .createQueryBuilder()
              .update()
              .set({
                firstName,
                lastName,
                email,
                dialCode,
                phoneNumber,
                nationality,
                adults: details?.adults,
                children: details?.children,
                householdStaffs: details?.householdStaffs,
                pets: details?.pets,
                peopleOfDetermination: details?.peopleOfDetermination,
                determination_text: details?.peopleOfDetermination && details?.detailsText ? details.detailsText : null,
                emiratesIdNumber,
                emiratesIdExpiryDate,
                tenancyContractStartDate,
                tenancyContractEndDate,
                updatedBy: user?.id,
              })
              .where('move_in_request_id = :requestId', { requestId })
              .execute();
            break;
          }
          case MOVE_IN_USER_TYPES.OWNER: {
            await MoveInRequestDetailsOwner.getRepository()
              .createQueryBuilder()
              .update()
              .set({
                adults: details?.adults,
                children: details?.children,
                householdStaffs: details?.householdStaffs,
                pets: details?.pets,
                peopleOfDetermination: details?.peopleOfDetermination,
                determination_text: details?.peopleOfDetermination && details?.detailsText ? details.detailsText : null,
                comments: comments ?? null,
                updatedBy: user?.id,
              })
              .where('move_in_request_id = :requestId', { requestId })
              .execute();
            break;
          }
          case MOVE_IN_USER_TYPES.HHO_OWNER: {
            await MoveInRequestDetailsHhoOwner.getRepository()
              .createQueryBuilder()
              .update()
              .set({
                ownerFirstName: ownerFirstName || undefined,
                ownerLastName: ownerLastName || undefined,
                email: email || undefined,
                dialCode: dialCode || undefined,
                phoneNumber: phoneNumber || undefined,
                nationality: nationality || undefined,
                unitPermitNumber: details?.unitPermitNumber,
                unitPermitStartDate: details?.unitPermitStartDate,
                unitPermitExpiryDate: details?.unitPermitExpiryDate,
                peopleOfDetermination: details?.peopleOfDetermination,
                determination_text: details?.peopleOfDetermination && details?.detailsText ? details.detailsText : null,
                comments: comments ?? null,
                updatedBy: user?.id,
              })
              .where('move_in_request_id = :requestId', { requestId })
              .execute();
            break;
          }
          case MOVE_IN_USER_TYPES.HHO_COMPANY: {
            await MoveInRequestDetailsHhcCompany.getRepository()
              .createQueryBuilder()
              .update()
              .set({
                name,
                companyName: company,
                companyEmail,
                countryCode,
                operatorCountryCode,
                operatorOfficeNumber,
                tradeLicenseNumber,
                tradeLicenseExpiryDate,
                tenancyContractStartDate: tenancyContractStartDate || null,
                unitPermitStartDate,
                unitPermitExpiryDate,
                unitPermitNumber,
                leaseStartDate,
                leaseEndDate,
                dtcmStartDate: dtcmStartDate || null,
                dtcmExpiryDate: dtcmExpiryDate || null,
                nationality,
                emiratesIdNumber,
                emiratesIdExpiryDate,
                peopleOfDetermination: details?.peopleOfDetermination,
                determination_text: details?.peopleOfDetermination && details?.detailsText ? details.detailsText : null,
                updatedBy: user?.id,
              })
              .where('move_in_request_id = :requestId', { requestId })
              .execute();
            break;
          }
        }

        // Log update
        const log = new MoveInRequestLogs();
        log.moveInRequest = { id: requestId } as any;
        log.requestType = existing.requestType;
        log.status = existing.status;
        log.changes = 'Request updated';
        log.user = { id: user?.id } as any;
        log.actionBy = TransitionRequestActionByTypes.USER;
        log.details = JSON.stringify({ data });
        log.comments = comments || null as any;
        await log.save();
      });

      const updated = await MoveInRequests.findOne({ where: { id: requestId } });
      return {
        id: updated?.id,
        moveInRequestNo: updated?.moveInRequestNo,
        status: updated?.status,
        requestType: updated?.requestType,
        moveInDate: updated?.moveInDate,
      };
    } catch (error: any) {
      logger.error(`Error in updateMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
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
      const data = await getMoveInRequestList
        .offset(skip)
        .limit(per_page)
        .getMany();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data, pagination };
    } catch (error: any) {
      logger.error(`Error in getMobileMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  async getMobileMoveIn(query: any) {

    try {
      let {
        page = 1,
        per_page = 20,
        status = "",
        unitIds = "",
        requestId = "",
      } = query;

      // Debug logging
      logger.debug(`getMobileMoveIn query params: ${JSON.stringify(query)}`);
      unitIds = unitIds.split(",").filter((e: any) => e);
      let whereClause = "am.isActive = true";

      if (status) whereClause += ` AND am.status = :status`;
      // Use unitIds for filtering by unit IDs
      if (unitIds && unitIds.length) {
        whereClause += ` AND am.unit IN (:...units)`;
      }
      // Filter by requestId
      if (requestId) {
        whereClause += ` AND am.id = :requestId`;
      }

      let getMoveInList = MoveInRequests.getRepository()
        .createQueryBuilder("am")
        .leftJoinAndSelect("am.unit", "u")
        .leftJoinAndSelect("u.masterCommunity", "mc")
        .leftJoinAndSelect("u.community", "c")
        .leftJoinAndSelect("u.tower", "t")
        .addSelect("am.createdAt")
        .addSelect("am.updatedAt")
        .addSelect("am.createdBy")
        .addSelect("am.updatedBy")
        .where(whereClause, {
          status,
          units: unitIds.map((x: any) => Number(x)).filter((n: any) => !isNaN(n)),
          requestId: requestId ? Number(requestId) : undefined,
        });

      getMoveInList.orderBy("am.createdAt", "DESC")
        .offset((page - 1) * per_page)
        .limit(per_page);

      // Debug logging
      logger.debug(`Final query: ${getMoveInList.getQuery()}`);
      logger.debug(`Query parameters: ${JSON.stringify(getMoveInList.getParameters())}`);

      const list = await getMoveInList.getMany();
      logger.debug(`Query executed successfully, found ${list.length} records`);
      logger.debug(`First item raw data: ${JSON.stringify(list[0] || {})}`);
      
      // Transform the response to include unit data
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
      
      const count = await getMoveInList.getCount();
      logger.debug(`Total count: ${count}`);
      
      const pagination = getPaginationInfo(page, per_page, count);
      return { data: transformedList, pagination };
    } catch (error: any) {
      logger.error(`Error in getMobileMoveIn: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  async getUnitById(id: number): Promise<Units | null> {
    try {
      return await Units.getRepository()
        .createQueryBuilder("u")
        .leftJoinAndMapOne("u.tower", "u.tower", "t", "t.isActive = 1")
        .leftJoinAndMapOne("u.community", "u.community", "c", "c.isActive = 1")
        .leftJoinAndMapOne("u.masterCommunity", "u.masterCommunity", "mc", "mc.isActive = 1")
        .leftJoinAndMapOne("u.unitRestriction", "u.unitRestriction", "ut", "ut.isActive = 1")
        .where({ id }).getOne();
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
    }
  }

  private generateRequestNumber(unitNumber?: string | number): string {
    const suffix = `${Date.now()}`;
    return `MIN-${unitNumber ?? 'UNIT'}-${suffix}`;
  }

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

        return await entity.save();
      }
      case MOVE_IN_USER_TYPES.OWNER: {
        const entity = new MoveInRequestDetailsOwner();
        Object.assign(entity, details);
        entity.moveInRequest = master;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await entity.save();
      }
      case MOVE_IN_USER_TYPES.HHO_OWNER: {
        const entity = new MoveInRequestDetailsHhoOwner();
        
        // Explicitly set all required fields
        entity.ownerFirstName = details.ownerFirstName;
        entity.ownerLastName = details.ownerLastName;
        entity.email = details.email;
        entity.dialCode = details.dialCode;
        entity.phoneNumber = details.phoneNumber;
        entity.nationality = details.nationality;
        
        // Set permit fields
        entity.unitPermitNumber = details.unitPermitNumber;
        entity.unitPermitStartDate = details.unitPermitStartDate;
        entity.unitPermitExpiryDate = details.unitPermitExpiryDate;
        
        // Set determination fields
        entity.peopleOfDetermination = details.peopleOfDetermination;
        entity.determination_text = details.determination_text;
        
        // Set other fields
        entity.comments = details.comments;
        
        entity.moveInRequest = master;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await entity.save();
      }
      case MOVE_IN_USER_TYPES.HHO_COMPANY: {
        const entity = new MoveInRequestDetailsHhcCompany();
        entity.moveInRequest = master;
        entity.name = details.name;
        entity.companyName = details.company;
        entity.companyEmail = details.companyEmail;
        entity.countryCode = details.countryCode;
        entity.operatorCountryCode = details.operatorCountryCode;
        entity.operatorOfficeNumber = details.operatorOfficeNumber;
        entity.tradeLicenseNumber = details.tradeLicenseNumber;
        entity.tradeLicenseExpiryDate = details.tradeLicenseExpiryDate;
        entity.tenancyContractStartDate = details.tenancyContractStartDate || null;
        entity.unitPermitStartDate = details.unitPermitStartDate;
        entity.unitPermitExpiryDate = details.unitPermitExpiryDate;
        entity.unitPermitNumber = details.unitPermitNumber;
        entity.leaseStartDate = details.leaseStartDate;
        entity.leaseEndDate = details.leaseEndDate;
        entity.dtcmStartDate = details.dtcmStartDate || null;
        entity.dtcmExpiryDate = details.dtcmExpiryDate || null;
        entity.nationality = details.nationality;
        entity.emiratesIdNumber = details.emiratesIdNumber;
        entity.emiratesIdExpiryDate = details.emiratesIdExpiryDate;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.isActive = true;

        return await entity.save();
      }
      default:
        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
    }
  }

  /**
   * Cancel move-in request (Mobile)
   */
  async cancelMoveInRequest(requestId: number, data: any, user: any) {
    try {
      const { cancellationRemarks } = data;
      
      // Check if request exists and belongs to user
      const request = await this.ensureCancelableByOwner(requestId, user);
      
      // Prepare update data
      const updateData: any = {
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED,
        updatedBy: user?.id,
      };
      
      // Only update comments if cancellationRemarks is provided
      if (cancellationRemarks && cancellationRemarks.trim()) {
        updateData.comments = cancellationRemarks;
      }
      
      // Update the request status to user-cancelled
      await MoveInRequests.getRepository()
        .createQueryBuilder()
        .update()
        .set(updateData)
        .where('id = :requestId', { requestId })
        .execute();

      // Log the cancellation
      const log = new MoveInRequestLogs();
      log.moveInRequest = { id: requestId } as any;
      log.requestType = request.requestType;
      log.status = MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED;
      log.changes = 'Request cancelled by user';
      log.user = { id: user?.id } as any;
      log.actionBy = TransitionRequestActionByTypes.USER;
      log.details = JSON.stringify({ cancellationRemarks: cancellationRemarks || null });
      log.comments = cancellationRemarks || null;
      await log.save();

      // Send cancellation notifications
      await this.sendCancellationNotifications(requestId, request.moveInRequestNo, cancellationRemarks);

      return { 
        id: requestId, 
        moveInRequestNo: request.moveInRequestNo,
        status: MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED,
        message: 'Move-in request cancelled successfully' 
      };
    } catch (error: any) {
      logger.error(`Error in cancelMoveInRequest: ${JSON.stringify(error)}`);
      logger.error(`Error stack: ${error.stack}`);
      
      // If it's already an ApiError, re-throw it as is
      if (error instanceof ApiError) {
        throw error;
      }
      
      // If it's a database error or other known error, handle appropriately
      if (error.code === 'EC004' || error.message?.includes('Record Not found')) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
      }
      
      if (error.code === 'EC041' || error.message?.includes('Only requests in')) {
        throw new ApiError(httpStatus.BAD_REQUEST, error.message, APICodes.VALIDATION_ERROR.code);
      }
      
      // Otherwise, handle as unknown error
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }

  /**
   * Ensure request is cancelable by owner (check status validation)
   */
  private async ensureCancelableByOwner(requestId: number, user: any) {
    const mir = await MoveInRequests.getRepository()
      .createQueryBuilder('mir')
      .leftJoinAndSelect('mir.user', 'user')
      .where('mir.id = :requestId AND mir.isActive = true', { requestId })
      .getOne();
    
    if (!mir) {
      throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
    }
    
    if (mir.user?.id !== user?.id) {
      throw new ApiError(httpStatus.FORBIDDEN, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.message, APICodes.REQUEST_NOT_BELONG_TO_CURRENT_USER.code);
    }
    
    // Only requests in 'new' status can be cancelled by users
    if (mir.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN) {
      throw new ApiError(httpStatus.BAD_REQUEST, 
        APICodes.CANNOT_CANCEL_MOBILE_STATUS.message, 
        APICodes.CANNOT_CANCEL_MOBILE_STATUS.code);
    }
    
    return mir;
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

  async getMobileMoveInRequestDetails(requestId: number, user: any) {
    try {
      logger.debug(`getMobileMoveInRequestDetails - requestId: ${requestId}, userId: ${user?.id}`);

      // Get the main move-in request with basic details
      let query = MoveInRequests.getRepository()
        .createQueryBuilder("mv")
        .select([
          "mv.id",
          "mv.moveInRequestNo",
          "mv.requestType",
          "mv.status",
          "mv.moveInDate",
          "mv.comments",
          "mv.additionalInfo",
          "mv.createdAt",
          "mv.updatedAt",
          "u.id as unitId",
          "u.unitNumber",
          "u.floorNumber",
          "u.unitName",
          "mc.id as masterCommunityId",
          "mc.name as masterCommunityName",
          "c.id as communityId",
          "c.name as communityName",
          "t.id as towerId",
          "t.name as towerName",
          "user.id as userId",
          "user.firstName",
          "user.middleName",
          "user.lastName",
          "user.email",
          "user.mobile"
        ])
        .innerJoin("mv.user", "user", "user.isActive = true")
        .innerJoin("mv.unit", "u", "u.isActive = true")
        .innerJoin("u.masterCommunity", "mc", "mc.isActive = true")
        .innerJoin("u.tower", "t", "t.isActive = true")
        .innerJoin("u.community", "c", "c.isActive = true")
        .where("mv.isActive = true AND mv.id = :requestId", { requestId });

      let result: any = await query.getOne();

      if (!result) {
        logger.warn(`Move-in request not found - requestId: ${requestId}`);
        return null;
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

      logger.debug(`Successfully retrieved move-in request details for requestId: ${requestId}`);
      return result;

    } catch (error: any) {
      logger.error(`Error in getMobileMoveInRequestDetails: ${JSON.stringify(error)}`);
      const apiCode = Object.values(APICodes as Record<string, any>).find((item: any) => item.code === (error as any).code) || APICodes.UNKNOWN_ERROR;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
    }
  }
}
