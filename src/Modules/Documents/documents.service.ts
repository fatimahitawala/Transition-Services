import { AppDataSource } from '../../Common/data-source';
import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { OccupancyRequestTemplates } from '../../Entities/OccupancyRequestTemplates.entity';
import { OccupancyRequestTemplateHistory } from '../../Entities/OccupancyRequestTemplateHistory.entity';
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
            
            // Add templateString field if includeFile is true
            if (includeFile === 'true' || includeFile === true) {
                getWelcomePackList.addSelect('welcomePack.templateString');
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
                throw new ApiError(APICodes.BAD_REQUEST, 'File is required');
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                throw new ApiError(APICodes.BAD_REQUEST, 'File size must be less than 10MB');
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new ApiError(APICodes.BAD_REQUEST, 'Only PDF and HTML files are allowed');
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
                queryBuilder.addSelect('welcomePack.templateString');
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
                    throw new ApiError(APICodes.BAD_REQUEST, 'File size must be less than 10MB');
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(file.mimetype)) {
                    throw new ApiError(APICodes.BAD_REQUEST, 'Only PDF and HTML files are allowed');
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
                .where('template.templateType IN (:...templateTypes)', { templateTypes: ['MIP', 'MOP'] });

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

            // Handle file content if requested
            if (includeFile === 'true' || includeFile === true) {
                templates.forEach((template: any) => {
                    if (template.templateString) {
                        template.templateString = template.templateString.toString('base64');
                    }
                });
            }

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
            const { masterCommunityId, communityId, towerId, templateType, isActive = true } = data;

            // Validate file type and size
            if (!templateFile) {
                throw new ApiError(APICodes.BAD_REQUEST, 'Template file is required');
            }

            if (templateFile.size > 10 * 1024 * 1024) { // 10MB
                throw new ApiError(APICodes.BAD_REQUEST, 'File size must be less than 10MB');
            }

            const allowedTypes = ['application/pdf', 'text/html'];
            if (!allowedTypes.includes(templateFile.mimetype)) {
                throw new ApiError(APICodes.BAD_REQUEST, 'Only PDF and HTML files are allowed');
            }

            // Deactivate existing active templates for the same combination
            const queryBuilder = AppDataSource.getRepository(OccupancyRequestTemplates)
                .createQueryBuilder('template')
                .where('template.masterCommunityId = :masterCommunityId', { masterCommunityId })
                .andWhere('template.communityId = :communityId', { communityId })
                .andWhere('template.templateType = :templateType', { templateType })
                .andWhere('template.isActive = :isActive', { isActive: true });

            if (towerId) {
                queryBuilder.andWhere('template.towerId = :towerId', { towerId });
            } else {
                queryBuilder.andWhere('template.towerId IS NULL');
            }

            const existingTemplates = await queryBuilder.getMany();

            if (existingTemplates.length > 0) {
                // Create history records for existing templates
                for (const template of existingTemplates) {
                    const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                        occupancyRequestTemplates: template,
                        templateType: template.templateType,
                        isActive: template.isActive,
                        createdBy: parseInt(userId)
                    });
                    await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);
                }

                // Deactivate existing templates
                for (const template of existingTemplates) {
                    template.isActive = false;
                    template.updatedBy = parseInt(userId);
                    await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);
                }
            }

            // Create new template
            const templateData: any = {
                masterCommunityId,
                communityId,
                templateType,
                templateString: templateFile.buffer,
                isActive,
                createdBy: parseInt(userId)
            };

            if (towerId) {
                templateData.towerId = towerId;
            }

            const template = AppDataSource.getRepository(OccupancyRequestTemplates).create(templateData);
            const savedTemplate = await AppDataSource.getRepository(OccupancyRequestTemplates).save(template);

            // Create history record
            const historyRecord = AppDataSource.getRepository(OccupancyRequestTemplateHistory).create({
                occupancyRequestTemplates: savedTemplate as unknown as OccupancyRequestTemplates,
                templateType: (savedTemplate as unknown as OccupancyRequestTemplates).templateType,
                isActive: (savedTemplate as unknown as OccupancyRequestTemplates).isActive,
                createdBy: parseInt(userId)
            });

            await AppDataSource.getRepository(OccupancyRequestTemplateHistory).save(historyRecord);

            return savedTemplate;
        } catch (error: any) {
            logger.error(`Error in createTemplate: ${JSON.stringify(error)}`);
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
                queryBuilder.addSelect('template.templateString');
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
                throw new ApiError(APICodes.BAD_REQUEST, 'Template file not found');
            }

            // Determine content type and file name
            let contentType = 'application/octet-stream';
            let fileName = `template_${id}`;

            // Check if it's a PDF (PDF magic numbers: %PDF)
            if (template.templateString.toString().startsWith('%PDF')) {
                contentType = 'application/pdf';
                fileName += '.pdf';
            } else if (template.templateString.toString().includes('<html') || template.templateString.toString().includes('<!DOCTYPE')) {
                contentType = 'text/html';
                fileName += '.html';
            }

            return {
                buffer: template.templateString,
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
                    throw new ApiError(APICodes.BAD_REQUEST, 'File size must be less than 10MB');
                }

                const allowedTypes = ['application/pdf', 'text/html'];
                if (!allowedTypes.includes(templateFile.mimetype)) {
                    throw new ApiError(APICodes.BAD_REQUEST, 'Only PDF and HTML files are allowed');
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
                            createdBy: parseInt(userId)
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
                createdBy: parseInt(userId)
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
}
