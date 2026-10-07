# Component Inventory

[← Overview](README.md) | [Architecture](architecture.md) | [Data Model](data-model.md)

Consolidated from [screen-flow.md](../screen-flow.md) (screen inventory),
[user-stories.md](../user-stories.md) (coverage notes), and the
[orientation wiki](../wiki/architecture.md) (CICS resource map, batch layer).

## Online components (17 screens)

| # | Tran | Program | Screen (Mapset) | Function | Module page | Stories |
|---|---|---|---|---|---|---|
| 1 | CC00 | COSGN00C | COSGN00 | Sign-on | [Sign-on & Session](modules/sign-on.md) | 001–003 |
| 2 | CM00 | COMEN01C | COMEN01 | Main Menu (regular users) | [Menus](modules/menus.md) | 004 |
| 3 | CA00 | COADM01C | COADM01 | Admin Menu | [Menus](modules/menus.md) | 005 |
| 4 | CAVW | COACTVWC | COACTVW | Account View | [Account Servicing](modules/account-servicing.md) | 006 |
| 5 | CAUP | COACTUPC | COACTUP | Account Update | [Account Servicing](modules/account-servicing.md) | 007 |
| 6 | CCLI | COCRDLIC | COCRDLI | Credit Card List | [Card Servicing](modules/card-servicing.md) | 008–009 |
| 7 | CCDL | COCRDSLC | COCRDSL | Credit Card Detail | [Card Servicing](modules/card-servicing.md) | 010 |
| 8 | CCUP | COCRDUPC | COCRDUP | Credit Card Update | [Card Servicing](modules/card-servicing.md) | 011 |
| 9 | CT00 | COTRN00C | COTRN00 | Transaction List | [Transactions](modules/transactions.md) | 012–013 |
| 10 | CT01 | COTRN01C | COTRN01 | Transaction View | [Transactions](modules/transactions.md) | 014 |
| 11 | CT02 | COTRN02C | COTRN02 | Transaction Add | [Transactions](modules/transactions.md) | 015–016 |
| 12 | CR00 | CORPT00C | CORPT00 | Transaction Reports | [Reporting](modules/reporting.md) | 018 |
| 13 | CB00 | COBIL00C | COBIL00 | Bill Payment | [Bill Payment](modules/bill-payment.md) | 017 |
| 14 | CU00 | COUSR00C | COUSR00 | User List (Security) | [User Administration](modules/user-administration.md) | 020–021 |
| 15 | CU01 | COUSR01C | COUSR01 | User Add (Security) | [User Administration](modules/user-administration.md) | 022 |
| 16 | CU02 | COUSR02C | COUSR02 | User Update (Security) | [User Administration](modules/user-administration.md) | 023 |
| 17 | CU03 | COUSR03C | COUSR03 | User Delete (Security) | [User Administration](modules/user-administration.md) | 024 |

(Screen IDs SCREEN-01…17 in [screen-flow.md](../screen-flow.md) follow this same order.)

## Shared / utility components

| Component | Role | Reference |
|---|---|---|
| CSUTLDTC | Called date-validation subprogram (wraps LE `CEEDAYS`); used by Account Update date edits, Transaction Add, and Reports | [validation-rules.md](../validation-rules.md) shared infrastructure; [orientation wiki — Shared Components](../wiki/modules/shared-components.md) |
| CSUTLDPY / CSUTLDWY copybooks | Reusable CCYYMMDD date-edit paragraphs and flags | [validation-rules.md](../validation-rules.md) shared infrastructure |
| CSLKPCDY copybook | Lookup tables: NANP area codes, US state codes, state+ZIP combos | [validation-rules.md](../validation-rules.md) shared infrastructure |
| COACTUPC generic edit paragraphs | Parameterized required/alpha/numeric/signed-decimal edits | [validation-rules.md](../validation-rules.md) shared infrastructure |
| CARDDEMO-COMMAREA (COCOM01Y) | Session context carried between all programs | [Architecture](architecture.md#runtime-model) |
| Menu option tables (COMEN02Y / COADM02Y) | Data-driven menu dispatch with per-option role flags | [Menus](modules/menus.md) |

## Batch components

| Component | Status | Role | Reference |
|---|---|---|---|
| TDQ `JOBS` | In tree (CSD) | CICS transient data queue routed to the JES internal reader; receives report JCL from CORPT00C | [Reporting](modules/reporting.md) |
| TRANREPT.prc | In tree | Report procedure: backup → sort/filter by processing date → report step | [Reporting](modules/reporting.md); STORY-019 |
| REPROC.prc + REPROCT.ctl | In tree | IDCAMS REPRO backup wrapper (no user-visible output) | [user-stories.md](../user-stories.md) coverage notes |
| CBTRN03C | **Referenced, source absent** | Report formatting program executed by TRANREPT.prc | [Modernization Notes](modernization-notes.md) |
| CBTRN* posting suite | **Catalogued load modules only, source absent** | Daily transaction posting / category balances / interest (implied by batch-only datasets) | [business-entities.md](../business-entities.md) ENTITY-006/007/008 notes |
| COCRDSEC (tran CDV1) | **Defined in CSD, no source** | "CREDIT CARD SEARCH" developer transaction | [orientation wiki — known gaps](../wiki/README.md#known-gaps-and-ambiguities-flagged-during-orientation) |

Phase 1 documented no other batch processing; anything beyond the report pipeline exists only
as catalog evidence (datasets, load-module names) — see
[Modernization Notes](modernization-notes.md).
