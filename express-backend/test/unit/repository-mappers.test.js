import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCard, publicCustomer, publicUser } from '../../src/app.js';
import { account, card, customer, report, transaction, user } from '../../src/repositories/carddemo.js';

test('U-003: row mappers preserve identifiers and map database names and types to domain fields', () => {
  assert.deepEqual(user({ id: 'USER0001', first_name: 'Ada', last_name: 'Lovelace', role: 'U', password_hash: 'hash', version: 3 }), {
    id: 'USER0001', firstName: 'Ada', lastName: 'Lovelace', role: 'U', passwordHash: 'hash', version: 3
  });
  assert.deepEqual(account({ id: '00000000001', active: 'Y', current_balance: '12.34', credit_limit: '500', cash_credit_limit: '100', open_date: '2024-01-02', expiration_date: null, reissue_date: '2025-01-02', current_cycle_credit: '1.25', current_cycle_debit: '-0.75', zip: '12345', group_id: 'GROUP', version: 4 }), {
    id: '00000000001', active: 'Y', currentBalance: 12.34, creditLimit: 500, cashCreditLimit: 100, openDate: '2024-01-02', expirationDate: '', reissueDate: '2025-01-02', currentCycleCredit: 1.25, currentCycleDebit: -0.75, zip: '12345', groupId: 'GROUP', version: 4
  });
  assert.deepEqual(card({ number: '1234567812345678', account_id: '00000000001', cvv: '123', embossed_name: 'ADA LOVELACE', expiration_date: '2026-12-31', active: 'Y', version: 2 }), {
    number: '1234567812345678', accountId: '00000000001', cvv: '123', embossedName: 'ADA LOVELACE', expirationDate: '2026-12-31', active: 'Y', version: 2
  });
});

test('U-003: transaction and report mappers preserve fixed-width IDs and timestamps', () => {
  assert.deepEqual(transaction({ id: 42, type_code: '01', category_code: '0001', source: 'API', description: 'Purchase', amount: '12.34', merchant_id: '000000001', merchant_name: 'Shop', merchant_city: 'Town', merchant_zip: '12345', card_number: '1234567812345678', originated_at: '2024-02-29 01:02:03.4', processed_at: null, version: 1 }), {
    id: '0000000000000042', typeCode: '01', categoryCode: '0001', source: 'API', description: 'Purchase', amount: 12.34, merchantId: '000000001', merchantName: 'Shop', merchantCity: 'Town', merchantZip: '12345', cardNumber: '1234567812345678', originatedAt: '2024-02-29 01:02:03.400000', processedAt: '', version: 1
  });
  assert.deepEqual(report({ id: 'report-id', owner_id: 'USER0001', status: 'completed', period: 'custom', start_date: '2024-02-01', end_date: '2024-02-29', created_at: '2024-02-29T00:00:00.000Z', content: 'report', version: 2 }), {
    id: 'report-id', ownerId: 'USER0001', status: 'completed', period: 'custom', startDate: '2024-02-01', endDate: '2024-02-29', createdAt: '2024-02-29T00:00:00.000Z', content: 'report', version: 2
  });
});

test('U-003: customer mapper retains protected data for persistence while public mappers redact it', () => {
  const mapped = customer({ id: '000000001', first_name: 'Ada', middle_name: '', last_name: 'Lovelace', address1: '1 Main', address2: '', address3: '', state: 'NY', country: 'USA', zip: '12345', phone1: '555-0100', phone2: '', ssn: '123456789', government_id: 'A1234567', dob: '1815-12-10', eft_account_id: '987654321', primary_card_holder: 'Y', fico: 800, version: 5 });
  assert.equal(mapped.ssn, '123456789');
  assert.deepEqual(publicCustomer(mapped), {
    id: '000000001', firstName: 'Ada', middleName: '', lastName: 'Lovelace', address1: '1 Main', address2: '', address3: '', state: 'NY', country: 'USA', zip: '12345', phone1: '555-0100', phone2: '', ssn: '*****6789', governmentId: '****4567', dob: '1815-12-10', eftAccountId: '*****4321', primaryCardHolder: 'Y', fico: 800
  });
  assert.deepEqual(publicCard({ ...card({ number: '1234567812345678', account_id: '00000000001', cvv: '123', embossed_name: 'ADA', expiration_date: '2026-12-31', active: 'Y', version: 1 }) }), {
    number: '1234567812345678', accountId: '00000000001', embossedName: 'ADA', expirationDate: '2026-12-31', active: 'Y'
  });
  assert.deepEqual(publicUser({ id: 'USER0001', firstName: 'Ada', lastName: 'Lovelace', role: 'U', passwordHash: 'secret-hash', version: 1 }), { id: 'USER0001', firstName: 'Ada', lastName: 'Lovelace', role: 'U' });
});
