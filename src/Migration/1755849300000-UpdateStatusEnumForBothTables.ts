import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateStatusEnumForBothTables1755849300000 implements MigrationInterface {
    name = 'UpdateStatusEnumForBothTables1755849300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // // Step 1: Check move_in_requests table
            // const existingMoveInStatuses = await queryRunner.query(`SELECT DISTINCT status FROM move_in_requests WHERE status IS NOT NULL`);

            // // Step 2: Check move_in_request_logs table
            // const existingLogStatuses = await queryRunner.query(`SELECT DISTINCT status FROM move_in_request_logs WHERE status IS NOT NULL`);

            // // Step 3: Validate all existing status values
            // const validStatuses = ['new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed'];

            // const invalidMoveInStatuses = existingMoveInStatuses.filter((row: any) => !validStatuses.includes(row.status));
            // const invalidLogStatuses = existingLogStatuses.filter((row: any) => !validStatuses.includes(row.status));

            // if (invalidMoveInStatuses.length > 0 || invalidLogStatuses.length > 0) {
            //     throw new Error(`Migration cannot proceed: Found invalid status values. Please clean up the data first.`);
            // }

            // // Step 4: Update move_in_requests table
            // await queryRunner.query(`ALTER TABLE \`move_in_requests\` MODIFY COLUMN \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);

            // // Step 5: Update move_in_request_logs table
            // await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` MODIFY COLUMN \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);

        } catch (error: any) {
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            // Revert move_in_requests table back to 'open'
            // await queryRunner.query(`ALTER TABLE \`move_in_requests\` MODIFY COLUMN \`status\` enum ('open', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);

            // // Revert move_in_request_logs table back to 'open'
            // await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` MODIFY COLUMN \`status\` enum ('open', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);

        } catch (error: any) {
            throw error;
        }
    }
}
