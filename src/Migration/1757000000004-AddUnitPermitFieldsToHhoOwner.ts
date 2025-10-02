import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add missing unit permit fields to MoveInRequestDetailsHhoOwner table:
 * - unitPermitNumber: varchar(100) NULL
 * - unitPermitStartDate: date NULL  
 * - unitPermitExpiryDate: date NULL
 */
export class AddUnitPermitFieldsToHhoOwner1757000000004 implements MigrationInterface {
    name = 'AddUnitPermitFieldsToHhoOwner1757000000004';

    private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
        const columns = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
        return columns.length > 0;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = 'move_in_request_details_hho_owner';
        
        // Add unitPermitNumber column if it doesn't exist
        if (!(await this.columnExists(queryRunner, table, 'unitPermitNumber'))) {
            await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`unitPermitNumber\` varchar(100) NULL`);
        }
        
        // Add unitPermitStartDate column if it doesn't exist
        if (!(await this.columnExists(queryRunner, table, 'unitPermitStartDate'))) {
            await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`unitPermitStartDate\` date NULL`);
        }
        
        // Add unitPermitExpiryDate column if it doesn't exist
        if (!(await this.columnExists(queryRunner, table, 'unitPermitExpiryDate'))) {
            await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`unitPermitExpiryDate\` date NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = 'move_in_request_details_hho_owner';
        
        // Remove the added columns if they exist
        if (await this.columnExists(queryRunner, table, 'unitPermitNumber')) {
            await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`unitPermitNumber\``);
        }
        if (await this.columnExists(queryRunner, table, 'unitPermitStartDate')) {
            await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`unitPermitStartDate\``);
        }
        if (await this.columnExists(queryRunner, table, 'unitPermitExpiryDate')) {
            await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`unitPermitExpiryDate\``);
        }
    }
}
