# Business Rules & Validation Index

[← Overview](README.md) | Sources: [business-rules-catalog.md](../business-rules-catalog.md) · [validation-rules.md](../validation-rules.md)

Phase 1 deliberately separates **business rules** (7 rules — policy: calculations, thresholds,
decisions) from **validation rules** (81 rules — data correctness at the input boundary). This
page is the index; the source catalogs hold the full statements, source references, and
dependency notes.

## Business rules (7)

| Rule | Policy | Program | Module page |
|---|---|---|---|
| RULE-CALC-001 | Bill payment always settles the full current balance, posted with a fixed transaction profile | COBIL00C | [Bill Payment](modules/bill-payment.md) |
| RULE-THRESHOLD-001 | Payment allowed only when a positive balance is owed | COBIL00C | [Bill Payment](modules/bill-payment.md) |
| RULE-DECISION-001 | Explicit Y/N confirmation before money moves | COBIL00C | [Bill Payment](modules/bill-payment.md) |
| RULE-DECISION-002 | User role (`A`/`U`) determines the application entry point | COSGN00C | [Sign-on](modules/sign-on.md) |
| RULE-DECISION-003 | Admin-only menu options denied to regular users (data-driven per-option flags) | COMEN01C | [Menus](modules/menus.md) |
| RULE-CALC-002 | Report period determination — Monthly / Yearly / Custom calendar ranges | CORPT00C | [Reporting](modules/reporting.md) |
| RULE-DECISION-004 | Report selects by **processing date**, ordered by card number | TRANREPT.prc | [Reporting](modules/reporting.md) |

The catalog's coverage table confirms the remaining 11 online programs contain **no business
rules** — only navigation, display, CRUD, and validation
([business-rules-catalog.md](../business-rules-catalog.md)).

## Validation rules by module (81)

| Section in [validation-rules.md](../validation-rules.md) | Rules | Program | Module page |
|---|---|---|---|
| §1 Sign-on | VAL-001–004 | COSGN00C | [Sign-on](modules/sign-on.md) |
| §2 Menus | VAL-005–007 | COMEN01C / COADM01C | [Menus](modules/menus.md) |
| §3 Account View | VAL-008–010 | COACTVWC | [Account Servicing](modules/account-servicing.md) |
| §4 Account Update | VAL-011–034 | COACTUPC | [Account Servicing](modules/account-servicing.md) |
| §5 Card List | VAL-035–038 | COCRDLIC | [Card Servicing](modules/card-servicing.md) |
| §6 Card View | VAL-039–041 | COCRDSLC | [Card Servicing](modules/card-servicing.md) |
| §7 Card Update | VAL-042–049 | COCRDUPC | [Card Servicing](modules/card-servicing.md) |
| §8 Transaction List | VAL-050–051 | COTRN00C | [Transactions](modules/transactions.md) |
| §9 Transaction View | VAL-052–053 | COTRN01C | [Transactions](modules/transactions.md) |
| §10 Transaction Add | VAL-054–063 | COTRN02C | [Transactions](modules/transactions.md) |
| §11 Bill Payment | VAL-064–068 | COBIL00C | [Bill Payment](modules/bill-payment.md) |
| §12 Reports | VAL-069–073 | CORPT00C | [Reporting](modules/reporting.md) |
| §13 User Administration | VAL-074–081 | COUSR00C–COUSR03C | [User Administration](modules/user-administration.md) |

A dependency diagram accompanies the catalog:
[validation-dependencies.svg](../validation-dependencies.svg).

## Cross-cutting patterns

These recur across modules and should be implemented **once** in a migrated system
([validation-rules.md](../validation-rules.md) shared-infrastructure and shared-field notes):

| Pattern | Occurrences |
|---|---|
| Account ID: exactly 11 digits, non-zero — re-implemented per program | VAL-011 (Account Update), VAL-035 (Card List), VAL-042 (Card Update), VAL-054 (Txn Add), VAL-064/065 (Bill Pay) |
| Card number: exactly 16 digits — re-implemented per program | VAL-036, VAL-039/043, VAL-055 |
| Calendar-date validation via CSUTLDTC/CEEDAYS and CSUTLDPY paragraphs | VAL-015/016 (dates, DOB), VAL-060 (txn dates), VAL-072 (report dates) |
| Y/N confirmation before an irreversible action | VAL-062 (txn add), VAL-067 (bill pay), VAL-073 (report submit) |
| No-change detection + optimistic-concurrency re-check at save | VAL-033/034 (account), VAL-049 (card), VAL-081 (user update) |
| Lookup-table edits (NANP area codes, state codes, state+ZIP combos) from CSLKPCDY | VAL-026, VAL-027, VAL-029, VAL-030 |

Where a check is both a validation and a policy (e.g. VAL-066 ↔ RULE-THRESHOLD-001,
VAL-067 ↔ RULE-DECISION-001, VAL-006 ↔ RULE-DECISION-003), both catalogs cross-reference each
other; the business-rule statement is authoritative for intent.
