# Sobha Smart FM Clone - Tenancy Backoffice Requirements Document

## Project Overview

A comprehensive tenancy management backoffice system based on Sobha Smart FM's BRD for Move-in, Move-out & Account Renewal processes. This system enables operational efficiency and consistency for tenancy lifecycle management with role-based access for Community Admins, Security teams, and other stakeholders.

## 1. Core Features

### 1.1 User Management & Role-based Access

- **Primary User Roles**

  - Super Admin (Master data configuration)
  - Community Admin (Main operational role)
  - Security Team (Request closure operations)
  - System Users (API integrations)

- **Authentication & Authorization**
  - Role-based dashboard access
  - Action-based permissions (RFI, Approve, Cancel, Close)
  - Secure login with session management
  - User profile management

### 1.2 Master Data Management

- **Community Configuration (FS-68)**
  - Master Community setup
  - Community hierarchy management
  - Tower/Building management
  - Email recipient configuration for approvals
  - Move-in/Move-out notification recipients

### 1.3 Dashboard System (FS-69)

- **Move-in Dashboard (UC-126)**

  - Community Admin view: All move-in requests
  - Security Team view: Approved requests only
  - Request tracking with status indicators
  - Export functionality (CSV/Excel)
  - Advanced search and filtering
  - Request creation capability

- **Account Renewal Dashboard (UC-127)**

  - Community Admin exclusive access
  - Renewal request lifecycle management
  - Tenant/HHO renewal tracking
  - Status-based filtering and reporting

- **Move-out Dashboard (UC-128)**
  - Community Admin view: All move-out requests
  - Security Team view: Approved requests only
  - Request approval workflow
  - Closure tracking by security team

### 1.4 Move-in Request Management (FS-15)

- **Move-in Request Types**

  - Owner Move-in (UC-129)
  - Tenant Move-in (UC-130)
  - HHO Unit Move-in (UC-131)
  - HHO Company Move-in (UC-132)

- **Request Workflow**
  - Request creation from backoffice
  - Document upload and validation
  - RFI (Request for Information) process
  - Approval workflow with Community Admin
  - Request closure by Security team
  - Cancellation capabilities

### 1.5 Account Renewal Management (FS-73)

- **Renewal Request Types**

  - Tenant Account Renewal (UC-137)
  - HHO Unit Account Renewal (UC-138)
  - HHO Company Account Renewal (UC-139)

- **Renewal Workflow**
  - Renewal request creation
  - Document management
  - Approval process
  - RFI handling
  - Cancellation management

### 1.6 Move-out Request Management (FS-29)

- **Move-out Processing**
  - Move-out request on behalf of users (UC-143)
  - Final settlements handling
  - Document verification
  - Approval workflow
  - Security team closure process
  - Service deactivation coordination

### 1.7 Request Lifecycle Management

- **Status Tracking**

  - Request creation and submission
  - Under review status
  - RFI (Request for Information) state
  - Approved/Rejected status
  - Closed/Completed status
  - Cancelled status

- **History & Audit Trail**
  - Complete request history tracking
  - Action logs with timestamps
  - User action attribution
  - Document version control
  - Status change notifications

### 1.8 Document Management

- **File Upload System**

  - Document attachment support
  - File type validation
  - Size limit enforcement
  - Secure file storage
  - Document versioning

- **Document Categories**
  - Identity proofs
  - Address proofs
  - Lease agreements
  - NOC documents
  - Supporting documents

## 2. Technical Requirements

### 2.2 Backend Technology Stack (Aligned with Common-Services)

- **Runtime**: Node.js 18+ LTS with TypeScript
- **Framework**: Express.js with TypeScript
- **Database**: MySQL with TypeORM
- **ORM**: TypeORM with Snake Case naming strategy
- **Authentication**: JWT with Passport.js
- **File Storage**: Azure Blob Storage / Local with Multer
- **Email Service**: NodeMailer with SMTP configuration
- **API Documentation**: Swagger with JSDoc
- **Validation**: Joi for input validation
- **Logging**: Winston for application logging
- **Caching**: Node-cache for in-memory caching
- **Scheduling**: Node-schedule for background jobs

### 2.3 Database Schema Requirements (Based on Existing Entities)

- **Extend Existing Tables**

  - users (leverage existing user management)
  - communities (use existing community hierarchy)
  - master_communities (existing master community structure)
  - towers (existing tower management)
  - units (existing unit management)
  - roles (existing role management)
  - user_roles (existing user role mappings)
  - file_uploads (existing file management)
  - notification_templates (existing notification system)

- **New Tables for Tenancy Management**
  - move_in_requests (move-in request data)
  - move_out_requests (move-out request data)
  - account_renewals (renewal request data)
  - request_history (audit trail for all requests)
  - tenancy_documents (documents specific to tenancy)
  - email_recipients (community-specific notification recipients)
  - request_status_logs (status change tracking)

