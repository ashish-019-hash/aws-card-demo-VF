# CardDemo Codebase Wiki

## 1. Overview

This repository contains the phase-1 source extract for a CardDemo-style credit-card application implemented as online COBOL/CICS transactions, BMS terminal maps, VSAM data sets, and JCL batch/reporting procedures. The application boundary is `00.phase-1-input/`.

The online application covers:

- authentication and routing to user or administrator menus;
- account and customer view/update;
- credit-card list, detail/search, and update;
- transaction list, detail, and entry;
- bill-payment processing;
- transaction-report submission; and
- security-user administration.

The checked-out source contains 18 COBOL source files (approximately 17,000 lines), 17 BMS map sources with generated COBOL map copybooks, application copybooks, a CICS resource definition export, catalog output, sample data, and two JCL procedures. It is a legacy source corpus rather than a runnable build: no build pipeline, CICS installation job stream, or modern application code is present.

**Primary source boundaries**

| Area | Location | Purpose |
|---|---|---|
| COBOL online programs | `00.phase-1-input/cbl/` | CICS transaction logic, validation, navigation, and VSAM access |
| BMS sources | `00.phase-1-input/bms/` | 3270 terminal map definitions |
| Generated BMS copybooks | `00.phase-1-input/cpy-bms/` | COBOL input/output field layouts for each mapset |
| Application copybooks | `00.phase-1-input/cpy/` | COMMAREA, menus, record layouts, messages, validation and date structures |
| CICS resources | `00.phase-1-input/csd/CARDDEMO.CSD` | Files, mapsets, programs, transactions, libraries, and TD queue |
| Batch artifacts | `00.phase-1-input/proc/`, `00.phase-1-input/ctl/` | VSAM unload/load and transaction reporting |
| Catalog export | `00.phase-1-input/catlg/LISTCAT.txt` | Mainframe data-set/catalog evidence |
| Seed/transfer data | `00.phase-1-input/data/ASCII/`, `00.phase-1-input/data/EBCDIC/` | Fixed-width source data for core and batch data sets |

## 2. Runtime Architecture

```text
3270 terminal
    │ BMS SEND / RECEIVE
    ▼
CICS transaction (transaction ID)
    │ maps to
    ▼
COBOL online program
    ├── COMMAREA: session, selection, re-entry, and navigation state
    ├── direct CICS VSAM commands: READ / WRITE / REWRITE / DELETE / browse
    ├── BMS map copybook fields and terminal AID/PF-key handling
    ├── XCTL transfers to another CICS program
    └── report submission records to the JOBS transient-data queue
             │
             ▼
      Internal reader / JCL procedure / IDCAMS / DFSORT / batch report program
```

The CICS resource export establishes the runtime contracts:

- eight enabled VSAM file resources are defined at `csd/CARDDEMO.CSD:1-99`;
- 17 mapsets are defined at `csd/CARDDEMO.CSD:100-171`;
- program definitions are at `csd/CARDDEMO.CSD:173-304`;
- transaction-to-program bindings are at `csd/CARDDEMO.CSD:306-488`; and
- `JOBS` is an extrapartition transient-data queue configured for the CICS internal reader at `csd/CARDDEMO.CSD:499-505`.

Programs are configured as CICS API applications with `EXECKEY(USER)` and `CONCURRENCY(QUASIRENT)` (for example, `COACTUPC` at `csd/CARDDEMO.CSD:173-180`). File resources use `UPDATEMODEL(LOCKING)`, enable read/update/add/delete/browse, and are configured for uncommitted reads; see `ACCTDAT` at `csd/CARDDEMO.CSD:1-12` and the equivalent definitions for the other resources.

## 3. Online Module Inventory

### 3.1 Authentication, menu, and shared utilities

| Program | Primary responsibility | Key references |
|---|---|---|
| `COSGN00C` | Displays login, reads `USRSEC`, validates credentials, and transfers to the regular or administrator menu. | `cbl/COSGN00C.cbl:110-153, 211-237` |
| `COMEN01C` | Presents and dispatches the regular-user main menu. | `cbl/COMEN01C.cbl:142-176`; `cpy/COMEN02Y.cpy:19-112` |
| `COADM01C` | Presents and dispatches the administrator menu. | `cbl/COADM01C.cbl:142-166`; `cpy/COADM02Y.cpy:19-48` |
| `CSUTLDTC` | Reusable date validation/conversion utility; invokes Language Environment routine `CEEDAYS`. | `cbl/CSUTLDTC.cbl:20, 116`; called by `COTRN02C` and `CORPT00C` |

