import { MigrationInterface, QueryRunner } from "typeorm";

export class TransitionServiceChanges1759300334592 implements MigrationInterface {
    name = 'TransitionServiceChanges1759300334592'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('tenant', 'hho_company', 'hho_owner') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_renewal_requests\` CHANGE \`request_type\` \`request_type\` enum ('owner', 'tenant', 'hho_company', 'hho_owner') NOT NULL`);
    }

}
