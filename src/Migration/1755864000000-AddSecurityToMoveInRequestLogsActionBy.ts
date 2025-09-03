import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecurityToMoveInRequestLogsActionBy1755864000000 implements MigrationInterface {
    name = 'AddSecurityToMoveInRequestLogsActionBy1755864000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // Add SECURITY value to action_by enum in move_in_request_logs table
            await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` MODIFY COLUMN \`action_by\` enum ('community-admin', 'super-admin', 'system', 'user', 'security') NOT NULL`);
            
            console.log('Successfully added SECURITY to action_by enum in move_in_request_logs table');
        } catch (error: any) {
            console.error('Error in migration:', error);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            // Remove SECURITY value from action_by enum in move_in_request_logs table
            await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` MODIFY COLUMN \`action_by\` enum ('community-admin', 'super-admin', 'system', 'user') NOT NULL`);
            
            console.log('Successfully removed SECURITY from action_by enum in move_in_request_logs table');
        } catch (error: any) {
            console.error('Error in migration rollback:', error);
            throw error;
        }
    }
}
