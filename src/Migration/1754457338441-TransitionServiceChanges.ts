import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1754457338441 implements MigrationInterface {
    name = 'TransitionServiceChanges1754457338441'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` ADD CONSTRAINT \`FK_597eff900d432183fa61d3e6451\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` ADD CONSTRAINT \`FK_a8813c0239e755b1aaf7b5b04ec\` FOREIGN KEY (\`unit_id\`) REFERENCES \`units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` ADD CONSTRAINT \`FK_2ee3f05cdc12863c453b9066317\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD CONSTRAINT \`FK_527e191725dc4b068e573a92660\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` ADD CONSTRAINT \`FK_dd7c76af94bd3f5c7af33efacae\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE \`move_in_request_details_tenant\` (\`id\` varchar(36) NOT NULL, \`first_name\` varchar(100) NOT NULL, \`last_name\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`dial_code\` varchar(10) NOT NULL, \`phone_number\` varchar(20) NOT NULL, \`nationality\` varchar(100) NOT NULL, \`date_of_birth\` date NULL, \`emergency_contact_dial_code\` varchar(10) NULL, \`emergency_contact_number\` varchar(20) NULL, \`adults\` int NOT NULL DEFAULT '0', \`children\` int NOT NULL DEFAULT '0', \`household_staffs\` int NOT NULL DEFAULT '0', \`pets\` int NOT NULL DEFAULT '0', \`emirates_id_number\` varchar(100) NULL, \`passport_number\` varchar(100) NULL, \`visa_number\` varchar(100) NULL, \`power_of_attorney_number\` varchar(100) NULL, \`attorney_name\` varchar(255) NULL, \`attorney_phone\` varchar(20) NULL, \`ejari_number\` varchar(100) NULL, \`dtcm_permit_number\` varchar(100) NULL, \`emergency_contact_name\` varchar(255) NULL, \`relationship\` varchar(100) NULL, \`comments\` text NULL, \`monthly_rent\` double(12,2) NULL, \`security_deposit\` double(12,2) NULL, \`maintenance_fee\` double(12,2) NULL, \`currency\` varchar(10) NULL, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`move_in_request_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_tenant\` ADD CONSTRAINT \`FK_00d9d42cf56e2ef70c4af2b0550\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` ADD CONSTRAINT \`FK_6f1ce2d2bb3304fbb30339454ca\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` ADD CONSTRAINT \`FK_2daaed06d654cc6abc72bd9cd12\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` ADD CONSTRAINT \`FK_07a6e8310a0dff0ef3c84b9f6a2\` FOREIGN KEY (\`file_id\`) REFERENCES \`file_uploads\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` ADD CONSTRAINT \`FK_ce9d00350e26f58cc78cd382b01\` FOREIGN KEY (\`move_in_request_id\`) REFERENCES \`move_in_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` ADD CONSTRAINT \`FK_0aae6c219821cab5cf2ecf462fa\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` ADD CONSTRAINT \`FK_0a02a464cf7fc8d1837294381c0\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` ADD CONSTRAINT \`FK_da629152051c5e9e5acc876b44b\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` ADD CONSTRAINT \`FK_c301139f5d58b3705423029f280\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_48251ec687117261c9f2729306e\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_40f8db579d5b05c49bfea2dabcd\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_60a832a27d292d2a3d2ec0eac2e\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_bd71209bfc9887b47ffeea8bc73\` FOREIGN KEY (\`occupancy_request_templates_id\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` ADD CONSTRAINT \`FK_278281026cca67c0670ece57f2a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` ADD CONSTRAINT \`FK_29963517fd0c737246be02f1385\` FOREIGN KEY (\`occupancy_request_templates_id\`) REFERENCES \`occupancy_request_templates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` ADD CONSTRAINT \`FK_9bdaac2b0ce0e7722ca9cb882c7\` FOREIGN KEY (\`file_id\`) REFERENCES \`file_uploads\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_59f1841b5a1227146273250ae44\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_3715a5f17678f1492fcd586f08a\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_9e859a9e7cc3ce82866616b3053\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_9e859a9e7cc3ce82866616b3053\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_3715a5f17678f1492fcd586f08a\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_59f1841b5a1227146273250ae44\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` DROP FOREIGN KEY \`FK_9bdaac2b0ce0e7722ca9cb882c7\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` DROP FOREIGN KEY \`FK_29963517fd0c737246be02f1385\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` DROP FOREIGN KEY \`FK_278281026cca67c0670ece57f2a\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_bd71209bfc9887b47ffeea8bc73\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_60a832a27d292d2a3d2ec0eac2e\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_40f8db579d5b05c49bfea2dabcd\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_48251ec687117261c9f2729306e\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` DROP FOREIGN KEY \`FK_c301139f5d58b3705423029f280\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` DROP FOREIGN KEY \`FK_da629152051c5e9e5acc876b44b\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_email_recipients\` DROP FOREIGN KEY \`FK_0a02a464cf7fc8d1837294381c0\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` DROP FOREIGN KEY \`FK_0aae6c219821cab5cf2ecf462fa\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_logs\` DROP FOREIGN KEY \`FK_ce9d00350e26f58cc78cd382b01\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` DROP FOREIGN KEY \`FK_07a6e8310a0dff0ef3c84b9f6a2\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` DROP FOREIGN KEY \`FK_2daaed06d654cc6abc72bd9cd12\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_documents\` DROP FOREIGN KEY \`FK_6f1ce2d2bb3304fbb30339454ca\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_tenant\` DROP FOREIGN KEY \`FK_00d9d42cf56e2ef70c4af2b0550\``);
        await queryRunner.query(`DROP TABLE \`move_in_request_details_tenant\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_owner\` DROP FOREIGN KEY \`FK_dd7c76af94bd3f5c7af33efacae\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP FOREIGN KEY \`FK_527e191725dc4b068e573a92660\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP FOREIGN KEY \`FK_2ee3f05cdc12863c453b9066317\``);
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` DROP FOREIGN KEY \`FK_a8813c0239e755b1aaf7b5b04ec\``);
        await queryRunner.query(`ALTER TABLE \`move_in_requests\` DROP FOREIGN KEY \`FK_597eff900d432183fa61d3e6451\``);
    }

}
