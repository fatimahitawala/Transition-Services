import { AppDataSource } from '../../Common/data-source';
import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { OccupancyRequestTemplates } from '../../Entities/OccupancyRequestTemplates.entity';
import { OccupancyRequestTemplateHistory } from '../../Entities/OccupancyRequestTemplateHistory.entity';
import { OccupancyRequestEmailRecipients } from '../../Entities/OccupancyRequestEmailRecipients.entity';
import { OccupancyRequestEmailRecipientsHistory } from '../../Entities/OccupancyRequestEmailRecipientsHistory.entity';
import ApiError from '../../Common/Utils/ApiError';
import { APICodes } from '../../Common/Constants/apiCodes.en';
import { logger } from '../../Common/Utils/logger';
import httpStatus from 'http-status';

export class DocumentsService {

    health() {
        return {
            status: 'OK',
            message: 'Documents service is running',
            timestamp: new Date().toISOString()
        };
    }

    // Welcome Pack Methods
    async getWelcomePackList(query: any) {
        try {
            logger.info(`Starting getWelcomePackList with query: ${JSON.stringify(query)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                logger.info('Database not initialized, attempting to initialize...');
                await AppDataSource.initialize();
                logger.info('Database initialized successfully');
            }
            
            let { page = 1, per_page = 20, masterCommunityIds = '', communityIds = '', towerIds = '', search = '', isActive, startDate, endDate, sortBy = 'createdAt', sortOrder = 'DESC', includeFile = false } = query;

            // Validate that masterCommunityIds is provided
            if (!masterCommunityIds || masterCommunityIds.trim() === '') {
                throw new ApiError(httpStatus.BAD_REQUEST, 'masterCommunityIds is required', 'EC400');
            }

            // Parse comma-separated IDs and filter out empty values
            const parseIds = (ids: string) => {
                if (!ids || ids.trim() === '') return [];
                return ids.split(',').filter((e: any) => e && e.trim() !== '');
            };

            masterCommunityIds = parseIds(masterCommunityIds);
            communityIds = parseIds(communityIds);
            towerIds = parseIds(towerIds);

            // Ensure masterCommunityIds has at least one valid ID
            if (masterCommunityIds.length === 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'At least one valid masterCommunityId is required', 'EC400');
            }

            logger.info(`Parsed IDs - masterCommunityIds: ${JSON.stringify(masterCommunityIds)}, communityIds: ${JSON.stringify(communityIds)}, towerIds: ${JSON.stringify(towerIds)}`);

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            logger.info('Repository obtained successfully');
            
            // Start with a simple query to test basic functionality
            let getWelcomePackList = welcomePackRepository.createQueryBuilder('welcomePack');
            
            // Handle field selection based on includeFile parameter
            if (includeFile === 'true' || includeFile === true) {
                // When includeFile is true, select all fields including templateString
                getWelcomePackList.addSelect('welcomePack.templateString');
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString)
                getWelcomePackList.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.isActive',
                    'welcomePack.createdAt',
                    'welcomePack.updatedAt',
                    'welcomePack.createdBy',
                    'welcomePack.updatedBy'
                ]);
            }

            // Base condition - show all records by default, filter by isActive only when specified
            let whereClause = "1=1";
            let whereParams: any = {};
            
            if (isActive !== undefined && isActive !== '') {
                whereClause += " AND welcomePack.isActive = :isActive";
                whereParams.isActive = isActive === 'true' || isActive === true;
            }

            // Add filtering by master community - required
            whereClause += " AND welcomePack.masterCommunityId IN (:...masterCommunityIds)";
            whereParams.masterCommunityIds = masterCommunityIds;

            // Add filtering by community - only if IDs are provided
            if (communityIds && communityIds.length > 0) {
                whereClause += " AND welcomePack.communityId IN (:...communityIds)";
                whereParams.communityIds = communityIds;
            }

            // Add filtering by tower - only if IDs are provided
            if (towerIds && towerIds.length > 0) {
                whereClause += " AND welcomePack.towerId IN (:...towerIds)";
                whereParams.towerIds = towerIds;
            }

            // Add search functionality
            if (search && search.trim() !== '') {
                whereClause += " AND (welcomePack.masterCommunityId IN (SELECT id FROM master_communities WHERE name LIKE :search) OR welcomePack.communityId IN (SELECT id FROM communities WHERE name LIKE :search) OR welcomePack.towerId IN (SELECT id FROM towers WHERE name LIKE :search))";
                whereParams.search = `%${search.trim()}%`;
            }

            // Add date range filtering
            if (startDate && startDate.trim() !== '') {
                whereClause += " AND DATE(welcomePack.createdAt) >= DATE(:startDate)";
                whereParams.startDate = startDate;
            }

            if (endDate && endDate.trim() !== '') {
                whereClause += " AND DATE(welcomePack.createdAt) <= DATE(:endDate)";
                whereParams.endDate = endDate;
            }

            logger.info(`Where clause: ${whereClause}`);
            logger.info(`Where params: ${JSON.stringify(whereParams)}`);

            getWelcomePackList.where(whereClause, whereParams);

            // Add sorting
            getWelcomePackList.orderBy(`welcomePack.${sortBy}`, sortOrder);

            // Get total count for pagination
            logger.info('Getting total count...');
            const totalCount = await getWelcomePackList.getCount();
            logger.info(`Total count: ${totalCount}`);

            // Add pagination
            const offset = (page - 1) * per_page;
            getWelcomePackList.skip(offset).take(per_page);

            // Execute query
            logger.info('Executing query...');
            const data = await getWelcomePackList.getMany();
            logger.info(`Query executed successfully, got ${data.length} records`);

            // Format response data - simplified without joins for now
            const formattedData = data.map((item: any) => ({
                id: item.id,
                masterCommunityId: item.masterCommunityId,
                communityId: item.communityId,
                towerId: item.towerId,
                templateString: item.templateString,
                isActive: item.isActive,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                createdBy: item.createdBy,
                updatedBy: item.updatedBy
            }));

            logger.info('Data formatted successfully');

            return {
                data: formattedData,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / per_page),
                    totalItems: totalCount,
                    itemsPerPage: per_page
                }
            };
        } catch (error: any) {
            logger.error(`Error in getWelcomePackList: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error.stack}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async createWelcomePack(data: any, file: any, userId: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const { masterCommunityId, communityId, towerId, isActive = true } = data;

            // Validate file
            if (!file) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'File is required');
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'File size must be less than 10MB');
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Only PDF and HTML files are allowed');
            }

