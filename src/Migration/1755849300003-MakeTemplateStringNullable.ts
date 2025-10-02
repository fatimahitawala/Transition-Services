import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MakeTemplateStringNullable1755849300003 implements MigrationInterface {
    name = 'MakeTemplateStringNullable1755849300003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make template_string column nullable in occupancy_request_welcome_pack table
        await queryRunner.changeColumn(
            'occupancy_request_welcome_pack',
            'template_string',
            new TableColumn({
                name: 'template_string',
                type: 'longtext',
                isNullable: true,
                comment: 'Base64 encoded file content for HTML files only. For PDF files, use file_id instead.'
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert template_string column to not nullable
        await queryRunner.changeColumn(
            'occupancy_request_welcome_pack',
            'template_string',
            new TableColumn({
                name: 'template_string',
                type: 'longtext',
                isNullable: false,
                comment: 'Base64 encoded file content for HTML files only. For PDF files, use file_id instead.'
            })
        );
    }
}
