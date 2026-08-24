CREATE TABLE IF NOT EXISTS users (
  id varchar(8) PRIMARY KEY CHECK (id ~ '^[A-Z0-9]{3,8}$'),
  first_name varchar(25) NOT NULL, last_name varchar(25) NOT NULL,
  role char(1) NOT NULL CHECK (role IN ('A','U')),
  password_hash text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);
CREATE TABLE IF NOT EXISTS accounts (
  id varchar(11) PRIMARY KEY CHECK (id ~ '^\d{11}$'), active char(1) NOT NULL CHECK (active IN ('Y','N')),
  current_balance numeric(12,2) NOT NULL, credit_limit numeric(12,2) NOT NULL, cash_credit_limit numeric(12,2) NOT NULL,
  open_date date NOT NULL, expiration_date date NOT NULL, reissue_date date NOT NULL,
  current_cycle_credit numeric(12,2) NOT NULL, current_cycle_debit numeric(12,2) NOT NULL,
  zip varchar(10) NOT NULL, group_id varchar(10) NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);
CREATE TABLE IF NOT EXISTS customers (
  id varchar(9) PRIMARY KEY CHECK (id ~ '^\d{9}$'), first_name varchar(25) NOT NULL, middle_name varchar(25) NOT NULL, last_name varchar(25) NOT NULL,
  address1 varchar(50) NOT NULL, address2 varchar(50) NOT NULL, address3 varchar(50) NOT NULL, state varchar(2) NOT NULL, country varchar(3) NOT NULL,
  zip varchar(10) NOT NULL, phone1 varchar(15) NOT NULL, phone2 varchar(15) NOT NULL, ssn varchar(9) NOT NULL, government_id varchar(20) NOT NULL,
  dob date NOT NULL, eft_account_id varchar(10) NOT NULL, primary_card_holder char(1) NOT NULL CHECK (primary_card_holder IN ('Y','N')),
  fico integer NOT NULL CHECK (fico BETWEEN 0 AND 999), version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);
CREATE TABLE IF NOT EXISTS cards (
  number varchar(16) PRIMARY KEY CHECK (number ~ '^\d{16}$'), account_id varchar(11) NOT NULL REFERENCES accounts(id), cvv varchar(3) NOT NULL CHECK (cvv ~ '^\d{3}$'),
  embossed_name varchar(50) NOT NULL, expiration_date date NOT NULL, active char(1) NOT NULL CHECK (active IN ('Y','N')), version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (number, account_id)
);
CREATE INDEX IF NOT EXISTS cards_account_number_idx ON cards(account_id, number);
CREATE TABLE IF NOT EXISTS card_xrefs (
  card_number varchar(16) NOT NULL, customer_id varchar(9) NOT NULL REFERENCES customers(id), account_id varchar(11) NOT NULL REFERENCES accounts(id),
  PRIMARY KEY(card_number, customer_id, account_id), FOREIGN KEY(card_number, account_id) REFERENCES cards(number, account_id)
);
CREATE TABLE IF NOT EXISTS transaction_types (code varchar(2) PRIMARY KEY CHECK (code ~ '^\d{2}$'), description varchar(50) NOT NULL);
CREATE TABLE IF NOT EXISTS transaction_categories (type_code varchar(2) NOT NULL REFERENCES transaction_types(code), code varchar(4) NOT NULL CHECK (code ~ '^\d{4}$'), description varchar(50) NOT NULL, PRIMARY KEY(type_code, code));
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq AS bigint MINVALUE 1 MAXVALUE 9999999999999999;
CREATE TABLE IF NOT EXISTS transactions (
  id numeric(16,0) PRIMARY KEY DEFAULT nextval('transactions_id_seq'), type_code varchar(2) NOT NULL, category_code varchar(4) NOT NULL,
  source varchar(10) NOT NULL, description varchar(100) NOT NULL, amount numeric(12,2) NOT NULL, merchant_id varchar(9) NOT NULL,
  merchant_name varchar(50) NOT NULL, merchant_city varchar(50) NOT NULL, merchant_zip varchar(10) NOT NULL, card_number varchar(16) NOT NULL REFERENCES cards(number),
  originated_at timestamp(6) NOT NULL, processed_at timestamp(6), version integer NOT NULL DEFAULT 1 CHECK (version >= 1), FOREIGN KEY(type_code, category_code) REFERENCES transaction_categories(type_code, code)
);
CREATE INDEX IF NOT EXISTS transactions_card_id_idx ON transactions(card_number, id);
CREATE INDEX IF NOT EXISTS transactions_report_idx ON transactions ((COALESCE(processed_at, originated_at)::date), id);
CREATE TABLE IF NOT EXISTS category_balances (account_id varchar(11) NOT NULL REFERENCES accounts(id), type_code varchar(2) NOT NULL, category_code varchar(4) NOT NULL, balance numeric(11,2) NOT NULL, PRIMARY KEY(account_id,type_code,category_code), FOREIGN KEY(type_code,category_code) REFERENCES transaction_categories(type_code,code));
CREATE TABLE IF NOT EXISTS disclosure_groups (group_id varchar(10) NOT NULL, type_code varchar(2) NOT NULL, category_code varchar(4) NOT NULL, interest_rate numeric(6,2) NOT NULL, PRIMARY KEY(group_id,type_code,category_code), FOREIGN KEY(type_code,category_code) REFERENCES transaction_categories(type_code,code));
CREATE TABLE IF NOT EXISTS sessions (sid text PRIMARY KEY, sess jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS idempotency (user_id varchar(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE, key varchar(128) NOT NULL, target text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,key));
CREATE INDEX IF NOT EXISTS idempotency_retention_idx ON idempotency(created_at);
CREATE TABLE IF NOT EXISTS reports (id uuid PRIMARY KEY, owner_id varchar(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE, status varchar(20) NOT NULL, period varchar(10) NOT NULL, start_date date NOT NULL, end_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), content text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version >= 1));
CREATE INDEX IF NOT EXISTS reports_owner_idx ON reports(owner_id,created_at);
CREATE INDEX IF NOT EXISTS reports_retention_idx ON reports(created_at);