            // Deactivate existing active welcome packs for the same combination
            const existingWelcomePack = await AppDataSource.getRepository(OccupancyRequestWelcomePack)
                .createQueryBuilder('welcomePack')
                .where('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId })
                .andWhere('welcomePack.communityId = :communityId', { communityId })
                .andWhere('welcomePack.isActive = :isActive', { isActive: true });

            if (towerId) {
                existingWelcomePack.andWhere('welcomePack.towerId = :towerId', { towerId });
            } else {
                existingWelcomePack.andWhere('welcomePack.towerId IS NULL');
            }

            const existingPack = await existingWelcomePack.getOne();

            if (existingPack) {
                existingPack.isActive = false;
                existingPack.updatedBy = userId;
                await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(existingPack);
            }

            // Create new welcome pack
            const welcomePackData: any = {
                masterCommunityId,
                communityId,
                templateString: file.buffer,
                isActive,
                createdBy: userId
            };

            if (towerId) {
                welcomePackData.towerId = towerId;
            }

            const welcomePack = AppDataSource.getRepository(OccupancyRequestWelcomePack).create(welcomePackData);
            const savedWelcomePack = await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(welcomePack);

            return savedWelcomePack;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in createWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getWelcomePackById(id: number, includeFile: boolean = false) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            let queryBuilder = welcomePackRepository.createQueryBuilder('welcomePack')
                .where('welcomePack.id = :id', { id });

            if (includeFile) {
                // When includeFile is true, select all fields including templateString
                queryBuilder.addSelect('welcomePack.templateString');
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString)
                queryBuilder.select([
                    'welcomePack.id',
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'welcomePack.isActive',
                    'welcomePack.createdAt',
                    'welcomePack.updatedAt',
                    'welcomePack.createdBy',
                    'welcomePack.updatedBy'
                ]);
            }

