-- CardDemo backend schema (V2)
-- Adds the referential-integrity constraints between transactions and the
-- transaction-type/transaction-category master files (business-entities.md
-- ENTITY-005 relationships: TRAN-TYPE-CD -> TRAN-TYPE, (TRAN-TYPE-CD, TRAN-CAT-CD)
-- -> TRAN-CAT-KEY). V1 created the transactions table without these FKs; verified
-- against the seed data (dailytran.txt uses (01,0001) and (03,0001); BillPaymentService
-- writes (02,0002)) that every seeded/generated row satisfies both constraints.
ALTER TABLE transactions
    ADD CONSTRAINT transactions_type_fkey FOREIGN KEY (tran_type_cd)
        REFERENCES transaction_types (tran_type);

ALTER TABLE transactions
    ADD CONSTRAINT transactions_category_fkey FOREIGN KEY (tran_type_cd, tran_cat_cd)
        REFERENCES transaction_categories (tran_type_cd, tran_cat_cd);
