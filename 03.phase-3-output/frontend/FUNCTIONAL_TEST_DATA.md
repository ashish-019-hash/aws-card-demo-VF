# Functional Test Data Pack

Use this pack with [FUNCTIONAL_TEST_SCRIPTS.md](FUNCTIONAL_TEST_SCRIPTS.md). Values are deliberately fictional. Reset the environment before execution and replace identifiers only where the environment's seeded data differs.

## Baseline records

| Key | Value / required state | Used by |
|---|---|---|
| Standard user | `STDUSER` / `PASS1234`, type `USER` | FT-FE-001–012, 017 |
| Admin user | `ADMIN01` / `ADMIN123`, type `ADMINISTRATOR` | FT-FE-001, 003, 013–016 |
| Positive payment account | `11111111111`, current balance `+125.50`, linked card `4111111111111111` | Account/card/transaction/payment tests |
| Zero payment account | `22222222222`, current balance `0.00`, linked card `4222222222222222` | FT-FE-012 |
| Negative payment account | `33333333333`, current balance `-1.00`, linked card `4333333333333333` | FT-FE-012 |
| Known transaction | `9000000000000001` | FT-FE-010 |
| Disposable create/update user | `FTUSR01`, `FTUSR02` | FT-FE-014–015 |
| Disposable delete user | `FTDEL01` | FT-FE-016 |

Provide more than ten cards, transactions, and users to exercise page boundaries. Provide report transactions with processing dates before, on, within, and after `2024-02-01`–`2024-02-29`, on multiple unsorted card numbers.

## Valid reusable input

### DATA-ACCT-VALID

| Field group | Valid value |
|---|---|
| Account active status | `Y` |
| Money fields | `+1000.00`, `+500.00`, `+125.50`, `+10.00`, `-5.00` |
| Account lifecycle dates | `2024-01-31`, `2028-02-29`, `2024-02-29` |
| Customer name | first `ALICE`, middle blank or `BETH`, last `SMITH` |
| Customer address | `1 TEST STREET`, line 2 blank, `AUSTIN`, `TX`, `USA`, ZIP `78701` |
| Phones | blank, or `(512)555-0100` using a recognized general-purpose area code |
| SSN components | `123` / `45` / `6789` |
| Date of birth | `1990-02-28` |
| EFT account ID | `1234567890` |
| Primary holder | `Y` |
| FICO | `300`, `850`, or nominal `720` |

### DATA-TRAN-VALID

| Field | Value |
|---|---|
| Account ID | `11111111111` (or use Card number only: `4111111111111111`) |
| Type code | `01` |
| Category code | `0001` |
| Source | `ONLINE` |
| Description | `FT-VALID PURCHASE` |
| Amount | `+00000125.50` |
| Origin / processing date | `2024-02-29` |
| Merchant ID | `123456789` |
| Merchant name | `FT MERCHANT` |
| Merchant city | `AUSTIN` |
| Merchant ZIP | `78701` |
| Confirmation | `Y` |

### DATA-USER-VALID

| Field | Value |
|---|---|
| User ID | `FTUSR01` (maximum implementation length must remain compatible with ENTITY-010 `PIC X(08)`) |
| First name | `FUNCTIONAL` |
| Last name | `TESTER` |
| Password | `TEST1234` |
| User type | `U` |

## Account/customer vectors

Each negative vector is applied after making a separate otherwise-valid change, so the maintenance workflow executes validation. The paired boundary/positive vector is tested in a new attempt.

| Rule | Field(s) | Negative / boundary-rejected vector | Positive / boundary-accepted vector | Expected evidence |
|---|---|---|---|---|
| RULE-VAL-003 | Active status | blank, `X` | `Y`, `N` | Required; only Y/N accepted. |
| RULE-VAL-004 | Each signed money field | blank, `ABC`, `+1.234` | `+0.00`, `-9999999999.99`, `+9999999999.99` when field capacity permits | Signed decimal, max two fractional positions. |
| RULE-VAL-005 / 039 | Open/expiry/reissue/DOB | blank date, `2023-02-29`, `2024-04-31`, `2024-13-01`, DOB today, DOB future | `1900-01-01`, `2024-02-29`; DOB `1990-02-28` | Valid CCYYMMDD/calendar semantics; DOB strictly earlier than today. |
| RULE-VAL-006 | FICO | blank, `0`, `299`, `851`, `ABC` | `300`, `850` | Numeric inclusive range. |
| RULE-VAL-007 | First/middle/last name | first/last blank; `AL1CE`; middle `B3TH` | first/last letters/spaces; middle blank or letters/spaces | First/last required alpha; middle optional alpha. |
| RULE-VAL-008 | Address/city/state/country/ZIP/EFT | blank line 1; blank/`A1` city/state/country; ZIP first 5 blank/non-numeric/`00000`; EFT blank/non-numeric/zero | line 2 blank; `AUSTIN`, `TX`, `USA`, `78701`, `1234567890` | Required domains; line 2 optional. |
| RULE-VAL-009 | State | `ZZ` after passing alpha check | `TX` | Valid US state domain. |
| RULE-VAL-010 | State + ZIP first 2 | `TX` + an incompatible prefix from the domain fixture | `TX` + `78` | Valid state/ZIP-prefix combination. |
| RULE-VAL-011 | Each optional phone | partial `(512)555-`; zero component; alphabetic component; unrecognized area code | entirely blank; `(512)555-0100` | Blank valid; otherwise 3/3/4 non-zero numeric components and recognized area code. |
| RULE-VAL-012 | SSN 3-2-4 components | blank/non-numeric/zero component; first `000`, `666`, `900`, `999` | `123` / `45` / `6789` | Components required numeric/non-zero; forbidden prefixes rejected. |
| RULE-VAL-013 | Primary holder | blank, `X` | `Y`, `N` | Required Y/N. |

