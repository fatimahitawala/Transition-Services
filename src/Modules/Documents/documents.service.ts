import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { AppDataSource } from '../../Common/data-source';
import httpStatus from 'http-status';
import ApiError from '../../Common/Utils/ApiError';
import { APICodes } from '../../Common/Constants/apiCodes.en';
import { getPaginationInfo } from '../../Common/Utils/paginationUtils';
import { logger } from '../../Common/Utils/logger';

/**
 * DocumentsService - Manages welcome pack documents
 * 
 * Business Rules:
 * 1. Only one active welcome pack can exist per combination of masterCommunityId, communityId, and towerId
 * 2. When creating a new welcome pack with existing combination: all existing records become inactive, new one becomes active
 * 3. When editing a welcome pack status from inactive to active: all other records with same combination become inactive
 * 4. Supported file types: PDF and HTML only
 * 5. File size limit: 10MB
 */
export class DocumentsService {

    health() {
        return { 
            success: true,
            message: 'Documents service is running',
            timestamp: new Date().toISOString()
        };
    }

    // Welcome Pack Methods
    async getWelcomePackList(query: any) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            let { page = 1, per_page = 20, masterCommunityIds = '', communityIds = '', towerIds = '', search = '', isActive, startDate, endDate, sortBy = 'createdAt', sortOrder = 'DESC', includeFile = false } = query;

            // Parse comma-separated IDs
            masterCommunityIds = masterCommunityIds.split(',').filter((e: any) => e);
            communityIds = communityIds.split(',').filter((e: any) => e);
            towerIds = towerIds.split(',').filter((e: any) => e);

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            let getWelcomePackList = welcomePackRepository.createQueryBuilder('welcomePack');
            
            // Add templateString field if includeFile is true
            if (includeFile === 'true' || includeFile === true) {
                getWelcomePackList.addSelect('welcomePack.templateString');
            }

            // Base condition - show all records by default, filter by isActive only when specified
            let whereClause = "1=1";
            let whereParams: any = {};
            
            if (isActive !== undefined && isActive !== '') {
                whereClause = "welcomePack.isActive = :isActive";
                whereParams.isActive = isActive === 'true' || isActive === true;
            }

            // Add filtering by master community
            if (masterCommunityIds && masterCommunityIds.length) {
                whereClause += " AND welcomePack.masterCommunityId IN (:...masterCommunityIds)";
                whereParams.masterCommunityIds = masterCommunityIds;
            }

            // Add filtering by community
            if (communityIds && communityIds.length) {
                whereClause += " AND welcomePack.communityId IN (:...communityIds)";
                whereParams.communityIds = communityIds;
            }

            // Add filtering by tower
            if (towerIds && towerIds.length) {
                whereClause += " AND welcomePack.towerId IN (:...towerIds)";
                whereParams.towerIds = towerIds;
            }

            // Add search functionality
            if (search) {
                whereClause += " AND (welcomePack.masterCommunityId LIKE :search OR welcomePack.communityId LIKE :search OR welcomePack.towerId LIKE :search)";
                whereParams.search = `%${search}%`;
            }

            // Add date range filtering
            if (startDate) {
                whereClause += " AND DATE(welcomePack.createdAt) >= DATE(:startDate)";
                whereParams.startDate = startDate;
            }

            if (endDate) {
                whereClause += " AND DATE(welcomePack.createdAt) <= DATE(:endDate)";
                whereParams.endDate = endDate;
            }

            getWelcomePackList.where(whereClause, whereParams);

            // Add sorting
            getWelcomePackList.orderBy(`welcomePack.${sortBy}`, sortOrder);
            
            // Log the generated SQL query for debugging
            logger.info(`Generated SQL query: ${getWelcomePackList.getSql()}`);
            logger.info(`Query parameters: ${JSON.stringify(whereParams)}`);

            // Get total count for pagination
            const count = await getWelcomePackList.getCount();

            // Add pagination
            getWelcomePackList.offset((page - 1) * per_page).limit(per_page);

            const welcomePacks = await getWelcomePackList.getMany();
            
            // Log the results for debugging
            logger.info(`Found ${welcomePacks.length} welcome packs`);
            logger.info(`Sample welcome pack: ${JSON.stringify(welcomePacks[0] || {})}`);
            
            let processedWelcomePacks;
            if (includeFile === 'true' || includeFile === true) {
                // Return with file content
                processedWelcomePacks = welcomePacks;
            } else {
                // Remove templateString from response to avoid sending large base64 data
                processedWelcomePacks = welcomePacks.map(pack => {
                    const { templateString, ...packWithoutFile } = pack;
                    return packWithoutFile;
                });
            }
            
