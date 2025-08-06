import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1754457940421 implements MigrationInterface {
    name = 'TransitionServiceChanges1754457940421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visitor_requests\` ADD CONSTRAINT \`FK_7717c041bc3c2ad917c6f930ac8\` FOREIGN KEY (\`reason_id\`) REFERENCES \`reasons\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP INDEX \`IDX_5a48f26118d3dfcc6cc3fe3e2c\` ON \`sr_sub_category\``);
        await queryRunner.query(`ALTER TABLE \`sr_sub_category\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`sr_sub_category\` ADD \`name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_update_cases\` CHANGE \`update_type\` \`update_type\` enum ('profile', 'communication', 'address') NOT NULL DEFAULT 'profile'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visitor_requests\` DROP FOREIGN KEY \`FK_7717c041bc3c2ad917c6f930ac8\``);
        await queryRunner.query(`ALTER TABLE \`user_update_cases\` CHANGE \`update_type\` \`update_type\` enum ('profile', 'address') NOT NULL DEFAULT 'profile'`);
        await queryRunner.query(`ALTER TABLE \`sr_sub_category\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`sr_sub_category\` ADD \`name\` varchar(55) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5a48f26118d3dfcc6cc3fe3e2c\` ON \`sr_sub_category\` (\`name\`)`);
        }

}
