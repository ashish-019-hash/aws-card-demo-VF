import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiContractAlignment20260827010000 implements MigrationInterface {
  name = 'ApiContractAlignment20260827010000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_check;
      ALTER TABLE users ADD CONSTRAINT users_id_check CHECK (id ~ '^[A-Z0-9]{8}$');
      ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;
      ALTER TABLE accounts ADD CONSTRAINT accounts_status_check CHECK (status IN ('Y','N'));
      ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_status_check;
      ALTER TABLE cards ADD CONSTRAINT cards_status_check CHECK (status IN ('Y','N'));
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // Existing rows can contain approved API values (Y/N and alphanumeric IDs), so restoring
    // the old checks would make a migration revert fail or silently change persisted data.
    // This migration is therefore intentionally irreversible in local development.
    await queryRunner.query(`
      SELECT 1;
    `);
  }
}
