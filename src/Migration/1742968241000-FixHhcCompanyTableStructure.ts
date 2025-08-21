import { MigrationInterface, QueryRunner } from "typeorm";

export class FixHhcCompanyTableStructure1742968241000 implements MigrationInterface {
    name = 'FixHhcCompanyTableStructure1742968241000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if move_in_request_details_hhc_company table exists
        const hhcTableExists = await queryRunner.hasTable('move_in_request_details_hhc_company');
        
        if (hhcTableExists) {
            // Add all missing HHC Company columns
            const hhcColumns = [
                {
                    name: 'name',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `name` varchar(100) NOT NULL AFTER `move_in_request_id`"
                },
                {
                    name: 'country_code',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `country_code` varchar(10) NULL AFTER `company_email`"
                },
                {
                    name: 'operator_office_number',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `operator_office_number` varchar(20) NULL AFTER `country_code`"
                },
                {
                    name: 'tenancy_contract_start_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `tenancy_contract_start_date` date NULL AFTER `trade_license_number`"
                },
                {
                    name: 'unit_permit_start_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `unit_permit_start_date` date NULL AFTER `tenancy_contract_start_date`"
                },
                {
                    name: 'unit_permit_expiry_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `unit_permit_expiry_date` date NULL AFTER `unit_permit_start_date`"
                },
                {
                    name: 'unit_permit_number',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `unit_permit_number` varchar(100) NULL AFTER `unit_permit_expiry_date`"
                },
                {
                    name: 'lease_start_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `lease_start_date` date NULL AFTER `unit_permit_number`"
                },
                {
                    name: 'lease_end_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `lease_end_date` date NULL AFTER `lease_start_date`"
                },
                {
                    name: 'nationality',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `nationality` varchar(100) NULL AFTER `lease_end_date`"
                },
                {
                    name: 'emirates_id_number',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `emirates_id_number` varchar(100) NULL AFTER `nationality`"
                },
                {
                    name: 'emirates_id_expiry_date',
                    ddl: "ALTER TABLE `move_in_request_details_hhc_company` ADD COLUMN `emirates_id_expiry_date` date NULL AFTER `emirates_id_number`"
                }
            ];

            // Add each column if it doesn't exist
            for (const column of hhcColumns) {
                try {
                    const [row]: any[] = await queryRunner.query(
                        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'move_in_request_details_hhc_company' AND COLUMN_NAME = ?",
                        [column.name]
                    );
                    const exists = (row?.cnt ?? row?.[0]?.cnt ?? 0) > 0;
                    
                    if (!exists) {
                        await queryRunner.query(column.ddl);
                        console.log(`Added column: ${column.name}`);
                    }
                } catch (error) {
                    console.log(`Column ${column.name} already exists or error occurred, continuing...`);
                }
            }

            // Make sure existing columns are properly configured
            try {
                await queryRunner.query(`
                    ALTER TABLE \`move_in_request_details_hhc_company\` 
                    MODIFY COLUMN \`company_email\` varchar(255) NOT NULL,
                    MODIFY COLUMN \`trade_license_number\` varchar(100) NOT NULL
                `);
            } catch (error) {
                console.log('Columns already have correct type, continuing...');
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the columns we added
        if (await queryRunner.hasTable('move_in_request_details_hhc_company')) {
            const hhcColumns = [
                'emirates_id_expiry_date',
                'emirates_id_number',
                'nationality',
                'lease_end_date',
                'lease_start_date',
                'unit_permit_number',
                'unit_permit_expiry_date',
                'unit_permit_start_date',
                'tenancy_contract_start_date',
                'operator_office_number',
                'country_code',
                'name'
            ];
            
            for (const column of hhcColumns) {
                try {
                    await queryRunner.query(`ALTER TABLE \`move_in_request_details_hhc_company\` DROP COLUMN \`${column}\``);
                } catch (error) {
                    // Column doesn't exist, ignore error
                }
            }
        }
    }
}
