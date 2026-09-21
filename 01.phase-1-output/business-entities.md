# CardDemo — Business Entities Catalog

**Scope:** Business entities of the CardDemo CICS/COBOL application, extracted from the copybooks (`00.phase-1-input/cpy/`), the VSAM catalog (`00.phase-1-input/catlg/LISTCAT.txt`), the CICS resource definitions (`00.phase-1-input/csd/CARDDEMO.CSD`), the COBOL programs (`00.phase-1-input/cbl/`), and the ASCII sample data (`00.phase-1-input/data/ASCII/`).

**Method:** Per `/code/.skills/user/business-entities/SKILL.md`. Every field, key, and relationship below is backed by a source citation `[FILE:path:line-range]`; all cited ranges were opened and verified against the current repository content. Sample data files were parsed byte-for-byte (fixed-width, no delimiters) to confirm field boundaries and to illustrate the persisted string formats requested for this catalog. Technical/system data (COMMAREA routing fields, BMS work areas, PF-key `88`-level flags, `FILLER`, loop/processing indicators) is excluded — see "Excluded Technical Structures" at the end.

---

### ENTITY-001: Customer

**Entity Type**: Master
**Description**: An individual who holds one or more credit cards. Carries personally-identifiable information (name, address, SSN, government ID, date of birth), contact numbers, EFT settlement account, and the FICO credit score used in credit decisions.
**Source**: [FILE:00.phase-1-input/cpy/CVCUS01Y.cpy:4-23] (`CUSTOMER-RECORD`, RECLEN 500). An identical, unused duplicate copybook exists at [FILE:00.phase-1-input/cpy/CUSTREC.cpy:4-23] (dead copybook — not `COPY`'d by any program in `cbl/`; differs only in one field name, see Open Dependencies). VSAM file `CUSTDAT`, dataset `AWS.M2.CARDDEMO.CUSTDATA.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:50-62]; cluster attributes KEYLEN 9 / RECLEN 500 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:632-633]. Read by COACTUPC, COACTVWC, COCRDSLC, COCRDUPC (all `COPY CVCUS01Y`, confirmed via `grep -l "COPY CVCUS01Y" *.cbl`).

**Business Attributes**:
- Primary Key: `CUST-ID` (9-digit numeric customer number)
- Core Attributes: name (first/middle/last), 3-line address, state/country/zip, 2 phone numbers, SSN, government-issued ID, date of birth, EFT account id, FICO score
- Foreign Keys: none stored directly on the customer record — Customer only links to Account/Card through the `CARD-XREF-RECORD` junction (ENTITY-004); confirmed by absence of any `ACCT-ID`/`CARD-NUM` field in `CVCUS01Y.cpy`
- Status Fields: `CUST-PRI-CARD-HOLDER-IND` (Y/N — is this customer the primary cardholder on the linked card)

**Data Structure** [FILE:00.phase-1-input/cpy/CVCUS01Y.cpy:4-23]:
```
01  CUSTOMER-RECORD.
    05  CUST-ID                                 PIC 9(09).
    05  CUST-FIRST-NAME                         PIC X(25).
    05  CUST-MIDDLE-NAME                        PIC X(25).
    05  CUST-LAST-NAME                          PIC X(25).
    05  CUST-ADDR-LINE-1                        PIC X(50).
    05  CUST-ADDR-LINE-2                        PIC X(50).
    05  CUST-ADDR-LINE-3                        PIC X(50).
    05  CUST-ADDR-STATE-CD                      PIC X(02).
    05  CUST-ADDR-COUNTRY-CD                    PIC X(03).
    05  CUST-ADDR-ZIP                           PIC X(10).
    05  CUST-PHONE-NUM-1                        PIC X(15).
    05  CUST-PHONE-NUM-2                        PIC X(15).
    05  CUST-SSN                                PIC 9(09).
    05  CUST-GOVT-ISSUED-ID                     PIC X(20).
    05  CUST-DOB-YYYY-MM-DD                     PIC X(10).
    05  CUST-EFT-ACCOUNT-ID                     PIC X(10).
    05  CUST-PRI-CARD-HOLDER-IND                PIC X(01).
    05  CUST-FICO-CREDIT-SCORE                  PIC 9(03).
    05  FILLER                                  PIC X(168).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| CUST-ID | 9(09) | 9 | Zero-padded numeric string | Customer number | PK |
| CUST-FIRST-NAME | X(25) | 25 | Space-padded text | First name | — |
| CUST-MIDDLE-NAME | X(25) | 25 | Space-padded text | Middle name | — |
| CUST-LAST-NAME | X(25) | 25 | Space-padded text | Last name | — |
| CUST-ADDR-LINE-1/2/3 | X(50) × 3 | 150 | Space-padded text | Street address lines | — |
| CUST-ADDR-STATE-CD | X(02) | 2 | 2-letter USPS state code | Address state; cross-checked against ENTITY-011 `VALID-US-STATE-CODE` | — |
| CUST-ADDR-COUNTRY-CD | X(03) | 3 | 3-letter code, e.g. `USA` | Address country | — |
| CUST-ADDR-ZIP | X(10) | 10 | Digits, first 5 significant | ZIP/postal code; cross-checked against state via ENTITY-011 `VALID-US-STATE-ZIP-CD2-COMBO` | — |
| CUST-PHONE-NUM-1/2 | X(15) × 2 | 30 | **`(NNN)NNN-NNNN` left-justified in a 15-byte field** (13 significant chars + 2 trailing spaces); area code cross-checked against ENTITY-011 `VALID-PHONE-AREA-CODE` | Primary/secondary phone | — |
| CUST-SSN | 9(09) | 9 | 9-digit numeric string, no dashes | Social Security Number | — |
| CUST-GOVT-ISSUED-ID | X(20) | 20 | Free-text alphanumeric | Government ID (license/passport) | — |
| CUST-DOB-YYYY-MM-DD | X(10) | 10 | **`YYYY-MM-DD`** | Date of birth | — |
| CUST-EFT-ACCOUNT-ID | X(10) | 10 | Alphanumeric | External EFT settlement account id | — |
| CUST-PRI-CARD-HOLDER-IND | X(01) | 1 | `Y` / `N` | Primary cardholder flag | — |
| CUST-FICO-CREDIT-SCORE | 9(03) | 3 | 3-digit numeric | FICO credit score | — |
| FILLER | X(168) | 168 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/custdata.txt:1]: `CUST-PHONE-NUM-1 = '(908)119-8310  '` (15 bytes), `CUST-SSN = '020973888'`, `CUST-DOB-YYYY-MM-DD = '1961-06-08'`, `CUST-GOVT-ISSUED-ID = '00000000000049368437'`(20 bytes). Byte offsets confirmed programmatically against the 500-byte fixed record.

**Relationships**:
- Parent: none
- Children: none directly — see ENTITY-004 (`CARD-XREF-RECORD`) for the Card/Account association
- Associates: Card (ENTITY-003) and Account (ENTITY-002), both **only** through the Card-Cross-Reference junction (ENTITY-004); a Customer can be associated with 0..N cards/accounts (M:N with Account, mediated by Card)

**Usage Context**:
- Programs: COACTUPC, COACTVWC, COCRDSLC, COCRDUPC (all read `CUSTDAT` keyed by `CUST-ID` obtained from `CARD-XREF-RECORD`, e.g. [FILE:00.phase-1-input/cbl/COACTVWC.cbl:826-831])
- Business Functions: Account view/update (display cardholder name/address), Card view/update (display cardholder name)

---

### ENTITY-002: Account

**Entity Type**: Master
**Description**: A credit-card account: current balance, credit limits, cycle-to-date credit/debit accumulators, and the key dates (open, expiration, reissue) that govern the account's life cycle.
**Source**: [FILE:00.phase-1-input/cpy/CVACT01Y.cpy:4-17] (`ACCOUNT-RECORD`, RECLEN 300). VSAM file `ACCTDAT`, dataset `AWS.M2.CARDDEMO.ACCTDATA.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:1-12]; cluster attributes KEYLEN 11 / RECLEN 300 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:59-60] (50 records loaded, [FILE:00.phase-1-input/catlg/LISTCAT.txt:63]). Read/written by COACTVWC (read-only) and COACTUPC (read/rewrite); also read by COBIL00C and COTRN02C (all `COPY CVACT01Y`).

