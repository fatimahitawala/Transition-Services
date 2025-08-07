import { OccupancyRequestWelcomePack } from '../../Entities/OccupancyRequestWelcomePack.entity';
import { AppDataSource } from '../../Common/data-source';
import httpStatus from 'http-status';
import ApiError from '../../Common/Utils/ApiError';
import { APICodes } from '../../Common/Constants/apiCodes.en';
import { getPaginationInfo } from '../../Common/Utils/paginationUtils';

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
            
            let { page = 1, per_page = 20, masterCommunityIds = '', communityIds = '', towerIds = '', search = '', isActive = true, startDate, endDate, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

            // Parse comma-separated IDs
            masterCommunityIds = masterCommunityIds.split(',').filter((e: any) => e);
            communityIds = communityIds.split(',').filter((e: any) => e);
            towerIds = towerIds.split(',').filter((e: any) => e);

            const welcomePackRepository = AppDataSource.getRepository(OccupancyRequestWelcomePack);
            
            let getWelcomePackList = welcomePackRepository.createQueryBuilder('welcomePack');

            // Base condition - show active by default, but allow filtering
            let whereClause = "welcomePack.isActive = :isActive";
            if (isActive !== undefined) {
                whereClause = "welcomePack.isActive = :isActive";
            }

            // Add filtering by master community
            if (masterCommunityIds && masterCommunityIds.length) {
                whereClause += " AND welcomePack.masterCommunityId IN (:...masterCommunityIds)";
            }

            // Add filtering by community
            if (communityIds && communityIds.length) {
                whereClause += " AND welcomePack.communityId IN (:...communityIds)";
            }

            // Add filtering by tower
            if (towerIds && towerIds.length) {
                whereClause += " AND welcomePack.towerId IN (:...towerIds)";
            }

            // Add search functionality
            if (search) {
                whereClause += " AND (welcomePack.masterCommunityId LIKE :search OR welcomePack.communityId LIKE :search OR welcomePack.towerId LIKE :search)";
            }

            // Add date range filtering
            if (startDate) {
                whereClause += " AND DATE(welcomePack.createdAt) >= DATE(:startDate)";
            }

            if (endDate) {
                whereClause += " AND DATE(welcomePack.createdAt) <= DATE(:endDate)";
            }

            getWelcomePackList.where(whereClause, { 
                isActive: isActive === 'true' || isActive === true, 
                masterCommunityIds, 
                communityIds, 
                towerIds, 
                search: search ? `%${search}%` : undefined,
                startDate,
                endDate
            });

            // Add sorting
            getWelcomePackList.orderBy(`welcomePack.${sortBy}`, sortOrder);

            // Get total count for pagination
            const count = await getWelcomePackList.getCount();

            // Add pagination
            getWelcomePackList.offset((page - 1) * per_page).limit(per_page);

            const welcomePacks = await getWelcomePackList.getMany();
            
            // Remove templateString from response to avoid sending large base64 data
            const welcomePacksWithoutFile = welcomePacks.map(pack => {
                const { templateString, ...packWithoutFile } = pack;
                return packWithoutFile;
            });
            
            const pagination = getPaginationInfo(page, per_page, count);
            return { data: welcomePacksWithoutFile, pagination };
        } catch (error: any) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
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
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];
                
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Only PDF, DOC, and DOCX files are allowed', 'EC400');
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

            const existingWelcomePack = await welcomePackRepository.findOne({
                where: whereCondition
            });

            let savedWelcomePack;

            if (existingWelcomePack) {
                // Update existing welcome pack
                existingWelcomePack.templateString = templateString;
                existingWelcomePack.isActive = data.isActive !== undefined ? (data.isActive === 'true' || data.isActive === true) : existingWelcomePack.isActive;
                existingWelcomePack.updatedBy = userId || 0;
                
                savedWelcomePack = await welcomePackRepository.save(existingWelcomePack);
            } else {
                // Create new welcome pack
                const welcomePack = new OccupancyRequestWelcomePack();
                welcomePack.masterCommunityId = parseInt(data.masterCommunityId);
                welcomePack.communityId = parseInt(data.communityId);
                welcomePack.towerId = data.towerId ? parseInt(data.towerId) : null;
                welcomePack.templateString = templateString;
                welcomePack.isActive = data.isActive !== undefined ? (data.isActive === 'true' || data.isActive === true) : true;
                welcomePack.createdBy = userId || 0;
                welcomePack.updatedBy = userId || 0;

                savedWelcomePack = await welcomePackRepository.save(welcomePack);
            }
            
            // Return the saved welcome pack with all metadata
            return savedWelcomePack;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
        }
    }

    async getWelcomePackById(id: number) {
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

            // Remove templateString from response to avoid sending large base64 data
            const { templateString, ...welcomePackWithoutFile } = welcomePack;
            return welcomePackWithoutFile;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
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
            
            return {
                buffer: fileBuffer,
                fileName: `welcome-pack-${id}.pdf`, // Default filename
                contentType: 'application/pdf' // Default content type
            };
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
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
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];
                
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Only PDF, DOC, and DOCX files are allowed', 'EC400');
                }
                
                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'File size must be less than 10MB', 'EC400');
                }
                
                // Convert file to base64 and update
                welcomePack.templateString = file.buffer.toString('base64');
            }

            // Allow status change
            if (data.isActive !== undefined) {
                welcomePack.isActive = data.isActive === 'true' || data.isActive === true;
            }
            
            welcomePack.updatedBy = userId || 0;

            const updatedWelcomePack = await welcomePackRepository.save(welcomePack);
            
            // Remove templateString from response to avoid sending large base64 data
            const { templateString, ...welcomePackWithoutFile } = updatedWelcomePack;
            return welcomePackWithoutFile;
        } catch (error: any) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, APICodes.UNKNOWN_ERROR.message, APICodes.UNKNOWN_ERROR.code, error);
        }
    }
}
