import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1755775861932 implements MigrationInterface {
    name = 'TransitionServiceChanges1755775861932'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` ADD \`status\` enum ('new', 'rfi-pending', 'rfi-submitted', 'approved', 'user-cancelled', 'cancelled', 'closed') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_59f1841b5a1227146273250ae44\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_3715a5f17678f1492fcd586f08a\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`master_community_id\` \`master_community_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`community_id\` \`community_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP COLUMN \`template_string\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD \`template_string\` longtext NOT NULL COMMENT 'Base64 encoded file content for PDF, DOC, DOCX files'`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_48251ec687117261c9f2729306e\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_40f8db579d5b05c49bfea2dabcd\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`master_community_id\` \`master_community_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`community_id\` \`community_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`template_type\` \`template_type\` enum ('move-in', 'move-out', 'welcome-pack', 'recipient-mail') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` CHANGE \`document_type\` \`document_type\` enum ('move-in', 'move-out', 'welcome-pack', 'recipient-mail') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` CHANGE \`template_type\` \`template_type\` enum ('move-in', 'move-out', 'welcome-pack', 'recipient-mail') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_59f1841b5a1227146273250ae44\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_3715a5f17678f1492fcd586f08a\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_48251ec687117261c9f2729306e\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_40f8db579d5b05c49bfea2dabcd\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_6e49caf025f8bed3dc0cdf6e7b0\` FOREIGN KEY (\`occupancy_request_email_recipients_id\`) REFERENCES \`occupancy_request_email_recipients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_b17dbd853baf3540cd21985d4c5\` FOREIGN KEY (\`occupancy_request_welcome_pack_id\`) REFERENCES \`occupancy_request_welcome_pack\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_c8b8eef828be4960232bb8db92c\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_79d604efe62a6df984fd19d80d9\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` ADD CONSTRAINT \`FK_1f8100853737faedd5971827d87\` FOREIGN KEY (\`tower_id\`) REFERENCES \`towers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_1f8100853737faedd5971827d87\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_79d604efe62a6df984fd19d80d9\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_c8b8eef828be4960232bb8db92c\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_b17dbd853baf3540cd21985d4c5\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` DROP FOREIGN KEY \`FK_6e49caf025f8bed3dc0cdf6e7b0\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_40f8db579d5b05c49bfea2dabcd\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` DROP FOREIGN KEY \`FK_48251ec687117261c9f2729306e\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_3715a5f17678f1492fcd586f08a\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP FOREIGN KEY \`FK_59f1841b5a1227146273250ae44\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_history\` CHANGE \`template_type\` \`template_type\` enum ('move-in', 'move-out', 'welcome-pack') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_template_documents\` CHANGE \`document_type\` \`document_type\` enum ('move-in', 'move-out', 'welcome-pack') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`template_type\` \`template_type\` enum ('move-in', 'move-out', 'welcome-pack') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`community_id\` \`community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` CHANGE \`master_community_id\` \`master_community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_40f8db579d5b05c49bfea2dabcd\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_templates\` ADD CONSTRAINT \`FK_48251ec687117261c9f2729306e\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` DROP COLUMN \`template_string\``);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD \`template_string\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`community_id\` \`community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` CHANGE \`master_community_id\` \`master_community_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_3715a5f17678f1492fcd586f08a\` FOREIGN KEY (\`community_id\`) REFERENCES \`communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`occupancy_request_welcome_pack\` ADD CONSTRAINT \`FK_59f1841b5a1227146273250ae44\` FOREIGN KEY (\`master_community_id\`) REFERENCES \`master_communities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`move_out_requests\` DROP COLUMN \`status\``);
    }

}
