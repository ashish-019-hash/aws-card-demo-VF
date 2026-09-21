# Business Rules & Validation Summary

**Source:** [`business-rules-catalog.md`](../business-rules-catalog.md) (16 rules,
BR-001–BR-016) and [`validation-rules.md`](../validation-rules.md) (130 rules,
VR-001–VR-128 plus VR-030b/VR-030c). This page is a browsable index into both catalogs,
organized by module, for the cross-referencing this wiki adds over reading either catalog
alone — it does not repeat the full rule text; follow the links for that.

## Business Rules Index (BR-001–BR-016)

| Module | Rule IDs | What they govern |
|---|---|---|
| [Sign-On](./modules/sign-on.md) | BR-001, BR-002 | Credential match case-handling quirk; Admin-vs-Regular routing |
| [Menu Navigation](./modules/menu-navigation.md) | BR-003 | Dead admin-only menu gate |
| [Card Management](./modules/card-management.md) | BR-004, BR-009, BR-014 | Session user-type reset hazard; card-update concurrency; filter AND semantics |
| Cross-cutting (see [User Types & Roles](./user-types-and-roles.md)) | BR-005 | No account-ownership scoping, system-wide |
| [Account Management](./modules/account-management.md) | BR-006, BR-007, BR-008 | Change detection; optimistic-concurrency re-check; two-file locked update with rollback |
| [Transaction Management](./modules/transaction-management.md) / [Bill Payment](./modules/bill-payment.md) | BR-010 | Transaction-ID MAX+1 generation, shared by both modules |
| [Bill Payment](./modules/bill-payment.md) | BR-011, BR-012 | Positive-balance requirement; full-balance payoff |
| [Transaction Reporting](./modules/reporting.md) | BR-013 | Report period derivation + mandatory confirm |
| [Card Management](./modules/card-management.md) / [Transaction Management](./modules/transaction-management.md) / [User Administration](./modules/user-administration.md) | BR-015 | Fixed page size per list screen (7 cards / 10 transactions / 10 users) |
| [User Administration](./modules/user-administration.md) | BR-016 | Add uniqueness, Update no-op guard, Delete two-step confirm |

Full rule text, source citations, and the observed-vs-recommended-correction distinction:
[`business-rules-catalog.md`](../business-rules-catalog.md#rule-index) (see its Rule Index
table for the same list with one-line titles).

## Validation Rules Index (VR-001–VR-128, +2 lettered)

| Module | Screen(s) | Rule Range | Count |
|---|---|---|---|
| [Sign-On](./modules/sign-on.md) | COSGN00 | VR-001–VR-002 | 2 |
| [Menu Navigation](./modules/menu-navigation.md) | COMEN01, COADM01 | VR-003–VR-004 | 2 |
| [Account Management](./modules/account-management.md) | COACTVW, COACTUP | VR-005–VR-053 | 51 |
| [Card Management](./modules/card-management.md) | COCRDLI, COCRDSL, COCRDUP | VR-054–VR-068 | 15 |
| [Transaction Management](./modules/transaction-management.md) | COTRN00, COTRN01, COTRN02 | VR-069–VR-094 | 26 |
| [Bill Payment](./modules/bill-payment.md) | COBIL00 | VR-095–VR-097 | 3 |
| [Transaction Reporting](./modules/reporting.md) | CORPT00 | VR-098–VR-114 | 17 |
| [User Administration](./modules/user-administration.md) | COUSR00–COUSR03 | VR-115–VR-128 | 14 |

**Total: 130** (see [`validation-rules.md` §20](../validation-rules.md#20-summary) for the
exact per-program breakdown this table is derived from).

## Cross-Field / Conditional Dependencies

Several validation rules only run when another rule already passed (e.g. the FICO range
check only runs if the FICO field passed its numeric-required check; the state+zip
cross-check only runs once both the state code and zip individually validate; leap-year and
date-of-birth checks are gated by the year/month/day format checks). The full dependency
graph — which check gates which, and where editor paragraphs are reused across screens — is
diagrammed in [`validation-dependencies.svg`](../validation-dependencies.svg).

## What's Deliberately Not Here

Authentication decisions (credential match), authorization decisions (admin-only gates,
account-ownership scope), record-not-found outcomes, technical/system error handling, and
workflow/state rules (e.g. "no change detected") are **not** validation rules — they're
business rules or explicitly out-of-scope categories. See
[`validation-rules.md` §1.2](../validation-rules.md#12-what-is-excluded-and-why) for the
full exclusion table and rationale, and the Business Rules Index above for where those
decisions actually live.

## Related Pages

- [Data Model](./data-model.md) — the entities these rules constrain
- [Modernization Notes](./modernization-notes.md) — quirks flagged as "observed, not corrected"