### 2.4 API Requirements (Following Common-Services Pattern)

- **RESTful API Design**

  - Express.js with TypeScript controllers
  - Service layer pattern for business logic
  - Joi validation for input validation
  - Consistent API response format using common utilities
  - Snake case naming convention for database fields
  - Camel case for API responses

- **API Structure Following Existing Pattern**

  ```
  src/
    ├── Modules/
    │   ├── TenancyManagement/
    │   │   ├── MoveIn/
    │   │   │   ├── moveIn.controller.ts
    │   │   │   ├── moveIn.service.ts
    │   │   │   ├── moveIn.route.ts
    │   │   │   └── moveIn.validation.ts
    │   │   ├── MoveOut/
    │   │   ├── AccountRenewal/
    │   │   └── Dashboard/
    │   └── ...
    ├── Entities/
    │   ├── TenancyDocuments.entity.ts
    │   ├── TenancyRecords.entity.ts
    │   ├── TenancyForms.entity.ts
    │   ├── TenancyRecordOwner.entity.ts
    │   ├── TenancyRecordHHOOwner.entity.ts
    │   ├── TenancyRecordTenant.entity.ts
    │   ├── TenancyRecordHHOCompany.entity.ts
    │   ├── AccountRenewals.entity.ts
    │   └── TenancyRecordLogs.entity.ts
    └── ...
  ```

- **Key API Endpoints**
  - `/api/v1/tenancy/move-in/*` - Move-in request management
  - `/api/v1/tenancy/move-out/*` - Move-out request management
  - `/api/v1/tenancy/renewals/*` - Account renewal endpoints
  - `/api/v1/tenancy/dashboard/*` - Dashboard data endpoints
  - `/api/v1/tenancy/master-data/*` - Master data management
  - `/api/v1/common/documents/*` - File upload/download (extend existing)

## 3. Business Rules & Validations (Following Common-Services Patterns)

### 3.1 Access Control Rules (Using Existing Role System)

- **Community Admin Access (Role-based)**

  - View all requests regardless of status
  - Can perform RFI, Approve, Cancel actions
  - Access to all dashboard features
  - Master data configuration rights
  - Can submit approved requests to Smart FM
  - Uses existing `Roles` and `UserRoles` entities

- **Security Team Access (Role-based)**
  - View only approved requests (submitted to Smart FM)
  - Can only close approved requests
  - Limited dashboard access
  - No request creation rights
  - No Smart FM integration access
  - Restricted by role permissions

### 3.2 Smart FM Integration Rules

- **Submission Rules**

  - Only approved requests can be submitted to Smart FM
  - Must have all required documents attached
  - Community Admin must validate data before submission
  - Failed submissions can be retried

- **Status Synchronization Rules**
  - Local status takes precedence for workflow
  - Smart FM status stored for reference
  - Status transitions must follow predefined workflow
  - Smart FM errors must be logged and handled

### 3.3 Validation Implementation (Joi Validation)

Following the existing Common-Services validation pattern:

```typescript
// Example: Move-in Request Validation
export class MoveInValidation {
  static createMoveInRequest = Joi.object({
    requestedForId: Joi.number().integer().required(),
    communityId: Joi.number().integer().required(),
    unitId: Joi.number().integer().required(),
    moveInType: Joi.string()
      .valid("Owner", "Tenant", "HHO-Unit", "HHO-Company")
      .required(),
    moveInDate: Joi.date().min("now").required(),
    documents: Joi.array()
      .items(
        Joi.object({
          documentType: Joi.string().required(),
          fileId: Joi.number().integer().required(),
        })
      )
      .min(1)
      .required(),
  });

  static approveAndSubmitToSmartFM = Joi.object({
    id: Joi.number().integer().required(),
    approvalComments: Joi.string().optional(),
    submitToSmartFM: Joi.boolean().default(true),
  });
}
```

### 3.4 Business Logic Rules

- **Status Transition Rules**

  - Pending → UnderReview → RFI/Approved/Rejected
  - Approved → SubmittedToSmartFM (automatic after approval)
  - SubmittedToSmartFM → Closed (only by Security)
  - Any status → Cancelled (by Community Admin)

- **Smart FM Integration Rules**

  - Requests must be approved before Smart FM submission
  - Smart FM submission happens automatically after approval
  - Failed Smart FM submissions retry automatically
  - Smart FM cancellation requires local cancellation first

- **Request Workflow Rules**
  - Owner requests require ownership verification documents
  - Tenant requests require lease agreement documents
  - HHO requests require company/unit documentation
  - All requests require Community Admin approval before Smart FM submission
  - Security closure only available after successful Smart FM submission

### 3.5 Error Handling (Following Common-Services Pattern)

