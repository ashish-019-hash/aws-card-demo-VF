# Architecture

[← Overview](README.md) | [Data Overview](data-overview.md) | [Key Workflows](key-workflows.md) | [Glossary](glossary.md)

## Technology stack

| Layer | Technology | Evidence |
|---|---|---|
| Online transaction processing | IBM CICS (pseudo-conversational) | `EXEC CICS` commands throughout `00.phase-1-input/cbl/*.cbl`; resource definitions in `00.phase-1-input/csd/CARDDEMO.CSD` |
| Language | COBOL (CICS command-level) | 18 programs in `00.phase-1-input/cbl/` |
| Screens | BMS maps (3270 terminal) | 17 mapsets in `00.phase-1-input/bms/`, symbolic maps in `00.phase-1-input/cpy-bms/` |
| Data storage | VSAM KSDS files with alternate indexes | CSD FILE definitions `00.phase-1-input/csd/CARDDEMO.CSD:1-99`; `00.phase-1-input/catlg/LISTCAT.txt` |
| Batch | JCL procedures + sort/IDCAMS (programs not in tree) | `00.phase-1-input/proc/REPROC.prc`, `00.phase-1-input/proc/TRANREPT.prc` |
| Date services | IBM Language Environment `CEEDAYS` API | `00.phase-1-input/cbl/CSUTLDTC.cbl:116` |

There is no database (no SQL/DB2), no MQ, and no web layer anywhere in the tree.

## Runtime model

Every online program follows the same pseudo-conversational pattern:

1. First entry (`EIBCALEN = 0` or `CDEMO-PGM-ENTER`): initialize, SEND the program's map.
2. `EXEC CICS RETURN TRANSID(<own tranid>) COMMAREA(CARDDEMO-COMMAREA)` — the terminal waits for user input while no task is running.
3. On the next AID key, CICS restarts the program under its own transaction; the program RECEIVEs the map and processes input.
4. PF3 (and selection actions) transfer control with `EXEC CICS XCTL PROGRAM(...)`, passing the same COMMAREA (e.g. `00.phase-1-input/cbl/COBIL00C.cbl:282`, `00.phase-1-input/cbl/COACTVWC.cbl:349`).

### Shared COMMAREA

All programs communicate through one structure, `CARDDEMO-COMMAREA` (`00.phase-1-input/cpy/COCOM01Y.cpy:19-44`):

- `CDEMO-GENERAL-INFO` — from/to tranid and program, user id, user type (`88 CDEMO-USRTYP-ADMIN 'A'` / `88 CDEMO-USRTYP-USER 'U'`), program context (`88 CDEMO-PGM-ENTER 0` / `88 CDEMO-PGM-REENTER 1`)
- `CDEMO-CUSTOMER-INFO` — customer id and name parts
- `CDEMO-ACCOUNT-INFO` — account id and status
- `CDEMO-CARD-INFO` — card number
- `CDEMO-MORE-INFO` — last map/mapset

## CICS resource map (transactions → programs → mapsets)

All resources are defined in `00.phase-1-input/csd/CARDDEMO.CSD`: FILEs at lines 1–99, MAPSETs at 100–172, PROGRAMs at 173–305, TRANSACTIONs at 306–489, TDQUEUE `JOBS` at 499–505.

| Tran | Program | Mapset / Map | Function | Module page | Source (lines) |
|---|---|---|---|---|---|
| CC00 | COSGN00C | COSGN00 / COSGN0A | Sign-on | [Authentication](modules/authentication.md) | `cbl/COSGN00C.cbl` (260) |
| CM00 | COMEN01C | COMEN01 / COMEN1A | Main menu (regular users) | [Menus](modules/menu-navigation.md) | `cbl/COMEN01C.cbl` (282) |
| CA00 | COADM01C | COADM01 / COADM1A | Admin menu | [Menus](modules/menu-navigation.md) | `cbl/COADM01C.cbl` (268) |
| CAVW | COACTVWC | COACTVW / CACTVWA | Account view | [Accounts](modules/account-management.md) | `cbl/COACTVWC.cbl` (941) |
| CAUP | COACTUPC | COACTUP / CACTUPA | Account + customer update | [Accounts](modules/account-management.md) | `cbl/COACTUPC.cbl` (4236) |
| CCLI | COCRDLIC | COCRDLI / CCRDLIA | Credit card list (paged) | [Cards](modules/card-management.md) | `cbl/COCRDLIC.cbl` (1459) |
| CCDL | COCRDSLC | COCRDSL / CCRDSLA | Credit card detail view | [Cards](modules/card-management.md) | `cbl/COCRDSLC.cbl` (887) |
| CCUP | COCRDUPC | COCRDUP / CCRDUPA | Credit card update | [Cards](modules/card-management.md) | `cbl/COCRDUPC.cbl` (1560) |
| CT00 | COTRN00C | COTRN00 / COTRN0A | Transaction list (paged) | [Transactions](modules/transaction-management.md) | `cbl/COTRN00C.cbl` (699) |
| CT01 | COTRN01C | COTRN01 / COTRN1A | Transaction view | [Transactions](modules/transaction-management.md) | `cbl/COTRN01C.cbl` (330) |
| CT02 | COTRN02C | COTRN02 / COTRN2A | Transaction add | [Transactions](modules/transaction-management.md) | `cbl/COTRN02C.cbl` (783) |
| CR00 | CORPT00C | CORPT00 / CORPT0A | Transaction report request | [Reporting](modules/reporting.md) | `cbl/CORPT00C.cbl` (649) |
| CB00 | COBIL00C | COBIL00 / COBIL0A | Bill payment | [Bill Payment](modules/bill-payment.md) | `cbl/COBIL00C.cbl` (572) |
| CU00 | COUSR00C | COUSR00 / COUSR0A | User list (admin) | [User Admin](modules/user-administration.md) | `cbl/COUSR00C.cbl` (695) |
| CU01 | COUSR01C | COUSR01 / COUSR1A | User add (admin) | [User Admin](modules/user-administration.md) | `cbl/COUSR01C.cbl` (299) |
| CU02 | COUSR02C | COUSR02 / COUSR2A | User update (admin) | [User Admin](modules/user-administration.md) | `cbl/COUSR02C.cbl` (414) |
| CU03 | COUSR03C | COUSR03 / COUSR3A | User delete (admin) | [User Admin](modules/user-administration.md) | `cbl/COUSR03C.cbl` (359) |
| CDV1 | COCRDSEC | — | "CREDIT CARD SEARCH" ("DEVELOPER TRANSACTION - 1") | — | **No source in tree** (`csd/CARDDEMO.CSD:211-218, 388-398`) |

