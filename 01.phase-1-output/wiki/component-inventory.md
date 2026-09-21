# Component Inventory

**Source:** [`screen-flow.md`](../screen-flow.md) (Screen Inventory),
[`codebase-wiki.md`](../codebase-wiki.md) (§3 Architecture/Program Inventory, §4.3 Batch
Jobs), [`user-stories.md`](../user-stories.md) (Coverage Summary).

## Online Components (17 Screens)

| Screen | BMS Map | Program | Transaction | Module |
|---|---|---|---|---|
| Sign-On | COSGN00 | COSGN00C | CC00 | [Sign-On](./modules/sign-on.md) |
| Main Menu | COMEN01 | COMEN01C | CM00 | [Menu Navigation](./modules/menu-navigation.md) |
| Admin Menu | COADM01 | COADM01C | CA00 | [Menu Navigation](./modules/menu-navigation.md) |
| View Account | COACTVW | COACTVWC | CAVW | [Account Management](./modules/account-management.md) |
| Update Account | COACTUP | COACTUPC | CAUP | [Account Management](./modules/account-management.md) |
| List Credit Cards | COCRDLI | COCRDLIC | CCLI | [Card Management](./modules/card-management.md) |
| View Card Detail | COCRDSL | COCRDSLC | CCDL | [Card Management](./modules/card-management.md) |
| Update Card | COCRDUP | COCRDUPC | CCUP | [Card Management](./modules/card-management.md) |
| List Transactions | COTRN00 | COTRN00C | CT00 | [Transaction Management](./modules/transaction-management.md) |
| View Transaction | COTRN01 | COTRN01C | CT01 | [Transaction Management](./modules/transaction-management.md) |
| Add Transaction | COTRN02 | COTRN02C | CT02 | [Transaction Management](./modules/transaction-management.md) |
| Bill Payment | COBIL00 | COBIL00C | CB00 | [Bill Payment](./modules/bill-payment.md) |
| Transaction Reports | CORPT00 | CORPT00C | CR00 | [Transaction Reporting](./modules/reporting.md) |
| List Users | COUSR00 | COUSR00C | CU00 | [User Administration](./modules/user-administration.md) |
| Add User | COUSR01 | COUSR01C | CU01 | [User Administration](./modules/user-administration.md) |
| Update User | COUSR02 | COUSR02C | CU02 | [User Administration](./modules/user-administration.md) |
| Delete User | COUSR03 | COUSR03C | CU03 | [User Administration](./modules/user-administration.md) |

## Excluded from End-User Documentation

`screen-flow.md` explicitly excludes one additional screen: `COCRDSEC`, under the
developer/debug transaction `CDV1`. It is defined in the CICS resource table but is not
reachable from any menu and is not part of the normal end-user experience.
`codebase-wiki.md` independently flags it as a gap (§8, item 6) — purpose unconfirmed,
possibly a card-search development/testing utility.

## Shared Utility Component

| Component | Type | Used By |
|---|---|---|
| `CSUTLDTC` | Date-utility subroutine (`CICS LINK` / COBOL `CALL`, no screen, no transaction ID) | Account Update (date fields), Transaction Add (Orig/Proc Date), Transaction Reporting (custom date range) — see the date-validation rules (VR-030–VR-035, VR-091–VR-092, VR-111–VR-112) in [Business Rules & Validation Summary](./business-rules-and-validation.md) |

## Batch Component

| Component | Type | Triggered By | Status |
|---|---|---|---|
| `TRANREPT` (JCL procedure) | Batch: unload → sort/filter → format | Transaction Reporting screen, via the `JOBS` transient-data queue | Documented in `codebase-wiki.md` §4.3; the formatting step it invokes (`CBTRN03C`) was not found in the source tree available to Phase 1 — see [Modernization Notes](./modernization-notes.md#carried-forward-gaps) |

No other batch/background components (data load, purge, interest calculation, statement
generation) were found documented in the Phase 1 artifacts.

## Programs Without a Screen of Their Own

Two menu-dispatcher programs (COMEN01C, COADM01C) don't own a business function — they
only route to the 14 functional screens above. See
[Menu Navigation](./modules/menu-navigation.md).

## Totals

| Count | What |
|---|---|
| 17 | End-user screens |
| 16 | Online (CICS transaction) programs behind those screens |
| 1 | Shared date-utility subroutine (no screen) |
| 1 | Documented batch job chain |
| 1 | Developer-only screen, excluded from this inventory's end-user scope |