**Business Attributes**:
- Primary Key: `ACCT-ID` (11-digit numeric account number)
- Core Attributes: current balance, credit limit, cash-credit limit, cycle-to-date credit/debit, open/expiration/reissue dates, mailing zip
- Foreign Keys: `ACCT-GROUP-ID` → `DIS-ACCT-GROUP-ID` of ENTITY-009 (Disclosure/Interest-Rate Group)
- Status Fields: `ACCT-ACTIVE-STATUS` (Y/N)

**Data Structure** [FILE:00.phase-1-input/cpy/CVACT01Y.cpy:4-17]:
```
01  ACCOUNT-RECORD.
    05  ACCT-ID                           PIC 9(11).
    05  ACCT-ACTIVE-STATUS                PIC X(01).
    05  ACCT-CURR-BAL                     PIC S9(10)V99.
    05  ACCT-CREDIT-LIMIT                 PIC S9(10)V99.
    05  ACCT-CASH-CREDIT-LIMIT            PIC S9(10)V99.
    05  ACCT-OPEN-DATE                    PIC X(10).
    05  ACCT-EXPIRAION-DATE               PIC X(10).
    05  ACCT-REISSUE-DATE                 PIC X(10).
    05  ACCT-CURR-CYC-CREDIT              PIC S9(10)V99.
    05  ACCT-CURR-CYC-DEBIT               PIC S9(10)V99.
    05  ACCT-ADDR-ZIP                     PIC X(10).
    05  ACCT-GROUP-ID                     PIC X(10).
    05  FILLER                            PIC X(178).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| ACCT-ID | 9(11) | 11 | Zero-padded numeric string | Account number | PK |
| ACCT-ACTIVE-STATUS | X(01) | 1 | `Y` / `N` | Active flag | — |
| ACCT-CURR-BAL | S9(10)V99 | 12 (zoned decimal, sign in last byte) | Signed decimal, 2dp | Current balance | — |
| ACCT-CREDIT-LIMIT | S9(10)V99 | 12 | Signed decimal, 2dp | Credit limit | — |
| ACCT-CASH-CREDIT-LIMIT | S9(10)V99 | 12 | Signed decimal, 2dp | Cash-advance credit limit | — |
| ACCT-OPEN-DATE | X(10) | 10 | **`YYYY-MM-DD`** | Account opened | — |
| ACCT-EXPIRAION-DATE *(sic, misspelled in source)* | X(10) | 10 | `YYYY-MM-DD` | Account expiration | — |
| ACCT-REISSUE-DATE | X(10) | 10 | `YYYY-MM-DD` | Last reissue date | — |
| ACCT-CURR-CYC-CREDIT | S9(10)V99 | 12 | Signed decimal, 2dp | Cycle-to-date credits | — |
| ACCT-CURR-CYC-DEBIT | S9(10)V99 | 12 | Signed decimal, 2dp | Cycle-to-date debits | — |
| ACCT-ADDR-ZIP | X(10) | 10 | Alphanumeric | Mailing zip on the account record | — |
| ACCT-GROUP-ID | X(10) | 10 | Alphanumeric code | FK to Disclosure Group (ENTITY-009) | FK |
| FILLER | X(178) | 178 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/acctdata.txt:1]: `ACCT-OPEN-DATE='2014-11-20'`, `ACCT-EXPIRAION-DATE='2025-05-20'`, `ACCT-CURR-BAL='00000001940{'` (zoned-decimal sign overpunch `{` = positive, value 1940.00). Note: in the loaded sample data every row has `ACCT-ADDR-ZIP='A000000000'` and `ACCT-GROUP-ID=spaces` — a data-generation placeholder, not a real ZIP/group; the field remains `PIC X(10)` alphanumeric per the copybook, not numeric-only.

**Relationships**:
- Parent: Disclosure Group (ENTITY-009), via `ACCT-GROUP-ID` (N accounts : 1 group)
- Children: Card (ENTITY-003), 1 Account : N Cards, via `CARD-ACCT-ID` on the card record and via the Card-Cross-Reference junction (ENTITY-004) — confirmed by COCRDLIC's own program comment "b) Only the ones associated with ACCT ... if user is not admin" [FILE:00.phase-1-input/cbl/COCRDLIC.cbl:1-7], implying an account may have more than one card
- Associates: Customer (ENTITY-001), indirectly, M:N, mediated by Card/Card-Cross-Reference — Account has **no** direct `CUST-ID` field (verified: absent from `CVACT01Y.cpy`)
- Associates: Transaction Category Balance (ENTITY-008) accumulates per `TRANCAT-ACCT-ID` (1 Account : N balance rows, one per type/category combination it has transacted in)

**Usage Context**:
- Programs: COACTVWC (view), COACTUPC (update, with rewrite), COBIL00C (bill payment — reads/decrements `ACCT-CURR-BAL`), COTRN02C (reads account context when adding a transaction)
- Business Functions: Account inquiry/maintenance, bill payment, transaction posting

---

### ENTITY-003: Card

**Entity Type**: Master
**Description**: A physical/virtual credit card issued against an account: card number, embossed name, CVV, expiration, and active status.
**Source**: [FILE:00.phase-1-input/cpy/CVACT02Y.cpy:4-11] (`CARD-RECORD`, RECLEN 150). VSAM file `CARDDAT`, dataset `AWS.M2.CARDDEMO.CARDDATA.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:25-36]; cluster attributes KEYLEN 16 / RECLEN 150 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:202-203]. Alternate index `CARDAIX` (dataset `AWS.M2.CARDDEMO.CARDDATA.VSAM.AIX.PATH`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:13-24]) keyed on `CARD-ACCT-ID` (KEYLEN 11, alternate-key offset 16 = start of `CARD-ACCT-ID`) at [FILE:00.phase-1-input/catlg/LISTCAT.txt:281-283]; used for account-scoped browse in COCRDLIC/COCRDSLC ([FILE:00.phase-1-input/cbl/COCRDSLC.cbl:187-190,743,784]). Read/written by COCRDLIC, COCRDSLC, COCRDUPC, COACTVWC (all `COPY CVACT02Y`).

