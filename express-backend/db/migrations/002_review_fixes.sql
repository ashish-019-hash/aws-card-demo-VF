ALTER TABLE transactions ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE idempotency DROP CONSTRAINT IF EXISTS idempotency_user_id_fkey;
ALTER TABLE idempotency ADD CONSTRAINT idempotency_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_owner_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS transactions_report_idx;
CREATE INDEX IF NOT EXISTS transactions_report_idx ON transactions ((COALESCE(processed_at, originated_at)::date), id);