```typescript
// Using existing ApiError class
import ApiError from "../../Common/Utils/ApiError";
import { APICodes } from "../../Common/Constants";

// Example error handling with Smart FM integration
if (!unit.isAvailable) {
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    "Unit is not available for move-in",
    APICodes.UNIT_NOT_AVAILABLE
  );
}

// Smart FM integration error handling
if (smartFMError) {
  throw new ApiError(
    httpStatus.SERVICE_UNAVAILABLE,
    "Smart FM integration failed",
    APICodes.SMART_FM_ERROR
  );
}
```

## 4. Integration Requirements (Extending Common-Services)

### 4.1 Smart FM Integration (Primary)

- **Existing Smart FM Service**

  - Leverage existing `SmartFMService` class from Common-Services
  - Use existing authentication and token management
  - Extend existing data transformation mappings
  - Utilize existing error handling and logging

- **Data Transformation**
  - Use existing `MOVE_IN_REQUEST_MAPPING` constants
  - Leverage `ACCOUNT_RENEWAL_REQUEST_MAPPING` for renewals
  - Extend `MOVE_OUT_REQUEST_MAPPING` for move-out requests
  - Portal type mapping using existing constants

### 4.2 One-App Integration

- **Mobile App API Extensions**

  - Extend existing API endpoints for mobile app
  - Use existing notification system for mobile push
  - Leverage existing file upload infrastructure
  - Real-time status updates using existing mechanisms

- **Request Submission**
  - Accept requests from One-App (mobile application)
  - Process through backoffice workflow
  - Submit to Smart FM after approval
  - Send status updates back to mobile app

### 4.3 Email Integration

- **Email Notification System**

  - Extend existing `NotificationTemplates` system
  - Use existing `NotificationEmails` entity
  - Leverage existing NodeMailer configuration
  - Template-based email system with existing infrastructure

- **Community-Specific Recipients**
  - Use new `EmailRecipients` entity
  - Configure recipients per community/tower
  - Automated email sending on status changes
  - Email tracking and delivery confirmation

### 4.4 File Storage Integration

- **Document Storage**

  - Extend existing `FileUploads` entity
  - Use existing Azure Blob Storage integration
  - Leverage existing file validation utilities
  - Document versioning using existing patterns

- **Smart FM Document Sync**
  - Upload documents to Smart FM when submitting requests
  - Maintain document references in both systems
  - Handle document updates and versioning

### 4.5 Notification System

- **Email Notifications**

  - Request submission confirmations
  - Status change notifications
  - RFI notifications to requestors
  - Approval/rejection notifications
  - Smart FM integration status updates

- **In-App Notifications**
  - Extend existing notification system
  - Use existing device token management
  - Leverage existing push notification infrastructure
  - Real-time dashboard updates

### 4.6 Background Job Integration

- **Smart FM Sync Jobs**

  - Retry failed Smart FM submissions
  - Status synchronization between systems
  - Data reconciliation jobs
  - Performance monitoring and alerts

- **Email Queue Processing**
  - Batch email sending
  - Email delivery status tracking
  - Failed email retry mechanism
  - Email template management

## 5. Project Structure & Architecture

### 5.1 Backend Structure (Extending Common-Services)

```
tenancy-backend/ (extends Common-Services)
├── src/
│   ├── Entities/
│   │   ├── MoveInRequests.entity.ts
│   │   ├── MoveOutRequests.entity.ts
│   │   ├── AccountRenewals.entity.ts
│   │   ├── RequestHistory.entity.ts
│   │   ├── TenancyDocuments.entity.ts
│   │   └── EmailRecipients.entity.ts
│   ├── Modules/
│   │   ├── TenancyManagement/
│   │   │   ├── MoveIn/
│   │   │   │   ├── moveIn.controller.ts
│   │   │   │   ├── moveIn.service.ts
│   │   │   │   ├── moveIn.route.ts
│   │   │   │   ├── moveIn.validation.ts
│   │   │   │   └── moveIn.smartFM.service.ts
│   │   │   ├── MoveOut/
│   │   │   │   ├── moveOut.controller.ts
│   │   │   │   ├── moveOut.service.ts
│   │   │   │   ├── moveOut.route.ts
│   │   │   │   ├── moveOut.validation.ts
│   │   │   │   └── moveOut.smartFM.service.ts
│   │   │   ├── AccountRenewal/
│   │   │   │   ├── accountRenewal.controller.ts
│   │   │   │   ├── accountRenewal.service.ts
│   │   │   │   ├── accountRenewal.route.ts
│   │   │   │   ├── accountRenewal.validation.ts
│   │   │   │   └── accountRenewal.smartFM.service.ts
│   │   │   ├── Dashboard/
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   └── dashboard.route.ts
│   │   │   └── MasterData/
│   │   │       ├── masterData.controller.ts
│   │   │       ├── masterData.service.ts
│   │   │       └── masterData.route.ts
│   │   └── Common/ (extend existing)
│   ├── Migration/
│   │   └── TenancyManagement/
│   │       ├── AddMoveInRequests.ts
│   │       ├── AddMoveOutRequests.ts
│   │       ├── AddAccountRenewals.ts
│   │       └── AddRequestHistory.ts
│   ├── Common/ (extend existing)
│   │   ├── Integration/
│   │   │   └── ShobhaSmartFM/ (extend existing)
│   │   │       └── TenancySmartFM.service.ts
│   │   └── Constants/
│   │       └── tenancyMappings.ts
│   ├── Types/
│   │   └── tenancy.types.ts
│   └── Utils/ (extend existing)
├── package.json
├── tsconfig.json
└── .env.example
```