### 3.2 Account and customer

| Program | Primary responsibility | Data access and workflow evidence |
|---|---|---|
| `COACTVWC` | View account and associated customer/card context. | Map flow `cbl/COACTVWC.cbl:583-612`; account/customer/card reads `:727-826` |
| `COACTUPC` | Search and update account and customer information; supports navigation to card functions. | Map receive/send `cbl/COACTUPC.cbl:1040, 3594`; reads `:3654-3921`; account/customer rewrites `:4065-4095` |

### 3.3 Cards

| Program | Primary responsibility | Data access and workflow evidence |
|---|---|---|
| `COCRDLIC` | Browse and page through cards, then navigate to detail or update. | XCTL navigation `cbl/COCRDLIC.cbl:402-567`; forward browse `:1129-1258`; reverse browse `:1273-1376` |
| `COCRDSLC` | Find/display card detail and related information. | Map flow `cbl/COCRDSLC.cbl:569-598`; keyed reads `:742-803` |
| `COCRDUPC` | Read, validate, and update a card record. | Map flow `cbl/COCRDUPC.cbl:579, 1329`; reads `:1382-1427`; rewrite `:1477-1488` |

### 3.4 Transactions, billing, and reporting

| Program | Primary responsibility | Data access and workflow evidence |
|---|---|---|
| `COTRN00C` | Browse transactions forward and backward. | Map flow `cbl/COTRN00C.cbl:534-556`; browse `:593-694` |
| `COTRN01C` | Display a transaction by key. | `cbl/COTRN01C.cbl:219-269` |
| `COTRN02C` | Validate a card/account relationship, derive transaction context, and add a transaction. | Date validation calls `cbl/COTRN02C.cbl:393-416`; reads/browse/write `:578-713` |
| `COBIL00C` | Process bill payment by updating an account and creating a transaction. | Account read/rewrite `cbl/COBIL00C.cbl:343-403`; xref and transaction browse `:408-505`; transaction write `:510-520` |
| `CORPT00C` | Validate reporting criteria and submit report JCL through CICS. | Date validation `cbl/CORPT00C.cbl:340-435`; job records written to `JOBS` `:462-535` |

### 3.5 Security-user administration

| Program | Primary responsibility | Data access evidence |
|---|---|---|
| `COUSR00C` | Browse security users. | `cbl/COUSR00C.cbl:529-551, 588-689` |
| `COUSR01C` | Add a security user. | `cbl/COUSR01C.cbl:190-240` |
| `COUSR02C` | Read and update a security user. | `cbl/COUSR02C.cbl:272-360` |
| `COUSR03C` | Read and delete a security user. | `cbl/COUSR03C.cbl:219-307` |

### 3.6 Presentation modules

The 17 BMS mapsets and their corresponding functional screens are:

| Mapset | Screen responsibility | Program |
|---|---|---|
| `COSGN00` | Sign-on | `COSGN00C` |
| `COMEN01` | Main menu | `COMEN01C` |
| `COADM01` | Administrator menu | `COADM01C` |
| `COACTVW` | Account view | `COACTVWC` |
| `COACTUP` | Account/customer update | `COACTUPC` |
| `COCRDLI` | Card list | `COCRDLIC` |
| `COCRDSL` | Card search/detail | `COCRDSLC` |
| `COCRDUP` | Card update | `COCRDUPC` |
| `COTRN00` | Transaction list | `COTRN00C` |
| `COTRN01` | Transaction detail | `COTRN01C` |
| `COTRN02` | Transaction add | `COTRN02C` |
| `COBIL00` | Bill payment | `COBIL00C` |
| `CORPT00` | Transaction report request | `CORPT00C` |
| `COUSR00` | Security-user list | `COUSR00C` |
| `COUSR01` | Security-user add | `COUSR01C` |
| `COUSR02` | Security-user update | `COUSR02C` |
| `COUSR03` | Security-user delete | `COUSR03C` |

The CICS mapset resource definitions are at `csd/CARDDEMO.CSD:100-171`. Each BMS source has a generated COBOL map copybook with the same name in `cpy-bms/` (for example, `bms/COTRN02.bms` and `cpy-bms/COTRN02.CPY`).

## 4. CICS Transaction and Program Mapping

The source defines 18 CICS transactions. The mapping below is authoritative for the supplied CSD export.

