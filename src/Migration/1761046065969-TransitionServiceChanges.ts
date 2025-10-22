import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1761046065969 implements MigrationInterface {
    name = 'TransitionServiceChanges1761046065969'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First expand enum to include both old and new values
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'cancel', 'approve', 'new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'open'`);

        // Update old values to new values
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'new' WHERE \`status\` = 'open'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'rfi-pending' WHERE \`status\` = 'rfi'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'cancelled' WHERE \`status\` = 'cancel'`);
        await queryRunner.query(`UPDATE \`moving_request_mappings\` SET \`status\` = 'approved' WHERE \`status\` = 'approve'`);

        // Set final enum with only new values
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'new'`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` ADD CONSTRAINT \`FK_492bd4fead75cf7276051e44354\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` ADD CONSTRAINT \`FK_cd55433a7edfe374dc56f0d686e\` FOREIGN KEY (\`parent_account_renewal_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` ADD CONSTRAINT \`FK_9ddc538bd342516b19e61faeed7\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` ADD CONSTRAINT \`FK_a826a256df26f131c91b7718c3d\` FOREIGN KEY (\`unit_id\`) REFERENCES \`units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD CONSTRAINT \`FK_6bef2837b2839572e419d5bf3b7\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` ADD CONSTRAINT \`FK_db6b5411557b108002c3c8ddb77\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` ADD CONSTRAINT \`FK_1ee748f5d1a02bcecd5b0f480d9\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_documents\` ADD CONSTRAINT \`FK_068dc12b6f329f4b5c90f0a7a37\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_documents\` ADD CONSTRAINT \`FK_e6461ada36a0be3d6d4d9a1017e\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_documents\` ADD CONSTRAINT \`FK_473cf15b7bb90a17adfc0573ea7\` FOREIGN KEY (\`file_id\`) REFERENCES \`file_uploads\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` ADD CONSTRAINT \`FK_389f42c5cb29730278fca8303d1\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` ADD CONSTRAINT \`FK_de83c3b65970370353f66f163b9\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` ADD CONSTRAINT \`FK_825a613a3fd4f43bb2e760e2a7b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD CONSTRAINT \`FK_0465154880dd49fdbc4b15ded75\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD CONSTRAINT \`FK_cf9dd11105510dcf407482028ec\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD CONSTRAINT \`FK_9e53f98ac2a9aee9177af736bcc\` FOREIGN KEY (\`unit_id\`) REFERENCES \`units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD CONSTRAINT \`FK_9bb86dfb57d016297747939079c\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD CONSTRAINT \`FK_13a14b925eec13b86ef478df878\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`move_out_histories\` ADD CONSTRAINT \`FK_aac0e4fbfeb2346bec360b5aab0\` FOREIGN KEY (\`request_id\`) REFERENCES \`move_out_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Helper to safely drop a foreign key only if it exists
        const dropFKIfExists = async (table: string, fkName: string) => {
            const tableRows: any[] = await queryRunner.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
                [table]
            );
            if (!tableRows || tableRows.length === 0) return;
            const rows: any[] = await queryRunner.query(
                `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? 
                   AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
                [table, fkName]
            );
            if (rows && rows.length > 0) {
                await queryRunner.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
            }
        };

        await dropFKIfExists('move_out_histories', 'FK_aac0e4fbfeb2346bec360b5aab0');
        await dropFKIfExists('move_out_requests', 'FK_13a14b925eec13b86ef478df878');
        await dropFKIfExists('move_out_requests', 'FK_9bb86dfb57d016297747939079c');
        await dropFKIfExists('move_out_requests', 'FK_9e53f98ac2a9aee9177af736bcc');
        await dropFKIfExists('move_out_requests', 'FK_cf9dd11105510dcf407482028ec');
        await dropFKIfExists('account_renewal_request_details_tenant', 'FK_0465154880dd49fdbc4b15ded75');
        await dropFKIfExists('account_renewal_request_logs', 'FK_825a613a3fd4f43bb2e760e2a7b');
        await dropFKIfExists('account_renewal_request_logs', 'FK_de83c3b65970370353f66f163b9');
        await dropFKIfExists('account_renewal_request_logs', 'FK_389f42c5cb29730278fca8303d1');
        await dropFKIfExists('account_renewal_request_documents', 'FK_473cf15b7bb90a17adfc0573ea7');
        await dropFKIfExists('account_renewal_request_documents', 'FK_e6461ada36a0be3d6d4d9a1017e');
        await dropFKIfExists('account_renewal_request_documents', 'FK_068dc12b6f329f4b5c90f0a7a37');
        await dropFKIfExists('account_renewal_request_details_owner', 'FK_1ee748f5d1a02bcecd5b0f480d9');
        await dropFKIfExists('account_renewal_request_details_hho_company', 'FK_db6b5411557b108002c3c8ddb77');
        await dropFKIfExists('account_renewal_request_details_hho_owner', 'FK_6bef2837b2839572e419d5bf3b7');
        await dropFKIfExists('account_renewal_requests', 'FK_a826a256df26f131c91b7718c3d');
        await dropFKIfExists('account_renewal_requests', 'FK_9ddc538bd342516b19e61faeed7');
        await dropFKIfExists('account_renewal_requests', 'FK_cd55433a7edfe374dc56f0d686e');
        await dropFKIfExists('account_renewal_requests', 'FK_492bd4fead75cf7276051e44354');

        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum COLLATE "utf8mb4_general_ci" ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL DEFAULT 'open'`);
    }

}