            const pagination = getPaginationInfo(page, per_page, count);
            return { data: processedWelcomePacks, pagination };
        } catch (error: any) {
            logger.error(`Error in getWelcomePackList: ${JSON.stringify(error)}`);
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
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            // Handle file upload
            let templateString = data.templateString || '';
            let fileName = '';
            let fileType = '';
            
            if (file) {
                // Validate file type
                const allowedMimeTypes = [
                    'application/pdf',
                    'text/html'
                ];
                
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Only PDF and HTML files are allowed', 'EC400');
                }
                
                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'File size must be less than 10MB', 'EC400');
                }
                
                // Convert file to base64
                templateString = file.buffer.toString('base64');
                fileName = file.originalname;
                fileType = file.mimetype;
            }

            // Validate required fields
            if (!data.masterCommunityId || !data.communityId) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Master Community ID and Community ID are required', 'EC400');
            }

            // Check for existing welcome pack with same combination
            const whereCondition: any = {
                masterCommunityId: parseInt(data.masterCommunityId),
                communityId: parseInt(data.communityId)
            };
            
            if (data.towerId) {
                whereCondition.towerId = parseInt(data.towerId);
            } else {
                whereCondition.towerId = null;
            }

            const existingWelcomePacks = await welcomePackRepository.find({
                where: whereCondition
            });

            let savedWelcomePack;

            if (existingWelcomePacks && existingWelcomePacks.length > 0) {
                // If records exist with same combination, make all existing records inactive
                const updateResult = await welcomePackRepository.update(
                    whereCondition,
                    { isActive: false, updatedBy: userId || 0 }
                );
                
                logger.info(`Made ${updateResult.affected} existing welcome pack records inactive for combination: masterCommunityId=${data.masterCommunityId}, communityId=${data.communityId}, towerId=${data.towerId || 'null'}`);

                // Create new welcome pack as active
                const welcomePack = new OccupancyRequestWelcomePack();
                welcomePack.masterCommunityId = parseInt(data.masterCommunityId);
                welcomePack.communityId = parseInt(data.communityId);
                welcomePack.towerId = data.towerId ? parseInt(data.towerId) : null;
                welcomePack.templateString = templateString;
                welcomePack.isActive = true; // Always active for new creation
                welcomePack.createdBy = userId || 0;
                welcomePack.updatedBy = userId || 0;

                savedWelcomePack = await welcomePackRepository.save(welcomePack);
            } else {
                // Create new welcome pack (no existing records with same combination)
                const welcomePack = new OccupancyRequestWelcomePack();
                welcomePack.masterCommunityId = parseInt(data.masterCommunityId);
                welcomePack.communityId = parseInt(data.communityId);
                welcomePack.towerId = data.towerId ? parseInt(data.towerId) : null;
                welcomePack.templateString = templateString;
                welcomePack.isActive = true; // Always active for new creation
                welcomePack.createdBy = userId || 0;
                welcomePack.updatedBy = userId || 0;

                savedWelcomePack = await welcomePackRepository.save(welcomePack);
            }
            
            // Return the saved welcome pack with all metadata
            return savedWelcomePack;
        } catch (error: any) {
            logger.error(`Error in createWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async getWelcomePackById(id: number, includeFile: boolean = false) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            const welcomePack = await welcomePackRepository.findOne({
                where: { id }
            });

            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Welcome pack not found', 'EC404');
            }

            if (includeFile) {
                // Return with file content
                return welcomePack;
            } else {
                // Remove templateString from response to avoid sending large base64 data
                const { templateString, ...welcomePackWithoutFile } = welcomePack;
                return welcomePackWithoutFile;
            }
        } catch (error: any) {
            logger.error(`Error in getWelcomePackById: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async downloadWelcomePackFile(id: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            const welcomePack = await welcomePackRepository.findOne({
                where: { id }
            });

            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Welcome pack not found', 'EC404');
            }

            if (!welcomePack.templateString) {
                throw new ApiError(httpStatus.NOT_FOUND, 'No file content found', 'EC404');
            }

            // Convert base64 back to buffer
            const fileBuffer = Buffer.from(welcomePack.templateString, 'base64');
            
            // Since we don't store MIME type in the database, we'll infer it from the file content
            // Check if the content starts with HTML tags or PDF magic numbers
            const contentStart = fileBuffer.toString('utf8', 0, 100).toLowerCase();
            let fileExtension = 'pdf';
            let contentType = 'application/pdf';
            
            if (contentStart.includes('<!doctype html') || contentStart.includes('<html') || contentStart.includes('<head')) {
                fileExtension = 'html';
                contentType = 'text/html';
            }
            
            return {
                buffer: fileBuffer,
                fileName: `welcome-pack-${id}.${fileExtension}`,
                contentType: contentType
            };
        } catch (error: any) {
            logger.error(`Error in downloadWelcomePackFile: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    async updateWelcomePack(id: number, data: any, file: any, userId: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            const welcomePack = await welcomePackRepository.findOne({ where: { id } });
            if (!welcomePack) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
            }

            // Handle file upload if provided
            if (file) {
                // Validate file type
                const allowedMimeTypes = [
                    'application/pdf',
                    'text/html'
                ];
                
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Only PDF and HTML files are allowed', 'EC400');
                }
                
                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'File size must be less than 10MB', 'EC400');
                }
                
                // Convert file to base64 and update
                welcomePack.templateString = file.buffer.toString('base64');
            }

            // Check if status is being changed from inactive to active
            if (data.isActive !== undefined) {
                const newStatus = data.isActive === 'true' || data.isActive === true;
                const currentStatus = welcomePack.isActive;
                
                // If changing from inactive to active, make all other records with same combination inactive
                if (!currentStatus && newStatus) {
                    const whereCondition: any = {
                        masterCommunityId: welcomePack.masterCommunityId,
                        communityId: welcomePack.communityId
                    };
                    
                    if (welcomePack.towerId) {
                        whereCondition.towerId = welcomePack.towerId;
                    } else {
                        whereCondition.towerId = null;
                    }
                    
                    // Make all other records with same combination inactive
                    const updateResult = await welcomePackRepository.update(
                        whereCondition,
                        { isActive: false, updatedBy: userId || 0 }
                    );
                    
                    logger.info(`Made ${updateResult.affected} other welcome pack records inactive for combination: masterCommunityId=${welcomePack.masterCommunityId}, communityId=${welcomePack.communityId}, towerId=${welcomePack.towerId}`);
                }
                
                welcomePack.isActive = newStatus;
                logger.info(`Updated welcome pack ${id} status from ${currentStatus} to ${newStatus}`);
            }
            
            welcomePack.updatedBy = userId || 0;

            const updatedWelcomePack = await welcomePackRepository.save(welcomePack);
            
            // Remove templateString from response to avoid sending large base64 data
            const { templateString, ...welcomePackWithoutFile } = updatedWelcomePack;
            return welcomePackWithoutFile;
        } catch (error: any) {
            logger.error(`Error in updateWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    // Get active welcome pack for a specific combination
    async getActiveWelcomePack(masterCommunityId: number, communityId: number, towerId?: number) {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            const whereCondition: any = {
                masterCommunityId,
                communityId,
                isActive: true
            };
            
            if (towerId) {
                whereCondition.towerId = towerId;
            } else {
                whereCondition.towerId = null;
            }

            const activeWelcomePack = await welcomePackRepository.findOne({
                where: whereCondition
            });

            return activeWelcomePack;
        } catch (error: any) {
            logger.error(`Error in getActiveWelcomePack: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

    // Helper method to ensure data consistency - only one active record per combination
    async ensureDataConsistency() {
        try {
            // Ensure database connection is initialized
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            
            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            // Find all combinations that have multiple active records
            const duplicateActiveRecords = await welcomePackRepository
                .createQueryBuilder('welcomePack')
                .select([
                    'welcomePack.masterCommunityId',
                    'welcomePack.communityId',
                    'welcomePack.towerId',
                    'COUNT(welcomePack.id) as count'
                ])
                .where('welcomePack.isActive = :isActive', { isActive: true })
                .groupBy('welcomePack.masterCommunityId, welcomePack.communityId, welcomePack.towerId')
                .having('COUNT(welcomePack.id) > 1')
                .getRawMany();

            let fixedCount = 0;
            
            for (const record of duplicateActiveRecords) {
                const whereCondition: any = {
                    masterCommunityId: record.masterCommunityId,
                    communityId: record.communityId
                };
                
                if (record.towerId) {
                    whereCondition.towerId = record.towerId;
                } else {
                    whereCondition.towerId = null;
                }

                // Get all active records for this combination
                const activeRecords = await welcomePackRepository.find({
                    where: whereCondition,
                    order: { createdAt: 'DESC' }
                });

                // Keep only the most recent one active, make others inactive
                if (activeRecords.length > 1) {
                    const recordsToDeactivate = activeRecords.slice(1); // All except the first (most recent)
                    const recordIds = recordsToDeactivate.map(r => r.id);
                    
                    await welcomePackRepository.update(
                        { id: recordIds[0] },
                        { isActive: false, updatedBy: 0 }
                    );
                    
                    // Update remaining records one by one if there are more
                    for (let i = 1; i < recordIds.length; i++) {
                        await welcomePackRepository.update(
                            { id: recordIds[i] },
                            { isActive: false, updatedBy: 0 }
                        );
                    }
                    
                    fixedCount += recordsToDeactivate.length;
                    logger.info(`Fixed data consistency: Made ${recordsToDeactivate.length} duplicate active records inactive for combination: masterCommunityId=${record.masterCommunityId}, communityId=${record.communityId}, towerId=${record.towerId}`);
                }
            }

            if (fixedCount > 0) {
                logger.info(`Data consistency check completed. Fixed ${fixedCount} duplicate active records.`);
            } else {
                logger.info('Data consistency check completed. No duplicate active records found.');
            }

            return { fixedCount, duplicateActiveRecords: duplicateActiveRecords.length };
        } catch (error: any) {
            logger.error(`Error in ensureDataConsistency: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode.message, apiCode.code);
        }
    }

 }