| Transaction | Program | Function | CSD reference |
|---|---|---|---|
| `CC00` | `COSGN00C` | Login | `csd/CARDDEMO.CSD:378-387` |
| `CM00` | `COMEN01C` | Main menu | `csd/CARDDEMO.CSD:399-408` |
| `CA00` | `COADM01C` | Administrator menu | `csd/CARDDEMO.CSD:327-336` |
| `CAVW` | `COACTVWC` | Account view | `csd/CARDDEMO.CSD:317-326` |
| `CAUP` | `COACTUPC` | Account update | `csd/CARDDEMO.CSD:306-316` |
| `CCLI` | `COCRDLIC` | Card list | `csd/CARDDEMO.CSD:357-366` |
| `CCDL` | `COCRDSLC` | Card detail/search | `csd/CARDDEMO.CSD:347-356` |
| `CCUP` | `COCRDUPC` | Card update | `csd/CARDDEMO.CSD:367-377` |
| `CT00` | `COTRN00C` | Transaction list | `csd/CARDDEMO.CSD:419-428` |
| `CT01` | `COTRN01C` | Transaction detail | `csd/CARDDEMO.CSD:429-438` |
| `CT02` | `COTRN02C` | Transaction add | `csd/CARDDEMO.CSD:439-448` |
| `CB00` | `COBIL00C` | Bill payment | `csd/CARDDEMO.CSD:337-346` |
| `CR00` | `CORPT00C` | Transaction report request | `csd/CARDDEMO.CSD:409-418` |
| `CU00` | `COUSR00C` | User list | `csd/CARDDEMO.CSD:449-458` |
| `CU01` | `COUSR01C` | User add | `csd/CARDDEMO.CSD:459-468` |
| `CU02` | `COUSR02C` | User update | `csd/CARDDEMO.CSD:469-478` |
| `CU03` | `COUSR03C` | User delete | `csd/CARDDEMO.CSD:479-488` |
| `CDV1` | `COCRDSEC` | Developer card-search transaction | `csd/CARDDEMO.CSD:388-398` |

