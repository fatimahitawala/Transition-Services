import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1756447939513 implements MigrationInterface {
    name = 'TransitionServiceChanges1756447939513'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_1f8100853737faedd5971827d87\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_6e49caf025f8bed3dc0cdf6e7b0\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_79d604efe62a6df984fd19d80d9\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_b17dbd853baf3540cd21985d4c5\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_bd71209bfc9887b47ffeea8bc73\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_c8b8eef828be4960232bb8db92c\``);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`unit_permit_number\` varchar(100) NULL`);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`unit_permit_start_date\` date NULL`);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`unit_permit_expiry_date\` date NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_data\` json NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`masterCommunityId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`communityId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`towerId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`occupancyRequestTemplatesId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`occupancyRequestWelcomePackId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`occupancyRequestEmailRecipientsId\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`template_string\` \`template_string\` longtext NULL COMMENT 'Base64 encoded file content for HTML files only. For PDF files, use fileId instead.'`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_type\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_type\` varchar(50) NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_string\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_string\` text NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` CHANGE \`file_id\` \`file_id\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mip_recipients\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mip_recipients\` text NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mop_recipients\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mop_recipients\` text NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`created_by\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`created_by\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`updated_by\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`updated_by\` int NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_23dc11bf8635199afa0119f530c\` FOREIGN KEY (\`file_id\`) REFERENCES \`file_uploads\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_256790598bc4f76591d9e2b5f4e\` FOREIGN KEY (\`masterCommunityId\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_906cf2293eca77cd1f1f46abba1\` FOREIGN KEY (\`communityId\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_12cec32da7a00ff0b21d953f504\` FOREIGN KEY (\`towerId\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_d9b2f19c7cf4926c9b8b9df2898\` FOREIGN KEY (\`occupancyRequestTemplatesId\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_76fdc58899f7271dcf0502d5b3d\` FOREIGN KEY (\`occupancyRequestWelcomePackId\`) REFERENCES \`occupancy_request_welcome_pack\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_81929e4c6061c94a4a13d5c38c4\` FOREIGN KEY (\`occupancyRequestEmailRecipientsId\`) REFERENCES \`occupancy_request_email_recipients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_f3a21442469529a10d58eb596bd\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_61439a9c09348be8e991d69929a\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_61439a9c09348be8e991d69929a\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_f3a21442469529a10d58eb596bd\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_81929e4c6061c94a4a13d5c38c4\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_76fdc58899f7271dcf0502d5b3d\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_d9b2f19c7cf4926c9b8b9df2898\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_12cec32da7a00ff0b21d953f504\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_906cf2293eca77cd1f1f46abba1\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_256790598bc4f76591d9e2b5f4e\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_23dc11bf8635199afa0119f530c\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`updated_by\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`updated_by\` bigint NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`created_by\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`created_by\` bigint NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mop_recipients\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mop_recipients\` varchar(500) NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mip_recipients\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mip_recipients\` varchar(500) NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` CHANGE \`file_id\` \`file_id\` int NULL COMMENT 'Reference to FileUploads entity for PDF files'`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_string\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_string\` longtext NULL COMMENT 'Base64 encoded file content for welcome pack'`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_type\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_type\` enum ('move-in', 'move-out', 'welcome-pack', 'recipient-mail') NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`template_string\` \`template_string\` longtext NOT NULL COMMENT 'Base64 encoded file content for PDF, DOC, DOCX files'`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestEmailRecipientsId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestWelcomePackId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancyRequestTemplatesId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`towerId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`communityId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`masterCommunityId\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_data\``);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_expiry_date\``);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_start_date\``);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unit_permit_number\``);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_c8b8eef828be4960232bb8db92c\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_bd71209bfc9887b47ffeea8bc73\` FOREIGN KEY (\`occupancy_request_templates_id\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_b17dbd853baf3540cd21985d4c5\` FOREIGN KEY (\`occupancy_request_welcome_pack_id\`) REFERENCES \`occupancy_request_welcome_pack\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_79d604efe62a6df984fd19d80d9\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_6e49caf025f8bed3dc0cdf6e7b0\` FOREIGN KEY (\`occupancy_request_email_recipients_id\`) REFERENCES \`occupancy_request_email_recipients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_1f8100853737faedd5971827d87\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
