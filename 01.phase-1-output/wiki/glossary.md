# Glossary

[← Overview](README.md) | [Architecture](architecture.md)

Domain-term definitions extracted from business meaning are owned by `01.phase-1-output/business-glossary.md`; this page covers naming conventions, technical/mainframe terms, and identifiers needed to read the source and this wiki.

## Naming conventions observed in this codebase

| Pattern | Meaning | Examples |
|---|---|---|
| `CO*C.cbl` | Online CICS COBOL program | `COSGN00C`, `COACTUPC` (`00.phase-1-input/cbl/`) |
| `CS*` | Common/shared utility program or copybook | `CSUTLDTC.cbl`, `CSSTRPFY.cpy`, `CSLKPCDY.cpy` |
| `CB*C` | Batch COBOL program (referenced, not in tree) | `CBTRN03C` (`proc/TRANREPT.prc:57`) |
| `CV*Y.cpy` | Business record-layout copybook | `CVACT01Y` (account), `CVTRA05Y` (transaction) |
| `CO*Y.cpy` | Application copybook (COMMAREA, menus, titles) | `COCOM01Y`, `COMEN02Y`, `COTTL01Y` |
| Mapset = program name minus trailing `C` | BMS mapset per program | `COSGN00C` ↔ mapset `COSGN00`, map `COSGN0A` |
| `...I` / `...O` field suffixes | BMS symbolic-map input/output fields | `COSGN0AI` / `COSGN0AO` (`cpy-bms/COSGN00.CPY`) |
| `CDEMO-*` | COMMAREA session fields | `CDEMO-USER-TYPE`, `CDEMO-TO-PROGRAM` (`cpy/COCOM01Y.cpy`) |
| `WS-*` / `LIT-*` | Working-storage variables / literals | `WS-TRANID`, `LIT-ACCTFILENAME` |
| `nnnn-PARAGRAPH-NAME` | Numbered procedure paragraphs | `9600-WRITE-PROCESSING` (`cbl/COACTUPC.cbl:3888`) |

## Application identifiers

| Term | Definition |
|---|---|
| CardDemo | AWS sample mainframe credit-card application; this codebase (version `CardDemo_v1.0-15-g27d6c6f-68`, `proc/REPROC.prc:31`) |
| `AWS.M2.CARDDEMO.*` | Dataset high-level qualifier for all files (`catlg/LISTCAT.txt`) |
| CC00, CM00, CA00, CAVW, CAUP, CCLI, CCDL, CCUP, CT00, CT01, CT02, CR00, CB00, CU00–CU03, CDV1 | CICS transaction ids — see table in [Architecture](architecture.md#cics-resource-map-transactions--programs--mapsets) |
| ACCTDAT, CARDDAT, CARDAIX, CCXREF, CXACAIX, CUSTDAT, TRANSACT, USRSEC | CICS FILE names — see [Data Overview](data-overview.md) |
| `JOBS` | CICS transient data queue routed to the JES internal reader (`csd/CARDDEMO.CSD:499-505`) |
| User type `'A'` / `'U'` | Admin / regular user (`cpy/COCOM01Y.cpy:26-28`, `cpy/CSUSR01Y.cpy:22`) |

## Mainframe / CICS terms used in this wiki

| Term | Meaning here |
|---|---|
| CICS | IBM's online transaction monitor; runs all `CO*C` programs |
| Pseudo-conversational | Program ends (`RETURN TRANSID`) between user interactions; state is carried in the COMMAREA |
| COMMAREA | Communication area passed between programs/tasks; here always `CARDDEMO-COMMAREA` (`cpy/COCOM01Y.cpy:19-44`) |
| XCTL | CICS transfer-control to another program (no return) |
| BMS / mapset / map | Basic Mapping Support — 3270 screen definitions (`00.phase-1-input/bms/`) |
| AID / PF key | Attention identifier — which key the user pressed; mapped via `cpy/CSSTRPFY.cpy` |
| VSAM KSDS | Key-sequenced dataset — the record stores used for all data |
| Alternate index (AIX) / PATH | Secondary key access to a KSDS, e.g. `CARDAIX` (cards by account id) |
| STARTBR / READNEXT / READPREV | CICS browse commands used for paged lists |
| READ UPDATE / REWRITE | Record-level update protocol used by all update programs |
| TDQ (transient data queue) | Sequential CICS queue; `JOBS` feeds the JES internal reader |
| Internal reader (INTRDR) | JES facility that accepts JCL written as data, submitting it as a job |
| JCL / PROC / GDG | Job Control Language; cataloged procedure (`proc/*.prc`); generation data group (e.g. `TRANREPT(+1)`) |
| IDCAMS / REPRO / LISTCAT | VSAM utility; its copy function; its catalog listing (`ctl/REPROCT.ctl`, `catlg/LISTCAT.txt`) |
| CSD | CICS system definition file — resource definitions (`csd/CARDDEMO.CSD`) |
| CEEDAYS | Language Environment date-conversion API called by `CSUTLDTC` (`cbl/CSUTLDTC.cbl:116`) |
| Zoned-decimal overpunch | Last digit + sign encoded in one character in the ASCII seed files (e.g. `{` = +0), `data/ASCII/*.txt` |
| EBCDIC | Mainframe character encoding of the `data/EBCDIC/*.PS` seed files |