            const welcomePack = await queryBuilder.getOne();

            if (!welcomePack) {
                throw new ApiError(APICodes.NOT_FOUND, 'Welcome pack not found');
            }

            return welcomePack;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in getWelcomePackById: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async downloadWelcomePackFile(id: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const welcomePack = await this.getWelcomePackById(id, true);

            if (!welcomePack.templateString) {
                throw new ApiError(APICodes.NOT_FOUND, 'Welcome pack file not found');
            }

            let contentType = 'application/octet-stream';
            let fileName = `welcome-pack-${id}`;

            // Try to determine if it's PDF or HTML based on content
            if (Buffer.isBuffer(welcomePack.templateString)) {
                // Check if it's a PDF by looking at the first few bytes
                if (welcomePack.templateString.length >= 4 && 
                    welcomePack.templateString[0] === 0x25 && 
                    welcomePack.templateString[1] === 0x50 && 
                    welcomePack.templateString[2] === 0x44 && 
                    welcomePack.templateString[3] === 0x46) {
                    contentType = 'application/pdf';
                    fileName += '.pdf';
                } else {
                    contentType = 'text/html';
                    fileName += '.html';
                }
            }

            return {
                buffer: welcomePack.templateString,
                contentType,
                fileName
            };
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in downloadWelcomePackFile: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async updateWelcomePack(id: number, data: any, file: any, userId: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const welcomePack = await this.getWelcomePackById(id);

            // If updating to active, deactivate other active welcome packs for the same combination
            if (data.isActive === true) {
                const queryBuilder = AppDataSource.getRepository(OccupancyRequestWelcomePack)
                    .createQueryBuilder('welcomePack')
                    .where('welcomePack.id != :id', { id })
                    .andWhere('welcomePack.masterCommunityId = :masterCommunityId', { masterCommunityId: welcomePack.masterCommunityId })
                    .andWhere('welcomePack.communityId = :communityId', { communityId: welcomePack.communityId })
                    .andWhere('welcomePack.isActive = :isActive', { isActive: true });

                if (welcomePack.towerId) {
                    queryBuilder.andWhere('welcomePack.towerId = :towerId', { towerId: welcomePack.towerId });
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
                    }
                }
            }

            // Update welcome pack data
            if (file) {
                // Validate file type and size
                if (file.size > 10 * 1024 * 1024) { // 10MB
                    throw new ApiError(APICodes.UNKNOWN_ERROR, 'File size must be less than 10MB');
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(file.mimetype)) {
                    throw new ApiError(APICodes.UNKNOWN_ERROR, 'Only PDF and HTML files are allowed');
                }

                data.templateString = file.buffer;
            }

            data.updatedBy = userId;

            // Update the welcome pack
            Object.assign(welcomePack, data);
            const updatedWelcomePack = await AppDataSource.getRepository(OccupancyRequestWelcomePack).save(welcomePack);

            if (!updatedWelcomePack) {
                throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, 'Failed to update welcome pack');
            }

            return updatedWelcomePack;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in updateWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getActiveWelcomePack(masterCommunityId: number, communityId: number, towerId?: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

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
                throw new ApiError(APICodes.NOT_FOUND, 'No active welcome pack found for the specified combination');
            }

