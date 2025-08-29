import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1755158527137 implements MigrationInterface {
    name = 'TransitionServiceChanges1755158527137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
    }

}