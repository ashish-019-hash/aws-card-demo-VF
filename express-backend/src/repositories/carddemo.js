import { randomUUID } from 'node:crypto';
import { withTransaction } from '../db.js';

const number = value => Number(value);
const date = value => value || '';
const timestamp = value => value ? `${value.split('.')[0]}.${(value.split('.')[1] || '').padEnd(6, '0').slice(0, 6)}` : '';
const mappedRows = result => result.rows;

export const user = row => row && ({
  id: row.id, firstName: row.first_name, lastName: row.last_name, role: row.role,
  passwordHash: row.password_hash, version: row.version
});
export const account = row => row && ({
  id: row.id, active: row.active, currentBalance: number(row.current_balance),
  creditLimit: number(row.credit_limit), cashCreditLimit: number(row.cash_credit_limit),
  openDate: date(row.open_date), expirationDate: date(row.expiration_date), reissueDate: date(row.reissue_date),
  currentCycleCredit: number(row.current_cycle_credit), currentCycleDebit: number(row.current_cycle_debit),
  zip: row.zip, groupId: row.group_id, version: row.version
});
export const customer = row => row && ({
  id: row.id, firstName: row.first_name, middleName: row.middle_name, lastName: row.last_name,
  address1: row.address1, address2: row.address2, address3: row.address3, state: row.state,
  country: row.country, zip: row.zip, phone1: row.phone1, phone2: row.phone2, ssn: row.ssn,
  governmentId: row.government_id, dob: date(row.dob), eftAccountId: row.eft_account_id,
  primaryCardHolder: row.primary_card_holder, fico: row.fico, version: row.version
});
export const card = row => row && ({
  number: row.number, accountId: row.account_id, cvv: row.cvv, embossedName: row.embossed_name,
  expirationDate: date(row.expiration_date), active: row.active, version: row.version
});
export const transaction = row => row && ({
  id: String(row.id).padStart(16, '0'), typeCode: row.type_code, categoryCode: row.category_code,
  source: row.source, description: row.description, amount: number(row.amount), merchantId: row.merchant_id,
  merchantName: row.merchant_name, merchantCity: row.merchant_city, merchantZip: row.merchant_zip,
  cardNumber: row.card_number, originatedAt: timestamp(row.originated_at), processedAt: timestamp(row.processed_at),
  version: row.version
});
export const report = row => row && ({
  id: row.id, ownerId: row.owner_id, status: row.status, period: row.period,
  startDate: date(row.start_date), endDate: date(row.end_date), createdAt: row.created_at,
  content: row.content, version: row.version
});

const selectOne = async (db, sql, values, mapper) => mapper((await db.query(sql, values)).rows[0]);
const patchFields = {
  accounts: { active: 'active', creditLimit: 'credit_limit', cashCreditLimit: 'cash_credit_limit', zip: 'zip', groupId: 'group_id', expirationDate: 'expiration_date', reissueDate: 'reissue_date' },
  customers: { firstName: 'first_name', middleName: 'middle_name', lastName: 'last_name', address1: 'address1', address2: 'address2', address3: 'address3', state: 'state', country: 'country', zip: 'zip', phone1: 'phone1', phone2: 'phone2', dob: 'dob', primaryCardHolder: 'primary_card_holder', fico: 'fico' },
  cards: { active: 'active', embossedName: 'embossed_name', expirationDate: 'expiration_date' },
  users: { firstName: 'first_name', lastName: 'last_name', role: 'role', passwordHash: 'password_hash' }
};
const tableMappers = { accounts: account, customers: customer, cards: card, users: user };

