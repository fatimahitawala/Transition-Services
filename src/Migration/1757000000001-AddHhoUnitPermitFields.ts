import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHhoUnitPermitFields1757000000001 implements MigrationInterface {
    name = 'AddHhoUnitPermitFields1757000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add HHO Unit permit fields to move_in_request_details_hho_owner table
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD COLUMN \`unitPermitNumber\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD COLUMN \`unitPermitStartDate\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD COLUMN \`unitPermitExpiryDate\` date NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove HHO Unit permit fields
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unitPermitExpiryDate\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unitPermitStartDate\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`unitPermitNumber\``);
    }
}
