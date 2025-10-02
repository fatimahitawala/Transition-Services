import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1756108567196 implements MigrationInterface {
    name = 'TransitionServiceChanges1756108567196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`account_renewal_request_details_hho_company\` (\`id\` int NOT NULL AUTO_INCREMENT, \`company_name\` varchar(255) NOT NULL, \`trade_license_number\` varchar(100) NULL, \`company_address\` varchar(255) NULL, \`company_phone\` varchar(20) NULL, \`company_email\` varchar(255) NULL, \`power_of_attorney_number\` varchar(100) NULL, \`attorney_name\` varchar(255) NULL, \`attorney_phone\` varchar(20) NULL, \`ejari_number\` varchar(100) NULL, \`dtcm_permit_number\` varchar(100) NULL, \`emergency_contact_name\` varchar(255) NULL, \`relationship\` varchar(100) NULL, \`comments\` text NULL, \`monthly_rent\` double(12,2) NULL, \`security_deposit\` double(12,2) NULL, \`maintenance_fee\` double(12,2) NULL, \`currency\` varchar(10) NULL, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`account_renewal_request_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` ADD CONSTRAINT \`FK_db6b5411557b108002c3c8ddb77\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` DROP FOREIGN KEY \`FK_db6b5411557b108002c3c8ddb77\``);
        await queryRunner.query(`DROP TABLE \`account_renewal_request_details_hho_company\``);
    }

}
