import { AppDataSource } from '../../Common/data-source';
import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { OccupancyRequestTemplates } from '../../Entities/OccupancyRequestTemplates.entity';
import { OccupancyRequestTemplateHistory } from '../../Entities/OccupancyRequestTemplateHistory.entity';
import { OccupancyRequestEmailRecipients } from '../../Entities/OccupancyRequestEmailRecipients.entity';
import { MasterCommunities } from '../../Entities/MasterCommunities.entity';
import { Communities } from '../../Entities/Communities.entity';
import { Towers } from '../../Entities/Towers.entity';
import { logger } from '../../Common/Utils/logger';
import { getPaginationInfo } from '../../Common/Utils/paginationUtils';

import ApiError from '../../Common/Utils/ApiError';
import { APICodes } from '../../Common/Constants/apiCodes.en';

import httpStatus from 'http-status';
import { WelcomeKitService, WelcomeKitData } from './welcomeKit.service';

export class DocumentsService {

    /**
     * Get Welcome Pack List
     * @returns {Promise<any>}
     * @throws {Error}
     * @param query
     */
    async getWelcomePackList(query: any) {
        try {
            let { page = 1, per_page = 20, sortBy = 'id', sortOrder = 'DESC', includeFile = false } = query;

            // Only process meaningful filters - ignore empty/blank values
            const filters: any = {};
            
            if (query.search && query.search.trim().length > 0) {
                filters.search = query.search.trim();
            }
            
            if (query.masterCommunityIds && query.masterCommunityIds.trim().length > 0) {
                filters.masterCommunityIds = query.masterCommunityIds.split(',').filter((id: string) => id.trim() !== '');
            }
            
            if (query.communityIds && query.communityIds.trim().length > 0) {
                filters.communityIds = query.communityIds.split(',').filter((id: string) => id.trim() !== '');
            }
            
            if (query.towerIds && query.towerIds.trim().length > 0) {
                filters.towerIds = query.towerIds.split(',').filter((id: string) => id.trim() !== '');
            }
            
            if (query.isActive !== undefined && query.isActive !== '') {
                filters.isActive = query.isActive === 'true' || query.isActive === true;
            }
            
            if (query.startDate && query.startDate.trim().length > 0) {
                filters.startDate = query.startDate;
            }
            
            if (query.endDate && query.endDate.trim().length > 0) {
                filters.endDate = query.endDate;
            }

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            // Check database connection status
            if (!AppDataSource.isInitialized) {
                logger.error('Database connection not available');
                throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, APICodes.INTERNAL_SERVER_ERROR.message, APICodes.INTERNAL_SERVER_ERROR.code);
            }
            
            // Build where clause based on meaningful filters only
            let whereClause = "1=1";
            let whereParams: any = {};
            
            if (filters.isActive !== undefined) {
                whereClause += " AND welcomePack.isActive = :isActive";
                whereParams.isActive = filters.isActive;
            }

            if (filters.masterCommunityIds && filters.masterCommunityIds.length > 0) {
                whereClause += " AND welcomePack.masterCommunityId IN (:...masterCommunityIds)";
                whereParams.masterCommunityIds = filters.masterCommunityIds;
            }

            if (filters.communityIds && filters.communityIds.length > 0) {
                whereClause += " AND welcomePack.communityId IN (:...communityIds)";
                whereParams.communityIds = filters.communityIds;
            }

            if (filters.towerIds && filters.towerIds.length > 0) {
                whereClause += " AND welcomePack.towerId IN (:...towerIds)";
                whereParams.towerIds = filters.towerIds;
            }

            if (filters.search) {
                whereClause += " AND (masterCommunity.name LIKE :search OR community.name LIKE :search OR tower.name LIKE :search)";
                whereParams.search = `%${filters.search}%`;
            }

            if (filters.startDate) {
                whereClause += " AND DATE(welcomePack.createdAt) >= DATE(:startDate)";
                whereParams.startDate = filters.startDate;
            }

            if (filters.endDate) {
                whereClause += " AND DATE(welcomePack.createdAt) <= DATE(:endDate)";
                whereParams.endDate = filters.endDate;
            }

            // Log applied filters for debugging
            if (Object.keys(filters).length > 0) {
                logger.info(`Welcome Pack List - Applied filters: ${JSON.stringify(filters)}`);
            } else {
                logger.info('Welcome Pack List - No filters applied, returning all records');
            }

            // Create separate query builders for count and data
            const countQuery = welcomePackRepository.createQueryBuilder('welcomePack')
                .leftJoin('welcomePack.masterCommunity', 'masterCommunity')
                .leftJoin('welcomePack.community', 'community')
                .leftJoin('welcomePack.tower', 'tower')
                .where(whereClause, whereParams);

            const dataQuery = welcomePackRepository.createQueryBuilder('welcomePack')
                .leftJoinAndSelect('welcomePack.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('welcomePack.community', 'community')
                .leftJoinAndSelect('welcomePack.tower', 'tower')
                .where(whereClause, whereParams);

            // Handle field selection for data query
            if (includeFile === 'true' || includeFile === true) {
                dataQuery.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.templateString',
                    'welcomePack.isActive',
                    'welcomePack.createdAt',
                    'welcomePack.updatedAt',
                    'welcomePack.createdBy',
                    'welcomePack.updatedBy',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            } else {
                dataQuery.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.isActive',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            }

            // Add sorting to data query
            dataQuery.orderBy(`welcomePack.${sortBy}`, sortOrder);

            // Get total count for pagination
            let totalCount: number;
            try {
                totalCount = await countQuery.getCount();
            } catch (countError: any) {
                logger.error(`Error getting count: ${JSON.stringify(countError)}`);
                logger.error(`Count error stack: ${countError.stack}`);
                throw countError;
            }

            // Add pagination to data query
            const offset = (page - 1) * per_page;
            dataQuery.skip(offset).take(per_page);

            // Execute data query
            let data: any[];
            try {
                data = await dataQuery.getMany();
            } catch (dataError: any) {
                throw dataError;
            }

            // Format response data with nested objects
            const formattedData = data.map((item: any) => ({
                id: item.id,
                templateString: item.templateString,
                isActive: item.isActive,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                createdBy: item.createdBy,
                updatedBy: item.updatedBy,
                masterCommunity: item.masterCommunity ? {
                    id: item.masterCommunity.id,
                    name: item.masterCommunity.name
                } : null,
                community: item.community ? {
                    id: item.community.id,
                    name: item.community.name
                } : null,
                tower: item.tower ? {
                    id: item.tower.id,
                    name: item.tower.name
                } : null
            }));

            const pagination = getPaginationInfo(page, per_page, totalCount);

            return { data: formattedData, pagination };
        } catch (error: any) {
            logger.error(`Error in getWelcomePackList: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Create Welcome Pack
     * @return {Promise<OccupancyRequestWelcomePack>}
     * @throws {Error}
     * @param data
     * @param file
     * @param userId
     */
    async createWelcomePack(data: any, file: any, userId: number) {
        try {
            const { masterCommunityId, communityId, towerId, isActive = true } = data;
            
            // Validate and convert data types
            const validatedMasterCommunityId = parseInt(masterCommunityId);
            const validatedCommunityId = parseInt(communityId);
            const validatedTowerId = towerId ? parseInt(towerId) : null;
            const validatedIsActive = isActive === 'true' || isActive === true;
            
            // Validate converted values
            if (isNaN(validatedMasterCommunityId)) {
                logger.error(`Invalid masterCommunityId: ${masterCommunityId} cannot be converted to number`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }
            if (isNaN(validatedCommunityId)) {
                logger.error(`Invalid communityId: ${communityId} cannot be converted to number`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }
            if (towerId && isNaN(validatedTowerId!)) {
                logger.error(`Invalid towerId: ${towerId} cannot be converted to number`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }

            // Validate file
            if (!file) {
                logger.error('File is missing');
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
            }

            if (!file.buffer) {
                logger.error(`File buffer is missing. File object: ${JSON.stringify(file)}`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                logger.error(`File size ${file.size} exceeds 10MB limit`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(file.mimetype)) {
                logger.error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
            }

            // Deactivate existing active welcome packs for the same combination
            let existingPack: any = null;
            try {
                const existingWelcomePack = await AppDataSource.getRepository(OccupancyRequestWelcomePack)
                    .createQueryBuilder('welcomePack')
                    .where('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId: validatedMasterCommunityId })
                    .andWhere('welcomePack.communityId = :communityId', { communityId: validatedCommunityId })
                    .andWhere('welcomePack.isActive = :isActive', { isActive: true });

                if (validatedTowerId) {
                    existingWelcomePack.andWhere('welcomePack.towerId = :towerId', { towerId: validatedTowerId });
                } else {
                    existingWelcomePack.andWhere('welcomePack.towerId IS NULL');
                }

                existingPack = await existingWelcomePack.getOne();
            } catch (queryError: any) {
                logger.error(`Error querying existing welcome packs: ${JSON.stringify(queryError)}`);
                throw queryError;
            }

            if (existingPack) {
                existingPack.isActive = false;
                existingPack.updatedBy = userId;
                await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(existingPack);
                
                // Create history record for deactivated welcome pack
                const deactivatedHistoryData = {
                    templateType: 'welcome-pack',
                    occupancyRequestWelcomePack: { id: existingPack.id },
                    masterCommunityId: existingPack.masterCommunityId,
                    communityId: existingPack.communityId,
                    towerId: existingPack.towerId,
                    templateString: existingPack.templateString,
                    isActive: false, // Mark as deactivated
                    createdBy: userId,
                    updatedBy: userId
                };
                await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(deactivatedHistoryData);
            }

            // Create new welcome pack
            const welcomePackData: any = {
                masterCommunityId: validatedMasterCommunityId,
                communityId: validatedCommunityId,
                templateString: file.buffer.toString('base64'),
                isActive: validatedIsActive,
                createdBy: userId,
                updatedBy: userId
            };

            if (validatedTowerId) {
                welcomePackData.towerId = validatedTowerId;
            }
            
            // Validate required fields
            if (!validatedMasterCommunityId || !validatedCommunityId || !file.buffer || !userId) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.INTERNAL_SERVER_ERROR.message, APICodes.INTERNAL_SERVER_ERROR.code);
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);         
            
            try {
                const welcomePack = welcomePackRepository.create(welcomePackData);
                const savedWelcomePack = await welcomePackRepository.save(welcomePack);
                
                // Ensure we have a single entity, not an array
                if (Array.isArray(savedWelcomePack)) {
                    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.INTERNAL_SERVER_ERROR.message, APICodes.INTERNAL_SERVER_ERROR.code);
                }
                
                // Type assertion after array check
                const welcomePackEntity = savedWelcomePack as OccupancyRequestWelcomePack;

                // Create history record
                const historyData = {
                    templateType: 'welcome-pack',
                    occupancyRequestWelcomePack: { id: welcomePackEntity.id },
                    masterCommunityId: welcomePackEntity.masterCommunityId,
                    communityId: welcomePackEntity.communityId,
                    towerId: welcomePackEntity.towerId ?? null,
                    templateString: welcomePackEntity.templateString,
                    isActive: welcomePackEntity.isActive,
                    createdBy: userId,
                    updatedBy: userId
                };

                await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyData);
                return welcomePackEntity;
            } catch (saveError: any) {      
                throw saveError;
            }
        } catch (error: any) {
            logger.error(`Error in createWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Welcome Pack By ID
     * @return {Promise<OccupancyRequestWelcomePack>}
     * @throws {Error}
     * @param id
     * @param includeFile
     */
    async getWelcomePackById(id: number, includeFile: boolean = false) {
        try {
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            let queryBuilder = welcomePackRepository.createQueryBuilder('welcomePack')
                .leftJoinAndSelect('welcomePack.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('welcomePack.community', 'community')
                .leftJoinAndSelect('welcomePack.tower', 'tower')
                .where('welcomePack.id = :id', { id });

            if (includeFile) {
                // When includeFile is true, select all fields including templateString and select: false fields
                queryBuilder.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.templateString',
                    'welcomePack.isActive',
                    'welcomePack.createdAt',
                    'welcomePack.updatedAt',
                    'welcomePack.createdBy',
                    'welcomePack.updatedBy',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString and select: false fields)
                queryBuilder.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.isActive',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            }

            const welcomePack = await queryBuilder.getOne();

            if (!welcomePack) {
                return null;
            }

            // Format the data to return nested objects instead of flat IDs
            const formattedData: any = {
                id: welcomePack.id,
                isActive: welcomePack.isActive,
                createdAt: welcomePack.createdAt,
                updatedAt: welcomePack.updatedAt,
                createdBy: welcomePack.createdBy,
                updatedBy: welcomePack.updatedBy,
                masterCommunity: welcomePack.masterCommunity ? {
                    id: welcomePack.masterCommunity.id,
                    name: welcomePack.masterCommunity.name
                } : null,
                community: welcomePack.community ? {
                    id: welcomePack.community.id,
                    name: welcomePack.community.name
                } : null,
                tower: welcomePack.tower ? {
                    id: welcomePack.tower.id,
                    name: welcomePack.tower.name
                } : null
            };

            // Add templateString if includeFile is true
            if (includeFile && welcomePack.templateString) {
                formattedData.templateString = welcomePack.templateString;
            }

            // Return null instead of throwing error - let the controller handle the "not found" case
            return formattedData;
        } catch (error: any) {
            logger.error(`Error in getWelcomePackById: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Download Welcome Pack File
     * @return {Promise<any>}
     * @throws {Error}
     * @param id
     */
    async downloadWelcomePackFile(id: number) {
        try {
            const welcomePack = await this.getWelcomePackById(id, true);

            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            // Check if templateString exists and is a string
            if (!('templateString' in welcomePack) || typeof (welcomePack as any).templateString !== 'string') {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.FILE_NOT_FOUND.message, APICodes.FILE_NOT_FOUND.code);
            }

            let contentType = 'application/octet-stream';
            let fileName = `welcome-pack-${id}`;

            // Convert Base64 string back to Buffer
            const fileBuffer = Buffer.from((welcomePack as any).templateString, 'base64');

            // Try to determine if it's PDF or HTML based on content
            if (fileBuffer.length >= 4 && 
                fileBuffer[0] === 0x25 && 
                fileBuffer[1] === 0x50 && 
                fileBuffer[2] === 0x44 && 
                fileBuffer[3] === 0x46) {
                contentType = 'application/pdf';
                fileName += '.pdf';
            } else {
                contentType = 'text/html';
                fileName += '.html';
            }

            return {
                buffer: fileBuffer,
                contentType,
                fileName
            };
        } catch (error: any) {
            logger.error(`Error in downloadWelcomePackFile: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Update Welcome Pack
     * @return {Promise<OccupancyRequestWelcomePack>}
     * @throws {Error}
     * @param id
     * @param data
     * @param file
     * @param userId
     */
    async updateWelcomePack(id: number, data: any, file: any, userId: number) {
        try {
            const welcomePack = await this.getWelcomePackById(id);

            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            // Convert string boolean to actual boolean if needed
            const isActiveBoolean = data.isActive === 'true' ? true : data.isActive === 'false' ? false : data.isActive;
            
            // If updating to active, deactivate other active welcome packs for the same combination
            if (isActiveBoolean === true) {
                const queryBuilder = AppDataSource.getRepository(OccupancyRequestWelcomePack)
                    .createQueryBuilder('welcomePack')
                    .where('welcomePack.id != :id', { id })
                    .andWhere('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId: welcomePack.masterCommunityId })
                    .andWhere('welcomePack.communityId = :communityId', { communityId: welcomePack.communityId })
                    .andWhere('welcomePack.isActive = :isActive', { isActive: true });

                if ((welcomePack as any).towerId) {
                    queryBuilder.andWhere('welcomePack.towerId = :towerId', { towerId: (welcomePack as any).towerId });
                } else {
                    queryBuilder.andWhere('welcomePack.towerId IS NULL');
                }

                const activeWelcomePacks = await queryBuilder.getMany();

                if (activeWelcomePacks.length > 0) {
                    // Deactivate existing welcome packs
                    for (const activeWelcomePack of activeWelcomePacks) {
                        activeWelcomePack.isActive = false;
                        activeWelcomePack.updatedBy = userId;
                        await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(activeWelcomePack);
                        
                        // Create history record for deactivated welcome pack
                        const deactivatedHistoryData = {
                            templateType: 'welcome-pack',
                            occupancyRequestWelcomePack: { id: activeWelcomePack.id },
                            masterCommunityId: activeWelcomePack.masterCommunityId,
                            communityId: activeWelcomePack.communityId,
                            towerId: activeWelcomePack.towerId,
                            templateString: activeWelcomePack.templateString,
                            isActive: false, // Mark as deactivated
                            createdBy: userId,
                            updatedBy: userId
                        };
                        await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(deactivatedHistoryData);
                    }
                }
            }

            // Clean up the data object to remove unwanted fields
            const cleanData = { ...data };
            delete cleanData.welcomePackFile; // Remove the empty file field
            
            if (file && file.buffer && file.buffer.length > 0 && file.size > 0 && file.mimetype) {
                // Validate file type and size
                if (file.size > 10 * 1024 * 1024) { // 10MB
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(file.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                }

                cleanData.templateString = file.buffer.toString('base64');
            }

            // Update specific fields based on what's provided
            let hasUpdates = false;
            
            if (cleanData.isActive !== undefined) {
                welcomePack.isActive = isActiveBoolean;
                hasUpdates = true;
            }
            
            // Update templateString if file is provided
            if (file && file.buffer && file.buffer.length > 0 && file.size > 0 && file.mimetype) {
                welcomePack.templateString = file.buffer.toString('base64');
                hasUpdates = true;
            }
            
            // Ensure at least one field is being updated
            if (!hasUpdates) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.UPDATE_NOT_POSSIBLE.message, APICodes.UPDATE_NOT_POSSIBLE.code);
            }
            
            welcomePack.updatedBy = userId;
            const updatedWelcomePack = await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(welcomePack);

            if (!updatedWelcomePack) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UPDATE_NOT_POSSIBLE.message, APICodes.UPDATE_NOT_POSSIBLE.code);
            }

            // Create history record for the update
            const historyData = {
                templateType: 'welcome-pack',
                occupancyRequestWelcomePack: { id: updatedWelcomePack.id },
                masterCommunityId: updatedWelcomePack.masterCommunityId,
                communityId: updatedWelcomePack.communityId,
                towerId: updatedWelcomePack.towerId,
                templateString: updatedWelcomePack.templateString,
                isActive: updatedWelcomePack.isActive,
                createdBy: userId,
                updatedBy: userId // Add missing updatedBy field
            };

            await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyData);

            return updatedWelcomePack;
        } catch (error: any) {
            logger.error(`Error in updateWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Active Welcome Pack
     * @return {Promise<OccupancyRequestWelcomePack>}
     * @throws {Error}
     * @param masterCommunityId
     * @param communityId
     * @param towerId
     */
    async getActiveWelcomePack(masterCommunityId: number, communityId: number, towerId?: number) {
        try {
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestWelcomePack)
                .createQueryBuilder('welcomePack')
                .leftJoinAndSelect('welcomePack.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('welcomePack.community', 'community')
                .leftJoinAndSelect('welcomePack.tower', 'tower')
                .where('welcomePack.masterCommunity.id = :masterCommunityId', { masterCommunityId })
                .andWhere('welcomePack.community.id = :communityId', { communityId })
                .andWhere('welcomePack.isActive = :isActive', { isActive: true });

            if (towerId) {
                queryBuilder.andWhere('welcomePack.tower.id = :towerId', { towerId });
            } else {
                queryBuilder.andWhere('welcomePack.tower IS NULL');
            }

            const welcomePack = await queryBuilder.getOne();

            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            return welcomePack;
        } catch (error: any) {
            logger.error(`Error in getActiveWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Ensure Data Consistency
     * @return {Promise<any>}
     * @throws {Error}
     */
    async ensureDataConsistency() {
        try {
            // Find all active welcome packs
            const activeWelcomePacks = await AppDataSource.getRepository(OccupancyRequestWelcomePack)
                .createQueryBuilder('welcomePack')
                .where('welcomePack.isActive = :isActive', { isActive: true })
                .getMany();

            // Group by master community, community, and tower combination
            const groupedWelcomePacks = new Map();

            for (const welcomePack of activeWelcomePacks) {
                const key = `${welcomePack.masterCommunityId}-${welcomePack.communityId}-${welcomePack.towerId || 'null'}`;
                
                if (!groupedWelcomePacks.has(key)) {
                    groupedWelcomePacks.set(key, []);
                }
                groupedWelcomePacks.get(key).push(welcomePack);
            }

            // Deactivate all but the most recent welcome pack in each group
            for (const [key, welcomePacks] of groupedWelcomePacks) {
                if (welcomePacks.length > 1) {
                    // Sort by creation date (newest first)
                    welcomePacks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    
                    // Keep the first one (newest) active, deactivate the rest
                    for (let i = 1; i < welcomePacks.length; i++) {
                        welcomePacks[i].isActive = false;
                        await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(welcomePacks[i]);
                    }
                }
            }

            return {
                message: 'Data consistency check completed',
                deactivatedCount: activeWelcomePacks.length - groupedWelcomePacks.size
            };
        } catch (error: any) {
            logger.error(`Error in ensureDataConsistency: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Template List
     * @return {Promise<any>}
     * @throws {Error}
     * @param query
     * @param userId
     */
    async getTemplateList(query: any, userId: string) {
        try {
            const { page = 1, per_page = 20, search, masterCommunityIds = '', communityIds = '', towerIds = '', templateType, includeFile = false, sortBy = 'createdAt', sortOrder = 'DESC', isActive } = query;

            // Parse comma-separated IDs and filter out empty values
            const parseIds = (ids: string) => {
                if (!ids || ids.trim() === '') return [];
                return ids.split(',').filter((e: any) => e && e.trim() !== '');
            };

            const parsedMasterCommunityIds = parseIds(masterCommunityIds);
            const parsedCommunityIds = parseIds(communityIds);
            const parsedTowerIds = parseIds(towerIds);

            // Start with a simple query to test basic functionality
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .leftJoinAndSelect('template.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('template.community', 'community')
                .leftJoinAndSelect('template.tower', 'tower')
                .where('template.templateType IN (:...templateTypes)', { templateTypes: ['move-in', 'move-out'] });

            // Handle field selection based on includeFile parameter
            if (includeFile === 'true' || includeFile === true) {
                // When includeFile is true, select all fields including templateString and select: false fields
                queryBuilder.select([
                    'template.id',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId',
                    'template.templateType',
                    'template.templateString',
                    'template.isActive',
                    'template.createdAt',
                    'template.updatedAt',
                    'template.createdBy',
                    'template.updatedBy',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString and select: false fields)
                queryBuilder.select([
                    'template.id',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId',
                    'template.templateType',
                    'template.isActive',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            }

            // Add filtering by master community - only if IDs are provided
            if (parsedMasterCommunityIds && parsedMasterCommunityIds.length > 0) {
                queryBuilder.andWhere('template.masterCommunityId IN (:...masterCommunityIds)', { masterCommunityIds: parsedMasterCommunityIds });
            }

            // Add filtering by community - only if IDs are provided
            if (parsedCommunityIds && parsedCommunityIds.length > 0) {
                queryBuilder.andWhere('template.communityId IN (:...communityIds)', { communityIds: parsedCommunityIds });
            }

            // Add filtering by tower - only if IDs are provided
            if (parsedTowerIds && parsedTowerIds.length > 0) {
                queryBuilder.andWhere('template.towerId IN (:...towerIds)', { towerIds: parsedTowerIds });
            }

            // Add search functionality
            if (search && search.trim() !== '') {
                queryBuilder.andWhere(
                    '(template.masterCommunityId IN (SELECT id FROM master_communities WHERE name LIKE :search) OR template.communityId IN (SELECT id FROM communities WHERE name LIKE :search) OR template.towerId IN (SELECT id FROM towers WHERE name LIKE :search))',
                    { search: `%${search.trim()}%` }
                );
            }

            // Add template type filtering - templateType is now required by validation
            if (!templateType) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
            }
            
            // Validate templateType value
            if (!['move-in', 'move-out'].includes(templateType)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
            }
            
            queryBuilder.andWhere('template.templateType = :templateType', { templateType });

            // Add active status filtering
            if (isActive !== undefined && isActive !== '') {
                queryBuilder.andWhere('template.isActive = :isActive', { isActive: isActive === 'true' || isActive === true });
            }

            // Add sorting
            queryBuilder.orderBy(`template.${sortBy}`, sortOrder);

            // Get total count for pagination
            const total = await queryBuilder.getCount();

            // Add pagination
            const offset = (page - 1) * per_page;
            const templates = await queryBuilder
                .skip(offset)
                .take(per_page)
                .getMany();

            // Note: File content handling is now done at the query level
            // When includeFile is false, templateString is not selected
            // When includeFile is true, templateString is selected and returned as-is

            const pagination = getPaginationInfo(page, per_page, total);

            return { templates, pagination };
        } catch (error: any) {
            logger.error(`Error in getTemplateList: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Create Template
     * @return {Promise<OccupancyRequestTemplates>}
     * @throws {Error}
     * @param data
     * @param templateFile
     * @param userId
     */
    async createTemplate(data: any, templateFile: any, userId: string) {
        try {
            // Convert form data to proper types
            const masterCommunityId = parseInt(data.masterCommunityId);
            const communityId = parseInt(data.communityId);
            const towerId = data.towerId ? parseInt(data.towerId) : null;
            const templateType = data.templateType;
            const isActive = data.isActive === 'true' || data.isActive === true;

            // Validate converted data
            if (isNaN(masterCommunityId)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }
            if (isNaN(communityId)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }
            if (data.towerId && towerId !== null && isNaN(towerId)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }

            // Validate file type and size
            if (!templateFile) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
            }

            if (templateFile.size > 10 * 1024 * 1024) { // 10MB
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(templateFile.mimetype)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
            }

            // Deactivate existing active templates for the same combination
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.masterCommunityId = :masterCommunityId', { masterCommunityId })
                .andWhere('template.communityId = :communityId', { communityId })
                .andWhere('template.templateType = :templateType', { templateType })
                .andWhere('template.isActive = :isActive', { isActive: true });

            if (towerId !== null && towerId !== undefined) {
                queryBuilder.andWhere('template.towerId = :towerId', { towerId: towerId as number });
            } else {
                queryBuilder.andWhere('template.towerId IS NULL');
            }

            const existingTemplates = await queryBuilder.getMany();

            if (existingTemplates.length > 0) {
                // Create history records for existing templates
                for (const template of existingTemplates) {
                    try {
                        const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                            occupancyRequestTemplates: template,
                            templateType: template.templateType,
                            isActive: template.isActive,
                            createdBy: parseInt(userId),
                            updatedBy: parseInt(userId)
                        });
                        await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                    } catch (historyError) {
                        logger.error(`Error creating history record: ${JSON.stringify(historyError)}`);
                        throw historyError;
                    }
                }

                // Deactivate existing templates
                for (const template of existingTemplates) {
                    try {
                        template.isActive = false;
                        template.updatedBy = parseInt(userId);
                        await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);
                    } catch (deactivateError) {
                        logger.error(`Error deactivating template: ${JSON.stringify(deactivateError)}`);
                        throw deactivateError;
                    }
                }
            }
            // Create new template
            const templateData: any = {
                masterCommunityId,
                communityId,
                templateType,
                templateString: templateFile.buffer.toString('base64'), // Convert buffer to base64 string
                isActive,
                createdBy: parseInt(userId),
                updatedBy: parseInt(userId) // Add this line to fix the database error
            };

            if (towerId) {
                templateData.towerId = towerId;
            }

            let savedTemplate: any;
            try {
                const template = AppDataSource.getRepository(OccupancyRequestTemplates).create(templateData);
                savedTemplate = await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);
            } catch (saveError) {
                logger.error(`Error saving template: ${JSON.stringify(saveError)}`);
                throw saveError;
            }

            // Create history record
            try {
                const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                    occupancyRequestTemplates: savedTemplate as unknown as OccupancyRequestTemplates,
                    templateType: (savedTemplate as unknown as OccupancyRequestTemplates).templateType,
                    isActive: (savedTemplate as unknown as OccupancyRequestTemplates).isActive,
                    createdBy: parseInt(userId),
                    updatedBy: parseInt(userId) // Add this line to fix the history table error
                });

                await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
            } catch (historyError) {
                logger.error(`Error creating history record for new template: ${JSON.stringify(historyError)}`);
                throw historyError;
            }

            return savedTemplate;
        } catch (error: any) {
            logger.error(`Error in createTemplate: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Template By ID
     * @return {Promise<OccupancyRequestTemplates>}
     * @throws {Error}
     * @param id
     * @param includeFile
     */
    async getTemplateById(id: number, includeFile: boolean = false) {
        try {
            const templateRepository = AppDataSource.getRepository(OccupancyRequestTemplates);
            
            let queryBuilder = templateRepository.createQueryBuilder('template')
                .leftJoinAndSelect('template.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('template.community', 'community')
                .leftJoinAndSelect('template.tower', 'tower')
                .where('template.id = :id', { id });

            if (includeFile) {
                // When includeFile is true, select all fields including templateString and select: false fields
                queryBuilder.select([
                    'template.id',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId',
                    'template.templateType',
                    'template.templateString',
                    'template.isActive',
                    'template.createdAt',
                    'template.updatedAt',
                    'template.createdBy',
                    'template.updatedBy',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString and select: false fields)
                queryBuilder.select([
                    'template.id',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId',
                    'template.templateType',
                    'template.isActive',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);
            }

            const template = await queryBuilder.getOne();

            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            return template;
        } catch (error: any) {
            logger.error(`Error in getTemplateById: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Download Template File
     * @return {Promise<any>}
     * @throws {Error}
     * @param id
     */
    async downloadTemplateFile(id: number) {
        try {
            const template = await AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.id = :id', { id })
                .getOne();

            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            if (!template.templateString) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.FILE_NOT_FOUND.message, APICodes.FILE_NOT_FOUND.code);
            }

            // Convert base64 string back to buffer
            const buffer = Buffer.from(template.templateString, 'base64');

            // Determine content type and file name
            let contentType = 'application/octet-stream';
            let fileName = `template_${id}`;

            // Check if it's a PDF (PDF magic numbers: %PDF)
            if (buffer.toString('utf8', 0, 4).startsWith('%PDF')) {
                contentType = 'application/pdf';
                fileName += '.pdf';
            } else if (buffer.toString('utf8').includes('<html') || buffer.toString('utf8').includes('<!DOCTYPE')) {
                contentType = 'text/html';
                fileName += '.html';
            }

            return {
                buffer: buffer,
                contentType,
                fileName
            };
        } catch (error: any) {
            logger.error(`Error in downloadTemplateFile: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Update Template
     * @return {Promise<OccupancyRequestTemplates>}
     * @throws {Error}
     * @param id
     * @param data
     * @param templateFile
     * @param userId
     */
    async updateTemplate(id: number, data: any, templateFile: any, userId: string) {
        try {
            logger.info(`Update template data received: ${JSON.stringify(data)}`);
            logger.info(`User ID: ${userId}`);

            const template = await AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.id = :id', { id })
                .getOne();

            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            // Convert string boolean to actual boolean if needed
            const isActiveBoolean = data.isActive === 'true' ? true : data.isActive === 'false' ? false : data.isActive;
            
            // If updating to active, deactivate other active templates for the same combination
            if (isActiveBoolean === true) {
                const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                    .createQueryBuilder('template')
                    .where('template.id != :id', { id })
                    .andWhere('template.masterCommunityId = :masterCommunityId', { masterCommunityId: template.masterCommunityId })
                    .andWhere('template.communityId = :communityId', { communityId: template.communityId })
                    .andWhere('template.templateType = :templateType', { templateType: template.templateType })
                    .andWhere('template.isActive = :isActive', { isActive: true });

                if (template.towerId) {
                    queryBuilder.andWhere('template.towerId = :towerId', { towerId: template.towerId });
                } else {
                    queryBuilder.andWhere('template.towerId IS NULL');
                }

                const existingTemplates = await queryBuilder.getMany();

                if (existingTemplates.length > 0) {
                    // Create history records for existing templates
                    for (const existingTemplate of existingTemplates) {
                        const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                            occupancyRequestTemplates: existingTemplate,
                            templateType: existingTemplate.templateType,
                            isActive: existingTemplate.isActive,
                            createdBy: parseInt(userId),
                            updatedBy: parseInt(userId)
                        });
                        await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                    }

                    // Deactivate existing templates
                    for (const existingTemplate of existingTemplates) {
                        existingTemplate.isActive = false;
                        existingTemplate.updatedBy = parseInt(userId);
                        await AppDataSource.getRepository(OccupancyRequestTemplates).save(existingTemplate);
                    }
                }
            }

            // Update template data
            logger.info(`File object received: ${JSON.stringify({
                hasFile: !!templateFile,
                hasBuffer: !!(templateFile && templateFile.buffer),
                bufferLength: templateFile?.buffer?.length || 0,
                fileSize: templateFile?.size || 0,
                mimetype: templateFile?.mimetype || 'none'
            })}`);
            
            // Clean up the data object to remove unwanted fields
            const cleanData = { ...data };
            delete cleanData.templateFile; // Remove the empty file field
            
            logger.info(`Original data: ${JSON.stringify(data)}`);
            logger.info(`Cleaned data: ${JSON.stringify(cleanData)}`);
            
            if (templateFile && templateFile.buffer && templateFile.buffer.length > 0 && templateFile.size > 0 && templateFile.mimetype) {
                // Validate file type and size
                if (templateFile.size > 10 * 1024 * 1024) { // 10MB
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.FILE_UPLOAD_ERROR.message, APICodes.FILE_UPLOAD_ERROR.code);
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(templateFile.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                }

                cleanData.templateString = templateFile.buffer.toString('base64');
            }

            // Update specific fields based on what's provided
            let hasUpdates = false;
            
            if (cleanData.isActive !== undefined) {
                template.isActive = isActiveBoolean;
                hasUpdates = true;
            }
            
            // Update templateString if file is provided
            if (templateFile && templateFile.buffer && templateFile.buffer.length > 0 && templateFile.size > 0 && templateFile.mimetype) {
                template.templateString = templateFile.buffer.toString('base64');
                hasUpdates = true;
            }
            
            // Update other fields if provided
            if (cleanData.masterCommunityId !== undefined) {
                template.masterCommunityId = parseInt(cleanData.masterCommunityId);
                hasUpdates = true;
            }
            
            if (cleanData.communityId !== undefined) {
                template.communityId = parseInt(cleanData.communityId);
                hasUpdates = true;
            }
            
            if (cleanData.towerId !== undefined) {
                template.towerId = cleanData.towerId ? parseInt(cleanData.towerId) : null;
                hasUpdates = true;
            }
            
            if (cleanData.templateType !== undefined) {
                template.templateType = cleanData.templateType;
                hasUpdates = true;
            }
            
            // Ensure at least one field is being updated
            if (!hasUpdates) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.UPDATE_NOT_POSSIBLE.message, APICodes.UPDATE_NOT_POSSIBLE.code);
            }
            
            logger.info(`Updating template with: isActive=${cleanData.isActive !== undefined ? isActiveBoolean : 'unchanged'}, hasFile=${!!(templateFile && templateFile.buffer && templateFile.buffer.length > 0)}`);
            
            template.updatedBy = parseInt(userId);
            const updatedTemplate = await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);

            if (!updatedTemplate) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UPDATE_NOT_POSSIBLE.message, APICodes.UPDATE_NOT_POSSIBLE.code);
            }

            // Create history record for the update
            const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                occupancyRequestTemplates: updatedTemplate,
                templateType: updatedTemplate.templateType,
                isActive: updatedTemplate.isActive,
                createdBy: parseInt(userId),
                updatedBy: parseInt(userId)
            });

            await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);

            logger.info(`Template updated successfully with ID: ${updatedTemplate.id}`);
            return updatedTemplate;
        } catch (error: any) {
            logger.error(`Error in updateTemplate: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Template History
     * @return {Promise<any>}
     * @throws {Error}
     * @param id
     */
    async getTemplateHistory(id: number) {
        try {
            logger.info(`Getting template history for template ID: ${id}`);

            const history = await AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                .createQueryBuilder('history')
                .leftJoinAndSelect('history.occupancyRequestTemplates', 'template')
                .where('history.occupancyRequestTemplates.id = :id', { id })
                .andWhere('history.templateType IN (:...templateTypes)', { templateTypes: ['move-in', 'move-out'] })
                .orderBy('history.createdAt', 'DESC')
                .getMany();

            if (!history || history.length === 0) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            logger.info(`Successfully retrieved ${history.length} history records for template ID ${id}`);
            return history;
        } catch (error: any) {
            logger.error(`Error in getTemplateHistory: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Unified History
     * @return {Promise<any>}
     * @throws {Error}
     * @param templateType
     * @param id
     */
    async getUnifiedHistory(templateType: string, id: number) {
        logger.info(`Getting unified history for templateType: ${templateType}, id: ${id}`);
        
        if (!AppDataSource.isInitialized) {
            logger.error('Database connection not available');
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.INTERNAL_SERVER_ERROR.message, APICodes.INTERNAL_SERVER_ERROR.code);
        }

        logger.info(`Database connection status: ${AppDataSource.isInitialized}`);
        logger.info(`Database driver: ${AppDataSource.driver.constructor.name}`);

        let history;
        let queryBuilder;
        
        try {
            switch (templateType) {
            case 'move-in':
            case 'move-out':
                // For move-in and move-out templates
                queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                    .createQueryBuilder('history')
                    .addSelect('history.createdAt')
                    .addSelect('history.updatedAt')
                    .addSelect('history.createdBy')
                    .addSelect('history.updatedBy')
                    .addSelect('history.masterCommunityId')
                    .addSelect('history.communityId')
                    .addSelect('history.towerId')
                    .addSelect('history.templateString')
                    .addSelect('history.isActive')
                    .addSelect('history.mipRecipients')
                    .addSelect('history.mopRecipients')
                    .where('history.occupancyRequestTemplatesId = :id', { id })
                    .andWhere('history.templateType = :templateType', { templateType })
                    .orderBy('history.createdAt', 'DESC');
                
                logger.info(`Executing query for ${templateType}: ${queryBuilder.getSql()}`);
                logger.info(`Query parameters: id=${id}, templateType=${templateType}`);
                try {
                    history = await queryBuilder.getMany();
                } catch (queryError: any) {
                    logger.error(`Query execution error for ${templateType}: ${JSON.stringify(queryError)}`);
                    logger.error(`Query error stack: ${queryError.stack}`);
                    throw queryError;
                }
                break;
                
            case 'welcome-pack':
                // For welcome pack templates
                queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                    .createQueryBuilder('history')
                    .addSelect('history.createdAt')
                    .addSelect('history.updatedAt')
                    .addSelect('history.createdBy')
                    .addSelect('history.updatedBy')
                    .addSelect('history.masterCommunityId')
                    .addSelect('history.communityId')
                    .addSelect('history.towerId')
                    .addSelect('history.templateString')
                    .addSelect('history.isActive')
                    .addSelect('history.mipRecipients')
                    .addSelect('history.mopRecipients')
                    .where('history.occupancyRequestWelcomePackId = :id', { id })
                    .andWhere('history.templateType = :templateType', { templateType })
                    .orderBy('history.createdAt', 'DESC');
                
                logger.info(`Executing query for ${templateType}: ${queryBuilder.getSql()}`);
                logger.info(`Query parameters: id=${id}, templateType=${templateType}`);
                try {
                    history = await queryBuilder.getMany();
                } catch (queryError: any) {
                    logger.error(`Query execution error for ${templateType}: ${JSON.stringify(queryError)}`);
                    logger.error(`Query error stack: ${queryError.stack}`);
                    throw queryError;
                }
                break;
                
            case 'recipient-mail':
                // For email recipient templates
                queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                    .createQueryBuilder('history')
                    .addSelect('history.createdAt')
                    .addSelect('history.updatedAt')
                    .addSelect('history.createdBy')
                    .addSelect('history.updatedBy')
                    .addSelect('history.masterCommunityId')
                    .addSelect('history.communityId')
                    .addSelect('history.towerId')
                    .addSelect('history.templateString')
                    .addSelect('history.isActive')
                    .addSelect('history.mipRecipients')
                    .addSelect('history.mopRecipients')
                    .where('history.occupancyRequestEmailRecipientsId = :id', { id })
                    .andWhere('history.templateType = :templateType', { templateType })
                    .orderBy('history.createdAt', 'DESC');
                
                logger.info(`Executing query for ${templateType}: ${queryBuilder.getSql()}`);
                logger.info(`Query parameters: id=${id}, templateType=${templateType}`);
                try {
                    history = await queryBuilder.getMany();
                } catch (queryError: any) {
                    logger.error(`Query execution error for ${templateType}: ${JSON.stringify(queryError)}`);
                    logger.error(`Query error stack: ${queryError.stack}`);
                    throw queryError;
                }
                break;
                
            default:
                logger.error(`Unsupported template type: ${templateType}`);
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
            }
            
            if (!history || history.length === 0) {
                logger.info(`No history found for templateType: ${templateType}, id: ${id}`);
                return [];
            }
            
            logger.info(`Found ${history.length} history records for templateType: ${templateType}, id: ${id}`);
            
            // Transform the data to include nested objects for masterCommunity, community, and tower
            const transformedHistory = history.map((record: any) => {
                const transformed: any = {
                    id: record.id,
                    templateType: record.templateType,
                    templateString: record.templateString,
                    isActive: record.isActive,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt,
                    createdBy: record.createdBy,
                    updatedBy: record.updatedBy,
                    mipRecipients: record.mipRecipients,
                    mopRecipients: record.mopRecipients
                };

                // Add nested objects for masterCommunity, community, and tower using IDs
                if (record.masterCommunityId) {
                    transformed.masterCommunity = {
                        id: record.masterCommunityId,
                        name: 'Unknown' // You can fetch this separately if needed
                    };
                }

                if (record.communityId) {
                    transformed.community = {
                        id: record.communityId,
                        name: 'Unknown' // You can fetch this separately if needed
                    };
                }

                if (record.towerId) {
                    transformed.tower = {
                        id: record.towerId,
                        name: 'Unknown' // You can fetch this separately if needed
                    };
                }

                // Add the specific template relationship based on type
                switch (templateType) {
                    case 'move-in':
                    case 'move-out':
                        if (record.occupancyRequestTemplates) {
                            transformed.occupancyRequestTemplates = record.occupancyRequestTemplates;
                        }
                        break;
                    case 'welcome-pack':
                        if (record.occupancyRequestWelcomePack) {
                            transformed.occupancyRequestWelcomePack = record.occupancyRequestWelcomePack;
                        }
                        break;
                    case 'recipient-mail':
                        if (record.occupancyRequestEmailRecipients) {
                            transformed.occupancyRequestEmailRecipients = record.occupancyRequestEmailRecipients;
                        }
                        break;
                }

                return transformed;
            });
            
            logger.info(`Successfully transformed ${transformedHistory.length} history records`);
            return transformedHistory;
        } catch (error: any) {
            logger.error(`Error in getUnifiedHistory: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Email Recipients List
     * @return {Promise<any>}
     * @throws {Error}
     * @param query
     */
    async getEmailRecipientsList(query: any) {
        try {
            logger.info(`Starting getEmailRecipientsList with query: ${JSON.stringify(query)}`);

            const { page = 1, per_page = 20, search = '', masterCommunityIds = '', communityIds = '', towerIds = '', isActive, startDate, endDate, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

            // Parse comma-separated IDs and filter out empty values
            const parseIds = (ids: string) => {
                if (!ids || ids.trim() === '') return [];
                return ids.split(',').filter((e: any) => e && e.trim() !== '');
            };

            const parsedMasterCommunityIds = parseIds(masterCommunityIds);
            const parsedCommunityIds = parseIds(communityIds);
            const parsedTowerIds = parseIds(towerIds);

            logger.info(`Parsed IDs - masterCommunityIds: ${JSON.stringify(parsedMasterCommunityIds)}, communityIds: ${JSON.stringify(parsedCommunityIds)}, towerIds: ${JSON.stringify(parsedTowerIds)}`);

            // Query email recipients directly instead of history table
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                .createQueryBuilder('recipients')
                .leftJoinAndSelect('recipients.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('recipients.community', 'community')
                .leftJoinAndSelect('recipients.tower', 'tower')
                .select([
                    'recipients.id',
                    'recipients.mipRecipients',
                    'recipients.mopRecipients',
                    'recipients.isActive',
                    'recipients.createdAt',
                    'recipients.updatedAt',
                    'recipients.createdBy',
                    'recipients.updatedBy',
                    'masterCommunity.id',
                    'masterCommunity.name',
                    'community.id',
                    'community.name',
                    'tower.id',
                    'tower.name'
                ]);

            // Add filtering by master community - only if IDs are provided
            if (parsedMasterCommunityIds && parsedMasterCommunityIds.length > 0) {
                queryBuilder.andWhere('recipients.masterCommunity.id IN (:...masterCommunityIds)', { masterCommunityIds: parsedMasterCommunityIds });
            }

            // Add filtering by community - only if IDs are provided
            if (parsedCommunityIds && parsedCommunityIds.length > 0) {
                queryBuilder.andWhere('recipients.community.id IN (:...communityIds)', { communityIds: parsedCommunityIds });
            }

            // Add filtering by tower - only if IDs are provided
            if (parsedTowerIds && parsedTowerIds.length > 0) {
                queryBuilder.andWhere('recipients.tower.id IN (:...towerIds)', { towerIds: parsedTowerIds });
            }

            // Add search functionality
            if (search && search.trim() !== '') {
                queryBuilder.andWhere(
                    '(masterCommunity.name LIKE :search OR community.name LIKE :search OR tower.name LIKE :search OR recipients.mipRecipients LIKE :search OR recipients.mopRecipients LIKE :search)',
                    { search: `%${search.trim()}%` }
                );
            }

            // Add active status filtering
            if (isActive !== undefined && isActive !== '') {
                queryBuilder.andWhere('recipients.isActive = :isActive', { isActive: isActive === 'true' || isActive === true });
            }

            // Add date range filtering
            if (startDate && startDate.trim() !== '') {
                queryBuilder.andWhere('DATE(recipients.createdAt) >= DATE(:startDate)', { startDate });
            }

            if (endDate && endDate.trim() !== '') {
                queryBuilder.andWhere('DATE(recipients.createdAt) <= DATE(:endDate)', { endDate });
            }

            // Add sorting
            queryBuilder.orderBy(`recipients.${sortBy}`, sortOrder);

            // Get total count for pagination
            logger.info('Getting total count...');
            const total = await queryBuilder.getCount();
            logger.info(`Total count: ${total}`);

            // Add pagination
            const offset = (page - 1) * per_page;
            const recipients = await queryBuilder
                .skip(offset)
                .take(per_page)
                .getMany();

            logger.info(`Query executed successfully, got ${recipients.length} recipients out of ${total} total`);

            const pagination = getPaginationInfo(page, per_page, total);

            return { officialRecipients: recipients, pagination };
        } catch (error: any) {
            logger.error(`Error in getEmailRecipientsList: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Create Email Recipients
     * @return {Promise<OccupancyRequestEmailRecipients>}
     * @throws {Error}
     * @param data
     * @param userId
     */
    async createEmailRecipients(data: any, userId: number) {
        try {
            logger.info(`Starting createEmailRecipients with data: ${JSON.stringify(data)}`);

            const { masterCommunityId, communityId, towerId, mipRecipients, mopRecipients, isActive = true } = data;

            // Validate email format for MIP recipients
            if (mipRecipients && mipRecipients.trim() !== '') {
                const mipEmails = mipRecipients.split(',').map((email: string) => email.trim());
                for (const email of mipEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                    }
                }
            }

            // Validate email format for MOP recipients
            if (mopRecipients && mopRecipients.trim() !== '') {
                const mopEmails = mopRecipients.split(',').map((email: string) => email.trim());
                for (const email of mopEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                    }
                }
            }

            // Check if there's already an active configuration for the same combination
            const existingRecipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                .createQueryBuilder('recipients')
                .leftJoinAndSelect('recipients.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('recipients.community', 'community')
                .leftJoinAndSelect('recipients.tower', 'tower')
                .where('masterCommunity.id = :masterCommunityId', { masterCommunityId })
                .andWhere('community.id = :communityId', { communityId });

            if (towerId) {
                existingRecipients.andWhere('tower.id = :towerId', { towerId });
            } else {
                existingRecipients.andWhere('tower.id IS NULL');
            }

            const existing = await existingRecipients.getOne();

            if (existing) {
                // Deactivate the existing record first
                existing.isActive = false;
                existing.updatedBy = userId;
                await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(existing);
                
                // Create history record for the deactivated record
                try {
                    const deactivatedHistoryRecord = new OccupancyRequestTemplateHistory();
                    deactivatedHistoryRecord.templateType = 'recipient-mail';
                    deactivatedHistoryRecord.occupancyRequestEmailRecipients = existing;
                    deactivatedHistoryRecord.mipRecipients = existing.mipRecipients;
                    deactivatedHistoryRecord.mopRecipients = existing.mopRecipients;
                    deactivatedHistoryRecord.isActive = false; // Deactivated
                    deactivatedHistoryRecord.masterCommunityId = existing.masterCommunity.id;
                    deactivatedHistoryRecord.communityId = existing.community.id;
                    deactivatedHistoryRecord.towerId = existing.tower ? existing.tower.id : null;
                    deactivatedHistoryRecord.createdBy = userId;
                    deactivatedHistoryRecord.updatedBy = userId;

                    await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(deactivatedHistoryRecord);
                    logger.info('History record created for deactivated recipient');
                } catch (historyError: any) {
                    logger.error(`Error creating history record for deactivated recipient: ${JSON.stringify(historyError)}`);
                    // Continue with the main operation even if history creation fails
                }

                logger.info(`Deactivated existing email recipient with ID ${existing.id}`);
            }

            // Create new email recipients
            try {
                // First, let's check if the referenced entities exist
                const masterCommunity = await AppDataSource.getRepository(MasterCommunities).findOne({ where: { id: masterCommunityId } });
                if (!masterCommunity) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.MASTER_COMMUNITY_NOT_FOUND.message, APICodes.MASTER_COMMUNITY_NOT_FOUND.code);
                }

                const community = await AppDataSource.getRepository(Communities).findOne({ where: { id: communityId } });
                if (!community) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.COMMUNITY_NOT_FOUND.message, APICodes.COMMUNITY_NOT_FOUND.code);
                }

                let tower = null;
                if (towerId) {
                    tower = await AppDataSource.getRepository(Towers).findOne({ where: { id: towerId } });
                    if (!tower) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.TOWER_NOT_FOUND.message, APICodes.TOWER_NOT_FOUND.code);
                    }
                }

                // Create new email recipients using direct entity creation
                const recipients = new OccupancyRequestEmailRecipients();
                recipients.masterCommunity = masterCommunity;
                recipients.community = community;
                if (tower) {
                    recipients.tower = tower;
                }
                recipients.mipRecipients = mipRecipients.trim();
                recipients.mopRecipients = mopRecipients.trim();
                recipients.isActive = isActive;
                recipients.createdBy = userId;
                recipients.updatedBy = userId; // Add the missing updatedBy field

                const savedRecipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(recipients);

                // Create template history record for email recipients
                const historyRecord = new OccupancyRequestTemplateHistory();
                historyRecord.templateType = 'recipient-mail';
                historyRecord.occupancyRequestEmailRecipients = savedRecipients;
                historyRecord.mipRecipients = savedRecipients.mipRecipients;
                historyRecord.mopRecipients = savedRecipients.mopRecipients;
                historyRecord.isActive = savedRecipients.isActive;
                historyRecord.masterCommunityId = savedRecipients.masterCommunity.id;
                historyRecord.communityId = savedRecipients.community.id;
                historyRecord.towerId = savedRecipients.tower ? savedRecipients.tower.id : null;
                historyRecord.createdBy = userId;
                historyRecord.updatedBy = userId;

                try {
                    await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                    logger.info('History record created successfully');
                } catch (historyError: any) {
                    logger.error(`Error creating history record: ${JSON.stringify(historyError)}`);
                    logger.error(`History record data: ${JSON.stringify(historyRecord)}`);
                    // Continue with the main operation even if history creation fails
                    logger.warn('Continuing without history record due to error');
                }

                logger.info('Email recipients created successfully');
                return savedRecipients;
            } catch (saveError: any) {
                logger.error(`Error saving email recipients: ${JSON.stringify(saveError)}`);
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.INTERNAL_SERVER_ERROR.message, APICodes.INTERNAL_SERVER_ERROR.code);
            }
        } catch (error: any) {
            logger.error(`Error in createEmailRecipients: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Update Email Recipients
     * @return {Promise<OccupancyRequestEmailRecipients>}
     * @throws {Error}
     * @param id
     * @param data
     * @param userId
     */
    async updateEmailRecipients(id: number, data: any, userId: number) {
        try {
            logger.info(`Starting updateEmailRecipients with id: ${id}, data: ${JSON.stringify(data)}`);

            const recipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                .createQueryBuilder('recipients')
                .leftJoinAndSelect('recipients.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('recipients.community', 'community')
                .leftJoinAndSelect('recipients.tower', 'tower')
                .where('recipients.id = :id', { id })
                .getOne();

            if (!recipients) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            // Validate email format for MIP recipients if provided
            if (data.mipRecipients && data.mipRecipients.trim() !== '') {
                const mipEmails = data.mipRecipients.split(',').map((email: string) => email.trim());
                for (const email of mipEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                    }
                }
            }

            // Validate email format for MOP recipients if provided
            if (data.mopRecipients && data.mopRecipients.trim() !== '') {
                const mopEmails = data.mopRecipients.split(',').map((email: string) => email.trim());
                for (const email of mopEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.VALIDATION_ERROR.message, APICodes.VALIDATION_ERROR.code);
                    }
                }
            }

            // If setting to active, check for conflicts and deactivate existing ones
            if (data.isActive === true) {
                const queryBuilder = AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                    .createQueryBuilder('recipients')
                    .where('recipients.id != :id', { id })
                    .andWhere('recipients.masterCommunity.id = :masterCommunityId', { masterCommunityId: recipients.masterCommunity.id })
                    .andWhere('recipients.community.id = :communityId', { communityId: recipients.community.id })
                    .andWhere('recipients.isActive = :isActive', { isActive: true });

                if (recipients.tower) {
                    queryBuilder.andWhere('recipients.tower.id = :towerId', { towerId: recipients.tower.id });
                } else {
                    queryBuilder.andWhere('recipients.tower.id IS NULL');
                }

                const existingRecipients = await queryBuilder.getMany();

                if (existingRecipients.length > 0) {
                    // Create history records for existing recipients before deactivating
                    for (const existing of existingRecipients) {
                        try {
                            const historyRecord = new OccupancyRequestTemplateHistory();
                            historyRecord.templateType = 'recipient-mail';
                            historyRecord.occupancyRequestEmailRecipients = existing;
                            historyRecord.mipRecipients = existing.mipRecipients;
                            historyRecord.mopRecipients = existing.mopRecipients;
                            historyRecord.isActive = false; // Will be deactivated
                            historyRecord.masterCommunityId = existing.masterCommunity.id;
                            historyRecord.communityId = existing.community.id;
                            historyRecord.towerId = existing.tower ? existing.tower.id : null;
                            historyRecord.createdBy = userId;
                            historyRecord.updatedBy = userId;
                            
                            await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                            logger.info(`History record created for existing recipient ${existing.id}`);
                        } catch (historyError: any) {
                            logger.error(`Error creating history record for existing recipient ${existing.id}: ${JSON.stringify(historyError)}`);
                            // Continue with deactivation even if history creation fails
                        }
                    }

                    // Deactivate existing recipients
                    for (const existing of existingRecipients) {
                        existing.isActive = false;
                        existing.updatedBy = userId;
                        await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(existing);
                        logger.info(`Deactivated existing recipient ${existing.id}`);
                    }
                }
            }

            // Update recipients data
            if (data.mipRecipients !== undefined) {
                recipients.mipRecipients = data.mipRecipients.trim();
            }
            if (data.mopRecipients !== undefined) {
                recipients.mopRecipients = data.mopRecipients.trim();
            }
            if (data.isActive !== undefined) {
                recipients.isActive = data.isActive;
            }

            recipients.updatedBy = userId;

            // Save updated recipients
            const updatedRecipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(recipients);

            // Create history record for the updated recipient
            try {
                const historyRecord = new OccupancyRequestTemplateHistory();
                historyRecord.templateType = 'recipient-mail';
                historyRecord.occupancyRequestEmailRecipients = updatedRecipients;
                historyRecord.mipRecipients = updatedRecipients.mipRecipients;
                historyRecord.mopRecipients = updatedRecipients.mopRecipients;
                historyRecord.isActive = updatedRecipients.isActive;
                historyRecord.masterCommunityId = updatedRecipients.masterCommunity.id;
                historyRecord.communityId = updatedRecipients.community.id;
                historyRecord.towerId = updatedRecipients.tower ? updatedRecipients.tower.id : null;
                historyRecord.createdBy = userId;
                historyRecord.updatedBy = userId;

                await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                logger.info('History record created for updated recipient');
            } catch (historyError: any) {
                logger.error(`Error creating history record for updated recipient: ${JSON.stringify(historyError)}`);
                // Continue with the main operation even if history creation fails
            }

            logger.info('Email recipients updated successfully');
            return updatedRecipients;
        } catch (error: any) {
            logger.error(`Error in updateEmailRecipients: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    /**
     * Get Email Recipients History
     * @return {Promise<any>}
     * @throws {Error}
     * @param id
     */
    async getEmailRecipientsHistory(id: number) {
        try {
            const history = await AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                .createQueryBuilder('history')
                .leftJoinAndSelect('history.occupancyRequestEmailRecipients', 'recipients')
                .where('recipients.id = :id', { id })
                .andWhere('history.templateType = :templateType', { templateType: 'recipient-mail' })
                .orderBy('history.createdAt', 'DESC')
                .getMany();

            return history;
        } catch (error: any) {
            logger.error(`Error in getEmailRecipientsHistory: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }







    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Welcome Kit PDF Generation Methods
    async generateWelcomeKitPDF(data: WelcomeKitData): Promise<Buffer> {
        try {
            logger.info(`Generating Welcome Kit PDF with data: ${JSON.stringify(data)}`);
            
            const welcomeKitService = new WelcomeKitService();
            const pdfBuffer = await welcomeKitService.generateWelcomeKitPDF(data);
            
            logger.info('Welcome Kit PDF generated successfully');
            return pdfBuffer;
        } catch (error: any) {
            logger.error(`Error in generateWelcomeKitPDF: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async generateWelcomeKitPDFFromTemplate(templateId: number, data: Partial<WelcomeKitData>): Promise<Buffer> {
        try {
            logger.info(`Generating Welcome Kit PDF from template ID: ${templateId} with data: ${JSON.stringify(data)}`);
            
            // Get template data from database
            const template = await this.getWelcomePackById(templateId, true);
            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.TEMPLATE_NOT_FOUND.message, APICodes.TEMPLATE_NOT_FOUND.code);
            }

            // Merge template data with provided data
            const mergedData: WelcomeKitData = {
                residentName: data.residentName || APICodes.DEFAULT_RESIDENT_NAME.message,
                unitNumber: data.unitNumber || APICodes.DEFAULT_UNIT_NUMBER.message,
                buildingName: data.buildingName || APICodes.DEFAULT_BUILDING_NAME.message,
                communityName: data.communityName || APICodes.DEFAULT_COMMUNITY_NAME.message,
                masterCommunityName: data.masterCommunityName || APICodes.DEFAULT_MASTER_COMMUNITY_NAME.message,
                dateOfIssue: data.dateOfIssue || new Date().toLocaleDateString('en-GB'),
                moveInDate: data.moveInDate || APICodes.DEFAULT_MOVE_IN_DATE.message,
                referenceNumber: data.referenceNumber || `WK-${Date.now()}`,
                contactNumber: data.contactNumber || APICodes.DEFAULT_CONTACT_NUMBER.message
            };

            return await this.generateWelcomeKitPDF(mergedData);
        } catch (error: any) {
            logger.error(`Error in generateWelcomeKitPDFFromTemplate: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

}