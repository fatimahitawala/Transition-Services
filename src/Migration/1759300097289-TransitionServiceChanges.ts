import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1759300097289 implements MigrationInterface {
    name = 'TransitionServiceChanges1759300097289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`move_out_histories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`action\` varchar(64) NOT NULL, \`action_by_type\` enum ('community-admin', 'super-admin', 'system', 'user', 'security') NOT NULL, \`remarks\` text NULL, \`created_by\` bigint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`request_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`move_out_histories\` ADD CONSTRAINT \`FK_aac0e4fbfeb2346bec360b5aab0\` FOREIGN KEY (\`request_id\`) REFERENCES \`move_out_requests\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`move_out_histories\` DROP FOREIGN KEY \`FK_aac0e4fbfeb2346bec360b5aab0\``);
        await queryRunner.query(`DROP TABLE \`move_out_histories\``);
    }

}