Note: `CVCRD01Y.cpy` (`CC-WORK-AREAS`) is **not** the persisted card record — it is a COBOL working-storage/AID-handling structure used for PF-key checks and screen routing, not read from or written to `CARDDAT` (verified: `CVCRD01Y` is `COPY`'d for AID/routing fields only, while `CARD-RECORD` I/O uses `CVACT02Y` — see [FILE:00.phase-1-input/cbl/COCRDLIC.cbl:221,290,1148-1149]).

**Business Attributes**:
- Primary Key: `CARD-NUM` (16-digit card number)
- Core Attributes: embossed name, CVV code, expiration date
- Foreign Keys: `CARD-ACCT-ID` → `ACCT-ID` of ENTITY-002 (Account)
- Status Fields: `CARD-ACTIVE-STATUS` (Y/N)

**Data Structure** [FILE:00.phase-1-input/cpy/CVACT02Y.cpy:4-11]:
```
01  CARD-RECORD.
    05  CARD-NUM                          PIC X(16).
    05  CARD-ACCT-ID                      PIC 9(11).
    05  CARD-CVV-CD                       PIC 9(03).
    05  CARD-EMBOSSED-NAME                PIC X(50).
    05  CARD-EXPIRAION-DATE               PIC X(10).
    05  CARD-ACTIVE-STATUS                PIC X(01).
    05  FILLER                            PIC X(59).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| CARD-NUM | X(16) | 16 | 16-digit numeric string stored as text | Card number | PK |
| CARD-ACCT-ID | 9(11) | 11 | Zero-padded numeric string | Owning account | FK |
| CARD-CVV-CD | 9(03) | 3 | 3-digit numeric | Card verification value | — |
| CARD-EMBOSSED-NAME | X(50) | 50 | Space-padded text | Name embossed on the card | — |
| CARD-EXPIRAION-DATE *(sic)* | X(10) | 10 | **`YYYY-MM-DD`** | Expiration date | — |
| CARD-ACTIVE-STATUS | X(01) | 1 | `Y` / `N` | Active flag | — |
| FILLER | X(59) | 59 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/carddata.txt:1]: `CARD-NUM='0500024453765740'`, `CARD-ACCT-ID='00000000050'`, `CARD-EXPIRAION-DATE='2023-03-09'`.

**Relationships**:
- Parent: Account (ENTITY-002), N Cards : 1 Account, via `CARD-ACCT-ID`
- Children: Transaction (ENTITY-005), 1 Card : N Transactions, via `TRAN-CARD-NUM`
- Associates: Customer (ENTITY-001) and Account (ENTITY-002), 1:1 each, only through the Card-Cross-Reference junction (ENTITY-004) — the card record itself has **no** `CUST-ID` field

**Usage Context**:
- Programs: COCRDLIC (list, filtered by account for non-admin users), COCRDSLC (detail view), COCRDUPC (update: expiry, embossed name, status), COACTVWC (indirectly, via cross-reference lookup)
- Business Functions: Card list/search, card view, card update

---

### ENTITY-004: Card-Account-Customer Cross-Reference

**Entity Type**: Relationship (junction)
**Description**: The join record that ties one card to exactly one account and exactly one customer. It is the only place in the data model where Card, Account, and Customer are all connected — neither `CARD-RECORD` nor `ACCOUNT-RECORD` carries a `CUST-ID`.
**Source**: [FILE:00.phase-1-input/cpy/CVACT03Y.cpy:4-8] (`CARD-XREF-RECORD`, RECLEN 50). VSAM file `CCXREF`, dataset `AWS.M2.CARDDEMO.CARDXREF.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:37-49]; cluster attributes KEYLEN 16 / RECLEN 50 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:403-404]. Alternate index `CXACAIX` (dataset `AWS.M2.CARDDEMO.CARDXREF.VSAM.AIX.PATH`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:63-75]) keyed on `XREF-ACCT-ID` (KEYLEN 11, alternate-key offset 25 = start of `XREF-ACCT-ID`) at [FILE:00.phase-1-input/catlg/LISTCAT.txt:482-486]. Read by COACTVWC, COACTUPC, COBIL00C, COTRN02C via account path; read/written by COTRN02C via card-number path when adding a transaction.

