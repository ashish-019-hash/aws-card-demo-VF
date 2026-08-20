import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { Store, empty } from './store.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ascii = path.join(root, '00.phase-1-input/data/ASCII');
const out = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(root, 'express-backend/data/carddemo.json');
const text = (s, at, width) => s.slice(at, at + width).trim();
// COBOL zoned decimal: {..I = +0..+9 and }..R = -0..-9; values are implied decimal.
function signed(value, scale = 2) { const raw = value.trim(); if (!raw) return 0; const last = raw.at(-1); const positive = '{ABCDEFGHI'; const negative = '}JKLMNOPQR'; let digits = raw; let sign = 1; if (positive.includes(last)) digits = raw.slice(0, -1) + positive.indexOf(last); if (negative.includes(last)) { digits = raw.slice(0, -1) + negative.indexOf(last); sign = -1; } return sign * Number(digits) / 10 ** scale; }
const lines = name => fs.readFileSync(path.join(ascii, name), 'utf8').split(/\r?\n/).filter(Boolean);
function importData(output = out) {
  const d = empty();
  d.accounts = lines('acctdata.txt').map(s => ({ id:text(s,0,11), active:text(s,11,1), currentBalance:signed(text(s,12,12)), creditLimit:signed(text(s,24,12)), cashCreditLimit:signed(text(s,36,12)), openDate:text(s,48,10), expirationDate:text(s,58,10), reissueDate:text(s,68,10), currentCycleCredit:signed(text(s,78,12)), currentCycleDebit:signed(text(s,90,12)), zip:text(s,102,10), groupId:text(s,112,10), version:1 }));
  d.cards = lines('carddata.txt').map(s => ({ number:text(s,0,16), accountId:text(s,16,11), cvv:text(s,27,3), embossedName:text(s,30,50), expirationDate:text(s,80,10), active:text(s,90,1), version:1 }));
  d.xrefs = lines('cardxref.txt').map(s => ({ cardNumber:text(s,0,16), customerId:text(s,16,9), accountId:text(s,25,11) }));
  d.customers = lines('custdata.txt').map(s => ({ id:text(s,0,9), firstName:text(s,9,25), middleName:text(s,34,25), lastName:text(s,59,25), address1:text(s,84,50), address2:text(s,134,50), address3:text(s,184,50), state:text(s,234,2), country:text(s,236,3), zip:text(s,239,10), phone1:text(s,249,15), phone2:text(s,264,15), ssn:text(s,279,9), governmentId:text(s,288,20), dob:text(s,308,10), eftAccountId:text(s,318,10), primaryCardHolder:text(s,328,1), fico:Number(text(s,329,3)), version:1 }));
  d.transactions = lines('dailytran.txt').map(s => ({ id:text(s,0,16), typeCode:text(s,16,2), categoryCode:text(s,18,4), source:text(s,22,10), description:text(s,32,100), amount:signed(text(s,132,11)), merchantId:text(s,143,9), merchantName:text(s,152,50), merchantCity:text(s,202,50), merchantZip:text(s,252,10), cardNumber:text(s,262,16), originatedAt:text(s,278,26), processedAt:text(s,304,26), version:1 }));
  d.types = lines('trantype.txt').map(s => ({ code:text(s,0,2), description:text(s,2,50) }));
  d.categories = lines('trancatg.txt').map(s => ({ typeCode:text(s,0,2), code:text(s,2,4), description:text(s,6,50) }));
  d.categoryBalances = lines('tcatbal.txt').map(s => ({ accountId:text(s,0,11), typeCode:text(s,11,2), categoryCode:text(s,13,4), balance:signed(text(s,17,11)) }));
  d.disclosureGroups = lines('discgrp.txt').map(s => ({ groupId:text(s,0,10), typeCode:text(s,10,2), categoryCode:text(s,12,4), interestRate:signed(text(s,16,6)) }));
  // ASCII USRSEC is absent. The checked-in EBCDIC USRSEC cannot safely yield portable plaintext/hash credentials.
  d.users = [
    { id:'ADMIN001', firstName:'Demo', lastName:'Administrator', role:'A', passwordHash:bcrypt.hashSync('Admin123!', 12), version:1 },
    { id:'USER0001', firstName:'Demo', lastName:'Business User', role:'U', passwordHash:bcrypt.hashSync('User123!', 12), version:1 }
  ];
  const store = new Store(output); store.data = d; store.save();
  console.log(`Imported ${d.accounts.length} accounts, ${d.customers.length} customers, ${d.cards.length} cards, and ${d.transactions.length} transactions into ${output}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) importData();
export { signed, importData };
