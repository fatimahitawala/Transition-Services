import { Request } from 'express';

/**
 * TestHistoryService
 * Generates dummy data matching the TransitionRequestHistory entity structure
 */
export class TestHistoryService {
    /**
     * Get dummy transition history data for UI testing
     * Consolidated method handling all scenarios: move-in, move-out, renewal
     */
    async getUnifiedHistory(query: any) {
        const { 
            type = 'all',
            filterBy,
            trackingId,
            unitId,
            medium,
            requestType,
            startDate,
            endDate,
            limit = 50,
            offset = 0,
            transitionType // NEW: specify which type of transition to get dummy data for
        } = query;

        // Generate dummy data based on transition type or default to move-in
        let dummyHistoryData: any[];
        
        if (transitionType === 'move-out' || requestType === 'move-out') {
            dummyHistoryData = this.generateMoveOutHistory();
        } else if (transitionType === 'renewal' || requestType === 'renewal') {
            dummyHistoryData = this.generateRenewalHistory();
        } else if (transitionType === 'move-in' || requestType === 'move-in' || !transitionType) {
            dummyHistoryData = this.generateDummyHistory(trackingId, type);
        } else {
            // If no specific type, combine all types
            dummyHistoryData = [
                ...this.generateDummyHistory(trackingId, type),
                ...this.generateMoveOutHistory(),
                ...this.generateRenewalHistory()
            ];
        }

        // Apply filtering based on query parameters
        let filteredData = dummyHistoryData;

        if (type === 'user-visible') {
            filteredData = dummyHistoryData.filter((item: any) => item.isVisibleToUser === true);
        } else if (type === 'milestones') {
            filteredData = dummyHistoryData.filter((item: any) => item.isMilestone === true);
        } else if (type === 'latest-status') {
            filteredData = [dummyHistoryData[dummyHistoryData.length - 1]];
        } else if (type === 'summary') {
            return this.generateSummaryData(startDate, endDate);
        }

        // Filter by medium if specified
        if (medium) {
            filteredData = filteredData.filter((item: any) => item.requestMedium === medium);
        }

        // Filter by specific trackingId if provided
        if (trackingId) {
            filteredData = filteredData.filter((item: any) => item.trackingId === trackingId);
        }

        // Apply pagination
        const paginatedData = filteredData.slice(offset, offset + limit);

        return {
            success: true,
            data: paginatedData,
            pagination: {
                total: filteredData.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (offset + limit) < filteredData.length
            },
            metadata: {
                trackingId: trackingId || (paginatedData[0]?.trackingId || 'N/A'),
                type,
                filterBy: filterBy || 'trackingId',
                transitionType: transitionType || requestType || 'all'
            }
        };
    }