**Business Attributes**:
- Primary Key: `XREF-CARD-NUM` (16 chars — matches Card's PK)
- Core Attributes: none beyond the two foreign keys below
- Foreign Keys: `XREF-CUST-ID` → `CUST-ID` of ENTITY-001; `XREF-ACCT-ID` → `ACCT-ID` of ENTITY-002
- Status Fields: none

**Data Structure** [FILE:00.phase-1-input/cpy/CVACT03Y.cpy:4-8]:
```
01 CARD-XREF-RECORD.
    05  XREF-CARD-NUM                     PIC X(16).
    05  XREF-CUST-ID                      PIC 9(09).
    05  XREF-ACCT-ID                      PIC 9(11).
    05  FILLER                            PIC X(14).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| XREF-CARD-NUM | X(16) | 16 | 16-digit numeric string | Card number | PK, FK→Card |
| XREF-CUST-ID | 9(09) | 9 | Zero-padded numeric string | Owning customer | FK→Customer |
| XREF-ACCT-ID | 9(11) | 11 | Zero-padded numeric string | Owning account | FK→Account |
| FILLER | X(14) | 14 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/cardxref.txt:1]: `XREF-CARD-NUM='0500024453765740'`, `XREF-CUST-ID='000000050'`, `XREF-ACCT-ID='00000000050'` (in the 50-row sample data set the mapping happens to be 1 card : 1 account : 1 customer, but the schema and alternate-index design support N cards per account/customer — see ENTITY-002 and ENTITY-003 relationship notes).

**Relationships**:
- Parent: Account (ENTITY-002) and Customer (ENTITY-001) — each xref row references exactly one of each
- Children: none
- Associates: Card (ENTITY-003), 1:1 by primary key `CARD-NUM`/`XREF-CARD-NUM`

**Usage Context**:
- Programs: COACTVWC (resolve `CDEMO-CUST-ID`/`CDEMO-CARD-NUM` for an account, [FILE:00.phase-1-input/cbl/COACTVWC.cbl:723-771]), COBIL00C (resolve the card for an account before writing a payment transaction, [FILE:00.phase-1-input/cbl/COBIL00C.cbl:412-415]), COTRN02C (resolve/validate card ↔ account when adding a transaction, [FILE:00.phase-1-input/cbl/COTRN02C.cbl:580-616])
- Business Functions: Account view/update, bill payment, transaction add — every workflow that must translate between card number, account number, and customer identity

---

### ENTITY-005: Transaction

**Entity Type**: Transactional
**Description**: A single posted charge/payment/return against a card: amount, merchant details, category/type classification, and origination/processing timestamps.
**Source**: [FILE:00.phase-1-input/cpy/CVTRA05Y.cpy:4-18] (`TRAN-RECORD`, RECLEN 350). VSAM file `TRANSACT`, dataset `AWS.M2.CARDDEMO.TRANSACT.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:76-87]; cluster attributes KEYLEN 16 / RECLEN 350 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:3593-3594]. Read by COTRN00C, COTRN01C, CORPT00C (report context); read/written by COTRN02C (add) and COBIL00C (bill-payment posting).
An equivalent daily-extract layout, `DALYTRAN-RECORD`, exists at [FILE:00.phase-1-input/cpy/CVTRA06Y.cpy:4-18] (RECLEN 350, field-for-field identical to `TRAN-RECORD` under a `DALYTRAN-` prefix) and is used for the flat-file `AWS.M2.CARDDEMO.DALYTRAN.PS` dataset (sample data [FILE:00.phase-1-input/data/ASCII/dailytran.txt:1]); it was not found `COPY`'d by any program under `cbl/` — the batch program that would consume it (`CBTRN03C`, referenced in [FILE:00.phase-1-input/proc/TRANREPT.prc:57]) is missing from this repository (see Open Dependencies).

**Business Attributes**:
- Primary Key: `TRAN-ID` (16-char, system-generated — see ID-generation note below)
- Core Attributes: type code, category code, source, description, amount, merchant id/name/city/zip, origination and processing timestamps
- Foreign Keys: `TRAN-CARD-NUM` → `CARD-NUM` of ENTITY-003; `TRAN-TYPE-CD` → `TRAN-TYPE` of ENTITY-006; `TRAN-CAT-CD` (with `TRAN-TYPE-CD`) → `TRAN-CAT-KEY` of ENTITY-007
- Status Fields: none (no explicit status field; presence of `TRAN-PROC-TS` indicates processed vs. pending — in the sample data new transactions carry a populated `TRAN-ORIG-TS` and a blank `TRAN-PROC-TS`)

**Data Structure** [FILE:00.phase-1-input/cpy/CVTRA05Y.cpy:4-18]:
```
01  TRAN-RECORD.
    05  TRAN-ID                                 PIC X(16).
    05  TRAN-TYPE-CD                            PIC X(02).
    05  TRAN-CAT-CD                             PIC 9(04).
    05  TRAN-SOURCE                             PIC X(10).
    05  TRAN-DESC                               PIC X(100).
    05  TRAN-AMT                                PIC S9(09)V99.
    05  TRAN-MERCHANT-ID                        PIC 9(09).
    05  TRAN-MERCHANT-NAME                      PIC X(50).
    05  TRAN-MERCHANT-CITY                      PIC X(50).
    05  TRAN-MERCHANT-ZIP                       PIC X(10).
    05  TRAN-CARD-NUM                           PIC X(16).
    05  TRAN-ORIG-TS                            PIC X(26).
    05  TRAN-PROC-TS                            PIC X(26).
    05  FILLER                                  PIC X(20).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| TRAN-ID | X(16) | 16 | Numeric string, system-generated (see below) | Transaction id | PK |
| TRAN-TYPE-CD | X(02) | 2 | 2-char code | FK to Transaction Type | FK |
| TRAN-CAT-CD | 9(04) | 4 | 4-digit numeric | FK (part) to Transaction Category | FK |
| TRAN-SOURCE | X(10) | 10 | Free text, e.g. `POS TERM` | Origination channel | — |
| TRAN-DESC | X(100) | 100 | Free text | Transaction description | — |
| TRAN-AMT | S9(09)V99 | 11 (zoned decimal, sign in last byte) | Signed decimal, 2dp, range ±9,999,999.99 | Transaction amount | — |
| TRAN-MERCHANT-ID | 9(09) | 9 | Zero-padded numeric string | Merchant id | — |
| TRAN-MERCHANT-NAME | X(50) | 50 | Space-padded text | Merchant name | — |
| TRAN-MERCHANT-CITY | X(50) | 50 | Space-padded text | Merchant city | — |
| TRAN-MERCHANT-ZIP | X(10) | 10 | Alphanumeric | Merchant zip | — |
| TRAN-CARD-NUM | X(16) | 16 | 16-digit numeric string | FK to Card | FK |
| TRAN-ORIG-TS | X(26) | 26 | **`YYYY-MM-DD HH:MM:SS.SSSSSS`** (26 chars, microsecond precision) | Origination timestamp | — |
| TRAN-PROC-TS | X(26) | 26 | `YYYY-MM-DD HH:MM:SS.SSSSSS` or spaces if unprocessed | Processing timestamp | — |
| FILLER | X(20) | 20 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/dailytran.txt:1] (byte-offset parse of the 350-byte fixed record): `TRAN-ID='0000000000683580'`, `TRAN-AMT='0000005047G'` (zoned-decimal overpunch `G` = positive, value 5047.00), `TRAN-ORIG-TS='2022-06-10 19:27:53.000000'` (exactly 26 characters), `TRAN-PROC-TS=` 26 spaces.

**ID generation (observed behavior)**: COTRN02C generates a new `TRAN-ID` by starting a browse from `HIGH-VALUES`, reading backward to obtain the current maximum id, adding 1, and using the result as the key for the new record [FILE:00.phase-1-input/cbl/COTRN02C.cbl:444-459]. This is a business-relevant identifier-assignment rule preserved here for context; the full mechanics (duplicate-key handling, retry) belong to the business-rules catalog, not repeated in full here.

**Relationships**:
- Parent: Card (ENTITY-003), N Transactions : 1 Card, via `TRAN-CARD-NUM`
- Parent: Transaction Type (ENTITY-006), N Transactions : 1 Type, via `TRAN-TYPE-CD`
- Parent: Transaction Category (ENTITY-007), N Transactions : 1 Category, via (`TRAN-TYPE-CD`,`TRAN-CAT-CD`)
- Children: none
- Associates: Account (ENTITY-002), indirectly via Card → Card-Cross-Reference (ENTITY-004); Transaction Category Balance (ENTITY-008), which accumulates transaction amounts by account/type/category (inferred from matching key shape; no program in `cbl/` was found writing `TRAN-CAT-BAL-RECORD` — see Open Dependencies)

**Usage Context**:
- Programs: COTRN00C (paged list/browse), COTRN01C (detail view), COTRN02C (add new transaction, with card/account lookup, confirm, and "copy last transaction" support), COBIL00C (writes a full-balance payment transaction, [FILE:00.phase-1-input/cbl/COBIL00C.cbl:218-234]), CORPT00C/TRANREPT (batch report of transactions by date range)
- Business Functions: Transaction browsing, transaction entry, bill payment, transaction reporting

---

### ENTITY-006: Transaction Type

**Entity Type**: Configuration / Reference master
**Description**: The lookup of valid transaction type codes and their descriptions (e.g., Purchase, Payment), used to classify every transaction.
**Source**: [FILE:00.phase-1-input/cpy/CVTRA03Y.cpy:4-7] (`TRAN-TYPE-RECORD`, RECLEN 60). VSAM file `TRANTYPE`, dataset `AWS.M2.CARDDEMO.TRANTYPE.VSAM.KSDS`; cluster attributes KEYLEN 2 / RECLEN 60 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:3779-3780]. **Not** defined as a CICS `FILE` resource in [FILE:00.phase-1-input/csd/CARDDEMO.CSD] (no `DEFINE FILE(TRANTYPE)` entry found) and not `COPY`'d by any program in `cbl/` — it is populated/consumed only by the batch report chain (`proc/TRANREPT.prc` DD statement [FILE:00.phase-1-input/proc/TRANREPT.prc:67-68] feeding the missing `CBTRN03C` program). Included here because it is a true reference entity the business recognizes (transaction type descriptions appear on the printed report), even though no interactive maintenance screen exists for it in this codebase (gap — see Open Dependencies).

**Business Attributes**:
- Primary Key: `TRAN-TYPE` (2-char code)
- Core Attributes: `TRAN-TYPE-DESC`
- Foreign Keys: none
- Status Fields: none

**Data Structure** [FILE:00.phase-1-input/cpy/CVTRA03Y.cpy:4-7]:
```
01  TRAN-TYPE-RECORD.
    05  TRAN-TYPE                               PIC X(02).
    05  TRAN-TYPE-DESC                          PIC X(50).
    05  FILLER                                  PIC X(08).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| TRAN-TYPE | X(02) | 2 | 2-char code, e.g. `01` | Transaction type code | PK |
