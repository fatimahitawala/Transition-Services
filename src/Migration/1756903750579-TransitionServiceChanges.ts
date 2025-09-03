import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1756903750579 implements MigrationInterface {
    name = 'TransitionServiceChanges1756903750579'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP FOREIGN KEY \`FK_move_in_request_details_hhc_company_move_in_request_id\``);
        await queryRunner.query(`DROP INDEX \`FK_bd71209bfc9887b47ffeea8bc73\` ON \`occupancy_request_template_history\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`country_code\` varchar(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`id\` \`id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`move_in_request_id\` \`move_in_request_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD CONSTRAINT \`FK_2ee3f05cdc12863c453b9066317\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP FOREIGN KEY \`FK_2ee3f05cdc12863c453b9066317\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`move_in_request_id\` \`move_in_request_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`updated_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`created_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` CHANGE \`is_active\` \`is_active\` tinyint(1) NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`id\` varchar(36) COLLATE "utf8mb4_unicode_ci" NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` CHANGE \`id\` \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`country_code\``);
        await queryRunner.query(`CREATE INDEX \`FK_bd71209bfc9887b47ffeea8bc73\` ON \`occupancy_request_template_history\` (\`occupancy_request_templates_id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD CONSTRAINT \`FK_move_in_request_details_hhc_company_move_in_request_id\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
