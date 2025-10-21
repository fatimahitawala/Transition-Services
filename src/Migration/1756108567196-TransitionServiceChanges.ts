import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1756108567196 implements MigrationInterface {
    name = 'TransitionServiceChanges1756108567196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create simplified HHC Company table with only 3 date fields
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`account_renewal_request_details_hho_company\` (\`id\` int NOT NULL AUTO_INCREMENT, \`lease_contract_end_date\` date NULL, \`dtcm_permit_end_date\` date NULL, \`permit_expiry\` date NULL, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`account_renewal_request_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        
        // Add foreign key only if it doesn't exist
        const hasFK = await queryRunner.query(`SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account_renewal_request_details_hho_company' AND CONSTRAINT_NAME = 'FK_db6b5411557b108002c3c8ddb77'`);
        if (hasFK[0].count === 0) {
            await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` ADD CONSTRAINT \`FK_db6b5411557b108002c3c8ddb77\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` DROP FOREIGN KEY \`FK_db6b5411557b108002c3c8ddb77\``);
        await queryRunner.query(`DROP TABLE \`account_renewal_request_details_hho_company\``);
    }

}
