# Database Schema Changes: Tenancy Management Refactoring

## Overview

The Tenancy Management module has been refactored to separate form data from core tenancy record data, and to support multiple document uploads per tenancy record. Form data is now stored in four distinct tables based on tenancy type. Deprecated entities such as TenantForms have been removed.

## New Schema Structure

### TenancyRecords (Core Entity)

**Purpose**: Stores core tenancy information and operational data
**Table**: `tenancy_records`

**Key Fields**:

- `id` (UUID): Primary key
- `unitId`: Reference to the unit
- `userId`: Reference to the user
- `tenancyType`: Type of tenancy (tenant, owner, hho_company, hho_owner)
- `status`: Current status (pending, active, inactive, etc.)
- `startDate`, `endDate`: Tenancy period
- `terminationDate`, `terminationReason`, `refundAmount`: Termination info
- `transferDate`, `transferReason`: Transfer info
- `smartFMId`, `smartFMRequestNumber`: Smart FM integration
- `comments`: General comments
- Audit fields (`createdBy`, `updatedBy`, `createdAt`, `updatedAt`)

### TenancyRecordTenant / TenancyRecordOwner / TenancyRecordHHOCompany / TenancyRecordHHOOwner (Form Data)

**Purpose**: Stores form submission data and personal information for each tenancy type
**Tables**: `tenancy_record_tenant`, `tenancy_record_owner`, `tenancy_record_hho_company`, `tenancy_record_hho_owner`
**Relationship**: 1:1 with TenancyRecords (each tenancy record links to one form table based on type)

**Key Fields (example for Tenant)**:

- `id` (UUID): Primary key
- `tenancyRecordId` (UUID): Foreign key to TenancyRecords
- Personal Information: `firstName`, `middleName`, `lastName`, `email`, `phoneNumber`, etc.
- Demographics: `adults`, `children`, `householdStaffs`, `pets`
- Document Numbers: `emiratesIdNumber`, `passportNumber`, `visaNumber`
- Financial: `monthlyRent`, `securityDeposit`, `maintenanceFee`
- Audit fields

**Other form tables** have similar fields, with additional fields for company info, power of attorney, etc., as relevant to the tenancy type.

### TenancyDocuments (Document Management)

**Purpose**: Manages document uploads and their metadata
**Table**: `tenancy_documents`
**Relationships**:

- N:1 with TenancyRecords
- N:1 with FileUploads
- Self-referencing for versioning

**Key Fields**:

- `id` (UUID): Primary key
- `tenancyRecordId` (UUID): Foreign key to TenancyRecords
- `fileUploadId` (UUID): Foreign key to FileUploads
- `documentType`: Type of document (emirates_id, passport, visa, etc.)
- `documentNumber`: Document number/identifier
- `issueDate`, `expiryDate`: Document validity period
- `issuingAuthority`: Who issued the document
- `status`: Document review status (pending, approved, rejected, etc.)
- `version`: Document version number
- `previousVersionId`: Link to previous version
- Review info: `reviewedBy`, `reviewedAt`, `reviewComments`
- Audit fields

## Relationships

```
TenancyRecords (1) -----> (1) TenancyRecordTenant | TenancyRecordOwner | TenancyRecordHHOCompany | TenancyRecordHHOOwner
TenancyRecords (1) -----> (N) TenancyDocuments
TenancyDocuments (N) ----> (1) FileUploads
TenancyDocuments (N) ----> (1) TenancyDocuments [self-reference for versioning]
```

## Key Benefits

1. **Separation of Concerns**: Core tenancy data is separate from form submissions
2. **Distinct Form Tables**: Each tenancy type has its own form table for clarity and maintainability
3. **Document Management**: Proper document upload handling with versioning
4. **Flexible Schema**: Easy to add new document types or form fields
5. **Data Integrity**: Proper foreign key relationships ensure data consistency
6. **Audit Trail**: Complete audit trail for all changes

## Document Types Supported

- `emirates_id`: Emirates ID
- `passport`: Passport
- `visa`: Visa
- `trade_license`: Trade License (for companies)
- `power_of_attorney`: Power of Attorney (for HHO)
- `ejari`: EJARI Certificate
- `dtcm_permit`: DTCM Permit
- `salary_certificate`: Salary Certificate
- `bank_statement`: Bank Statement
- `no_objection_certificate`: NOC
- `tenancy_contract`: Tenancy Contract
- `utility_bill`: Utility Bill
- `insurance_policy`: Insurance Policy
- `other`: Other documents

## Migration Notes

- The migration script (`003-split-form-tables.ts`) handles:
  - Creating new form tables for each tenancy type
  - Adding foreign key relationships
  - Creating necessary indexes
  - Removing old form tables and references (including TenantForms)
  - Adding new operational columns to `tenancy_records`

## API Changes

The service layer has been updated to:

- Use transactions for data consistency
- Support creating multiple related records
- Include proper relationships in queries
- Handle document uploads and management
- Support form updates and versioning

## Usage Examples

### Creating a Tenancy Record

```typescript
const tenancyData = {
  unitId: 123,
  tenancyType: "tenant",
  startDate: "2025-01-01",
  endDate: "2026-01-01",
  form: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    // ... other form fields
  },
  documents: [
    {
      fileUploadId: "uuid-here",
      documentType: "emirates_id",
      documentNumber: "123456789",
      expiryDate: "2030-12-31",
    },
  ],
};

const result = await tenancyService.createTenancyRecord(tenancyData, user);
```

### Querying with Relationships

```typescript
const tenancy = await TenancyRecords.findOne({
  where: { id: tenancyId },
  relations: ["form", "documents", "documents.fileUpload", "unit", "user"],
});

// Access form data
const form = tenancy.form;
const fullName = form.fullName;

// Access documents
const emiratesId = tenancy.documents.find(
  (doc) => doc.documentType === "emirates_id"
);
const expiringDocs = tenancy.getExpiringDocuments();
```

This new schema provides a robust foundation for the Tenancy Management system with proper separation of concerns and scalability for future requirements.