## Card vectors

| Rule | Field(s) | Reject | Accept |
|---|---|---|---|
| RULE-VAL-014 | Supplied account ID | `ABC`; account-view `0`; card-update blank | Card-list/search blank or zero as omitted filter; numeric non-zero valid account. |
| RULE-VAL-015 | Card number | `ABC`, 15 digits; card-update blank/zero | Card-list/search blank/zero as omitted filter; 16 numeric digits. |
| RULE-VAL-016 | Card-list row actions | two `S`/`U` actions; `X` action | one blank or one `S`/`U` action. |
| RULE-VAL-017 | Embossed name | blank, `JANE2`, `JANE-DOE` | `JANE DOE` |
| RULE-VAL-018 | Card status | blank, `X` | `Y`, `N` |
| RULE-VAL-019 | Expiry month | blank, `00`, `13` | `01`, `12` |
| RULE-VAL-020 | Expiry year | blank, `1949`, `2100` | `1950`, `2099` |

## Transaction/add/list vectors

| Rule | Field(s) | Reject | Accept |
|---|---|---|---|
| RULE-VAL-027 | List filter/selection | `ID-A`; action `X` with selected row | blank filter; numeric filter; `S`/`s` selected row |
| RULE-VAL-028 | Detail transaction ID | blank | Known ID `9000000000000001` |
| RULE-VAL-029 | Add confirmation | blank, `N`, `X` | `Y`, `y` (only these add) |
| RULE-VAL-030 | Account/card ID | both blank; `ABC` account; `CARD` card | numeric account only or numeric 16-digit card only |
| RULE-VAL-031 | Required add fields | blank each of type, category, source, desc, amount, origin/process date, merchant ID/name/city/ZIP | DATA-TRAN-VALID values |
| RULE-VAL-032 | Type/category | `A1`, `12A` | `01`, `0001` |
| RULE-VAL-033 | Amount | `125.50`, `+123456789.00`, `+12.5`, `+12.500`, `+12345678X.00` | `+00000000.00`, `-99999999.99`, `+00000125.50` |
| RULE-VAL-034 | Origin/process date | `2024/02/29`, `2024-02-30`, `2023-02-29`, `2024-13-01` | `2024-02-29` |
| RULE-VAL-035 | Merchant ID | `MID1` | `123456789` |
| RULE-VAL-036 | New transaction ID | fault-injected duplicate-key response | next unique ID after highest existing; verify non-duplicate persisted key |

## Reporting vectors

| Rule | Input | Reject | Accept / expected |
|---|---|---|---|
| RULE-DECISION-003 | Monthly | N/A | controlled current month start `YYYY-MM-01` and actual last day, including December `YYYY-12-31` |
| RULE-DECISION-004 | Yearly | N/A | controlled current year `YYYY-01-01` through `YYYY-12-31` |
| RULE-VAL-037 | Custom start/end | any missing component; alpha component; month `13`; day `32`; `2023-02-29` (screen-flow calendar check) | numeric month/day/year ≤ 12/31 and valid date; do not require chronological order because catalog does not define it |
| RULE-VAL-038 | Report confirmation | blank, `N`, `X` | `Y`/`y` queues/submits exactly one request |

## Fault-injection matrix

| Test | Controlled fault | Required result |
|---|---|---|
| FT-FE-001 | Sign-on verification failure | Unable-to-verify outcome; no session. |
| FT-FE-004 | Missing account/assignment/account/customer data | Lookup error; no stale/unrelated record. |
| FT-FE-005 | Customer rewrite fails after account rewrite | Account rollback; no partial update. |
| FT-FE-011 / 012 | Duplicate transaction write | Duplicate rejected; no duplicate transaction. |
| FT-FE-014 | User create failure | Error/no success; input correctable. |
| FT-FE-016 | User delete failure | Error/no deletion success claim. |
| FT-FE-017 | JOBS queue write failure | `Unable to Write TDQ (JOBS)...`; no submission success. |
