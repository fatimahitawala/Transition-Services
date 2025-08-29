import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFileIdToWelcomePack1755849300001 implements MigrationInterface {
    name = 'AddFileIdToWelcomePack1755849300001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add file_id column to OccupancyRequestWelcomePack table
        // await queryRunner.addColumn(
        //     'occupancy_request_welcome_pack',
        //     new TableColumn({
        //         name: 'file_id',
        //         type: 'int',
        //         isNullable: true,
        //         comment: 'Reference to FileUploads entity for PDF files'
        //     })
        // );

        // Add file_id column to OccupancyRequestTemplateHistory table
        // await queryRunner.addColumn(
        //     'occupancy_request_template_history',
        //     new TableColumn({
        //         name: 'file_id',
        //         type: 'int',
        //         isNullable: true,
        //         comment: 'Reference to FileUploads entity for PDF files'
        //     })
        // );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove file_id column from OccupancyRequestTemplateHistory table
        await queryRunner.dropColumn('occupancy_request_template_history', 'file_id');

        // Remove file_id column from OccupancyRequestWelcomePack table
        await queryRunner.dropColumn('occupancy_request_welcome_pack', 'file_id');
    }
}
