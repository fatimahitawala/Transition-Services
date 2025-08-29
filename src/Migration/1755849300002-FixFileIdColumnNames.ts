import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class FixFileIdColumnNames1755849300002 implements MigrationInterface {
    name = 'FixFileIdColumnNames1755849300002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if fileId column exists and rename it to file_id
        // const hasFileIdColumn = await queryRunner.hasColumn('occupancy_request_welcome_pack', 'fileId');
        // if (hasFileIdColumn) {
        //     await queryRunner.changeColumn(
        //         'occupancy_request_welcome_pack',
        //         'fileId',
        //         new TableColumn({
        //             name: 'file_id',
        //             type: 'int',
        //             isNullable: true,
        //             comment: 'Reference to FileUploads entity for PDF files'
        //         })
        //     );
        // } else {
        //     // If fileId doesn't exist, add file_id column
        //     await queryRunner.addColumn(
        //         'occupancy_request_welcome_pack',
        //         new TableColumn({
        //             name: 'file_id',
        //             type: 'int',
        //             isNullable: true,
        //             comment: 'Reference to FileUploads entity for PDF files'
        //         })
        //     );
        // }

        // Check if fileId column exists in history table and rename it to file_id
        // const hasHistoryFileIdColumn = await queryRunner.hasColumn('occupancy_request_template_history', 'fileId');
        // if (hasHistoryFileIdColumn) {
        //     await queryRunner.changeColumn(
        //         'occupancy_request_template_history',
        //         'fileId',
        //         new TableColumn({
        //             name: 'file_id',
        //             type: 'int',
        //             isNullable: true,
        //             comment: 'Reference to FileUploads entity for PDF files'
        //         })
        //     );
        // } else {
        //     // If fileId doesn't exist, add file_id column
        //     await queryRunner.addColumn(
        //         'occupancy_request_template_history',
        //         new TableColumn({
        //             name: 'file_id',
        //             type: 'int',
        //             isNullable: true,
        //             comment: 'Reference to FileUploads entity for PDF files'
        //         })
        //     );
        // }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove file_id columns
        await queryRunner.dropColumn('occupancy_request_template_history', 'file_id');
        await queryRunner.dropColumn('occupancy_request_welcome_pack', 'file_id');
    }
}