            return welcomePack;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in getActiveWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async ensureDataConsistency() {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

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
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    // Consolidated template service methods
    async getTemplateList(query: any, userId: string) {
        try {
            logger.info(`Starting getTemplateList with query: ${JSON.stringify(query)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const { page = 1, per_page = 20, search, masterCommunityIds = '', communityIds = '', towerIds = '', templateType, includeFile = false, sortBy = 'createdAt', sortOrder = 'DESC', isActive } = query;

            // Parse comma-separated IDs and filter out empty values
            const parseIds = (ids: string) => {
                if (!ids || ids.trim() === '') return [];
                return ids.split(',').filter((e: any) => e && e.trim() !== '');
            };

            const parsedMasterCommunityIds = parseIds(masterCommunityIds);
            const parsedCommunityIds = parseIds(communityIds);
            const parsedTowerIds = parseIds(towerIds);

            logger.info(`Parsed IDs - masterCommunityIds: ${JSON.stringify(parsedMasterCommunityIds)}, communityIds: ${JSON.stringify(parsedCommunityIds)}, towerIds: ${JSON.stringify(parsedTowerIds)}`);

            // Start with a simple query to test basic functionality
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.templateType IN (:...templateTypes)', { templateTypes: ['move-in', 'move-out'] });

            // Handle field selection based on includeFile parameter
            if (includeFile === 'true' || includeFile === true) {
                // When includeFile is true, select all fields including templateString
                queryBuilder.addSelect('template.templateString');
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString)
                queryBuilder.select([
                    'template.id',
                    'template.templateType',
                    'template.isActive',
                    'template.createdAt',
                    'template.updatedAt',
                    'template.createdBy',
                    'template.updatedBy',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId'
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

            // Add template type filtering
            if (templateType) {
                queryBuilder.andWhere('template.templateType = :templateType', { templateType });
            }

            // Add active status filtering
            if (isActive !== undefined && isActive !== '') {
                queryBuilder.andWhere('template.isActive = :isActive', { isActive: isActive === 'true' || isActive === true });
            }

            // Add sorting
            queryBuilder.orderBy(`template.${sortBy}`, sortOrder);

            // Get total count for pagination
            logger.info('Getting total count...');
            const total = await queryBuilder.getCount();
            logger.info(`Total count: ${total}`);

            // Add pagination
            const offset = (page - 1) * per_page;
            const templates = await queryBuilder
                .skip(offset)
                .take(per_page)
                .getMany();

            logger.info(`Query executed successfully, got ${templates.length} templates out of ${total} total`);

            // Note: File content handling is now done at the query level
            // When includeFile is false, templateString is not selected
            // When includeFile is true, templateString is selected and returned as-is

            return {
                templates,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / per_page),
                    totalItems: total,
                    itemsPerPage: per_page
                }
            };
        } catch (error: any) {
            logger.error(`Error in getTemplateList: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error.stack}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async createTemplate(data: any, templateFile: any, userId: string) {
        try {
            logger.info(`Starting createTemplate with data: ${JSON.stringify(data)}`);
            logger.info(`Template file info: ${JSON.stringify({
                originalname: templateFile?.originalname,
                mimetype: templateFile?.mimetype,
                size: templateFile?.size,
                bufferLength: templateFile?.buffer?.length
            })}`);
            logger.info(`User ID: ${userId}`);

            // Convert form data to proper types
            const masterCommunityId = parseInt(data.masterCommunityId);
            const communityId = parseInt(data.communityId);
            const towerId = data.towerId ? parseInt(data.towerId) : null;
            const templateType = data.templateType;
            const isActive = data.isActive === 'true' || data.isActive === true;

            // Validate converted data
            if (isNaN(masterCommunityId)) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Invalid masterCommunityId: must be a number');
            }
            if (isNaN(communityId)) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Invalid communityId: must be a number');
            }
            if (data.towerId && towerId !== null && isNaN(towerId)) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Invalid towerId: must be a number');
            }

            logger.info(`Converted data - masterCommunityId: ${masterCommunityId} (${typeof masterCommunityId}), communityId: ${communityId} (${typeof communityId}), towerId: ${towerId} (${typeof towerId}), templateType: ${templateType}, isActive: ${isActive} (${typeof isActive})`);

            // Check database connection
            if (!AppDataSource.isInitialized) {
                logger.error('Database not initialized');
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Database connection not available');
            }

            // Validate file type and size
            if (!templateFile) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Template file is required');
            }

            if (templateFile.size > 10 * 1024 * 1024) { // 10MB
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'File size must be less than 10MB');
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(templateFile.mimetype)) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Only PDF and HTML files are allowed');
            }

            logger.info(`File validation passed. Checking for existing templates...`);

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

            logger.info(`Query built: ${queryBuilder.getQuery()}`);
            const existingTemplates = await queryBuilder.getMany();
            logger.info(`Found ${existingTemplates.length} existing templates`);

            if (existingTemplates.length > 0) {
                logger.info('Creating history records for existing templates...');
                // Create history records for existing templates
                for (const template of existingTemplates) {
                    try {
                        const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                            occupancyRequestTemplates: template,
                            templateType: template.templateType,
                            isActive: template.isActive,
                            createdBy: parseInt(userId),
                            updatedBy: parseInt(userId) // Add this line to fix the history table error
                        });
                        await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                        logger.info(`History record created for template ${template.id}`);
                    } catch (historyError) {
                        logger.error(`Error creating history record: ${JSON.stringify(historyError)}`);
                        throw historyError;
                    }
                }

                logger.info('Deactivating existing templates...');
                // Deactivate existing templates
                for (const template of existingTemplates) {
                    try {
                        template.isActive = false;
                        template.updatedBy = parseInt(userId);
                        await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);
                        logger.info(`Template ${(template as any).id} deactivated`);
                    } catch (deactivateError) {
                        logger.error(`Error deactivating template: ${JSON.stringify(deactivateError)}`);
                        throw deactivateError;
                    }
                }
            }

            logger.info('Creating new template...');
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

            logger.info(`Template data prepared: ${JSON.stringify({
                ...templateData,
                templateString: `Buffer of length ${templateData.templateString?.length}`
            })}`);

            let savedTemplate: any;
            try {
                const template = AppDataSource.getRepository(OccupancyRequestTemplates).create(templateData);
                logger.info('Template entity created, attempting to save...');
                savedTemplate = await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);
                logger.info(`Template saved successfully with ID: ${savedTemplate.id}`);
            } catch (saveError) {
                logger.error(`Error saving template: ${JSON.stringify(saveError)}`);
                throw saveError;
            }

            logger.info('Creating history record for new template...');
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
                logger.info('History record created successfully');
            } catch (historyError) {
                logger.error(`Error creating history record for new template: ${JSON.stringify(historyError)}`);
                throw historyError;
            }

            logger.info('Template creation completed successfully');
            return savedTemplate;
        } catch (error: any) {
            logger.error(`Error in createTemplate: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error.stack}`);
            logger.error(`Error name: ${error.name}`);
            logger.error(`Error message: ${error.message}`);
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getTemplateById(id: number, includeFile: boolean = false) {
        try {
            const templateRepository = AppDataSource.getRepository(OccupancyRequestTemplates);
            
            let queryBuilder = templateRepository.createQueryBuilder('template')
                .leftJoinAndSelect('template.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('template.community', 'community')
                .leftJoinAndSelect('template.tower', 'tower')
                .where('template.id = :id', { id });

            if (includeFile) {
                // When includeFile is true, select all fields including templateString
                queryBuilder.addSelect('template.templateString');
            } else {
                // When includeFile is false, explicitly select only the fields we want (excluding templateString)
                queryBuilder.select([
                    'template.id',
                    'template.templateType',
                    'template.isActive',
                    'template.createdAt',
                    'template.updatedAt',
                    'template.createdBy',
                    'template.updatedBy',
                    'template.masterCommunityId',
                    'template.communityId',
                    'template.towerId',
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
                throw new ApiError(APICodes.NOT_FOUND, 'Template not found');
            }

            return template;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in getTemplateById: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async downloadTemplateFile(id: number) {
        try {
            const template = await AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.id = :id', { id })
                .getOne();

            if (!template) {
                throw new ApiError(APICodes.NOT_FOUND, 'Template not found');
            }

            if (!template.templateString) {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Template file not found');
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
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in downloadTemplateFile: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async updateTemplate(id: number, data: any, templateFile: any, userId: string) {
        try {
            const template = await AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.id = :id', { id })
                .getOne();

            if (!template) {
                throw new ApiError(APICodes.NOT_FOUND, 'Template not found');
            }

            // Validate file if provided
            if (templateFile) {
                if (templateFile.size > 10 * 1024 * 1024) { // 10MB
                    throw new ApiError(APICodes.UNKNOWN_ERROR, 'File size must be less than 10MB');
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(templateFile.mimetype)) {
                    throw new ApiError(APICodes.UNKNOWN_ERROR, 'Only PDF and HTML files are allowed');
                }

                template.templateString = templateFile.buffer;
            }

            // Update other fields
            if (data.masterCommunityId) {
                template.masterCommunity = { id: data.masterCommunityId } as any;
            }
            if (data.communityId) {
                template.community = { id: data.communityId } as any;
            }
            if (data.towerId !== undefined) {
                template.tower = data.towerId ? { id: data.towerId } as any : null;
            }
            if (data.templateType) {
                template.templateType = data.templateType;
            }
            if (data.isActive !== undefined) {
                template.isActive = data.isActive;
            }

            template.updatedBy = parseInt(userId);

            // If setting to active, deactivate other templates for the same combination
            if (data.isActive === true) {
                const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                    .createQueryBuilder('template')
                    .where('template.id != :id', { id })
                    .andWhere('template.masterCommunity.id = :masterCommunityId', { masterCommunityId: template.masterCommunity.id })
                    .andWhere('template.community.id = :communityId', { communityId: template.community.id })
                    .andWhere('template.templateType = :templateType', { templateType: template.templateType })
                    .andWhere('template.isActive = :isActive', { isActive: true });

                if (template.tower) {
                    queryBuilder.andWhere('template.tower.id = :towerId', { towerId: template.tower.id });
                } else {
                    queryBuilder.andWhere('template.tower IS NULL');
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
                            updatedBy: parseInt(userId) // Add this line to fix the history table error
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

            // Save updated template
            const updatedTemplate = await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);

            if (!updatedTemplate) {
                throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, 'Failed to update template');
            }

            // Create history record
            const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                occupancyRequestTemplates: updatedTemplate,
                templateType: updatedTemplate.templateType,
                isActive: updatedTemplate.isActive,
                createdBy: parseInt(userId),
                updatedBy: parseInt(userId) // Add this line to fix the history table error
            });

            await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);

            return updatedTemplate;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in updateTemplate: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getTemplateHistory(id: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const history = await AppDataSource.getRepository(OccupancyRequestTemplateHistory)
                .createQueryBuilder('history')
                .leftJoinAndSelect('history.occupancyRequestTemplates', 'template')
                .where('template.id = :id', { id })
                .orderBy('history.createdAt', 'DESC')
                .getMany();

            return history;
        } catch (error: any) {
            logger.error(`Error in getTemplateHistory: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    // Email Recipients Methods
    async getEmailRecipientsList(query: any) {
        try {
            logger.info(`Starting getEmailRecipientsList with query: ${JSON.stringify(query)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

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

            return {
                officialRecipients: recipients,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / per_page),
                    totalItems: total,
                    itemsPerPage: per_page
                }
            };
        } catch (error: any) {
            logger.error(`Error in getEmailRecipientsList: ${JSON.stringify(error)}`);
            logger.error(`Error stack: ${error.stack}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async createEmailRecipients(data: any, userId: number) {
        try {
            logger.info(`Starting createEmailRecipients with data: ${JSON.stringify(data)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const { masterCommunityId, communityId, towerId, mipRecipients, mopRecipients, isActive = true } = data;

            // Validate email format for MIP recipients
            if (mipRecipients && mipRecipients.trim() !== '') {
                const mipEmails = mipRecipients.split(',').map((email: string) => email.trim());
                for (const email of mipEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(APICodes.UNKNOWN_ERROR, `Invalid email format for MIP recipient: ${email}`);
                    }
                }
            }

            // Validate email format for MOP recipients
            if (mopRecipients && mopRecipients.trim() !== '') {
                const mopEmails = mopRecipients.split(',').map((email: string) => email.trim());
                for (const email of mopEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(APICodes.UNKNOWN_ERROR, `Invalid email format for MOP recipient: ${email}`);
                    }
                }
            }

            // Check if there's already an active configuration for the same combination
            const existingRecipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                .createQueryBuilder('recipients')
                .where('recipients.masterCommunity.id = :masterCommunityId', { masterCommunityId })
                .andWhere('recipients.community.id = :communityId', { communityId })
                .andWhere('recipients.isActive = :isActive', { isActive: true });

            if (towerId) {
                existingRecipients.andWhere('recipients.tower.id = :towerId', { towerId });
            } else {
                existingRecipients.andWhere('recipients.tower IS NULL');
            }

            const existing = await existingRecipients.getOne();

            if (existing) {
                // Create error message
                let errorMessage = 'An active email recipient configuration already exists for ';
                if (towerId) {
                    errorMessage += `Master Community ID ${masterCommunityId}, Community ID ${communityId}, and Tower ID ${towerId}`;
                } else {
                    errorMessage += `Master Community ID ${masterCommunityId} and Community ID ${communityId}`;
                }
                errorMessage += '. Only one active configuration is allowed per combination.';
                
                throw new ApiError(APICodes.UNKNOWN_ERROR, errorMessage);
            }



            const recipients = new OccupancyRequestEmailRecipients();
            recipients.masterCommunity = { id: masterCommunityId } as any;
            recipients.community = { id: communityId } as any;
            recipients.mipRecipients = mipRecipients.trim();
            recipients.mopRecipients = mopRecipients.trim();
            recipients.isActive = isActive;
            recipients.createdBy = userId;
            
            if (towerId) {
                recipients.tower = { id: towerId } as any;
            }
            
            const savedRecipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(recipients);

            // Create history record
            const historyRecord = new OccupancyRequestEmailRecipientsHistory();
            historyRecord.occupancyRequestEmailRecipients = savedRecipients;
            historyRecord.mipRecipients = savedRecipients.mipRecipients;
            historyRecord.mopRecipients = savedRecipients.mopRecipients;
            historyRecord.isActive = savedRecipients.isActive;
            historyRecord.createdBy = userId;
            historyRecord.updatedBy = userId;

            await AppDataSource.getRepository(OccupancyRequestEmailRecipientsHistory).save(historyRecord);

            logger.info('Email recipients created successfully');
            return savedRecipients;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in createEmailRecipients: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async updateEmailRecipients(id: number, data: any, userId: number) {
        try {
            logger.info(`Starting updateEmailRecipients with id: ${id}, data: ${JSON.stringify(data)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const recipients = await AppDataSource.getRepository(OccupancyRequestEmailRecipients)
                .createQueryBuilder('recipients')
                .leftJoinAndSelect('recipients.masterCommunity', 'masterCommunity')
                .leftJoinAndSelect('recipients.community', 'community')
                .leftJoinAndSelect('recipients.tower', 'tower')
                .where('recipients.id = :id', { id })
                .getOne();

            if (!recipients) {
                throw new ApiError(APICodes.NOT_FOUND, 'Email recipients configuration not found');
            }

            // Validate email format for MIP recipients if provided
            if (data.mipRecipients && data.mipRecipients.trim() !== '') {
                const mipEmails = data.mipRecipients.split(',').map((email: string) => email.trim());
                for (const email of mipEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(APICodes.UNKNOWN_ERROR, `Invalid email format for MIP recipient: ${email}`);
                    }
                }
            }

            // Validate email format for MOP recipients if provided
            if (data.mopRecipients && data.mopRecipients.trim() !== '') {
                const mopEmails = data.mopRecipients.split(',').map((email: string) => email.trim());
                for (const email of mopEmails) {
                    if (!this.isValidEmail(email)) {
                        throw new ApiError(APICodes.UNKNOWN_ERROR, `Invalid email format for MOP recipient: ${email}`);
                    }
                }
            }

            // If setting to active, check for conflicts
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
                    queryBuilder.andWhere('recipients.tower IS NULL');
                }

                const existingRecipients = await queryBuilder.getMany();

                if (existingRecipients.length > 0) {
                    // Create history records for existing recipients
                    for (const existing of existingRecipients) {
                        const historyRecord = new OccupancyRequestEmailRecipientsHistory();
                        historyRecord.occupancyRequestEmailRecipients = existing;
                        historyRecord.mipRecipients = existing.mipRecipients;
                        historyRecord.mopRecipients = existing.mopRecipients;
                        historyRecord.isActive = existing.isActive;
                        historyRecord.createdBy = userId;
                        historyRecord.updatedBy = userId;
                        await AppDataSource.getRepository(OccupancyRequestEmailRecipientsHistory).save(historyRecord);
                    }

                    // Deactivate existing recipients
                    for (const existing of existingRecipients) {
                        existing.isActive = false;
                        existing.updatedBy = userId;
                        await AppDataSource.getRepository(OccupancyRequestEmailRecipients).save(existing);
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

            // Create history record
            const historyRecord = new OccupancyRequestEmailRecipientsHistory();
            historyRecord.occupancyRequestEmailRecipients = updatedRecipients;
            historyRecord.mipRecipients = updatedRecipients.mipRecipients;
            historyRecord.mopRecipients = updatedRecipients.mopRecipients;
            historyRecord.isActive = updatedRecipients.isActive;
            historyRecord.createdBy = userId;
            historyRecord.updatedBy = userId;

            await AppDataSource.getRepository(OccupancyRequestEmailRecipientsHistory).save(historyRecord);

            logger.info('Email recipients updated successfully');
            return updatedRecipients;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error in updateEmailRecipients: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getEmailRecipientsHistory(id: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const history = await AppDataSource.getRepository(OccupancyRequestEmailRecipientsHistory)
                .createQueryBuilder('history')
                .leftJoinAndSelect('history.occupancyRequestEmailRecipients', 'recipients')
                .where('recipients.id = :id', { id })
                .orderBy('history.createdAt', 'DESC')
                .getMany();

            return history;
        } catch (error: any) {
            logger.error(`Error in getEmailRecipientsHistory: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async exportEmailRecipients(query: any) {
        try {
            logger.info(`Starting exportEmailRecipients with query: ${JSON.stringify(query)}`);
            
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            const { search = '', masterCommunityIds = '', communityIds = '', towerIds = '', isActive, startDate, endDate, format = 'csv' } = query;

            // Parse comma-separated IDs and filter out empty values
            const parseIds = (ids: string) => {
                if (!ids || ids.trim() === '') return [];
                return ids.split(',').filter((e: any) => e && e.trim() !== '');
            };

            const parsedMasterCommunityIds = parseIds(masterCommunityIds);
            const parsedCommunityIds = parseIds(communityIds);
            const parsedTowerIds = parseIds(towerIds);

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
                    'masterCommunity.name',
                    'community.name',
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

            // Get all records for export
            const recipients = await queryBuilder.getMany();

            if (format === 'csv') {
                return this.generateCSV(recipients);
            } else if (format === 'excel') {
                return this.generateExcel(recipients);
            } else {
                throw new ApiError(APICodes.UNKNOWN_ERROR, 'Unsupported export format. Use "csv" or "excel"');
            }
        } catch (error: any) {
            logger.error(`Error in exportEmailRecipients: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(APICodes.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private generateCSV(recipients: any[]): { buffer: Buffer, contentType: string, fileName: string } {
        const headers = ['Sl. No', 'Master Community', 'Community', 'Tower', 'MIP Email Recipients', 'MOP Email Recipients', 'Status', 'Created At', 'Updated At'];
        
        const csvData = recipients.map((recipient, index) => [
            index + 1,
            recipient.masterCommunity?.name || 'N/A',
            recipient.community?.name || 'N/A',
            recipient.tower?.name || 'N/A',
            recipient.mipRecipients || 'N/A',
            recipient.mopRecipients || 'N/A',
            recipient.isActive ? 'Active' : 'Inactive',
            recipient.createdAt ? new Date(recipient.createdAt).toISOString() : 'N/A',
            recipient.updatedAt ? new Date(recipient.updatedAt).toISOString() : 'N/A'
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const buffer = Buffer.from(csvContent, 'utf-8');
        
        return {
            buffer,
            contentType: 'text/csv',
            fileName: `email_recipients_${new Date().toISOString().split('T')[0]}.csv`
        };
    }

    private generateExcel(recipients: any[]): { buffer: Buffer, contentType: string, fileName: string } {
        // For now, return CSV as Excel (you can implement proper Excel generation later)
        return this.generateCSV(recipients);
    }
}
