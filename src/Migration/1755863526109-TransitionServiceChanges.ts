import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1755863526109 implements MigrationInterface {
    name = 'TransitionServiceChanges1755863526109'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tenant_move_in_request_details\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`move_in_request_details_hho_owner\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_tenant\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`request_details_hho_company\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account_renewal_request_details_hho_owner\` ADD PRIMARY KEY (\`id\`)`);
    }

}
