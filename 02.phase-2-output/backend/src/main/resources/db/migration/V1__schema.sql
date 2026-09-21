-- CardDemo backend schema (V1)
-- Mirrors 01.phase-1-output/business-entities.md exactly.
-- Legacy persisted string formats are preserved as fixed-length CHAR columns:
--   phone   -> VARCHAR(15)  '(NNN)NNN-NNNN  '
--   dob     -> VARCHAR(10)  'YYYY-MM-DD'
--   ssn     -> VARCHAR(9)   digits only
--   dates   -> VARCHAR(10)  'YYYY-MM-DD'
--   tran ts -> VARCHAR(26)  'YYYY-MM-DD HH:MM:SS.SSSSSS'

CREATE TABLE customers (
    cust_id                 BIGINT          NOT NULL,
    cust_first_name         VARCHAR(25)     NOT NULL,
    cust_middle_name        VARCHAR(25),
    cust_last_name          VARCHAR(25)     NOT NULL,
    cust_addr_line_1        VARCHAR(50)     NOT NULL,
    cust_addr_line_2        VARCHAR(50),
    cust_addr_line_3        VARCHAR(50),
    cust_addr_state_cd      VARCHAR(2)         NOT NULL,
    cust_addr_country_cd    VARCHAR(3)         NOT NULL,
    cust_addr_zip           VARCHAR(10)     NOT NULL,
    cust_phone_num_1        VARCHAR(15),
    cust_phone_num_2        VARCHAR(15),
    cust_ssn                VARCHAR(9)         NOT NULL,
    cust_govt_issued_id     VARCHAR(20),
    cust_dob_yyyy_mm_dd     VARCHAR(10)        NOT NULL,
    cust_eft_account_id     VARCHAR(10),
    cust_pri_card_holder_ind VARCHAR(1)        NOT NULL DEFAULT 'N',
    cust_fico_credit_score  INTEGER         NOT NULL,
    CONSTRAINT customers_pkey PRIMARY KEY (cust_id),
    -- No FICO range CHECK: legacy CUSTDAT sample data contains scores below 300 (e.g. 274).
    -- The 300-850 rule (VR) is enforced on input in the validation layer, not on stored rows.
    CONSTRAINT customers_pri_card_holder_ind_chk CHECK (cust_pri_card_holder_ind IN ('Y','N'))
);

CREATE TABLE disclosure_groups (
    dis_acct_group_id  VARCHAR(10)     NOT NULL,
    dis_tran_type_cd   VARCHAR(2)         NOT NULL,
    dis_tran_cat_cd    INTEGER         NOT NULL,
    dis_int_rate       NUMERIC(6,2)    NOT NULL,
    CONSTRAINT disclosure_groups_pkey PRIMARY KEY (dis_acct_group_id, dis_tran_type_cd, dis_tran_cat_cd)
);

CREATE TABLE accounts (
    acct_id               BIGINT          NOT NULL,
    acct_active_status    VARCHAR(1)         NOT NULL,
    acct_curr_bal         NUMERIC(12,2)   NOT NULL,
    acct_credit_limit     NUMERIC(12,2)   NOT NULL,
    acct_cash_credit_limit NUMERIC(12,2)  NOT NULL,
    acct_open_date        VARCHAR(10)        NOT NULL,
    acct_expiraion_date   VARCHAR(10)        NOT NULL,
    acct_reissue_date     VARCHAR(10)        NOT NULL,
    acct_curr_cyc_credit  NUMERIC(12,2)   NOT NULL,
    acct_curr_cyc_debit   NUMERIC(12,2)   NOT NULL,
    acct_addr_zip         VARCHAR(10),
    acct_group_id         VARCHAR(10),
    CONSTRAINT accounts_pkey PRIMARY KEY (acct_id),
    CONSTRAINT accounts_active_status_chk CHECK (acct_active_status IN ('Y','N'))
);

CREATE TABLE cards (
    card_num             VARCHAR(16)        NOT NULL,
    card_acct_id         BIGINT          NOT NULL,
    card_cvv_cd          INTEGER         NOT NULL,
    card_embossed_name   VARCHAR(50)     NOT NULL,
    card_expiraion_date  VARCHAR(10)        NOT NULL,
    card_active_status   VARCHAR(1)         NOT NULL,
    CONSTRAINT cards_pkey PRIMARY KEY (card_num),
    CONSTRAINT cards_acct_id_fkey FOREIGN KEY (card_acct_id) REFERENCES accounts (acct_id),
    CONSTRAINT cards_active_status_chk CHECK (card_active_status IN ('Y','N'))
);
CREATE INDEX cards_acct_id_idx ON cards (card_acct_id);