| TRAN-TYPE-DESC | X(50) | 50 | Space-padded text, e.g. `Purchase` | Type description | — |
| FILLER | X(08) | 8 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/trantype.txt:1-2]: `'01Purchase...'`, `'02Payment...'`.

**Relationships**:
- Parent: none
- Children: Transaction (ENTITY-005), 1 Type : N Transactions; Transaction Category (ENTITY-007), 1 Type : N Categories (composite key includes `TRAN-TYPE-CD`); Disclosure Group (ENTITY-009), 1 Type : N rate rows

**Usage Context**:
- Programs: none in `cbl/` (batch-only, via TRANREPT)
- Business Functions: Transaction classification, printed on the daily/monthly transaction report [FILE:00.phase-1-input/cpy/CVTRA07Y.cpy:16-31]

---

### ENTITY-007: Transaction Category

**Entity Type**: Configuration / Reference master
**Description**: The lookup of valid transaction category codes (sub-classifications within a transaction type) and their descriptions.
**Source**: [FILE:00.phase-1-input/cpy/CVTRA04Y.cpy:4-9] (`TRAN-CAT-RECORD`, RECLEN 60). VSAM file `TRANCATG`, dataset `AWS.M2.CARDDEMO.TRANCATG.VSAM.KSDS`; cluster attributes KEYLEN 6 / RECLEN 60 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:1475-1476]. Same status as ENTITY-006: not a CICS `FILE` resource, not `COPY`'d in `cbl/`, populated/consumed via `proc/TRANREPT.prc` [FILE:00.phase-1-input/proc/TRANREPT.prc:69-70].

**Business Attributes**:
- Primary Key: `TRAN-CAT-KEY` = (`TRAN-TYPE-CD`, `TRAN-CAT-CD`)
- Core Attributes: `TRAN-CAT-TYPE-DESC`
- Foreign Keys: `TRAN-TYPE-CD` → `TRAN-TYPE` of ENTITY-006
- Status Fields: none

**Data Structure** [FILE:00.phase-1-input/cpy/CVTRA04Y.cpy:4-9]:
```
01  TRAN-CAT-RECORD.
    05  TRAN-CAT-KEY.
        10  TRAN-TYPE-CD                        PIC X(02).
        10  TRAN-CAT-CD                         PIC 9(04).
    05  TRAN-CAT-TYPE-DESC                      PIC X(50).
    05  FILLER                                  PIC X(04).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| TRAN-TYPE-CD | X(02) | 2 | 2-char code | Type portion of key | PK(part), FK→Transaction Type |
| TRAN-CAT-CD | 9(04) | 4 | 4-digit numeric | Category portion of key | PK(part) |
| TRAN-CAT-TYPE-DESC | X(50) | 50 | Space-padded text | Category description | — |
| FILLER | X(04) | 4 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/trancatg.txt:1-2]: `'010001Regular Sales Draft...'`, `'010002Regular Cash Advance...'`.

**Relationships**:
- Parent: Transaction Type (ENTITY-006)
- Children: Transaction (ENTITY-005), 1 Category : N Transactions; Transaction Category Balance (ENTITY-008); Disclosure Group (ENTITY-009)

**Usage Context**:
- Programs: none in `cbl/` (batch-only, via TRANREPT)
- Business Functions: Transaction classification, printed on the daily/monthly transaction report

---

### ENTITY-008: Transaction Category Balance

**Entity Type**: Master (running summary)
**Description**: A running balance of amounts transacted, per account, per transaction type and category — a per-account, per-category accumulator (e.g., "total cash advances this cycle for account X").
**Source**: [FILE:00.phase-1-input/cpy/CVTRA01Y.cpy:4-10] (`TRAN-CAT-BAL-RECORD`, RECLEN 50). VSAM file `TCATBALF`, dataset `AWS.M2.CARDDEMO.TCATBALF.VSAM.KSDS`; cluster attributes KEYLEN 17 / RECLEN 50 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:1371-1372]. Not defined as a CICS `FILE` resource and not `COPY`'d by any program in `cbl/` — populated/maintained by a batch process outside this repository's scope (gap).

**Business Attributes**:
- Primary Key: `TRAN-CAT-KEY` = (`TRANCAT-ACCT-ID`, `TRANCAT-TYPE-CD`, `TRANCAT-CD`)
- Core Attributes: `TRAN-CAT-BAL`
- Foreign Keys: `TRANCAT-ACCT-ID` → `ACCT-ID` of ENTITY-002; (`TRANCAT-TYPE-CD`,`TRANCAT-CD`) → `TRAN-CAT-KEY` of ENTITY-007
- Status Fields: none

**Data Structure** [FILE:00.phase-1-input/cpy/CVTRA01Y.cpy:4-10]:
```
01  TRAN-CAT-BAL-RECORD.
    05  TRAN-CAT-KEY.
        10 TRANCAT-ACCT-ID                      PIC 9(11).
        10 TRANCAT-TYPE-CD                       PIC X(02).
        10 TRANCAT-CD                            PIC 9(04).
    05  TRAN-CAT-BAL                            PIC S9(09)V99.
    05  FILLER                                  PIC X(22).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| TRANCAT-ACCT-ID | 9(11) | 11 | Zero-padded numeric string | Owning account | PK(part), FK→Account |
