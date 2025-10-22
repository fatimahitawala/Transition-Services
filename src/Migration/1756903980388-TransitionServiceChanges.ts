import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1756903980388 implements MigrationInterface {
    name = 'TransitionServiceChanges1756903980388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`trade_license_expiry_date\` date NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`dtcm_start_date\` date NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD \`dtcm_expiry_date\` date NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`dtcm_expiry_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`dtcm_start_date\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`trade_license_expiry_date\``);
    }

}