    /**
     * Generate dummy history records matching TransitionRequestHistory entity
     */
    private generateDummyHistory(trackingId?: string, type?: string) {
        const dummyTrackingId = trackingId || 'TR-20250109-00001';
        
        return [
            // Record 1: Request Created
            {
                id: 1,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'request-created',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'new',
                previousStatus: null,
                requestMedium: 'mobile',
                userId: 1001,
                actionBy: 'user',
                changeDetails: {
                    unitNumber: 'A-101',
                    buildingName: 'Tower A',
                    communityName: 'Sobha Hartland',
                    moveInDate: '2025-02-01'
                },
                comments: 'Move-in request created by resident',
                messageSlug: {
                    en: 'Move-in request created successfully',
                    ar: 'تم إنشاء طلب الانتقال بنجاح'
                },
                stepNumber: 1,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    userDetails: {
                        id: 1001,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com',
                        phoneNumber: '+971501234567'
                    },
                    requestPayload: {
                        moveInDate: '2025-02-01T00:00:00.000Z',
                        details: {
                            adults: 2,
                            children: 1,
                            householdStaffs: 0,
                            pets: 0
                        }
                    }
                },
                documentIds: null,
                templateId: null,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                timestamp: '2025-01-09T10:00:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            },
            // Record 2: Emirates ID Uploaded
            {
                id: 2,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'document-uploaded',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'new',
                previousStatus: 'new',
                requestMedium: 'mobile',
                userId: 1001,
                actionBy: 'user',
                changeDetails: {
                    documentType: 'emirates-id-front',
                    fileName: 'emirates_id_front.jpg',
                    fileSize: 1024000,
                    uploadedAt: '2025-01-09T10:15:00.000Z'
                },
                comments: 'Emirates ID front uploaded',
                messageSlug: {
                    en: 'Emirates ID document uploaded',
                    ar: 'تم تحميل وثيقة الهوية الإماراتية'
                },
                stepNumber: 2,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    userDetails: {
                        id: 1001,
                        firstName: 'John',
                        lastName: 'Doe'
                    }
                },
                documentIds: '1',
                templateId: null,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                timestamp: '2025-01-09T10:15:00.000Z',
                isVisibleToUser: false,
                isMilestone: false
            },
            // Record 3: Passport Uploaded
            {
                id: 3,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'document-uploaded',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'new',
                previousStatus: 'new',
                requestMedium: 'mobile',
                userId: 1001,
                actionBy: 'user',
                changeDetails: {
                    documentType: 'passport-front',
                    fileName: 'passport.jpg',
                    fileSize: 2048000,
                    uploadedAt: '2025-01-09T10:20:00.000Z'
                },
                comments: 'Passport uploaded',
                messageSlug: {
                    en: 'Passport document uploaded',
                    ar: 'تم تحميل وثيقة جواز السفر'
                },
                stepNumber: 3,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    userDetails: {
                        id: 1001,
                        firstName: 'John',
                        lastName: 'Doe'
                    }
                },
                documentIds: '1,2',
                templateId: null,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                timestamp: '2025-01-09T10:20:00.000Z',
                isVisibleToUser: false,
                isMilestone: false
            },
            // Record 4: RFI Requested
            {
                id: 4,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'rfi-requested',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'rfi-pending',
                previousStatus: 'new',
                requestMedium: 'web',
                userId: 2001,
                actionBy: 'community-admin',
                changeDetails: {
                    rfiReason: 'Missing EJARI certificate',
                    requiredDocuments: ['ejari'],
                    dueDate: '2025-01-12T23:59:59.000Z'
                },
                comments: 'Additional documents required: Please upload your EJARI certificate',
                messageSlug: {
                    en: 'Request for Information raised - Additional documents needed',
                    ar: 'طلب معلومات إضافية - مطلوب مستندات إضافية'
                },
                stepNumber: 4,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    adminDetails: {
                        id: 2001,
                        firstName: 'Admin',
                        lastName: 'User',
                        email: 'admin@sobha.com'
                    }
                },
                documentIds: '1,2',
                templateId: null,
                ipAddress: '192.168.10.50',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                timestamp: '2025-01-09T14:30:00.000Z',
                isVisibleToUser: true,
                isMilestone: false
            },
            // Record 5: EJARI Uploaded
            {
                id: 5,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'document-uploaded',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'rfi-pending',
                previousStatus: 'rfi-pending',
                requestMedium: 'mobile',
                userId: 1001,
                actionBy: 'user',
                changeDetails: {
                    documentType: 'ejari',
                    fileName: 'ejari_certificate.pdf',
                    fileSize: 512000,
                    uploadedAt: '2025-01-10T09:00:00.000Z'
                },
                comments: 'EJARI certificate uploaded in response to RFI',
                messageSlug: {
                    en: 'EJARI certificate uploaded',
                    ar: 'تم تحميل شهادة إيجاري'
                },
                stepNumber: 5,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    userDetails: {
                        id: 1001,
                        firstName: 'John',
                        lastName: 'Doe'
                    },
                    rfiResponse: true
                },
                documentIds: '1,2,3',
                templateId: null,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                timestamp: '2025-01-10T09:00:00.000Z',
                isVisibleToUser: false,
                isMilestone: false
            },
            // Record 6: RFI Submitted
            {
                id: 6,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'rfi-submitted',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'rfi-submitted',
                previousStatus: 'rfi-pending',
                requestMedium: 'mobile',
                userId: 1001,
                actionBy: 'user',
                changeDetails: {
                    submittedDocuments: ['ejari'],
                    submittedAt: '2025-01-10T09:05:00.000Z'
                },
                comments: 'RFI documents submitted for review',
                messageSlug: {
                    en: 'RFI response submitted successfully',
                    ar: 'تم تقديم الرد على طلب المعلومات بنجاح'
                },
                stepNumber: 6,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    userDetails: {
                        id: 1001,
                        firstName: 'John',
                        lastName: 'Doe'
                    }
                },
                documentIds: '1,2,3',
                templateId: null,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                timestamp: '2025-01-10T09:05:00.000Z',
                isVisibleToUser: true,
                isMilestone: false
            },
            // Record 7: Approved
            {
                id: 7,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'approved',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'approved',
                previousStatus: 'rfi-submitted',
                requestMedium: 'web',
                userId: 2001,
                actionBy: 'community-admin',
                changeDetails: {
                    approvalNotes: 'All documents are in order',
                    verifiedDocuments: ['emirates-id-front', 'passport-front', 'ejari'],
                    approvedAt: '2025-01-10T15:00:00.000Z'
                },
                comments: 'Move-in request approved. All documents verified.',
                messageSlug: {
                    en: 'Move-in request approved',
                    ar: 'تمت الموافقة على طلب الانتقال'
                },
                stepNumber: 7,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    adminDetails: {
                        id: 2001,
                        firstName: 'Admin',
                        lastName: 'User',
                        email: 'admin@sobha.com'
                    }
                },
                documentIds: '1,2,3',
                templateId: null,
                ipAddress: '192.168.10.50',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                timestamp: '2025-01-10T15:00:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            },
            // Record 8: Process Closed
            {
                id: 8,
                trackingId: dummyTrackingId,
                transitionRequestType: 'move-in',
                referenceId: 123,
                requestNumber: 'MIR-000123',
                actionType: 'process-closed',
                requestUserType: 'tenant',
                unitId: 101,
                moveInRequestId: 123,
                moveOutRequestId: null,
                accountRenewalRequestId: null,
                currentStatus: 'closed',
                previousStatus: 'approved',
                requestMedium: 'system',
                userId: null,
                actionBy: 'system',
                changeDetails: {
                    completionDate: '2025-02-01T10:00:00.000Z',
                    welcomePackSent: true,
                    accessGranted: true
                },
                comments: 'Move-in process completed successfully',
                messageSlug: {
                    en: 'Move-in process completed',
                    ar: 'اكتمل عملية الانتقال'
                },
                stepNumber: 8,
                startStep: 1,
                lastStep: 8,
                metadata: {
                    systemAction: true,
                    completedSteps: 8
                },
                documentIds: '1,2,3',
                templateId: 5,
                ipAddress: null,
                userAgent: 'System/Automated',
                timestamp: '2025-02-01T10:00:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            }
        ];
    }

    /**
     * Generate summary data for reporting
     */
    private generateSummaryData(startDate?: string, endDate?: string) {
        return {
            success: true,
            data: {
                period: {
                    startDate: startDate || '2025-01-01',
                    endDate: endDate || '2025-01-31'
                },
                summary: {
                    totalRequests: 45,
                    byType: {
                        'move-in': 25,
                        'move-out': 12,
                        'renewal': 8
                    },
                    byStatus: {
                        'new': 8,
                        'rfi-pending': 5,
                        'rfi-submitted': 3,
                        'approved': 15,
                        'closed': 12,
                        'cancelled': 2
                    },
                    byMedium: {
                        'mobile': 30,
                        'web': 12,
                        'system': 3
                    },
                    avgProcessingTime: '4.5 days',
                    rfiRate: '22%'
                },
                topActions: [
                    { action: 'created', count: 45 },
                    { action: 'document-uploaded', count: 135 },
                    { action: 'approved', count: 27 },
                    { action: 'rfi-raised', count: 10 },
                    { action: 'closed', count: 12 }
                ]
            }
        };
    }

    /**
     * Generate move-out dummy data
     */
    private generateMoveOutHistory() {
        return [
            {
                id: 101,
                trackingId: 'TR-20250115-00002',
                transitionRequestType: 'move-out',
                referenceId: 456,
                requestNumber: 'MOR-000456',
                actionType: 'request-created',
                requestUserType: 'tenant',
                unitId: 205,
                moveInRequestId: null,
                moveOutRequestId: 456,
                accountRenewalRequestId: null,
                currentStatus: 'new',
                previousStatus: null,
                requestMedium: 'web',
                userId: 1002,
                actionBy: 'user',
                changeDetails: {
                    unitNumber: 'B-205',
                    buildingName: 'Tower B',
                    communityName: 'Sobha Creek Vistas',
                    moveOutDate: '2025-03-01',
                    reason: 'Relocation'
                },
                comments: 'Move-out request initiated',
                messageSlug: {
                    en: 'Move-out request created',
                    ar: 'تم إنشاء طلب الانتقال للخارج'
                },
                stepNumber: 1,
                startStep: 1,
                lastStep: 5,
                metadata: {
                    userDetails: {
                        id: 1002,
                        firstName: 'Jane',
                        lastName: 'Smith',
                        email: 'jane.smith@example.com',
                        phoneNumber: '+971501234569'
                    }
                },
                documentIds: null,
                templateId: null,
                ipAddress: '192.168.1.105',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                timestamp: '2025-01-15T11:00:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            },
            {
                id: 102,
                trackingId: 'TR-20250115-00002',
                transitionRequestType: 'move-out',
                referenceId: 456,
                requestNumber: 'MOR-000456',
                actionType: 'approved',
                requestUserType: 'tenant',
                unitId: 205,
                moveInRequestId: null,
                moveOutRequestId: 456,
                accountRenewalRequestId: null,
                currentStatus: 'approved',
                previousStatus: 'new',
                requestMedium: 'web',
                userId: 2002,
                actionBy: 'community-admin',
                changeDetails: {
                    inspectionDate: '2025-02-28T10:00:00.000Z',
                    approvalNotes: 'Final inspection scheduled'
                },
                comments: 'Move-out approved. Final inspection scheduled.',
                messageSlug: {
                    en: 'Move-out request approved',
                    ar: 'تمت الموافقة على طلب الانتقال للخارج'
                },
                stepNumber: 2,
                startStep: 1,
                lastStep: 5,
                metadata: {
                    adminDetails: {
                        id: 2002,
                        firstName: 'Manager',
                        lastName: 'Admin',
                        email: 'manager@sobha.com',
                        phoneNumber: '+971501234570'
                    }
                },
                documentIds: null,
                templateId: null,
                ipAddress: '192.168.10.51',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                timestamp: '2025-01-16T14:00:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            }
        ];
    }

    /**
     * Generate renewal dummy data
     */
    private generateRenewalHistory() {
        return [
            {
                id: 201,
                trackingId: 'TR-20250120-00003',
                transitionRequestType: 'account-renewal',
                referenceId: 789,
                requestNumber: 'ARR-000789',
                actionType: 'request-created',
                requestUserType: 'tenant',
                unitId: 302,
                moveInRequestId: null,
                moveOutRequestId: null,
                accountRenewalRequestId: 789,
                currentStatus: 'new',
                previousStatus: null,
                requestMedium: 'mobile',
                userId: 1003,
                actionBy: 'user',
                changeDetails: {
                    unitNumber: 'C-302',
                    buildingName: 'Tower C',
                    communityName: 'Sobha Heartland',
                    renewalPeriod: '12 months',
                    renewalStartDate: '2025-04-01',
                    renewalEndDate: '2026-03-31'
                },
                comments: 'Tenancy renewal request submitted',
                messageSlug: {
                    en: 'Renewal request created',
                    ar: 'تم إنشاء طلب التجديد'
                },
                stepNumber: 1,
                startStep: 1,
                lastStep: 6,
                metadata: {
                    userDetails: {
                        id: 1003,
                        firstName: 'Mike',
                        lastName: 'Johnson',
                        email: 'mike.johnson@example.com',
                        phoneNumber: '+971501234571'
                    }
                },
                documentIds: null,
                templateId: null,
                ipAddress: '192.168.1.110',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
                timestamp: '2025-01-20T09:30:00.000Z',
                isVisibleToUser: true,
                isMilestone: true
            }
        ];
    }
}

