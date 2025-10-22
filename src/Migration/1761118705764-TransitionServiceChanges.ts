import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1761118705764 implements MigrationInterface {
    name = 'TransitionServiceChanges1761118705764'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Safely drop FKs only if they exist (avoids ER_CANT_DROP_FIELD_OR_KEY)
        const dropFKIfExists = async (fkName: string) => {
            const rows: any[] = await queryRunner.query(
                `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'occupancy_request_template_history' 
                   AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
                [fkName]
            );
            if (rows && rows.length > 0) {
                await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`${fkName}\``);
            }
        };
        await dropFKIfExists('FK_1f8100853737faedd5971827d87');
        await dropFKIfExists('FK_6e49caf025f8bed3dc0cdf6e7b0');
        await dropFKIfExists('FK_79d604efe62a6df984fd19d80d9');
        await dropFKIfExists('FK_b17dbd853baf3540cd21985d4c5');
        await dropFKIfExists('FK_bd71209bfc9887b47ffeea8bc73');
        await dropFKIfExists('FK_c8b8eef828be4960232bb8db92c');
        // Helper to drop column if it exists
        const dropColumnIfExists = async (table: string, column: string) => {
            const cols: any[] = await queryRunner.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [table, column]
            );
            if (cols && cols.length > 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
            }
        };
        // Helper to add column if it does not exist
        const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
            const cols: any[] = await queryRunner.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [table, column]
            );
            if (!cols || cols.length === 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`${column}\` ${definition}`);
            }
        };
        // Conditionally drop columns on account_renewal_request_details_hho_owner
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'owner_first_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'owner_last_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'attorney_first_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'attorney_last_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'email');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'dial_code');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'phone_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'nationality');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'date_of_birth');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'emergency_contact_dial_code');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'emergency_contact_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'adults');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'children');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'household_staffs');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'pets');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'emirates_id_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'passport_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'visa_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'power_of_attorney_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'attorney_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'attorney_phone');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'ejari_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'dtcm_permit_number');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'emergency_contact_name');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'relationship');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'comments');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'monthly_rent');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'security_deposit');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'maintenance_fee');
        await dropColumnIfExists('account_renewal_request_details_hho_owner', 'currency');
        // Conditionally drop columns on account_renewal_request_details_tenant
        await dropColumnIfExists('account_renewal_request_details_tenant', 'first_name');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'last_name');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'email');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'dial_code');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'phone_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'nationality');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'date_of_birth');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'emergency_contact_dial_code');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'emergency_contact_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'emirates_id_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'passport_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'visa_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'power_of_attorney_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'attorney_name');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'attorney_phone');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'ejari_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'dtcm_permit_number');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'emergency_contact_name');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'relationship');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'comments');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'monthly_rent');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'security_deposit');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'maintenance_fee');
        await dropColumnIfExists('account_renewal_request_details_tenant', 'currency');
        await addColumnIfNotExists('move_in_requests', 'actual_move_in_date', 'date NULL');
        await addColumnIfNotExists('account_renewal_request_details_hho_owner', 'dtcm_permit_end_date', 'date NULL');
        await addColumnIfNotExists('account_renewal_request_details_tenant', 'tenancy_contract_end_date', 'date NULL');
        await addColumnIfNotExists('account_renewal_request_details_tenant', 'determination_comments', 'text NULL');
        await addColumnIfNotExists('move_in_request_details_hho_owner', 'people_of_determination', 'tinyint NOT NULL DEFAULT 0');
        await addColumnIfNotExists('move_in_request_details_hho_owner', 'unit_permit_number', 'varchar(100) NULL');
        await addColumnIfNotExists('move_in_request_details_hho_owner', 'unit_permit_start_date', 'date NULL');
        await addColumnIfNotExists('move_in_request_details_hho_owner', 'unit_permit_expiry_date', 'date NULL');
        await addColumnIfNotExists('move_in_request_details_hho_owner', 'determination_text', 'text NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'name', 'varchar(100) NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'country_code', 'varchar(10) NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'operator_country_code', 'varchar(10) NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'operator_office_number', 'varchar(20) NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'trade_license_expiry_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'tenancy_contract_start_date', 'date NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'unit_permit_start_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'unit_permit_expiry_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'unit_permit_number', 'varchar(100) NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'lease_start_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'lease_end_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'dtcm_start_date', 'date NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'dtcm_expiry_date', 'date NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'nationality', 'varchar(100) NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'emirates_id_number', 'varchar(100) NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'emirates_id_expiry_date', 'date NOT NULL');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'people_of_determination', 'tinyint NOT NULL DEFAULT 0');
        await addColumnIfNotExists('move_in_request_details_hhc_company', 'determination_text', 'text NULL');
        await addColumnIfNotExists('move_in_request_details_owner', 'people_of_determination', 'tinyint NOT NULL DEFAULT 0');
        await addColumnIfNotExists('move_in_request_details_owner', 'determination_text', 'text NULL');
        await addColumnIfNotExists('occupancy_request_welcome_pack', 'file_id', "int NULL COMMENT 'Reference to FileUploads entity for PDF files'");
        await addColumnIfNotExists('occupancy_request_template_history', 'file_id', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'template_data', 'json NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'masterCommunityId', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'communityId', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'towerId', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'occupancyRequestTemplatesId', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'occupancyRequestWelcomePackId', 'int NULL');
        await addColumnIfNotExists('occupancy_request_template_history', 'occupancyRequestEmailRecipientsId', 'int NULL');
        // moving_request_mappings.status: expand -> migrate data -> restrict
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'open'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'new' WHERE \`status\` = 'open'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'rfi-pending' WHERE \`status\` = 'rfi'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'cancelled' WHERE \`status\` = 'cancel'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'approved' WHERE \`status\` = 'approve'`);
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'new'`);

        // account_renewal_requests.request_type: normalize values before restricting enum
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`request_type\` = 'hho_owner' WHERE \`request_type\` = 'owner'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('tenant', 'hho_company', 'hho_owner') NOT NULL`);

        // account_renewal_requests.status: expand -> migrate data -> restrict
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'new' WHERE \`status\` = 'open'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'rfi-pending' WHERE \`status\` = 'rfi'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'cancelled' WHERE \`status\` = 'cancel'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'approved' WHERE \`status\` = 'approve'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        // account_renewal_request_logs.request_type: normalize before restricting enum
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`request_type\` = 'hho_owner' WHERE \`request_type\` = 'owner'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`request_type\` \`request_type\` enum ('tenant', 'hho_company', 'hho_owner') NOT NULL`);
        // account_renewal_request_logs.status: expand -> migrate data -> restrict
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'new' WHERE \`status\` = 'open'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'rfi-pending' WHERE \`status\` = 'rfi'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'cancelled' WHERE \`status\` = 'cancel'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'approved' WHERE \`status\` = 'approve'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`company_email\` \`company_email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`trade_license_number\` \`trade_license_number\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`id\` \`id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`template_string\` \`template_string\` longtext NULL COMMENT 'Base64 encoded file content for HTML files only. For PDF files, use fileId instead.'`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_type\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_type\` varchar(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_string\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_string\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mip_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mip_recipients\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mop_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mop_recipients\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`created_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_23dc11bf8635199afa0119f530c\` FOREIGN KEY (\`file_id\`) REFERENCES \`file_uploads\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_256790598bc4f76591d9e2b5f4e\` FOREIGN KEY (\`masterCommunityId\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_906cf2293eca77cd1f1f46abba1\` FOREIGN KEY (\`communityId\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_12cec32da7a00ff0b21d953f504\` FOREIGN KEY (\`towerId\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_d9b2f19c7cf4926c9b8b9df2898\` FOREIGN KEY (\`occupancyRequestTemplatesId\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_76fdc58899f7271dcf0502d5b3d\` FOREIGN KEY (\`occupancyRequestWelcomePackId\`) REFERENCES \`occupancy_request_welcome_pack\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_81929e4c6061c94a4a13d5c38c4\` FOREIGN KEY (\`occupancyRequestEmailRecipientsId\`) REFERENCES \`occupancy_request_email_recipients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_f3a21442469529a10d58eb596bd\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_61439a9c09348be8e991d69929a\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const dropColumnIfExists = async (table: string, column: string) => {
            const cols: any[] = await queryRunner.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [table, column]
            );
            if (cols && cols.length > 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
            }
        };

        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_61439a9c09348be8e991d69929a\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_f3a21442469529a10d58eb596bd\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_81929e4c6061c94a4a13d5c38c4\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_76fdc58899f7271dcf0502d5b3d\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_d9b2f19c7cf4926c9b8b9df2898\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_12cec32da7a00ff0b21d953f504\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_906cf2293eca77cd1f1f46abba1\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_256790598bc4f76591d9e2b5f4e\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_23dc11bf8635199afa0119f530c\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`updated_by\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`created_by\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mop_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mop_recipients\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mip_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mip_recipients\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_string\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_string\` longtext NULL COMMENT 'Base64 encoded file content for welcome pack'`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_type\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_type\` enum ('move-in', 'move-out', 'welcome-pack', 'recipient-mail') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`template_string\` \`template_string\` longtext NOT NULL COMMENT 'Base64 encoded file content for PDF, DOC, DOCX files'`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`id\` \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`trade_license_number\` \`trade_license_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`company_email\` \`company_email\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD PRIMARY KEY (\`id\`)`);
        // account_renewal_request_logs.status: expand -> migrate data back -> restrict
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'open' WHERE \`status\` = 'new'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'rfi' WHERE \`status\` = 'rfi-pending'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'cancel' WHERE \`status\` = 'cancelled'`);
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`status\` = 'approve' WHERE \`status\` = 'approved'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        // account_renewal_request_logs.request_type: map back and expand
        await queryRunner.query(`UPDATE \`account_renewal_request_logs\` SET \`request_type\` = 'owner' WHERE \`request_type\` = 'hho_owner'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`request_type\` \`request_type\` enum ('owner', 'tenant', 'hho_company', 'hho_owner') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD PRIMARY KEY (\`id\`)`);
        // account_renewal_requests.status: expand -> migrate data back -> restrict
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'open' WHERE \`status\` = 'new'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'rfi' WHERE \`status\` = 'rfi-pending'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'cancel' WHERE \`status\` = 'cancelled'`);
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`status\` = 'approve' WHERE \`status\` = 'approved'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        // account_renewal_requests.request_type: map back and allow owner again
        await queryRunner.query(`UPDATE \`account_renewal_requests\` SET \`request_type\` = 'owner' WHERE \`request_type\` = 'hho_owner'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('owner', 'tenant', 'hho_company', 'hho_owner') NOT NULL`);
        // moving_request_mappings.status: expand -> migrate data back -> restrict
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'open'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'open' WHERE \`status\` = 'new'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'rfi' WHERE \`status\` = 'rfi-pending'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'cancel' WHERE \`status\` = 'cancelled'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'approve' WHERE \`status\` = 'approved'`);
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL DEFAULT 'open'`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestEmailRecipientsId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestWelcomePackId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestTemplatesId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`towerId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`communityId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`masterCommunityId\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_data\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`file_id\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP COLUMN \`file_id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`determination_text\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`people_of_determination\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`determination_text\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`people_of_determination\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`emirates_id_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`emirates_id_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`nationality\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`dtcm_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`dtcm_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`lease_end_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`lease_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`tenancy_contract_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`trade_license_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`operator_office_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`operator_country_code\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`country_code\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`determination_text\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`people_of_determination\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`determination_comments\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`tenancy_contract_end_date\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP COLUMN \`dtcm_permit_end_date\``);
        await dropColumnIfExists('move_in_requests', 'actual_move_in_date');
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`currency\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`maintenance_fee\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`security_deposit\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`monthly_rent\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`comments\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`relationship\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`emergency_contact_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`dtcm_permit_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`ejari_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`attorney_phone\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`attorney_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`power_of_attorney_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`visa_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`passport_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`emirates_id_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`emergency_contact_number\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`emergency_contact_dial_code\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`date_of_birth\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`nationality\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`phone_number\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`dial_code\` varchar(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`last_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`first_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`currency\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`maintenance_fee\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`security_deposit\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`monthly_rent\` double(12,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`comments\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`relationship\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`emergency_contact_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`dtcm_permit_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`ejari_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`attorney_phone\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`attorney_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`power_of_attorney_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`visa_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`passport_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`emirates_id_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`pets\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`household_staffs\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`children\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`adults\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`emergency_contact_number\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`emergency_contact_dial_code\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`date_of_birth\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`nationality\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`phone_number\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`dial_code\` varchar(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`attorney_last_name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`attorney_first_name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`owner_last_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`owner_first_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_c8b8eef828be4960232bb8db92c\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_bd71209bfc9887b47ffeea8bc73\` FOREIGN KEY (\`occupancy_request_templates_id\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_b17dbd853baf3540cd21985d4c5\` FOREIGN KEY (\`occupancy_request_welcome_pack_id\`) REFERENCES \`occupancy_request_welcome_pack\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_79d604efe62a6df984fd19d80d9\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_6e49caf025f8bed3dc0cdf6e7b0\` FOREIGN KEY (\`occupancy_request_email_recipients_id\`) REFERENCES \`occupancy_request_email_recipients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_1f8100853737faedd5971827d87\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
