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
  ActionByTypes,
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

export class MoveInService {
  // Removed old generic placeholder createMoveInRequest

  async createOwnerMoveIn(data: any, user: any) {
    // Map owner UI fields to details
    const { details = {}, ...rest } = data || {};
    const ownerDetails = {
      adults: details.adults,
      children: details.children,
      householdStaffs: details.householdStaffs,
      pets: details.pets,
      comments: details.detailsText || rest.comments || null,
      // Optional toggles
      peopleOfDetermination: details.peopleOfDetermination,
    };
    return this.createMoveIn({ ...rest, details: ownerDetails, requestType: MOVE_IN_USER_TYPES.OWNER }, user);
  }

  async createTenantMoveIn(data: any, user: any) {
    return this.createMoveIn({ ...data, requestType: MOVE_IN_USER_TYPES.TENANT }, user);
  }

  async createHhoOwnerMoveIn(data: any, user: any) {
    return this.createMoveIn({ ...data, requestType: MOVE_IN_USER_TYPES.HHO_OWNER }, user);
  }

  async createHhcCompanyMoveIn(data: any, user: any) {
    return this.createMoveIn({ ...data, requestType: MOVE_IN_USER_TYPES.HHO_COMPANY }, user);
  }

  async uploadHhcCompanyDocuments(requestId: number, files: any, user: any) {
    try {
      if (user?.isAdmin === true || user?.isAdmin === 1) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.NOT_FOUND.message,
          APICodes.NOT_FOUND.code
        );
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.REQUEST_NOT_BELONG_TO_USER.message,
          APICodes.REQUEST_NOT_BELONG_TO_USER.code
        );
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Emirates ID Front
        if (files?.emiratesIdFront?.[0]) {
          const file = files.emiratesIdFront[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-front/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_FRONT,
            createdBy: user?.id,
            updatedBy: user?.id,
            isActive: true,
          });
          