| TRANCAT-TYPE-CD | X(02) | 2 | 2-char code | Type portion of key | PK(part), FK→Transaction Type |
| TRANCAT-CD | 9(04) | 4 | 4-digit numeric | Category portion of key | PK(part), FK(part)→Transaction Category |
| TRAN-CAT-BAL | S9(09)V99 | 11 (zoned decimal) | Signed decimal, 2dp | Running balance for this account/type/category | — |
| FILLER | X(22) | 22 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/tcatbal.txt:1]: `TRANCAT-ACCT-ID='00000000001'`, `TRANCAT-TYPE-CD='01'`, `TRANCAT-CD='0001'`, `TRAN-CAT-BAL='0000000000{'` (zero, positive overpunch).

**Relationships**:
- Parent: Account (ENTITY-002), Transaction Category (ENTITY-007)
- Children: none
- Associates: Transaction (ENTITY-005) — this table is the natural aggregation target for transaction amounts by account/type/category, though no program in `cbl/` was found performing the aggregation (open dependency)

**Usage Context**:
- Programs: none in `cbl/` (batch-only)
- Business Functions: Per-category running balances, presumably feeding interest/statement calculations together with ENTITY-009

---

### ENTITY-009: Disclosure Group (Interest Rate Table)

**Entity Type**: Configuration / Reference master
**Description**: The interest-rate table: for a given account discount/rate group and transaction type/category, the applicable interest rate.
**Source**: [FILE:00.phase-1-input/cpy/CVTRA02Y.cpy:4-10] (`DIS-GROUP-RECORD`, RECLEN 50). VSAM file `DISCGRP`, dataset `AWS.M2.CARDDEMO.DISCGRP.VSAM.KSDS`; cluster attributes KEYLEN 16 / RECLEN 50 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:896-897]. Not defined as a CICS `FILE` resource and not `COPY`'d by any program in `cbl/` (gap — no maintenance or interest-calculation program found in this repository).

**Business Attributes**:
- Primary Key: `DIS-GROUP-KEY` = (`DIS-ACCT-GROUP-ID`, `DIS-TRAN-TYPE-CD`, `DIS-TRAN-CAT-CD`)
- Core Attributes: `DIS-INT-RATE`
- Foreign Keys: `DIS-ACCT-GROUP-ID` ← referenced by `ACCT-GROUP-ID` on ENTITY-002 (Account); (`DIS-TRAN-TYPE-CD`,`DIS-TRAN-CAT-CD`) → `TRAN-CAT-KEY` of ENTITY-007
- Status Fields: none

**Data Structure** [FILE:00.phase-1-input/cpy/CVTRA02Y.cpy:4-10]:
```
01  DIS-GROUP-RECORD.
    05  DIS-GROUP-KEY.
        10 DIS-ACCT-GROUP-ID                    PIC X(10).
        10 DIS-TRAN-TYPE-CD                     PIC X(02).
        10 DIS-TRAN-CAT-CD                      PIC 9(04).
    05  DIS-INT-RATE                            PIC S9(04)V99.
    05  FILLER                                  PIC X(28).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| DIS-ACCT-GROUP-ID | X(10) | 10 | Alphanumeric code | Rate/discount group | PK(part), referenced by Account.ACCT-GROUP-ID |
| DIS-TRAN-TYPE-CD | X(02) | 2 | 2-char code | Type portion of key | PK(part), FK→Transaction Type |
| DIS-TRAN-CAT-CD | 9(04) | 4 | 4-digit numeric | Category portion of key | PK(part), FK(part)→Transaction Category |
| DIS-INT-RATE | S9(04)V99 | 6 (zoned decimal) | Signed decimal, 2dp (percentage) | Interest rate for this group/type/category | — |
| FILLER | X(28) | 28 | — | Reserved/unused | — |

**Persisted string formats verified against sample data** [FILE:00.phase-1-input/data/ASCII/discgrp.txt:1]: `DIS-ACCT-GROUP-ID='A000000000'`, `DIS-TRAN-TYPE-CD='01'`, `DIS-TRAN-CAT-CD='0001'`, `DIS-INT-RATE='00150{'` (value 1.50, positive).

**Relationships**:
- Parent: Transaction Type (ENTITY-006), Transaction Category (ENTITY-007)
- Children: Account (ENTITY-002), N Accounts : 1 rate group (loosely — group id is a plain string match, not an enforced VSAM alternate-key relationship)

**Usage Context**:
- Programs: none in `cbl/` (batch-only / not yet wired to an interactive program)
- Business Functions: Interest computation by account rate group and transaction type/category (inferred from field names; no calculation program found — open dependency)

---

### ENTITY-010: User (Security Profile)

**Entity Type**: Master
**Description**: A system login account with a role (Admin or Regular user) that gates access to the admin-only user-management screens versus the regular account/card/transaction screens.
**Source**: [FILE:00.phase-1-input/cpy/CSUSR01Y.cpy:17-23] (`SEC-USER-DATA`, RECLEN 80). VSAM file `USRSEC`, dataset `AWS.M2.CARDDEMO.USRSEC.VSAM.KSDS`, defined [FILE:00.phase-1-input/csd/CARDDEMO.CSD:88-99]; cluster attributes KEYLEN 8 / RECLEN 80 at [FILE:00.phase-1-input/catlg/LISTCAT.txt:3883-3884]. Read by COSGN00C (authentication) and COMEN01C/COADM01C (menu routing context); read/written by COUSR00C (list), COUSR01C (add), COUSR02C (update), COUSR03C (delete).

**Business Attributes**:
- Primary Key: `SEC-USR-ID` (8-char user id)
- Core Attributes: first name, last name
- Foreign Keys: none
- Status Fields: `SEC-USR-TYPE` (`A`=Admin / `U`=Regular user — role, drives menu routing per [FILE:00.phase-1-input/cpy/COCOM01Y.cpy:26-28])

**Data Structure** [FILE:00.phase-1-input/cpy/CSUSR01Y.cpy:17-23]:
```
01 SEC-USER-DATA.
   05 SEC-USR-ID                 PIC X(08).
   05 SEC-USR-FNAME              PIC X(20).
   05 SEC-USR-LNAME              PIC X(20).
   05 SEC-USR-PWD                PIC X(08).
   05 SEC-USR-TYPE               PIC X(01).
   05 SEC-USR-FILLER             PIC X(23).
