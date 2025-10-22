import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1761125559202 implements MigrationInterface {
    name = 'TransitionServiceChanges1761125559202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` DROP FOREIGN KEY \`FK_hho_company_request\``);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP FOREIGN KEY \`FK_hho_owner_request\``);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` DROP FOREIGN KEY \`FK_owner_request\``);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP FOREIGN KEY \`FK_tenant_request\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_company_active\` ON \`account_renewal_request_details_hho_company\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_company_dates\` ON \`account_renewal_request_details_hho_company\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_company_renewal_request\` ON \`account_renewal_request_details_hho_company\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_owner_active\` ON \`account_renewal_request_details_hho_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_owner_permit_date\` ON \`account_renewal_request_details_hho_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_hho_owner_renewal_request\` ON \`account_renewal_request_details_hho_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_owner_active\` ON \`account_renewal_request_details_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_owner_emirates_id\` ON \`account_renewal_request_details_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_owner_passport\` ON \`account_renewal_request_details_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_owner_renewal_request\` ON \`account_renewal_request_details_owner\``);
        // await queryRunner.query(`DROP INDEX \`IDX_tenant_active\` ON \`account_renewal_request_details_tenant\``);
        // await queryRunner.query(`DROP INDEX \`IDX_tenant_contract_date\` ON \`account_renewal_request_details_tenant\``);
        // await queryRunner.query(`DROP INDEX \`IDX_tenant_renewal_request\` ON \`account_renewal_request_details_tenant\``);
        // await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL DEFAULT 'new'`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('tenant', 'hho_company', 'hho_owner') NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`request_type\` \`request_type\` enum ('tenant', 'hho_company', 'hho_owner') NOT NULL`);
        // await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'user-cancelled', 'cancelled', 'approved', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` ADD CONSTRAINT \`FK_db6b5411557b108002c3c8ddb77\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD CONSTRAINT \`FK_6bef2837b2839572e419d5bf3b7\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` ADD CONSTRAINT \`FK_1ee748f5d1a02bcecd5b0f480d9\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD CONSTRAINT \`FK_0465154880dd49fdbc4b15ded75\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_out_histories\` ADD CONSTRAINT \`FK_aac0e4fbfeb2346bec360b5aab0\` FOREIGN KEY (\`request_id\`) REFERENCES \`move_out_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_out_histories\` DROP FOREIGN KEY \`FK_aac0e4fbfeb2346bec360b5aab0\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP FOREIGN KEY \`FK_0465154880dd49fdbc4b15ded75\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` DROP FOREIGN KEY \`FK_1ee748f5d1a02bcecd5b0f480d9\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP FOREIGN KEY \`FK_6bef2837b2839572e419d5bf3b7\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` DROP FOREIGN KEY \`FK_db6b5411557b108002c3c8ddb77\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_logs\` CHANGE \`request_type\` \`request_type\` enum ('owner', 'tenant', 'hho_company', 'hho_owner') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` CHANGE \`updated_at\` \`updated_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` CHANGE \`created_at\` \`created_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` CHANGE \`updated_at\` \`updated_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` CHANGE \`created_at\` \`created_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` CHANGE \`updated_at\` \`updated_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` CHANGE \`created_at\` \`created_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` CHANGE \`updated_at\` \`updated_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` CHANGE \`created_at\` \`created_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('owner', 'tenant', 'hho_company', 'hho_owner') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`moving_request_mappings\` CHANGE \`status\` \`status\` enum ('open', 'rfi', 'user-cancelled', 'cancel', 'approve') NOT NULL DEFAULT 'open'`);
        await queryRunner.query(`CREATE INDEX \`IDX_tenant_renewal_request\` ON \`account_renewal_request_details_tenant\` (\`account_renewal_request_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_tenant_contract_date\` ON \`account_renewal_request_details_tenant\` (\`tenancy_contract_end_date\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_tenant_active\` ON \`account_renewal_request_details_tenant\` (\`is_active\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_owner_renewal_request\` ON \`account_renewal_request_details_owner\` (\`account_renewal_request_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_owner_passport\` ON \`account_renewal_request_details_owner\` (\`passport_number\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_owner_emirates_id\` ON \`account_renewal_request_details_owner\` (\`emirates_id_number\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_owner_active\` ON \`account_renewal_request_details_owner\` (\`is_active\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_owner_renewal_request\` ON \`account_renewal_request_details_hho_owner\` (\`account_renewal_request_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_owner_permit_date\` ON \`account_renewal_request_details_hho_owner\` (\`dtcm_permit_end_date\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_owner_active\` ON \`account_renewal_request_details_hho_owner\` (\`is_active\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_company_renewal_request\` ON \`account_renewal_request_details_hho_company\` (\`account_renewal_request_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_company_dates\` ON \`account_renewal_request_details_hho_company\` (\`lease_contract_end_date\`, \`dtcm_permit_end_date\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_hho_company_active\` ON \`account_renewal_request_details_hho_company\` (\`is_active\`)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD CONSTRAINT \`FK_tenant_request\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_owner\` ADD CONSTRAINT \`FK_owner_request\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD CONSTRAINT \`FK_hho_owner_request\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_company\` ADD CONSTRAINT \`FK_hho_company_request\` FOREIGN KEY (\`account_renewal_request_id\`) REFERENCES \`account_renewal_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
