# CardDemo Application Wiki

**Source material for this wiki:** this page and every page linked from it is synthesized
*only* from the Phase 1 extraction artifacts in `01.phase-1-output/` —
[`business-entities.md`](../business-entities.md),
[`business-rules-catalog.md`](../business-rules-catalog.md),
[`business-glossary.md`](../business-glossary.md),
[`validation-rules.md`](../validation-rules.md),
[`validation-dependencies.svg`](../validation-dependencies.svg),
[`screen-flow.md`](../screen-flow.md),
[`user-stories.md`](../user-stories.md), and the orientation doc
[`codebase-wiki.md`](../codebase-wiki.md). No COBOL source under `00.phase-1-input/` was
re-opened to produce this wiki. Every fact below traces back to one of those documents;
where a document didn't capture something, that gap is called out explicitly rather than
invented.

## What CardDemo Is

CardDemo is a credit-card account and transaction management system built on
CICS/COBOL/BMS/VSAM (mainframe). It serves two kinds of signed-on users:

- **Regular users** — look up accounts and cards, review and add transactions, pay a bill
  in full, and request printed transaction reports.
- **Administrators** — manage the list of people allowed to sign in (add, update,
  delete, list users) and can also reach every regular-user screen.

See [User Types & Roles](./user-types-and-roles.md) for the full persona breakdown, and
[Architecture & Technology Summary](./architecture.md) for the technical shape of the
system this wiki was extracted from.

## How to Use This Wiki

Each **Functional Capability** page below covers one business area end-to-end: what it
does, its screen(s) and navigation, the entities it touches, and the business/validation
rules that govern it — the cross-reference view that isn't available from reading any
single Phase 1 document alone. For full field-by-field detail, each page links back to the
relevant section of the source Phase 1 document rather than repeating it.

## Table of Contents

1. [Overview](./README.md) — this page
2. [Architecture & Technology Summary](./architecture.md)
3. [User Types & Roles](./user-types-and-roles.md)
4. Functional Capability Pages
   - [Sign-On](./modules/sign-on.md)
   - [Menu Navigation](./modules/menu-navigation.md)
   - [Account Management](./modules/account-management.md)
   - [Card Management](./modules/card-management.md)
   - [Transaction Management](./modules/transaction-management.md)
   - [Bill Payment](./modules/bill-payment.md)
   - [Transaction Reporting](./modules/reporting.md)
   - [User Administration](./modules/user-administration.md)
5. [Component Inventory](./component-inventory.md)
6. [Data Model](./data-model.md)
7. [Business Rules & Validation Summary](./business-rules-and-validation.md)
8. [Modernization Notes](./modernization-notes.md)
9. [Glossary](./glossary.md)

## Functional Modules at a Glance

The eight functional modules below are the grouping already used consistently across the
screen-flow, business-rules, validation-rules, and user-stories documents (by program/menu
option), reused here for consistency:

| Module | Programs | Transactions | Screens | User Stories |
|---|---|---|---|---|
| [Sign-On](./modules/sign-on.md) | COSGN00C | CC00 | 1 | STORY-001–STORY-006 |
| [Menu Navigation](./modules/menu-navigation.md) | COMEN01C, COADM01C | CM00, CA00 | 2 | STORY-007–STORY-011 |
| [Account Management](./modules/account-management.md) | COACTVWC, COACTUPC | CAVW, CAUP | 2 | STORY-012–STORY-019 |
| [Card Management](./modules/card-management.md) | COCRDLIC, COCRDSLC, COCRDUPC | CCLI, CCDL, CCUP | 3 | STORY-020–STORY-026 |
| [Transaction Management](./modules/transaction-management.md) | COTRN00C, COTRN01C, COTRN02C | CT00, CT01, CT02 | 3 | STORY-027–STORY-034 |
| [Bill Payment](./modules/bill-payment.md) | COBIL00C | CB00 | 1 | STORY-035–STORY-038 |
| [Transaction Reporting](./modules/reporting.md) | CORPT00C (+ batch TRANREPT) | CR00 | 1 | STORY-039–STORY-043 |
| [User Administration](./modules/user-administration.md) | COUSR00C, COUSR01C, COUSR02C, COUSR03C | CU00, CU01, CU02, CU03 | 4 | STORY-044–STORY-050 |

**Totals** (from the source catalogs): 17 screens, 16 online programs (+1 date-utility
subroutine, + a developer-only screen excluded from end-user documentation — see
[Component Inventory](./component-inventory.md)), 16 business rules (BR-001–BR-016), 130
validation rules (VR-001–VR-128, plus VR-030b/VR-030c), 50 user stories (STORY-001–STORY-050),
and 11 business entities (ENTITY-001–ENTITY-011).

## Known Gaps Carried Forward from Phase 1

These are explicitly documented as gaps in the source artifacts, not omissions of this
wiki — see [Modernization Notes](./modernization-notes.md#carried-forward-gaps) for the
full list and its consequences for a rebuild.