export function createRepository(pool) {
  const repo = {
    pool,
    withTransaction: callback => withTransaction(pool, callback),
    getUser: (id, db = pool) => selectOne(db, 'SELECT * FROM users WHERE id=$1', [id], user),
    getAccount: (id, db = pool, lock = false) => selectOne(db, `SELECT * FROM accounts WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [id], account),
    getCustomer: (id, db = pool) => selectOne(db, 'SELECT * FROM customers WHERE id=$1', [id], customer),
    getCard: (id, db = pool) => selectOne(db, 'SELECT * FROM cards WHERE number=$1', [id], card),
    getTransaction: (id, db = pool) => selectOne(db, 'SELECT * FROM transactions WHERE id=$1', [id], transaction),
    getReport: (id, db = pool) => selectOne(db, 'SELECT * FROM reports WHERE id=$1', [id], report),

    async accountView(id) {
      const value = await repo.getAccount(id);
      if (!value) return null;
      const customers = await pool.query('SELECT c.* FROM customers c JOIN card_xrefs x ON x.customer_id=c.id WHERE x.account_id=$1 ORDER BY c.id', [id]);
      const cards = await pool.query('SELECT c.* FROM cards c JOIN card_xrefs x ON x.card_number=c.number AND x.account_id=c.account_id WHERE x.account_id=$1 ORDER BY c.number', [id]);
      return { ...value, customers: mappedRows(customers).map(customer), cards: mappedRows(cards).map(card) };
    },
    async isAssociated(accountId, customerId) {
      return (await pool.query('SELECT 1 FROM card_xrefs WHERE account_id=$1 AND customer_id=$2', [accountId, customerId])).rowCount > 0;
    },

    async update(table, keyField, key, version, patch, db = pool) {
      const mapping = patchFields[table];
      const mapper = tableMappers[table];
      if (!mapping || !mapper || !Object.keys(patch).length || Object.keys(patch).some(field => !mapping[field])) throw new Error(`Invalid ${table} patch mapping.`);
      const fields = Object.keys(patch);
      const assignments = fields.map((field, index) => `${mapping[field]}=$${index + 1}`);
      const values = fields.map(field => patch[field]);
      const result = await db.query(`UPDATE ${table} SET ${assignments.join(',')},version=version+1 WHERE ${keyField}=$${fields.length + 1} AND version=$${fields.length + 2} RETURNING *`, [...values, key, version]);
      return mapper(result.rows[0]);
    },

    async listCards({ accountId, cardNumber, cursor, limit }) {
      const conditions = []; const values = [];
      const add = (column, value) => { values.push(value); conditions.push(`${column}=$${values.length}`); };
      if (accountId) add('account_id', accountId);
      if (cardNumber) add('number', cardNumber);
      if (cursor) {
        const exists = await pool.query(`SELECT 1 FROM cards ${conditions.length ? `WHERE ${conditions.join(' AND ')} AND number=$${values.length + 1}` : `WHERE number=$${values.length + 1}`}`, [...values, cursor]);
        if (!exists.rowCount) return null;
        values.push(cursor); conditions.push(`number > $${values.length}`);
      }
      values.push(limit + 1);
      const result = await pool.query(`SELECT * FROM cards ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY number LIMIT $${values.length}`, values);
      return mappedRows(result).map(card);
    },
    async listTransactions({ accountId, cardNumber, cursor, limit }) {
      const conditions = []; const values = [];
      const add = (column, value) => { values.push(value); conditions.push(`${column}=$${values.length}`); };
      if (cardNumber) add('t.card_number', cardNumber);
      if (accountId) add('c.account_id', accountId);
      if (cursor) {
        const exists = await pool.query(`SELECT 1 FROM transactions t JOIN cards c ON c.number=t.card_number ${conditions.length ? `WHERE ${conditions.join(' AND ')} AND t.id=$${values.length + 1}` : `WHERE t.id=$${values.length + 1}`}`, [...values, cursor]);
        if (!exists.rowCount) return null;
        values.push(cursor); conditions.push(`t.id > $${values.length}`);
      }
      values.push(limit + 1);
      const result = await pool.query(`SELECT t.* FROM transactions t JOIN cards c ON c.number=t.card_number ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY t.id LIMIT $${values.length}`, values);
      return mappedRows(result).map(transaction);
    },
    async listUsers({ cursor, limit }) {
      if (cursor && !(await pool.query('SELECT 1 FROM users WHERE id=$1', [cursor])).rowCount) return null;
      const values = cursor ? [cursor, limit + 1] : [limit + 1];
      const result = await pool.query(`SELECT * FROM users ${cursor ? 'WHERE id > $1' : ''} ORDER BY id LIMIT $${values.length}`, values);
      return mappedRows(result).map(user);
    },

    async idempotency(db, userId, key, target, fingerprint, execute) {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${userId}:${key}`]);
      const existing = await db.query('SELECT * FROM idempotency WHERE user_id=$1 AND key=$2 FOR UPDATE', [userId, key]);
      if (existing.rowCount) {
        const value = existing.rows[0];
        if (value.target !== target || value.fingerprint !== fingerprint) throw Object.assign(new Error('Idempotency-Key was already used for a different target or request body.'), { status: 409, code: 'IDEMPOTENCY_CONFLICT' });
        return { ...value.result, replay: true };
      }
      const result = await execute();
      await db.query('INSERT INTO idempotency(user_id,key,target,fingerprint,result) VALUES($1,$2,$3,$4,$5)', [userId, key, target, fingerprint, JSON.stringify(result)]);
      return { ...result, replay: false };
    },
    async insertTransaction(db, value) {
      const result = await db.query('INSERT INTO transactions(type_code,category_code,source,description,amount,merchant_id,merchant_name,merchant_city,merchant_zip,card_number,originated_at,processed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *', [value.typeCode, value.categoryCode, value.source, value.description, value.amount, value.merchantId, value.merchantName, value.merchantCity, value.merchantZip, value.cardNumber, value.originatedAt, value.processedAt]);
      return transaction(result.rows[0]);
    },
    async createReport(db, data) {
      const result = await db.query('INSERT INTO reports(id,owner_id,status,period,start_date,end_date,content) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [randomUUID(), data.ownerId, 'completed', data.period, data.startDate, data.endDate, data.content]);
      return report(result.rows[0]);
    },
    async reportRows(startDate, endDate) {
      const result = await pool.query('SELECT t.*,c.account_id FROM transactions t LEFT JOIN cards c ON c.number=t.card_number WHERE COALESCE(t.processed_at,t.originated_at)::date BETWEEN $1 AND $2 ORDER BY COALESCE(t.processed_at,t.originated_at)::date,t.id', [startDate, endDate]);
      return mappedRows(result).map(row => ({ ...transaction(row), accountId: row.account_id || 'UNASSIGNED' }));
    },

    async withAdminLock(db, callback) {
      await db.query("SELECT pg_advisory_xact_lock(hashtext('carddemo-admin-invariant'))");
      return callback();
    },
    createUser: async (db, value) => user((await db.query('INSERT INTO users(id,first_name,last_name,role,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *', [value.id, value.firstName, value.lastName, value.role, value.passwordHash])).rows[0]),
    deleteUser: async (db, id, version) => (await db.query('DELETE FROM users WHERE id=$1 AND version=$2 RETURNING *', [id, version])).rowCount,
    adminCount: async db => (await db.query("SELECT id FROM users WHERE role='A' FOR UPDATE")).rowCount,

    types: async () => mappedRows(await pool.query('SELECT code,description FROM transaction_types ORDER BY code')).map(row => ({ code: row.code, description: row.description })),
    categories: async type => mappedRows(await pool.query(`SELECT type_code,code,description FROM transaction_categories ${type ? 'WHERE type_code=$1' : ''} ORDER BY type_code,code`, type ? [type] : [])).map(row => ({ typeCode: row.type_code, code: row.code, description: row.description })),
    definedType: async (type, category, db = pool) => (await db.query('SELECT 1 FROM transaction_categories WHERE type_code=$1 AND code=$2', [type, category])).rowCount > 0,
    async cleanup(limit = 1000) {
      const result = await pool.query("WITH expired_sessions AS (DELETE FROM sessions WHERE sid IN (SELECT sid FROM sessions WHERE expires_at <= now() LIMIT $1) RETURNING 1), expired_idempotency AS (DELETE FROM idempotency WHERE ctid IN (SELECT ctid FROM idempotency WHERE created_at < now() - interval '30 days' LIMIT $1) RETURNING 1), expired_reports AS (DELETE FROM reports WHERE ctid IN (SELECT ctid FROM reports WHERE created_at < now() - interval '30 days' LIMIT $1) RETURNING 1) SELECT (SELECT count(*) FROM expired_sessions)::int sessions,(SELECT count(*) FROM expired_idempotency)::int idempotency,(SELECT count(*) FROM expired_reports)::int reports", [limit]);
      return result.rows[0];
    }
  };
  return repo;
}
