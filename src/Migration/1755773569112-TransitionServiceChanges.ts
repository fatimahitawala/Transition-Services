import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1755773569112 implements MigrationInterface {
    name = 'TransitionServiceChanges1755773569112'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`country_code\` varchar(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`operator_office_number\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`tenancy_contract_start_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`unit_permit_start_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`unit_permit_expiry_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`unit_permit_number\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`lease_start_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`lease_end_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`nationality\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`emirates_id_number\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`emirates_id_expiry_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`people_of_determination\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`emirates_id_expiry_date\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`tenancy_contract_start_date\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`tenancy_contract_end_date\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`occupancy_request_email_recipients_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mip_recipients\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`mop_recipients\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`occupancy_request_welcome_pack_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`master_community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`tower_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD \`template_string\` longtext NULL COMMENT 'Base64 encoded file content for welcome pack'`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`company_email\` \`company_email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`trade_license_number\` \`trade_license_number\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`first_name\` \`first_name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`last_name\` \`last_name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`email\` \`email\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`dial_code\` \`dial_code\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`phone_number\` \`phone_number\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`nationality\` \`nationality\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` DROP COLUMN \`status\``);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert move_out_requests status column dropped in up()
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);

        // Revert tenant_move_in_request_details changes from up()
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`nationality\` \`nationality\` varchar(100) NOT NULL`
        );
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`phone_number\` \`phone_number\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`dial_code\` \`dial_code\` varchar(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`email\` \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`last_name\` \`last_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` CHANGE \`first_name\` \`first_name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`tenancy_contract_end_date\``);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`tenancy_contract_start_date\``);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`emirates_id_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`people_of_determination\``);

        // Revert move_in_request_details_owner default change
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`adults\` \`adults\` int NOT NULL DEFAULT '0'`);

        // Revert move_in_request_details_hhc_company changes from up()
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`trade_license_number\` \`trade_license_number\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`company_email\` \`company_email\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`emirates_id_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`emirates_id_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`nationality\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`lease_end_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`lease_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`unit_permit_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`tenancy_contract_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`operator_office_number\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`country_code\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`name\``);

        // Revert occupancy_request_template_history added columns
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`template_string\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`tower_id\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`community_id\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`master_community_id\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancy_request_welcome_pack_id\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mop_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`mip_recipients\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP COLUMN \`occupancy_request_email_recipients_id\``);
    }

}