`COCRDSEC` is defined in the CSD (`csd/CARDDEMO.CSD:211-218`) but is not present as COBOL source in `cbl/`; see [Source Completeness Gaps](#10-source-completeness-gaps).

## 5. Navigation and State Management

### 5.1 Pseudo-conversational model

The online programs are pseudo-conversational CICS programs. They generally send a BMS map, return with a transaction ID and COMMAREA, receive user input after the next terminal interaction, then either redisplay, update data, or transfer to another program. Examples include:

- `COACTVWC` returns to CICS at `cbl/COACTVWC.cbl:402-403`, sends its map at `:583-589`, and receives it at `:611-618`.
- `COCRDLIC` sends/receives its map at `cbl/COCRDLIC.cbl:939-969` and returns at `:615`.
- `COTRN00C` sends its screen at `cbl/COTRN00C.cbl:534-547` and receives it at `:556-563`.

The shared `CARDDEMO-COMMAREA` is the central navigation and session context. It carries source/target transaction IDs and program names, authenticated user ID/type, re-entry context, selected customer/account/card information, and last map/mapset. See `cpy/COCOM01Y.cpy:19-44`.

### 5.2 Primary navigation graph

```text
CC00 / COSGN00C
  ├─ authenticated administrator ─► CA00 / COADM01C
  │                                  ├─ COUSR00C (list)
  │                                  ├─ COUSR01C (add)
  │                                  ├─ COUSR02C (update)
  │                                  └─ COUSR03C (delete)
  │
  └─ authenticated regular user ───► CM00 / COMEN01C
                                     ├─ COACTVWC (account view)
                                     ├─ COACTUPC (account update)
                                     ├─ COCRDLIC (card list)
                                     ├─ COCRDSLC (card detail)
                                     ├─ COCRDUPC (card update)
                                     ├─ COTRN00C (transaction list)
                                     ├─ COTRN01C (transaction detail)
                                     ├─ COTRN02C (transaction add)
                                     ├─ CORPT00C (reports)
                                     └─ COBIL00C (bill payment)
```

Login chooses `COADM01C` or `COMEN01C` through CICS `XCTL` at `cbl/COSGN00C.cbl:231-237`. The main menu is data-driven: its ten target program names are held in `cpy/COMEN02Y.cpy:23-102` and dispatched by `COMEN01C` at `cbl/COMEN01C.cbl:142-176`. The four administrator targets are defined in `cpy/COADM02Y.cpy:22-42` and dispatched by `COADM01C` at `cbl/COADM01C.cbl:142-166`.

Functional programs commonly use `CDEMO-TO-PROGRAM` from the COMMAREA to return to the menu or caller. Representative transfers appear in `COACTVWC` at `cbl/COACTVWC.cbl:349-350`, `COACTUPC` at `:952-959`, `COCRDSLC` at `:331-332`, `COTRN02C` at `:508-514`, and `CORPT00C` at `:548-550`.

### 5.3 In-domain card navigation

The account and card programs embed destination program, transaction, mapset, and map constants. For example, `COACTVWC` identifies the card list, card update, and card detail destinations at `cbl/COACTVWC.cbl:150-183`; `COCRDLIC` contains the equivalent list/detail/update targets at `cbl/COCRDLIC.cbl:180-210`. This means some navigation is dynamic or contextual and cannot be inferred from only the CICS transaction table.

## 6. Data Stores and Record Model

### 6.1 CICS VSAM resources

| CICS file | Dataset named in CSD | Layout / logical role | Main access patterns |
|---|---|---|---|
| `ACCTDAT` | `AWS.M2.CARDDEMO.ACCTDATA.VSAM.KSDS` | Account | Keyed read/rewrite in account update and billing |
| `CARDDAT` | `AWS.M2.CARDDEMO.CARDDATA.VSAM.KSDS` | Card | Keyed read/rewrite; browse via alternate path |
| `CARDAIX` | `AWS.M2.CARDDEMO.CARDDATA.VSAM.AIX.PATH` | Card alternate-index path | Card list navigation/browsing |
| `CCXREF` | `AWS.M2.CARDDEMO.CARDXREF.VSAM.KSDS` | Card/customer/account cross-reference | Relationship lookup |
| `CUSTDAT` | `AWS.M2.CARDDEMO.CUSTDATA.VSAM.KSDS` | Customer | Keyed read/rewrite |
| `CXACAIX` | `AWS.M2.CARDDEMO.CARDXREF.VSAM.AIX.PATH` | Card-xref alternate path by account | Account-to-card lookup |
| `TRANSACT` | `AWS.M2.CARDDEMO.TRANSACT.VSAM.KSDS` | Online transactions | Keyed lookup, browse, insert |
| `USRSEC` | `AWS.M2.CARDDEMO.USRSEC.VSAM.KSDS` | Application security users | Login, browse, CRUD |

The CSD file-to-dataset mapping is at `csd/CARDDEMO.CSD:1-99`. `CCXREF` is explicitly described as **CARD TO ACCOUNT XREF** at `:37-49`; `CXACAIX` is described as its alternate index by account key at `:63-75`.

### 6.2 Core layouts and relationships

```text
Customer (CUST-ID)
   │
   └── Card Xref (XREF-CUST-ID, XREF-ACCT-ID, XREF-CARD-NUM)
           ├── Card (CARD-NUM, CARD-ACCT-ID)
           └── Account (ACCT-ID)
                    │
                    └── Transaction (TRAN-CARD-NUM, transaction attributes)
```

| Logical record | Copybook | Notable fields / declared record length |
|---|---|---|
| Account | `cpy/CVACT01Y.cpy:4-18` | `ACCT-ID`, status, balance, credit limits, dates, address ZIP, group ID; **300** |
| Card | `cpy/CVACT02Y.cpy:4-12` | `CARD-NUM`, `CARD-ACCT-ID`, CVV, embossed name, expiry, active status; **150** |
| Card cross-reference | `cpy/CVACT03Y.cpy:4-10` | `XREF-CARD-NUM`, `XREF-CUST-ID`, `XREF-ACCT-ID`; **50** |
| Customer | `cpy/CVCUS01Y.cpy:4-24` | identity, address, phones, SSN, government ID, DOB, EFT account, primary-holder flag, FICO score; **500** |
| Transaction | `cpy/CVTRA05Y.cpy:4-20` | ID, type/category, source/description, amount, merchant data, card number, origin/processing timestamps; **350** |
| Daily transaction | `cpy/CVTRA06Y.cpy:4-20` | Daily/batch analogue of transaction; **350** |
| Transaction category balance | `cpy/CVTRA01Y.cpy:4-12` | account/type/category key and balance; **50** |
| Disclosure group | `cpy/CVTRA02Y.cpy:4-12` | account group, transaction type/category, interest rate; **50** |
| Transaction type | `cpy/CVTRA03Y.cpy:4-8` | type code and description; **60** |
| Transaction category | `cpy/CVTRA04Y.cpy:4-12` | type/category key and description; **60** |
| Security user | `cpy/CSUSR01Y.cpy:17-23` | user ID, first/last name, password, user type; **80** |

The `CARDDEMO-COMMAREA` exposes user identity/type and current customer/account/card selections; this provides the online-session equivalent of a workflow context. See `cpy/COCOM01Y.cpy:19-44`.

### 6.3 Data supplied in the repository

The repository includes fixed-width ASCII inputs for account, card, card xref, customer, daily transaction, disclosure group, transaction category balance, transaction category, and transaction type under `data/ASCII/`. It also contains corresponding EBCDIC-named fixed-width files under `data/EBCDIC/`, including security-user data; they are populated files in the current checkout, not zero-byte placeholders.

The supplied data is useful for discovery and test seeding, but it does not itself provide VSAM cluster definitions, key offsets, alternate-index definitions, record-control interval settings, or production-scale data. Those details must be reconstructed or obtained before a byte-compatible VSAM migration.

## 7. Major Workflows

### 7.1 Authentication and authorization routing

1. Transaction `CC00` starts `COSGN00C`.
2. The program receives the sign-on map, reads the `USRSEC` record keyed by user ID, and checks the credentials.
3. It places user ID and type into the COMMAREA.
4. It transfers with `XCTL` to the administrator menu (`COADM01C`) for type `A`, or main menu (`COMEN01C`) for type `U`.

Sources: `cbl/COSGN00C.cbl:110-153, 198-237`; `cpy/CSUSR01Y.cpy:17-23`; `cpy/COCOM01Y.cpy:19-29`.

### 7.2 Account view and maintenance

Account view receives a selected account, reads account, customer, and card-related data, and displays it using the `COACTVW` map. The data retrieval routines are at `cbl/COACTVWC.cbl:687-870`.

Account maintenance receives update input, reads account/customer/xref context, validates map values using shared lookup/date/message structures, and rewrites the `ACCTDAT` and/or `CUSTDAT` records. The primary persistence operations are at `cbl/COACTUPC.cbl:4065-4095`; the associated retrieval code is at `:3654-3921`.

### 7.3 Card list, detail, and update

The card list uses a CICS browse over card data, issuing `STARTBR`, repeated `READNEXT` or `READPREV`, and `ENDBR`, to supply forward/backward pages. Sources: `cbl/COCRDLIC.cbl:1129-1258, 1273-1376`.

Card detail retrieves a card and related information using keyed CICS reads (`cbl/COCRDSLC.cbl:742-803`). Card update reads the existing card, validates the requested changes, then rewrites `CARDDAT` (`cbl/COCRDUPC.cbl:1382-1488`). Card functions can transfer among list, detail, and update using the embedded navigation constants described in [In-domain card navigation](#53-in-domain-card-navigation).

### 7.4 Transaction inquiry and entry

`COTRN00C` supports paged transaction browsing with `STARTBR`, `READNEXT`, `READPREV`, and `ENDBR` (`cbl/COTRN00C.cbl:593-694`). `COTRN01C` displays a selected transaction by keyed read (`cbl/COTRN01C.cbl:269-301`).

`COTRN02C` validates date input through `CSUTLDTC`, reads the required account/card-xref context, browses existing transactions to derive sequence context, then writes a new transaction record. Sources: `cbl/COTRN02C.cbl:393-416, 578-713`.

### 7.5 Bill payment

Billing reads `ACCTDAT` with update intent, retrieves an account-to-card cross-reference through `CXACAIX`, browses transactions, changes the account record, then writes a transaction record. This is a multi-step financial workflow whose modern replacement must preserve atomicity across the account update and transaction insert. Sources: `cbl/COBIL00C.cbl:343-403, 408-520`.

### 7.6 Report submission and batch reporting

`CORPT00C` validates report dates and confirmation input, constructs JCL records, and writes each 80-byte record to TD queue `JOBS`. Sources: `cbl/CORPT00C.cbl:340-435, 462-535`; queue definition: `csd/CARDDEMO.CSD:499-505`.

The batch report procedure unloads `TRANSACT`, filters transactions by processing date, sorts by card number, and invokes batch program `CBTRN03C` to create a 133-byte formatted report. See `proc/TRANREPT.prc:19-78`.

## 8. Batch Integration

### 8.1 VSAM REPRO utility

`proc/REPROC.prc` is a parameterized IDCAMS procedure. It assigns caller-provided input/output datasets and executes `IDCAMS`; the associated control member performs `REPRO INFILE(FILEIN) OUTFILE(FILEOUT)`.

- Procedure: `proc/REPROC.prc:19-29`
- IDCAMS control: `ctl/REPROCT.ctl:15`

### 8.2 Transaction reporting job

`proc/TRANREPT.prc` coordinates the transaction-report pipeline:

1. Executes `REPROC` to unload `AWS.M2.CARDDEMO.TRANSACT.VSAM.KSDS` to a GDG backup with `LRECL=350` (`proc/TRANREPT.prc:21-31`).
2. Uses DFSORT to select transactions in a processing-date range and sort by the card-number bytes (`:33-53`). The supplied symbolic date constants are `2022-01-01` and `2022-07-06` at `:41-46`.
3. Invokes batch program `CBTRN03C` with transaction, cross-reference, type, category, and date-parameter inputs; it produces `AWS.M2.CARDDEMO.TRANREPT(+1)` with `LRECL=133` (`:55-78`).

`CORPT00C` includes the online JCL template references, including `//STEP10 EXEC PROC=TRANREPT` and the `DATEPARM` DD statement, at `cbl/CORPT00C.cbl:94-116`.

## 9. Migration Architecture Implications

### 9.1 Decompose mixed responsibilities

Each online COBOL program mixes terminal I/O, re-entry handling, navigation, validation, authorization, persistence, messages, and business actions. A modern implementation should separate those concerns:

| Legacy concern | Modern responsibility |
|---|---|
| BMS map and generated map copybook | Web/mobile UI view model or API request/response DTO |
| CICS transaction and pseudo-conversation | HTTP endpoint, UI route, and stateless request lifecycle |
| COMMAREA | authenticated session/claims plus explicit workflow or client state |
| `XCTL` with dynamic target names | explicit route/controller transitions; avoid executable program names as UI navigation data |
| CICS VSAM command | repository/data-access service with database transaction boundary |
| CICS browse (`STARTBR`, `READNEXT`, `READPREV`) | indexed query plus stable cursor/keyset pagination |
| CICS `RESP` / `RESP2` and screen errors | typed error handling, validation responses, observable error logging |
| TDQ internal-reader JCL submission | asynchronous report/job orchestration with auditability and idempotency |

### 9.2 Preserve data and access-path semantics

Do not translate VSAM resources as generic tables without preserving their meaningful keys and alternate access paths.

- The account/card/customer/xref relationships should be modeled explicitly from `CVACT01Y`, `CVACT02Y`, `CVACT03Y`, and `CVCUS01Y`.
- `CARDAIX` and `CXACAIX` must become verified database indexes or query paths; see `csd/CARDDEMO.CSD:13-24` and `:63-75`.
- Fixed-width layouts contain implied-decimal signed numeric fields (for example `ACCT-CURR-BAL PIC S9(10)V99` at `cpy/CVACT01Y.cpy:7` and `TRAN-AMT PIC S9(09)V99` at `cpy/CVTRA05Y.cpy:9`). Explicit money/decimal precision decisions are required.
- Card number, customer/account IDs, SSN, passwords, and dates have legacy representations that must be mapped deliberately rather than inferred from presentation fields.

### 9.3 Treat authentication as a security redesign

`CSUSR01Y` stores `SEC-USR-PWD PIC X(08)` directly in the security record (`cpy/CSUSR01Y.cpy:17-23`), and the login flow compares application credentials against `USRSEC`. A modern migration must not preserve this plaintext/fixed-width password model. It should use a managed or securely implemented identity system with salted adaptive password hashes, role claims, secure session/token controls, credential migration/reset planning, and audit events.

### 9.4 Persistence and concurrency contracts

This section is normative for a behavioral migration. The requirements preserve the observed update and insert semantics, while using appropriate database transactions, row locks, optimistic versions, or equivalent mechanisms in the target platform.

#### Account/customer update contract

1. **Capture the displayed snapshot.** When account and customer data are first fetched, the service **MUST** retain the persisted values supplied to the editor as the update baseline. `COACTUPC` copies account and customer data into `ACUP-OLD-DETAILS` at `cbl/COACTUPC.cbl:3801-3884` (the baseline structure is declared at `:669-756`).
2. **Re-read and lock both records before write.** On confirmation, the service **MUST** re-read the account and customer within the write transaction and acquire an update lock, or an isolation-equivalent lock. The legacy program uses `READ ... UPDATE` for `ACCTDAT` at `cbl/COACTUPC.cbl:3888-3915` and for `CUSTDAT` at `:3917-3942`; lock failure is treated as an update failure, with explicit account/customer lock messages declared at `:517-524`.
3. **Reject stale writes.** Before modifying either record, the service **MUST** compare the re-read values with the original baseline and **MUST NOT** apply the submitted changes if either record differs. The legacy comparison begins at `cbl/COACTUPC.cbl:3944-3952`, checks account fields at `:4109-4145`, checks customer fields at `:4147-4191`, and sets `DATA-WAS-CHANGED-BEFORE-UPDATE` on a mismatch. The confirmation flow returns this case to the detail screen rather than marking it successful at `:2602-2615`; its user-facing stale-data message is declared at `:521-522`.
4. **Commit account and customer changes atomically.** The service **MUST** write account and customer changes in one transaction and **MUST** roll back all writes if either write fails. `COACTUPC` rewrites `ACCTDAT` then `CUSTDAT` at `cbl/COACTUPC.cbl:4061-4091`; when the customer rewrite fails it issues `SYNCPOINT ROLLBACK` at `:4093-4102`. An account rewrite failure is detected before the customer write at `:4074-4081`. The migration **MUST NOT** leave a committed account change when the associated customer change fails.
5. **Surface concurrency failures.** Lock contention, stale data, and write failures **MUST** be distinguishable outcomes for callers and operators; they must not be collapsed into a generic success or silently retried. The legacy state handling distinguishes lock error, write failure, and stale data at `cbl/COACTUPC.cbl:2606-2615, 2971-2974`.

#### Transaction identifier and uniqueness contract

1. **Preserve the current generation algorithm until it is deliberately replaced.** To allocate a transaction ID, `COTRN02C` positions a browse at `HIGH-VALUES`, reads the previous record (therefore the highest key), converts that ID to numeric, and adds one. See `cbl/COTRN02C.cbl:442-451`; the `STARTBR`/`READPREV`/`ENDBR` implementation is at `:642-706`. If the browse reaches end-of-file, the program sets the ID to zero before incrementing at `:685-689`.
2. **Treat max-plus-one as concurrency-sensitive.** A migration **MUST NOT** assume the reverse browse plus increment is safe under concurrent creators. It **MUST** use a concurrency-safe allocator (for example a database sequence/identity or a transactionally locked allocation row), or preserve max-plus-one under serializable/locked allocation. If identifier format or ordering changes, that change requires an explicit compatibility decision.
3. **Enforce uniqueness at persistence time.** `TRANSACT` insertion **MUST** be backed by a unique transaction-ID constraint. The legacy `WRITE` supplies `TRAN-ID` as `RIDFLD` at `cbl/COTRN02C.cbl:711-721` and handles both `DFHRESP(DUPKEY)` and `DFHRESP(DUPREC)` as a rejected duplicate (`:723-749`). The modern implementation **MUST** translate a uniqueness violation into a deterministic duplicate/conflict outcome; it **MUST NOT** overwrite an existing transaction. Any automatic retry with a newly allocated ID must be explicitly designed and observable, because the legacy behavior reports the duplicate rather than retrying.

### 9.5 Preserve workflow integrity

Billing writes both an account update and a transaction (`cbl/COBIL00C.cbl:379-385, 512-520`). Transaction entry also relies on relationship validation and transaction ID sequencing/browsing (`cbl/COTRN02C.cbl:578-713`). Modern services need transaction demarcation, concurrency control, duplicate/idempotency handling, and audit history for these workflows.

### 9.6 Migrate reporting as an asynchronous boundary

Reporting is not a synchronous screen-only operation. The online program submits JCL via a CICS TDQ, while the JCL unloads VSAM, filters/sorts, and runs a separate batch program. The migration should provide a durable asynchronous job model, stored criteria, status/results, retries, and report artifact retention. It must also define whether reports run against a point-in-time snapshot and how dates/time zones are interpreted.

### 9.7 Extract behavior before implementation

The source is suitable for the next discovery artifacts—entities, business rules, validation rules, screen flow, and user stories—but is not itself an API contract. Business rules and validations reside inside large screen programs and shared lookup copybooks. In particular, account update (`COACTUPC`, 4,236 lines) and card update (`COCRDUPC`, 1,560 lines) should be analyzed at paragraph/condition level before their logic is implemented elsewhere.

## 10. Source Completeness Gaps

| Gap | Evidence | Impact / follow-up |
|---|---|---|
| Missing `COCRDSEC` source | CSD defines `COCRDSEC` at `csd/CARDDEMO.CSD:211-218` and maps `CDV1` to it at `:388-398`; no `cbl/COCRDSEC.cbl` exists. | Obtain the program, its source dependencies, and any associated map before treating the `CDV1` card-search path as fully covered. |
| Missing batch report program source | `proc/TRANREPT.prc:57` runs `CBTRN03C`; no corresponding source exists in `cbl/`. | Obtain `CBTRN03C` and any copybooks/JCL it needs to preserve report formatting/totals. |
| Missing platform copybooks | COBOL uses CICS copybooks such as `DFHAID`, `DFHBMSCA`, and BMS attribute copybook `DFHATTR`, which are not local application files. | These are IBM platform dependencies rather than application-code omissions; replace their behavior/values during UI migration and provide compiler libraries only if rebuilding legacy code. |
| No complete build/deployment definitions | The extract has CSD resources and selected JCL, but no COBOL compile/link jobs, BMS assembly/generation jobs, or full CICS group-install process. | A legacy runnable environment cannot be reconstructed from the repository alone. Obtain CI/JCL/region configuration if legacy execution is required. |
| Incomplete VSAM physical metadata | CSD names KSDS/AIX paths but does not define VSAM cluster key positions, alternate-index definitions, or full load process. | Derive candidate logical keys from `RIDFLD` usage and copybooks, then validate against IDCAMS definitions/catalog or SME confirmation before migrating data. |
| Partial batch/runtime dependencies | CSD references `AWS.M2.CARDDEMO.LOADLIB` (`csd/CARDDEMO.CSD:489-498`), the procedures reference `AWS.M2.CARDDEMO.CNTL` (`proc/REPROC.prc:28`), and report JCL references `DATEPARM` (`proc/TRANREPT.prc:71-72`). | Obtain these members/data sets and operational scheduling details. Catalog output confirms a `DATEPARM` non-VSAM data set at `catlg/LISTCAT.txt:818`. |
| Seed data is not a complete production or VSAM image | Current checkout has fixed-width ASCII and populated EBCDIC-named data files, but no VSAM cluster/control metadata or production contents. | Use as controlled seed data only; establish data governance, conversion, reconciliation, and test baselines. |
| No generated discovery or modern-delivery artifacts | The repository contains no README, architecture/design document, OpenAPI specification, modern backend/frontend, or prior phase-1 extraction artifact. | This wiki is the first discovery artifact. Subsequent phase-1 documents should cite the original source rather than assume undocumented intent. |

## 11. Source Reference Index

The following files are the highest-value starting points for detailed follow-on analysis:

- **CICS topology:** `00.phase-1-input/csd/CARDDEMO.CSD:1-505`
- **Session and navigation contract:** `00.phase-1-input/cpy/COCOM01Y.cpy:19-44`
- **Regular menu routing:** `00.phase-1-input/cpy/COMEN02Y.cpy:19-112`, `00.phase-1-input/cbl/COMEN01C.cbl:142-176`
- **Administrator menu routing:** `00.phase-1-input/cpy/COADM02Y.cpy:19-48`, `00.phase-1-input/cbl/COADM01C.cbl:142-166`
- **Authentication:** `00.phase-1-input/cbl/COSGN00C.cbl:110-237`, `00.phase-1-input/cpy/CSUSR01Y.cpy:17-23`
- **Core records:** `00.phase-1-input/cpy/CVACT01Y.cpy:4-18`, `CVACT02Y.cpy:4-12`, `CVACT03Y.cpy:4-10`, `CVCUS01Y.cpy:4-24`, `CVTRA05Y.cpy:4-20`
- **Account maintenance:** `00.phase-1-input/cbl/COACTUPC.cbl:3594-4095`
- **Card browse/detail/update:** `00.phase-1-input/cbl/COCRDLIC.cbl:939-1376`, `COCRDSLC.cbl:569-803`, `COCRDUPC.cbl:1329-1488`
- **Transaction/billing:** `00.phase-1-input/cbl/COTRN00C.cbl:534-694`, `COTRN02C.cbl:393-713`, `COBIL00C.cbl:343-520`
- **Reporting:** `00.phase-1-input/cbl/CORPT00C.cbl:340-535`, `00.phase-1-input/proc/TRANREPT.prc:19-78`, `00.phase-1-input/cpy/CVTRA07Y.cpy:4-87`
- **VSAM unload/reload:** `00.phase-1-input/proc/REPROC.prc:19-29`, `00.phase-1-input/ctl/REPROCT.ctl:15`

## 12. Assessment

The supplied corpus is complete enough to begin structured discovery and a preliminary modernization design. It provides the principal online workflows, display maps, data layouts, CICS entry points, direct data-access behavior, navigation metadata, seed data, and the central reporting integration.

It is not complete enough to claim full behavioral or operational equivalence. The immediate blockers are the absent `COCRDSEC` and `CBTRN03C` sources, missing VSAM physical/key metadata, missing build/install assets, and incomplete batch/runtime operational definitions. Those artifacts should be resolved before finalizing database DDL, report equivalence, production migration tooling, or a complete acceptance-test baseline.