          const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
          uploadedDocuments.push({ type: 'emiratesIdFront', document: savedDoc });
        }

        // Handle Emirates ID Back
        if (files?.emiratesIdBack?.[0]) {
          const file = files.emiratesIdBack[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/emirates-id-back/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.EMIRATES_ID_BACK,
            createdBy: user?.id,
            updatedBy: user?.id,
            isActive: true,
          });
          
          const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
          uploadedDocuments.push({ type: 'emiratesIdBack', document: savedDoc });
        }

        // Handle Company Trade License
        if (files?.companyTradeLicense?.[0]) {
          const file = files.companyTradeLicense[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/company-trade-license/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.COMPANY_TRADE_LICENSE,
            createdBy: user?.id,
            updatedBy: user?.id,
            isActive: true,
          });
          
          const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
          uploadedDocuments.push({ type: 'companyTradeLicense', document: savedDoc });
        }

        // Handle Unit Permit
        if (files?.unitPermit?.[0]) {
          const file = files.unitPermit[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/unit-permit/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.UNIT_PEMIT,
            createdBy: user?.id,
            updatedBy: user?.id,
            isActive: true,
          });
          
          const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
          uploadedDocuments.push({ type: 'unitPermit', document: savedDoc });
        }

        // Create log entry
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: { id: requestId } as any,
          requestType: moveInRequest.requestType,
          status: moveInRequest.status,
          changes: `Documents uploaded: ${uploadedDocuments.map(d => d.type).join(', ')}`,
          user: { id: user?.id } as any,
          actionBy: ActionByTypes.USER,
          details: JSON.stringify(uploadedDocuments),
          comments: `Documents uploaded for move-in request ${requestId}`,
        });
        await qr.manager.save(MoveInRequestLogs, log);
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
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.NOT_FOUND.message,
          APICodes.NOT_FOUND.code
        );
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.REQUEST_NOT_BELONG_TO_USER.message,
          APICodes.REQUEST_NOT_BELONG_TO_USER.code
        );
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
            `For Tenant Move-In, only Emirates ID Front, Emirates ID Back, and Ejari documents are allowed. Invalid document types: ${invalidDocumentTypes.join(', ')}`,
            'INVALID_DOCUMENT_TYPES_FOR_TENANT'
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
            `For Tenant Move-In, only Emirates ID Front, Emirates ID Back, and Ejari documents are allowed. Invalid linked document types: ${invalidLinkedTypes.join(', ')}`,
            'INVALID_LINKED_DOCUMENT_TYPES_FOR_TENANT'
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
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `For HHC Company Move-In, only Emirates ID Front, Emirates ID Back, Company Trade License, and Unit Permit documents are allowed. Invalid document types: ${invalidDocumentTypes.join(', ')}`,
            'INVALID_DOCUMENT_TYPES_FOR_HHC_COMPANY'
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
            `For HHC Company Move-In, only Emirates ID Front, Emirates ID Back, Company Trade License, and Unit Permit documents are allowed. Invalid linked document types: ${invalidLinkedTypes.join(', ')}`,
            'INVALID_LINKED_DOCUMENT_TYPES_FOR_HHC_COMPANY'
          );
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
        log.actionBy = ActionByTypes.USER;
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
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.NOT_FOUND.message,
          APICodes.NOT_FOUND.code
        );
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.REQUEST_NOT_BELONG_TO_USER.message,
          APICodes.REQUEST_NOT_BELONG_TO_USER.code
        );
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Other Documents (up to 4 files)
        if (files?.otherDocuments && Array.isArray(files.otherDocuments)) {
          for (let i = 0; i < files.otherDocuments.length; i++) {
            const file = files.otherDocuments[i];
            const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/other-documents/`, user?.id);
            
            const document = qr.manager.create(MoveInRequestDocuments, {
              moveInRequest: { id: requestId } as any,
              user: { id: user?.id } as any,
              file: uploadedFile,
              documentType: TRANSITION_DOCUMENT_TYPES.OTHER,
              createdBy: user?.id,
              updatedBy: user?.id,
              isActive: true,
            });
            
            const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
            uploadedDocuments.push({ type: `otherDocument${i + 1}`, document: savedDoc });
          }
        }

        // Create log entry
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: { id: requestId } as any,
          requestType: moveInRequest.requestType,
          status: moveInRequest.status,
          changes: `Other documents uploaded: ${uploadedDocuments.length} files`,
          user: { id: user?.id } as any,
          actionBy: ActionByTypes.USER,
          details: JSON.stringify(uploadedDocuments),
          comments: `Other documents uploaded for move-in request ${requestId}`,
        });
        await qr.manager.save(MoveInRequestLogs, log);
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
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.INVALID_USER_ROLE.message,
          APICodes.INVALID_USER_ROLE.code
        );
      }

      // Get the move-in request with user relationship
      const moveInRequest = await MoveInRequests.getRepository()
        .createQueryBuilder("mir")
        .leftJoinAndSelect("mir.user", "user")
        .where("mir.id = :requestId AND mir.isActive = true", { requestId })
        .getOne();

      if (!moveInRequest) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          APICodes.NOT_FOUND.message,
          APICodes.NOT_FOUND.code
        );
      }

      // Verify the request belongs to the user
      if (moveInRequest.user?.id !== user?.id) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          APICodes.REQUEST_NOT_BELONG_TO_USER.message,
          APICodes.REQUEST_NOT_BELONG_TO_USER.code
        );
      }

      const uploadedDocuments: Array<{ type: string; document: any }> = [];

      await executeInTransaction(async (qr: any) => {
        // Handle Title Deed
        if (files?.titleDeed?.[0]) {
          const file = files.titleDeed[0];
          const uploadedFile = await uploadFile(file.originalname, file, `move-in/${requestId}/title-deed/`, user?.id);
          
          const document = qr.manager.create(MoveInRequestDocuments, {
            moveInRequest: { id: requestId } as any,
            user: { id: user?.id } as any,
            file: uploadedFile,
            documentType: TRANSITION_DOCUMENT_TYPES.TITLE_DEED,
            createdBy: user?.id,
            updatedBy: user?.id,
            isActive: true,
          });
          
          const savedDoc = await qr.manager.save(MoveInRequestDocuments, document);
          uploadedDocuments.push({ type: 'titleDeed', document: savedDoc });
        }

        // Create log entry
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: { id: requestId } as any,
          requestType: moveInRequest.requestType,
          status: moveInRequest.status,
          changes: `Title deed document uploaded`,
          user: { id: user?.id } as any,
          actionBy: ActionByTypes.USER,
          details: JSON.stringify(uploadedDocuments),
          comments: `Title deed document uploaded for move-in request ${requestId}`,
        });
        await qr.manager.save(MoveInRequestLogs, log);
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

      if (user?.isAdmin === true || user?.isAdmin === 1) {
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
        createdDetails = await this.createDetailsRecord(qr, requestType, createdMaster as MoveInRequests, detailsData, user?.id);

        // Create initial log
        const log = qr.manager.create(MoveInRequestLogs, {
          moveInRequest: createdMaster as MoveInRequests,
          requestType,
          status: MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN,
          changes: null,
          user: { id: user?.id } as any,
          actionBy: ActionByTypes.USER,
          details: details ? JSON.stringify(details) : null,
          comments: comments || null,
        });
        await qr.manager.save(MoveInRequestLogs, log);
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

  async getMobileMoveIn(query: any, unitId: number) {
    const unit = await this.getUnitById(unitId);

    if (!unit) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        APICodes.UNIT_NOT_FOUND.message,
        APICodes.UNIT_NOT_FOUND.code
      );
    }
    try {
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
        unit: unitFilter = "",
        unitIds = "",
      } = query;
      masterCommunityIds = masterCommunityIds.split(",").filter((e: any) => e);
      communityIds = communityIds.split(",").filter((e: any) => e);
      towerIds = towerIds.split(",").filter((e: any) => e);
      unitIds = unitIds.split(",").filter((e: any) => e);
      let whereClause = "am.isActive = true";

      if (masterCommunityIds && masterCommunityIds.length)
        whereClause += ` AND am.masterCommunity IN (:...masterCommunityIds)`;

      if (communityIds && communityIds.length)
        whereClause += ` AND am.community IN (:...communityIds)`;

      if (towerIds && towerIds.length)
        whereClause += ` AND am.tower IN (:...towerIds)`;

      if (createdStartDate)
        whereClause += ` AND am.createdAt >= :createdStartDate`;

      if (createdEndDate) whereClause += ` AND am.createdAt <= :createdEndDate`;

      if (moveInStartDate)
        whereClause += ` AND am.moveInDate >= :moveInStartDate`;

      if (moveInEndDate) whereClause += ` AND am.moveInDate <= :moveInEndDate`;
      if (unitFilter) whereClause += ` AND am.unit = :unitId`;
      if (unitIds && unitIds.length)
        whereClause += ` AND am.unit IN (:...units)`;

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
          unitId: Number(unitFilter) || undefined,
          units: unitIds.map((x: any) => Number(x)).filter((n: any) => !isNaN(n)),
          startDate: query.startDate,
          endDate: query.endDate,
        });

      getMoveInList.innerJoinAndSelect("am.unit", "u", "u.isActive=1");
      getMoveInList.innerJoinAndSelect(
        "u.masterCommunity",
        "mc",
        "mc.isActive=1"
      );
      getMoveInList.innerJoinAndSelect("u.community", "c", "c.isActive=1");
      getMoveInList.innerJoinAndSelect("u.tower", "t", "t.isActive=1");
      getMoveInList.where(whereClause, {
        masterCommunityIds,
        communityIds,
        towerIds,
        unitId: Number(unitFilter) || undefined,
        units: unitIds.map((x: any) => Number(x)).filter((n: any) => !isNaN(n)),
      });

      // getMoveInList = checkAdminPermission(getMoveInList, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, query.user);
      getMoveInList.offset((page - 1) * per_page).limit(per_page);

      const list = await getMoveInList.getMany();
      const count = await getMoveInList.getCount();
      const pagination = getPaginationInfo(page, per_page, count);
      return { data: list, pagination };
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
        .leftJoinAndMapOne(
          "u.masterCommunity",
          "u.masterCommunity",
          "mc",
          "mc.isActive = 1"
        )
        .leftJoinAndMapOne(
          "u.unitRestriction",
          "u.unitRestriction",
          "ut",
          "ut.isActive = 1"
        )
        .where({ id })
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

  private generateRequestNumber(unitNumber?: string | number): string {
    const suffix = `${Date.now()}`;
    return `MIN-${unitNumber ?? 'UNIT'}-${suffix}`;
  }

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
          ...details,
          moveInRequest: master,
          createdBy: userId,
          updatedBy: userId,
          isActive: true,
        });
        return await qr.manager.save(MoveInRequestDetailsOwner, entity);
      }
      case MOVE_IN_USER_TYPES.HHO_OWNER: {
        const entity = qr.manager.create(MoveInRequestDetailsHhoOwner, {
          ...details,
          moveInRequest: master,
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
}
