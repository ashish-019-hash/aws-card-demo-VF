# Data Model

[← Overview](README.md) | [Component Inventory](component-inventory.md) | Full detail: [business-entities.md](../business-entities.md)

Eleven business entities were catalogued (ENTITY-001…011). All persistent data lives in VSAM
KSDS files (plus batch sequential/GDG feeds); there is no relational database, so every
"relationship" below is a key convention enforced by program logic, not by the data store
([business-entities.md](../business-entities.md); [Architecture](architecture.md)).

## Entity catalog

| ID | Entity | Record / Copybook | Primary key | File(s) | Online use |
|---|---|---|---|---|---|
| ENTITY-001 | Customer | `CUSTOMER-RECORD` / CVCUS01Y | CUST-ID (9) | CUSTDAT | [Account Servicing](modules/account-servicing.md) read/update |
| ENTITY-002 | Account | `ACCOUNT-RECORD` / CVACT01Y | ACCT-ID (11) | ACCTDAT | Account Servicing, [Bill Payment](modules/bill-payment.md) |
| ENTITY-003 | Credit Card | `CARD-RECORD` / CVACT02Y | CARD-NUM (16) | CARDDAT (+ CARDAIX by account) | [Card Servicing](modules/card-servicing.md) |
| ENTITY-004 | Card Cross-Reference | `CARD-XREF-RECORD` / CVACT03Y | CARD-NUM | CCXREF (+ CXACAIX by account) | key resolution everywhere |
| ENTITY-005 | Transaction | `TRAN-RECORD` / CVTRA05Y | TRAN-ID (16) | TRANSACT | [Transactions](modules/transactions.md), Bill Payment, [Reporting](modules/reporting.md) |
| ENTITY-006 | Daily Transaction | CVTRA06Y | TRAN-ID | DALYTRAN.PS (+ reject GDG DALYREJS) | **batch-only** |
| ENTITY-007 | Transaction Category Balance | CVTRA01Y | ACCT-ID + type + category (composite) | TCATBALF | **batch-only** |
| ENTITY-008 | Disclosure Group | CVTRA02Y | group + type + category | DISCGRP | **batch-only** (interest rates) |
| ENTITY-009 | Transaction Type | CVTRA03Y | type code (2) | TRANTYPE | batch report reference |
| ENTITY-010 | Transaction Category | CVTRA04Y | type + category (4) | TRANCATG | batch report reference |
| ENTITY-011 | Application User | `SEC-USER-DATA` / CSUSR01Y | SEC-USR-ID (8) | USRSEC | [Sign-on](modules/sign-on.md), [User Administration](modules/user-administration.md) |

Attribute-level layouts (field names, PIC-derived types, business meaning) are in
[business-entities.md](../business-entities.md) and are not duplicated here.

## Relationships

From the [business-entities.md](../business-entities.md) relationship catalog:

- **Customer ↔ Account exists ONLY through the Card Cross-Reference (ENTITY-004).** There is
  no customer ID on the account record and no account list on the customer record. Online
  programs resolve an account's customer by reading the **first** xref row for the account via
  CXACAIX — effectively assuming one primary cardholder per account.
- **Account 1—N Credit Card**: CARD-ACCT-ID on the card record; CARDAIX serves "cards by
  account" browses.
- **Card 1—N Transaction**: TRAN-CARD-NUM on the transaction record.
- **Account — Disclosure Group**: ACCT-GROUP-ID names the pricing/interest group (batch-only
  usage in tree).
- **Transaction Type 1—N Transaction Category**: category key embeds the type code; both are
  reference data read by the batch report program.
- **Daily Transaction → Transaction / Category Balance**: batch feed relationships implied by
  the dataset definitions; the posting programs themselves are absent from the repository.

A visual entity-relationship diagram is in the source artifact
([business-entities.md](../business-entities.md), Mermaid section).

## File access by screen

The authoritative screen × file matrix (reader/writer per file: USRSEC, ACCTDAT, CUSTDAT,
CARDDAT, CCXREF/CXACAIX, TRANSACT, TDQ JOBS) is at the end of
[screen-flow.md](../screen-flow.md) ("Data sources by screen"). Per-module summaries appear on
each [module page](README.md#functional-modules-one-page-each).

## Data caveats for migration

- Duplicate customer layouts exist (CUSTREC.cpy vs CVCUS01Y.cpy; only the DOB field name
  differs) — pick one canonical schema.
- `CARD-EXPIRAION-DATE` field-name typo is in the production copybook; preserved verbatim in
  Phase 1 artifacts.
- No TRANSACT seed data ships with the repository; USRSEC seed data exists only as EBCDIC
  (10 users, including ADMIN001/PASSWORD/A).

Full list: [Modernization Notes](modernization-notes.md).