```

| Field | PIC Clause | Bytes | Data Type / Persisted Format | Description | Key |
|---|---|---|---|---|---|
| SEC-USR-ID | X(08) | 8 | Alphanumeric, space-padded | User id / login | PK |
| SEC-USR-FNAME | X(20) | 20 | Space-padded text | First name | — |
| SEC-USR-LNAME | X(20) | 20 | Space-padded text | Last name | — |
| SEC-USR-PWD | X(08) | 8 | Plain alphanumeric (stored in clear text — no hashing observed) | Password | — |
| SEC-USR-TYPE | X(01) | 1 | `A` (Admin) / `U` (Regular user) | Role | — |
| SEC-USR-FILLER | X(23) | 23 | — | Reserved/unused | — |

**Relationships**:
- Parent: none
- Children: none — a `User` is a login/session identity; it is **not** linked to Customer/Account/Card by any foreign key. `CSUSR01Y` is additionally `COPY`'d into COACTUPC/COACTVWC/COCRDLIC/COCRDSLC/COCRDUPC, but its `SEC-USR-*` fields are not referenced in those programs' PROCEDURE DIVISIONs (verified by `grep -n "SEC-USR" *.cbl` returning no hits outside COSGN00C/COMEN01C/COADM01C/COUSR0*C) — those `COPY` statements pull in the layout without using it, i.e. a dead copy in those programs.

**Usage Context**:
- Programs: COSGN00C (sign-on, credential check against `USRSEC`), COADM01C (admin-menu dispatch), COMEN01C (regular-menu dispatch), COUSR00C–COUSR03C (list/add/update/delete — admin only)
- Business Functions: Authentication, role-based menu routing (Admin vs. Regular user), user administration

---

### ENTITY-011: Geographic & Phone Reference Codes (Validation Master Data)

**Entity Type**: Configuration
**Description**: Compiled-in reference data used to validate a customer's address and phone number: the list of valid North-American phone area codes, the list of valid US state codes, and the valid state+first-2-digits-of-zip combinations.
**Source**: [FILE:00.phase-1-input/cpy/CSLKPCDY.cpy:24-1011] (phone area codes: `WS-US-PHONE-AREA-CODE-TO-EDIT`, condition-names `VALID-PHONE-AREA-CODE` / `VALID-GENERAL-PURP-CODE` / `VALID-EASY-RECOG-AREA-CODE`); [FILE:00.phase-1-input/cpy/CSLKPCDY.cpy:1012-1070] (`US-STATE-CODE-TO-EDIT` / `VALID-US-STATE-CODE`, all 50 states + DC/territories); [FILE:00.phase-1-input/cpy/CSLKPCDY.cpy:1071-1314] (`US-STATE-ZIPCODE-TO-EDIT` / `VALID-US-STATE-ZIP-CD2-COMBO`, state + first-2-of-zip combinations). `COPY`'d into COACTUPC [FILE:00.phase-1-input/cbl/COACTUPC.cbl:602] and used for cross-field validation: `IF VALID-US-STATE-CODE` [FILE:00.phase-1-input/cbl/COACTUPC.cbl:2495] and `IF VALID-US-STATE-ZIP-CD2-COMBO` [FILE:00.phase-1-input/cbl/COACTUPC.cbl:2542].

**Note on why this is included despite being compiled-in constants rather than a VSAM file**: per the skill's guidance to capture "business parameter or rate-structure configuration tables," this data set is recognized and cared about by the business (valid area codes, valid states, valid state/zip pairs are business reference data, not incidental programming detail), even though it is implemented as inline `88`-level `VALUE` lists rather than a keyed file. It has no independent record structure/primary key of its own — it is a set of value-domains, not a row-oriented entity — so no attribute table or ER-diagram node is given the same treatment as ENTITY-001..010; it is listed here for completeness and traceability, and used as the validation source for `CUST-ADDR-STATE-CD`, `CUST-ADDR-ZIP`, `CUST-PHONE-NUM-1/2` on ENTITY-001.

**Usage Context**:
- Programs: COACTUPC (account/customer address and phone edits)
- Business Functions: Customer address/phone validation during account update

---

## Mermaid ER Diagram

```mermaid
erDiagram
    CUSTOMER {
        string CUST_ID PK
        string CUST_FIRST_NAME
        string CUST_LAST_NAME
        string CUST_SSN
        string CUST_DOB
        string CUST_PHONE_NUM_1
        int CUST_FICO_CREDIT_SCORE
    }
    ACCOUNT {
        string ACCT_ID PK
        string ACCT_ACTIVE_STATUS
        decimal ACCT_CURR_BAL
        decimal ACCT_CREDIT_LIMIT
        string ACCT_GROUP_ID FK
    }
    CARD {
        string CARD_NUM PK
        string CARD_ACCT_ID FK
        string CARD_EMBOSSED_NAME
        string CARD_EXPIRAION_DATE
        string CARD_ACTIVE_STATUS
    }
    CARD_XREF {
        string XREF_CARD_NUM PK
        string XREF_CUST_ID FK
        string XREF_ACCT_ID FK
    }
    TRANSACTION {
        string TRAN_ID PK
        string TRAN_CARD_NUM FK
        string TRAN_TYPE_CD FK
        string TRAN_CAT_CD FK
        decimal TRAN_AMT
        string TRAN_ORIG_TS
        string TRAN_PROC_TS
    }
    TRAN_TYPE {
        string TRAN_TYPE PK
        string TRAN_TYPE_DESC
    }
    TRAN_CATEGORY {
        string TRAN_TYPE_CD PK_FK
        string TRAN_CAT_CD PK
        string TRAN_CAT_TYPE_DESC
    }
    TRAN_CAT_BALANCE {
        string TRANCAT_ACCT_ID PK_FK
        string TRANCAT_TYPE_CD PK_FK
        string TRANCAT_CD PK_FK
        decimal TRAN_CAT_BAL
    }
    DISCLOSURE_GROUP {
        string DIS_ACCT_GROUP_ID PK
        string DIS_TRAN_TYPE_CD PK_FK
        string DIS_TRAN_CAT_CD PK_FK
        decimal DIS_INT_RATE
    }
    USER {
        string SEC_USR_ID PK
        string SEC_USR_TYPE
    }

    ACCOUNT ||--o{ CARD : owns
    CUSTOMER ||--o{ CARD_XREF : identified_by
    ACCOUNT ||--o{ CARD_XREF : identified_by
    CARD ||--|| CARD_XREF : cross_referenced_by
    CARD ||--o{ TRANSACTION : originates
    TRAN_TYPE ||--o{ TRANSACTION : classifies
    TRAN_TYPE ||--o{ TRAN_CATEGORY : groups
    TRAN_CATEGORY ||--o{ TRANSACTION : classifies
    ACCOUNT ||--o{ TRAN_CAT_BALANCE : accumulates
    TRAN_CATEGORY ||--o{ TRAN_CAT_BALANCE : categorizes
    TRAN_TYPE ||--o{ DISCLOSURE_GROUP : rates
    TRAN_CATEGORY ||--o{ DISCLOSURE_GROUP : rates
    DISCLOSURE_GROUP }o--|| ACCOUNT : rate_group_for
```

Cardinality notes (all derived from the field/key evidence cited in each entity block, not assumed):
- `ACCOUNT ||--o{ CARD`: one account can have zero-to-many cards (`COCRDLIC` comment confirms per-account card lists can contain more than one card)
- `CUSTOMER ||--o{ CARD_XREF` and `ACCOUNT ||--o{ CARD_XREF`: Account and Customer are related to each other only through this junction, making Account↔Customer effectively many-to-many
- `CARD ||--|| CARD_XREF`: exactly one xref row per card (shared primary key `CARD-NUM`/`XREF-CARD-NUM`)
- `CARD ||--o{ TRANSACTION`: one card can have zero-to-many posted transactions
- `DISCLOSURE_GROUP }o--|| ACCOUNT`: many accounts can share one rate group id (string match on `ACCT-GROUP-ID`, not an enforced VSAM key relationship)

---

## Excluded Technical Structures

Per the skill's exclusion criteria, the following were examined and deliberately left out of the catalog because they are technical scaffolding, not business entities a user would recognize:

- `COCOM01Y.cpy` (`CARDDEMO-COMMAREA`) — inter-program routing/session context (from/to transaction id, from/to program, PF-key context flag); it *carries copies* of business identifiers (cust id, account id, card num) for the duration of a pseudo-conversational exchange, but it is not itself a persisted business record.
- `CVCRD01Y.cpy` (`CC-WORK-AREAS`) — AID/PF-key handling and screen-routing work area; not the `CARDDAT` record (see ENTITY-003 note).
- `COADM02Y.cpy`, `COMEN02Y.cpy` — menu option lists (BMS display/navigation data).
- `COTTL01Y.cpy`, `CSDAT01Y.cpy`, `CSMSG01Y.cpy`, `CSMSG02Y.cpy`, `CSSTRPFY.cpy`, `CSUTLDPY.cpy`, `CSUTLDWY.cpy` — title/header, date-formatting, message, and PF-key utility structures.
- `CVTRA07Y.cpy` — print/report formatting layouts (`REPORT-NAME-HEADER`, `TRANSACTION-DETAIL-REPORT`, headers, page/account/grand totals) — presentation formatting of Transaction data, not a distinct entity.
- `UNUSED1Y.cpy` — explicitly named/unused placeholder copybook.
- BMS symbolic maps (`cpy-bms/`) — screen field layouts, covered by the screen-flow extraction, not business data.

---

## Open Dependencies / Gaps

1. **CBTRN03C is missing.** [FILE:00.phase-1-input/proc/TRANREPT.prc:57] invokes `CBTRN03C`, the batch program that would read `TRANTYPE`/`TRANCATG` (ENTITY-006/007) and the daily transaction extract (`DALYTRAN-RECORD`, part of ENTITY-005) — it is not present under `00.phase-1-input/cbl/`. Consequently, exactly how/whether `TCATBALF` (ENTITY-008) and `DISCGRP` (ENTITY-009) are populated or read cannot be confirmed from source in this repository; their business role (interest/category accumulation) is inferred from field-name/key-shape evidence only, not from a program that reads or writes them.
2. **`CUSTREC.cpy` is a duplicate, unused copybook** of `CVCUS01Y.cpy` (Customer). Not `COPY`'d anywhere; flagged rather than silently dropped in case a future program is intended to use it.
3. **`CSUSR01Y` (User) is `COPY`'d but not referenced** in COACTUPC, COACTVWC, COCRDLIC, COCRDSLC, COCRDUPC — no audit/last-changed-by linkage from Account/Card to User was found in source, despite the copy statement suggesting one might have been intended.
4. **TRANSACT alternate index target field is unconfirmed.** [FILE:00.phase-1-input/catlg/LISTCAT.txt:3674-3676] shows an AIX path association for `TRANSACT` with KEYLEN 26 (matching the 26-byte length of `TRAN-ORIG-TS`/`TRAN-PROC-TS`) but no corresponding `DEFINE FILE` CICS resource for it exists in `CARDDEMO.CSD`, and no program in `cbl/` opens it by any ddname. Left unmodeled rather than guessed.
5. **`ACCT-GROUP-ID` ↔ `DIS-ACCT-GROUP-ID` is a naming/shape match, not a verified enforced relationship** — no program was found that joins `ACCOUNT-RECORD` to `DIS-GROUP-RECORD`; the FK is asserted from identical field definition (`PIC X(10)`, same business meaning by name) only.
6. **Reference/master tables `TRANTYPE`, `TRANCATG`, `TCATBALF`, `DISCGRP` have no online (CICS) maintenance program** in this repository — they are populated by a process outside the current scope. Confirmed by the absence of any `DEFINE FILE` entry for them in `CARDDEMO.CSD` and absence of any `COPY` of their layouts in `cbl/`.
7. **`CSLKPCDY` (ENTITY-011) is validation-domain data, not a row-oriented entity** — included per the skill's "don't drop configuration/reference tables" guidance, but modeled differently (no PK/attribute table, no ER-diagram node) because it has no record structure of its own.