CREATE TABLE card_xref (
    xref_card_num  VARCHAR(16)  NOT NULL,
    xref_cust_id   BIGINT    NOT NULL,
    xref_acct_id   BIGINT    NOT NULL,
    CONSTRAINT card_xref_pkey PRIMARY KEY (xref_card_num),
    CONSTRAINT card_xref_card_num_fkey FOREIGN KEY (xref_card_num) REFERENCES cards (card_num),
    CONSTRAINT card_xref_cust_id_fkey FOREIGN KEY (xref_cust_id) REFERENCES customers (cust_id),
    CONSTRAINT card_xref_acct_id_fkey FOREIGN KEY (xref_acct_id) REFERENCES accounts (acct_id)
);
CREATE INDEX card_xref_acct_id_idx ON card_xref (xref_acct_id);
CREATE INDEX card_xref_cust_id_idx ON card_xref (xref_cust_id);

CREATE TABLE transaction_types (
    tran_type      VARCHAR(2)      NOT NULL,
    tran_type_desc VARCHAR(50)  NOT NULL,
    CONSTRAINT transaction_types_pkey PRIMARY KEY (tran_type)
);

CREATE TABLE transaction_categories (
    tran_type_cd        VARCHAR(2)      NOT NULL,
    tran_cat_cd         INTEGER      NOT NULL,
    tran_cat_type_desc  VARCHAR(50)  NOT NULL,
    CONSTRAINT transaction_categories_pkey PRIMARY KEY (tran_type_cd, tran_cat_cd),
    CONSTRAINT transaction_categories_type_fkey FOREIGN KEY (tran_type_cd) REFERENCES transaction_types (tran_type)
);

CREATE TABLE transaction_category_balances (
    trancat_acct_id  BIGINT     NOT NULL,
    trancat_type_cd  VARCHAR(2)    NOT NULL,
    trancat_cd       INTEGER    NOT NULL,
    tran_cat_bal     NUMERIC(11,2) NOT NULL,
    CONSTRAINT transaction_category_balances_pkey PRIMARY KEY (trancat_acct_id, trancat_type_cd, trancat_cd),
    CONSTRAINT tcb_acct_id_fkey FOREIGN KEY (trancat_acct_id) REFERENCES accounts (acct_id),
    CONSTRAINT tcb_category_fkey FOREIGN KEY (trancat_type_cd, trancat_cd) REFERENCES transaction_categories (tran_type_cd, tran_cat_cd)
);

CREATE TABLE transactions (
    tran_id             VARCHAR(16)        NOT NULL,
    tran_type_cd        VARCHAR(2)         NOT NULL,
    tran_cat_cd         INTEGER         NOT NULL,
    tran_source         VARCHAR(10)     NOT NULL,
    tran_desc           VARCHAR(100)    NOT NULL,
    tran_amt            NUMERIC(11,2)   NOT NULL,
    tran_merchant_id    BIGINT          NOT NULL,
    tran_merchant_name  VARCHAR(50)     NOT NULL,
    tran_merchant_city  VARCHAR(50)     NOT NULL,
    tran_merchant_zip   VARCHAR(10)     NOT NULL,
    tran_card_num       VARCHAR(16)        NOT NULL,
    tran_orig_ts        VARCHAR(26)        NOT NULL,
    tran_proc_ts        VARCHAR(26),
    CONSTRAINT transactions_pkey PRIMARY KEY (tran_id),
    CONSTRAINT transactions_card_num_fkey FOREIGN KEY (tran_card_num) REFERENCES cards (card_num)
);
CREATE INDEX transactions_card_num_idx ON transactions (tran_card_num);
CREATE INDEX transactions_orig_ts_idx ON transactions (tran_orig_ts);

CREATE TABLE users (
    sec_usr_id      VARCHAR(8)   NOT NULL,
    sec_usr_fname   VARCHAR(20)  NOT NULL,
    sec_usr_lname   VARCHAR(20)  NOT NULL,
    sec_usr_pwd     VARCHAR(8)   NOT NULL,
    sec_usr_type    VARCHAR(1)      NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (sec_usr_id),
    CONSTRAINT users_type_chk CHECK (sec_usr_type IN ('A','U'))
);

-- Transaction-id allocation table: a single row whose next_tran_id is
-- advanced under SELECT ... FOR UPDATE to hand out MAX+1 style ids
-- atomically (see docs/api-contract.md / BR-010 for the rationale).
CREATE TABLE tran_id_allocator (
    id            INTEGER NOT NULL,
    next_tran_id  BIGINT  NOT NULL,
    CONSTRAINT tran_id_allocator_pkey PRIMARY KEY (id)
);
INSERT INTO tran_id_allocator (id, next_tran_id) VALUES (1, 1);
