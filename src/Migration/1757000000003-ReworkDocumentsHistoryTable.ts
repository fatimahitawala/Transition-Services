import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rework occupancy_request_template_history to store a minimal, unified history payload
 * Columns to keep:
 * - id
 * - template_type
 * - created_by, updated_by
 * - created_at, updated_at
 * - template_data (JSON)
 * - occupancy_request_templates_id
 * - occupancy_request_welcome_pack_id
 * - occupancy_request_email_recipients_id
 * - master_community_id, community_id, tower_id
 */
export class ReworkDocumentsHistoryTable1757000000003 implements MigrationInterface {
  name = 'ReworkDocumentsHistoryTable1757000000003';

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'occupancy_request_template_history';

    // Ensure table exists
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`template_type\` varchar(50) NOT NULL,
        \`created_by\` bigint NULL,
        \`updated_by\` bigint NULL,
        \`created_at\` datetime NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`template_data\` json NULL,
        \`occupancy_request_templates_id\` bigint NULL,
        \`occupancy_request_welcome_pack_id\` bigint NULL,
        \`occupancy_request_email_recipients_id\` bigint NULL,
        \`master_community_id\` int NULL,
        \`community_id\` int NULL,
        \`tower_id\` int NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`);

    // Ensure required columns exist (id/PK assumed present)
    const ensures: Array<{ name: string; definition: string }> = [
      { name: 'template_type', definition: 'varchar(50) NOT NULL' },
      { name: 'created_by', definition: 'bigint NULL' },
      { name: 'updated_by', definition: 'bigint NULL' },
      { name: 'created_at', definition: 'datetime NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', definition: 'datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
      { name: 'template_data', definition: 'json NULL' },
      { name: 'occupancy_request_templates_id', definition: 'bigint NULL' },
      { name: 'occupancy_request_welcome_pack_id', definition: 'bigint NULL' },
      { name: 'occupancy_request_email_recipients_id', definition: 'bigint NULL' },
      { name: 'master_community_id', definition: 'int NULL' },
      { name: 'community_id', definition: 'int NULL' },
      { name: 'tower_id', definition: 'int NULL' },
    ];

    for (const col of ensures) {
      try {
        const exists = await this.columnExists(queryRunner, table, col.name);
        if (!exists) {
          await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.definition}`);
        }
      } catch (_) {}
    }

    // Drop known extra columns if present (defensive; ignore errors)
    const extras = ['template_string', 'mip_recipients', 'mop_recipients', 'file_id', 'is_active'];
    for (const extra of extras) {
      try {
        const exists = await this.columnExists(queryRunner, table, extra);
        if (exists) {
          await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${extra}\``);
        }
      } catch (_) {}
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'occupancy_request_template_history';
    // Best-effort rollback: re-add previously dropped extra columns
    const restore: Array<{ name: string; definition: string }> = [
      { name: 'template_string', definition: 'longtext NULL' },
      { name: 'mip_recipients', definition: 'varchar(500) NULL' },
      { name: 'mop_recipients', definition: 'varchar(500) NULL' },
      { name: 'file_id', definition: 'bigint NULL' },
      { name: 'is_active', definition: 'tinyint(1) NULL DEFAULT 1' },
    ];
    for (const col of restore) {
      try {
        const exists = await this.columnExists(queryRunner, table, col.name);
        if (!exists) {
          await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.definition}`);
        }
      } catch (_) {}
    }
  }
}


