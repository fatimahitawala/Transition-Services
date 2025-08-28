import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ensure HHO Owner permit fields use camelCase column names and exist.
 * - unitPermitNumber: varchar(100) NULL
 * - unitPermitStartDate: date NULL
 * - unitPermitExpiryDate: date NULL
 *
 * If legacy snake_case columns exist, rename them to camelCase.
 * If columns are missing, add them.
 */
export class FixHhoOwnerPermitColumns1757000000002 implements MigrationInterface {
    name = 'FixHhoOwnerPermitColumns1757000000002';

    private async ensureVarcharColumn(
        queryRunner: QueryRunner,
        table: string,
        camel: string,
        snake: string,
        definition: string
    ) {
        const camelExists: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${camel}'`);
        if (camelExists.length > 0) return;

        const snakeExists: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${snake}'`);
        if (snakeExists.length > 0) {
            // Rename legacy snake_case to camelCase
            await queryRunner.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`${snake}\` \`${camel}\` ${definition}`);
            return;
        }
        // Add missing column
        await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${camel}\` ${definition}`);
    }

    private async ensureDateColumn(
        queryRunner: QueryRunner,
        table: string,
        camel: string,
        snake: string
    ) {
        const camelExists: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${camel}'`);
        if (camelExists.length > 0) return;

        const snakeExists: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${snake}'`);
        if (snakeExists.length > 0) {
            await queryRunner.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`${snake}\` \`${camel}\` date NULL`);
            return;
        }
        await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${camel}\` date NULL`);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = 'move_in_request_details_hho_owner';
        // Ensure camelCase columns exist (rename from snake_case if needed)
        try {
            await this.ensureVarcharColumn(queryRunner, table, 'unitPermitNumber', 'unit_permit_number', 'varchar(100) NULL');
        } catch (_) {}
        try {
            await this.ensureDateColumn(queryRunner, table, 'unitPermitStartDate', 'unit_permit_start_date');
        } catch (_) {}
        try {
            await this.ensureDateColumn(queryRunner, table, 'unitPermitExpiryDate', 'unit_permit_expiry_date');
        } catch (_) {}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = 'move_in_request_details_hho_owner';
        // Best-effort rollback: if snake_case does not exist and camelCase exists, rename back
        try {
            const camel: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unitPermitNumber'`);
            const snake: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unit_permit_number'`);
            if (camel.length > 0 && snake.length === 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`unitPermitNumber\` \`unit_permit_number\` varchar(100) NULL`);
            }
        } catch (_) {}
        try {
            const camel: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unitPermitStartDate'`);
            const snake: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unit_permit_start_date'`);
            if (camel.length > 0 && snake.length === 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`unitPermitStartDate\` \`unit_permit_start_date\` date NULL`);
            }
        } catch (_) {}
        try {
            const camel: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unitPermitExpiryDate'`);
            const snake: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'unit_permit_expiry_date'`);
            if (camel.length > 0 && snake.length === 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`unitPermitExpiryDate\` \`unit_permit_expiry_date\` date NULL`);
            }
        } catch (_) {}
    }
}