### 5.2 Development Environment Setup

#### 5.2.1 Backend Setup (Extending Common-Services)

- **Database Configuration**

  - MySQL database (extend existing Common-Services DB)
  - TypeORM configuration with new entities
  - Migration scripts for tenancy tables
  - Database seeding with master data

- **Smart FM Integration**

  - Extend existing Smart FM service
  - Configure Smart FM credentials
  - Setup retry mechanisms for failed integrations
  - Configure logging for Smart FM interactions

- **Authentication & Security**
  - JWT authentication setup (existing)
  - Role-based access control configuration
  - API rate limiting configuration
  - CORS setup for frontend integration

### 5.3 Integration Points

#### 5.3.1 Smart FM Integration Points

- **Request Submission**: After Community Admin approval
- **Status Updates**: Bidirectional sync between systems
- **Document Sync**: Upload documents to Smart FM
- **Error Handling**: Comprehensive error management

#### 5.3.2 Email Integration Points

- **Notification Triggers**: On status changes
- **Template Management**: Community-specific templates
- **Recipient Management**: Role-based email lists
- **Delivery Tracking**: Email delivery status

#### 5.3.3 File Storage Integration Points

- **Document Upload**: Azure Blob Storage
- **Document Validation**: File type and size checks
- **Document Versioning**: Version control for updates
- **Document Security**: Access control and permissions

## 6. Timeline & Milestones (Revised with Smart FM Integration)

### Phase 1: Foundation & Setup (Weeks 1-2)

- **Backend Setup**

  - Extend Common-Services project structure
  - Create new database entities and migrations
  - Setup new modules for tenancy management
  - Configure routes and basic controllers
  - **Smart FM Integration Setup**
    - Configure Smart FM service extensions
    - Setup data transformation mappings
    - Configure Smart FM credentials and endpoints

- **Frontend Setup**
  - Create new Next.js project following One-Sobha-Admin structure
  - Setup Redux store with tenancy features
  - Configure Material-UI theme
  - Setup basic routing structure
  - Configure API services for Smart FM integration

### Phase 2: Core Features Implementation (Weeks 3-6)

- **Move-in Management**

  - Backend APIs for all move-in types
  - Smart FM integration for move-in requests
  - Frontend forms and dashboard
  - Document upload integration
  - Request workflow implementation with Smart FM submission

- **Dashboard Development**
  - Role-based dashboard views
  - Data grid implementation with Smart FM status
  - Search and filter functionality
  - Export capabilities
  - Real-time status updates from Smart FM

### Phase 3: Advanced Features (Weeks 7-10)

- **Move-out Management**

  - Move-out request APIs and forms
  - Smart FM integration for move-out requests
  - Approval workflow
  - Security team closure process

- **Account Renewal**
  - Renewal request management
  - Smart FM integration for renewals
  - Document handling
  - Approval process with Smart FM submission

### Phase 4: Integration & Testing (Weeks 11-12)

- **Smart FM Integration Testing**

  - End-to-end testing with Smart FM
  - Error handling and retry mechanisms
  - Performance optimization
  - Data synchronization testing

- **Email Integration**

  - Notification templates
  - Email recipients configuration
  - Automated email sending
  - Smart FM status change notifications

- **Testing & Deployment**
  - Unit testing for critical functions
  - Integration testing with Smart FM
  - Performance optimization
  - Production deployment with Smart FM connectivity

### Phase 5: Post-Launch Optimization (Weeks 13-14)

- **Smart FM Monitoring**

  - Setup monitoring for Smart FM integration
  - Performance metrics and alerts
  - Error tracking and resolution
  - Data reconciliation processes

- **User Training & Support**
  - User documentation
  - Training materials
  - Support processes
  - Feedback collection and improvements

---

**Based on**:

- FD-Tenancy-Backoffice BRD v1.0
- Common-Services Architecture with Smart FM Integration
  **Project Contact**: [Your Name]  
  **Last Updated**: July 17, 2025  
  **Document Version**: 4.0 (Smart FM Integration)
