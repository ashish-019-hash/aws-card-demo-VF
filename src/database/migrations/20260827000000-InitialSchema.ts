import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260827000000 implements MigrationInterface {
  name = 'InitialSchema20260827000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE users (
        id varchar(8) PRIMARY KEY CHECK (id ~ '^[A-Z0-9]{8}$'), first_name varchar(20) NOT NULL,
        last_name varchar(20) NOT NULL, password_hash varchar(100) NOT NULL,
        role char(1) NOT NULL CHECK (role IN ('A','U')), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE customers (
        id char(9) PRIMARY KEY CHECK (id ~ '^[0-9]{9}$'), first_name varchar(25) NOT NULL, middle_name varchar(25), last_name varchar(25) NOT NULL,
        address_line_1 varchar(50) NOT NULL, address_line_2 varchar(50), address_line_3 varchar(50), address_state_code char(2) NOT NULL,
        address_country_code char(3) NOT NULL, address_zip char(10) NOT NULL, phone_number_1 varchar(15), phone_number_2 varchar(15),
        ssn char(9) NOT NULL, government_issued_id varchar(20) NOT NULL, dob date NOT NULL, eft_account_id char(10),
        primary_card_holder char(1) NOT NULL CHECK (primary_card_holder IN ('Y','N')), fico_score smallint NOT NULL CHECK (fico_score BETWEEN 0 AND 999),
        version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE accounts (
        id char(11) PRIMARY KEY CHECK (id ~ '^[0-9]{11}$'), status char(1) NOT NULL CHECK (status IN ('Y','N')),
        current_balance numeric(12,2) NOT NULL CHECK (current_balance BETWEEN -9999999999.99 AND 9999999999.99),
        credit_limit numeric(12,2) NOT NULL CHECK (credit_limit BETWEEN -9999999999.99 AND 9999999999.99),
        cash_credit_limit numeric(12,2) NOT NULL CHECK (cash_credit_limit BETWEEN -9999999999.99 AND 9999999999.99),
        open_date date NOT NULL, expiration_date date NOT NULL, reissue_date date NOT NULL,
        current_cycle_credit numeric(12,2) NOT NULL CHECK (current_cycle_credit BETWEEN -9999999999.99 AND 9999999999.99),
        current_cycle_debit numeric(12,2) NOT NULL CHECK (current_cycle_debit BETWEEN -9999999999.99 AND 9999999999.99),
        address_zip char(10) NOT NULL, group_id char(10) NOT NULL,
        version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE cards (
        number char(16) PRIMARY KEY CHECK (number ~ '^[0-9]{16}$'), account_id char(11) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        cvv char(3) NOT NULL CHECK (cvv ~ '^[0-9]{3}$'), embossed_name varchar(50) NOT NULL, expiry_date date NOT NULL,
        status char(1) NOT NULL CHECK (status IN ('Y','N')), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE card_xrefs (
        card_number char(16) PRIMARY KEY REFERENCES cards(number) ON DELETE RESTRICT,
        customer_id char(9) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        account_id char(11) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT
      );
      CREATE TABLE transaction_types (code char(2) PRIMARY KEY, description varchar(50) NOT NULL);
      CREATE TABLE transaction_categories (
        type_code char(2) NOT NULL REFERENCES transaction_types(code) ON DELETE RESTRICT, code char(4) NOT NULL,
        description varchar(50) NOT NULL, PRIMARY KEY (type_code, code)
      );
      CREATE TABLE disclosure_groups (
        account_group_id char(10) NOT NULL, transaction_type_code char(2) NOT NULL,
        transaction_category_code char(4) NOT NULL, interest_rate numeric(6,2) NOT NULL,
        PRIMARY KEY (account_group_id, transaction_type_code, transaction_category_code),
        FOREIGN KEY (transaction_type_code, transaction_category_code) REFERENCES transaction_categories(type_code, code) ON DELETE RESTRICT
      );
      CREATE TABLE category_balances (
        account_id char(11) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        transaction_type_code char(2) NOT NULL, transaction_category_code char(4) NOT NULL,
        balance numeric(11,2) NOT NULL CHECK (balance BETWEEN -999999999.99 AND 999999999.99),
        PRIMARY KEY (account_id, transaction_type_code, transaction_category_code),
        FOREIGN KEY (transaction_type_code, transaction_category_code) REFERENCES transaction_categories(type_code, code) ON DELETE RESTRICT
      );
      CREATE SEQUENCE transaction_id_sequence AS bigint MINVALUE 1 MAXVALUE 9999999999999999 START WITH 1;
      CREATE TABLE transactions (
        id char(16) PRIMARY KEY CHECK (id ~ '^[0-9]{16}$'), type_code char(2) NOT NULL, category_code char(4) NOT NULL,
        source varchar(10) NOT NULL, description varchar(100) NOT NULL, amount numeric(12,2) NOT NULL CHECK (amount BETWEEN -9999999999.99 AND 9999999999.99),
        merchant_id char(9) NOT NULL, merchant_name varchar(50) NOT NULL, merchant_city varchar(50) NOT NULL, merchant_zip char(10) NOT NULL,
        card_number char(16) NOT NULL REFERENCES cards(number) ON DELETE RESTRICT, original_ts timestamp(6) NOT NULL, processed_ts timestamp(6),
        version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_code, category_code) REFERENCES transaction_categories(type_code, code) ON DELETE RESTRICT
      );
      CREATE TABLE report_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status varchar(16) NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
        report_kind varchar(16) NOT NULL CHECK (report_kind IN ('monthly','yearly','custom')),
        timestamp_mode varchar(32) NOT NULL CHECK (timestamp_mode IN ('processed-or-original','processed')),
        range_start date NOT NULL, range_end date NOT NULL CHECK (range_start <= range_end),
        attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lease_token uuid, lease_owner varchar(128), lease_expires_at timestamptz, completed_at timestamptz,
        artifact bytea, artifact_sha256 char(64), artifact_length integer CHECK (artifact_length IS NULL OR artifact_length >= 0),
        artifact_content_type varchar(64), artifact_filename varchar(255), artifact_metadata jsonb,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb, error_message text,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK ((status = 'processing' AND lease_token IS NOT NULL AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL) OR (status <> 'processing' AND lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)),
        CHECK (status = 'completed' OR (artifact IS NULL AND artifact_sha256 IS NULL AND artifact_length IS NULL AND artifact_content_type IS NULL AND artifact_filename IS NULL AND artifact_metadata IS NULL AND completed_at IS NULL)),
        CHECK (status <> 'completed' OR (artifact IS NOT NULL AND artifact_sha256 ~ '^[0-9a-f]{64}$' AND artifact_length IS NOT NULL AND artifact_metadata IS NOT NULL AND completed_at IS NOT NULL))
      );
      CREATE TABLE legacy_import_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_mode varchar(32) NOT NULL CHECK (source_mode IN ('canonical-ebcdic','ascii-mirror')),
        status varchar(16) NOT NULL CHECK (status IN ('running','completed','partial','failed')), canonical boolean NOT NULL DEFAULT false,
        source_hashes jsonb NOT NULL, record_counts jsonb NOT NULL, allowed_divergences jsonb NOT NULL DEFAULT '[]'::jsonb,
        artifacts jsonb, error text, started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at timestamptz
      );
      CREATE INDEX idx_cards_account ON cards(account_id);
      CREATE INDEX idx_card_xrefs_account_card ON card_xrefs(account_id, card_number);
      CREATE INDEX idx_card_xrefs_customer ON card_xrefs(customer_id);
      CREATE INDEX idx_transactions_card_effective_report ON transactions(card_number, processed_ts, original_ts, id);
      CREATE INDEX idx_users_id_keyset ON users(id);
      CREATE INDEX idx_report_jobs_pending_claim ON report_jobs(next_attempt_at, created_at, id) WHERE status = 'pending';
      CREATE INDEX idx_report_jobs_expired_lease ON report_jobs(lease_expires_at, created_at, id) WHERE status = 'processing';
      CREATE INDEX idx_transactions_processed_report ON transactions(processed_ts, card_number, id) WHERE processed_ts IS NOT NULL;
      CREATE INDEX idx_transactions_fallback_report ON transactions((COALESCE(processed_ts, original_ts)), card_number, id);
      CREATE OR REPLACE FUNCTION allocate_transaction_id() RETURNS char(16) LANGUAGE plpgsql AS $$
      DECLARE next_id bigint;
      BEGIN
        next_id := nextval('transaction_id_sequence');
        IF next_id > 9999999999999999 THEN RAISE EXCEPTION 'transaction ID sequence exhausted'; END IF;
        RETURN lpad(next_id::text, 16, '0')::char(16);
      END;
      $$;
      CREATE OR REPLACE FUNCTION reinitialize_transaction_id_sequence() RETURNS void LANGUAGE plpgsql AS $$
      DECLARE max_id bigint;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM transactions) THEN PERFORM setval('transaction_id_sequence', 1, false); RETURN; END IF;
        IF EXISTS (SELECT 1 FROM transactions WHERE id !~ '^[0-9]{16}$' OR id::numeric > 9999999999999999) THEN RAISE EXCEPTION 'malformed transaction ID'; END IF;
        SELECT max(id::bigint) INTO max_id FROM transactions;
        IF max_id >= 9999999999999999 THEN RAISE EXCEPTION 'transaction ID sequence exhausted'; END IF;
        PERFORM setval('transaction_id_sequence', max_id, true);
      END;
      $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS reinitialize_transaction_id_sequence(); DROP FUNCTION IF EXISTS allocate_transaction_id();
      DROP TABLE IF EXISTS legacy_import_runs; DROP TABLE IF EXISTS report_jobs; DROP TABLE IF EXISTS transactions;
      DROP SEQUENCE IF EXISTS transaction_id_sequence; DROP TABLE IF EXISTS category_balances; DROP TABLE IF EXISTS disclosure_groups;
      DROP TABLE IF EXISTS transaction_categories; DROP TABLE IF EXISTS transaction_types; DROP TABLE IF EXISTS card_xrefs;
      DROP TABLE IF EXISTS cards; DROP TABLE IF EXISTS accounts; DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS users;
    `);
  }
}