Non-CICS: `00.phase-1-input/cbl/CSUTLDTC.cbl` (157 lines) is a statically `CALL`ed date-validation subprogram — see [Shared Components](modules/shared-components.md).

## Program dependency graph (XCTL / CALL)

```
CC00 COSGN00C ─┬─> COADM01C (CA00) ─> COUSR00C ─> COUSR01C / COUSR02C / COUSR03C
               └─> COMEN01C (CM00) ─> COACTVWC, COACTUPC, COCRDLIC, COCRDSLC, COCRDUPC,
                                      COTRN00C, COTRN01C, COTRN02C, CORPT00C, COBIL00C
COCRDLIC ─('S'/'U' row select)─> COCRDSLC / COCRDUPC
COTRN00C ─(row select)─> COTRN01C
CORPT00C, COTRN02C ──CALL──> CSUTLDTC ──> CEEDAYS (LE, not in tree)
CORPT00C ──WRITEQ TD 'JOBS'──> batch job TRNRPT00 (PROC TRANREPT) ──> CBTRN03C (not in tree)
```

Evidence: menu dispatch tables `00.phase-1-input/cpy/COMEN02Y.cpy:23-85` and `00.phase-1-input/cpy/COADM02Y.cpy:22-43`; XCTL dispatch `00.phase-1-input/cbl/COMEN01C.cbl:152-154`; card-list selection XCTLs `00.phase-1-input/cbl/COCRDLIC.cbl:538, 566`; CALLs `00.phase-1-input/cbl/CORPT00C.cbl:392, 411-414` and `00.phase-1-input/cbl/COTRN02C.cbl:393, 413`; TDQ write `00.phase-1-input/cbl/CORPT00C.cbl:517-521`.

## Batch layer (partially present)

Only two JCL procedures and one control card exist:

- `00.phase-1-input/proc/TRANREPT.prc` — transaction report: REPRO backup of `TRANSACT` (STEP01R, lines 21-30), SORT by `TRAN-CARD-NUM` within a date range (STEP05/SYSIN, lines 38-48), then `PGM=CBTRN03C` (line 57) reading `CARDXREF`, `TRANTYPE`, `TRANCATG` and writing GDG `TRANREPT(+1)` (lines 57-78). **`CBTRN03C` source is not in the tree.**
- `00.phase-1-input/proc/REPROC.prc` — generic IDCAMS REPRO wrapper used by TRANREPT's backup step; control card `00.phase-1-input/ctl/REPROCT.ctl`.

The dataset catalog (`00.phase-1-input/catlg/LISTCAT.txt`) additionally lists batch-oriented datasets (`DALYTRAN`, `DALYREJS`, `SYSTRAN`, `TRANREPT`, `TRANSACT.BKUP`) implying a larger batch suite whose programs and JCL are absent from this repository.

## Security model

- Sign-on validates user id/password against the `USRSEC` VSAM file; password comparison is plaintext (`00.phase-1-input/cbl/COSGN00C.cbl:209-227`).
- Authorization is a single user-type flag: menu options marked `'A'` are blocked for `'U'` users with message `'No access - Admin Only option... '` (`00.phase-1-input/cbl/COMEN01C.cbl:126-141`). User administration is reachable only from the admin menu (`00.phase-1-input/cpy/COADM02Y.cpy:22-43`).
- CSD transaction definitions have `RESSEC(NO) CMDSEC(NO)` (e.g. `00.phase-1-input/csd/CARDDEMO.CSD:314`), i.e. no CICS resource-level security.
