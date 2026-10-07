# CardDemo Legacy Application Wiki — Overview

This wiki is an architecture-level orientation to the legacy **CardDemo** application contained in this repository under `00.phase-1-input/`. CardDemo is AWS's sample mainframe credit-card management application (every source file carries an Amazon.com Apache-2.0 copyright header; version stamp `CardDemo_v1.0-15-g27d6c6f-68 Date: 2022-07-19` at `00.phase-1-input/proc/REPROC.prc:31` and `00.phase-1-input/proc/TRANREPT.prc:81`).

## What the application does

CardDemo is an online CICS/COBOL application for managing credit-card data. Signed-on users work with:

- **Accounts** — view and update account and customer master data
- **Credit cards** — list, view, and update card records
- **Transactions** — list, view, and add card transactions
- **Bill payment** — pay an account's current balance in full
- **Reporting** — request a batch transaction report for a date range
- **User administration** (admin users only) — list, add, update, delete application users

Two user types exist: **regular users** (`'U'`) and **admin users** (`'A'`), distinguished by `SEC-USR-TYPE` in the user security record (`00.phase-1-input/cpy/CSUSR01Y.cpy:22`) and routed to different menus after sign-on (`00.phase-1-input/cbl/COSGN00C.cbl:223-240`).

## What is in the repository

All legacy source lives under one folder, `00.phase-1-input/`. There is no README, no JCL library, and no build scripts in the tree.

| Path | Contents | Count |
|---|---|---|
| `00.phase-1-input/cbl/` | CICS COBOL online programs + 1 called date utility | 18 `.cbl` |
| `00.phase-1-input/bms/` | BMS mapset source (screen definitions) | 17 `.bms` |
| `00.phase-1-input/cpy-bms/` | Generated symbolic map copybooks (one per mapset) | 17 `.CPY` |
| `00.phase-1-input/cpy/` | Record layouts, COMMAREA, menu tables, utility copybooks | 28 files |
| `00.phase-1-input/csd/CARDDEMO.CSD` | CICS resource definitions (files, mapsets, programs, transactions, TDQ) | 1 |
| `00.phase-1-input/proc/` | JCL procedures `REPROC.prc`, `TRANREPT.prc` | 2 |
| `00.phase-1-input/ctl/REPROCT.ctl` | IDCAMS REPRO control card | 1 |
| `00.phase-1-input/catlg/LISTCAT.txt` | IDCAMS LISTCAT of the `AWS.M2.CARDDEMO.*` datasets | 1 |
| `00.phase-1-input/data/ASCII/` | Seed data, ASCII fixed-width | 9 `.txt` |
| `00.phase-1-input/data/EBCDIC/` | Seed data, EBCDIC sequential | 12 `.PS` |

## Wiki pages

- [Architecture](architecture.md) — technology stack, runtime model, CICS resources, program dependency graph
- Module pages:
  - [Authentication / Sign-on](modules/authentication.md)
  - [Menus & Navigation](modules/menu-navigation.md)
  - [Account Management](modules/account-management.md)
  - [Credit Card Management](modules/card-management.md)
  - [Transaction Management](modules/transaction-management.md)
  - [Bill Payment](modules/bill-payment.md)
  - [Reporting](modules/reporting.md)
  - [User Administration](modules/user-administration.md)
  - [Shared Components & Utilities](modules/shared-components.md)
- [Data Overview](data-overview.md) — VSAM files, record layouts, seed data
- [Key Workflows](key-workflows.md) — end-to-end flows through the system
- [Glossary](glossary.md) — naming conventions, domain and mainframe terms

## Companion Phase-1 artifacts

Deeper detail is owned by the dedicated extraction artifacts in `01.phase-1-output/` (produced separately): `business-entities.md` (field-level data model), `business-rules-catalog.md` and `business-glossary.md` (business logic), `validation-rules.md` (field validations), `screen-flow.md` (per-screen fields and navigation), and `user-stories.md` (requirements). This wiki stays at the architecture level and links out rather than duplicating them.

## Known gaps and ambiguities (flagged during orientation)

1. Program `COCRDSEC` (transaction `CDV1`, "CREDIT CARD SEARCH") is defined in the CSD (`00.phase-1-input/csd/CARDDEMO.CSD:211-218, 388-398`) but has **no source file** in `cbl/`.
2. **Batch programs are absent.** `TRANREPT.prc` executes `PGM=CBTRN03C` (`00.phase-1-input/proc/TRANREPT.prc:57`), and the catalog lists daily-transaction, posting, and reject datasets implying a batch suite, but only the online layer plus `CSUTLDTC` is in the tree.
3. No `TRANSACT` seed data exists in either data folder; `dailytran.txt` (DALYTRAN layout) is the closest source. No ASCII `USRSEC` seed exists — only EBCDIC (`00.phase-1-input/data/EBCDIC/AWS.M2.CARDDEMO.USRSEC.PS`).
4. Main-menu option 8 ("Transaction Add") has an alternate, commented-out label `'Transaction Add (Admin Only)'` but is flagged user type `'U'` (`00.phase-1-input/cpy/COMEN02Y.cpy:66-72`) — the comment and the flag disagree.
5. The card-list header comment describes admin-vs-user filtering (`00.phase-1-input/cbl/COCRDLIC.cbl:5-7`), but the program's filtering is driven by whether account/card context is present, not by an explicit admin test (see [Credit Card Management](modules/card-management.md)).
6. Passwords are stored and compared in **plaintext** (`00.phase-1-input/cbl/COSGN00C.cbl:223`, `00.phase-1-input/cpy/CSUSR01Y.cpy:21`).
7. Source identifiers carry typos preserved verbatim here, e.g. `CARD-EXPIRAION-DATE` (`00.phase-1-input/cpy/CVACT02Y.cpy:9`).
