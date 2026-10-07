# Data Overview

[← Overview](README.md) | [Architecture](architecture.md) | [Key Workflows](key-workflows.md)

All persistent data is in VSAM KSDS files (no database). CICS FILE definitions are at `00.phase-1-input/csd/CARDDEMO.CSD:1-99`; physical dataset attributes (keys, record lengths, alternate indexes) are in the IDCAMS listing `00.phase-1-input/catlg/LISTCAT.txt`. Field-level entity detail is owned by `01.phase-1-output/business-entities.md` — this page stays at the file/record level.

## Online VSAM files (defined in the CSD)

| CICS FILE | Dataset (`AWS.M2.CARDDEMO.` prefix) | Key | LRECL | Record copybook | Used by (programs) |
|---|---|---|---|---|---|
| ACCTDAT | ACCTDATA.VSAM.KSDS | `ACCT-ID` 9(11) | 300 | `cpy/CVACT01Y.cpy` (`ACCOUNT-RECORD`) | COACTVWC, COACTUPC, COBIL00C |
| CARDDAT | CARDDATA.VSAM.KSDS | `CARD-NUM` X(16) | 150 | `cpy/CVACT02Y.cpy` (`CARD-RECORD`) | COCRDLIC, COCRDSLC, COCRDUPC |
| CARDAIX | CARDDATA.VSAM.AIX.PATH | `CARD-ACCT-ID` 9(11) | 150 | same | COCRDSLC, COCRDUPC (account path) |
| CCXREF | CARDXREF.VSAM.KSDS | `XREF-CARD-NUM` X(16) | 50 | `cpy/CVACT03Y.cpy` (`CARD-XREF-RECORD`) | COTRN02C |
| CXACAIX | CARDXREF.VSAM.AIX.PATH | `XREF-ACCT-ID` 9(11) | 50 | same | COACTVWC, COACTUPC, COBIL00C, COTRN02C |
| CUSTDAT | CUSTDATA.VSAM.KSDS | `CUST-ID` 9(9) | 500 | `cpy/CVCUS01Y.cpy` (`CUSTOMER-RECORD`) | COACTVWC, COACTUPC |
| TRANSACT | TRANSACT.VSAM.KSDS (AIX exists on card/timestamp, `catlg/LISTCAT.txt:3645`) | `TRAN-ID` X(16) | 350 | `cpy/CVTRA05Y.cpy` (`TRAN-RECORD`) | COTRN00C/01C/02C, COBIL00C |
| USRSEC | USRSEC.VSAM.KSDS | `SEC-USR-ID` X(8) | 80 | `cpy/CSUSR01Y.cpy` (`SEC-USER-DATA`) | COSGN00C, COUSR00C-03C |

CSD FILE definition lines: ACCTDAT `:1`, CARDAIX `:13`, CARDDAT `:25`, CCXREF `:37`, CUSTDAT `:50`, CXACAIX `:63`, TRANSACT `:76`, USRSEC `:88`. Cluster attributes in `catlg/LISTCAT.txt`: ACCTDATA `:22`, CARDDATA `:164` (+AIX `:254`), CARDXREF `:365` (+AIX `:455`), CUSTDATA `:595`, TRANSACT `:3555` (+AIX `:3645`), USRSEC `:3846`.

## Entity relationships (as implemented by keys)

- `CARD-XREF-RECORD` ties the three masters together: `XREF-CARD-NUM` → card, `XREF-CUST-ID` → customer, `XREF-ACCT-ID` → account (`cpy/CVACT03Y.cpy:4-8`).
- `CARD-RECORD.CARD-ACCT-ID` also carries the owning account on the card itself (`cpy/CVACT02Y.cpy:6`).
- `TRAN-RECORD.TRAN-CARD-NUM` links transactions to cards; type/category codes reference `TRANTYPE`/`TRANCATG` (`cpy/CVTRA05Y.cpy`).

## Batch-only / reference datasets (in the catalog and seed data, NOT in the CSD)

| Dataset | Record copybook | Catalog ref |
|---|---|---|
| TCATBALF (transaction category balance, 50 bytes, key acct+type+cat) | `cpy/CVTRA01Y.cpy` | `catlg/LISTCAT.txt:1334` |
| DISCGRP (disclosure group, 50 bytes) | `cpy/CVTRA02Y.cpy` | `:859` |
| TRANTYPE (transaction type, 60 bytes) | `cpy/CVTRA03Y.cpy` | `:3742` |
| TRANCATG (transaction category, 60 bytes) | `cpy/CVTRA04Y.cpy` | `:1440` |
| DALYTRAN (daily transaction feed, 350 bytes) | `cpy/CVTRA06Y.cpy` | `:786-801` |
| GDGs: DALYREJS, SYSTRAN, TRANREPT, TRANSACT.BKUP / .DALY / .COMBINED, TCATBALF.BKUP | — | `:684, 1098, 1527, 1631, 3021, 2919, 1202` |

These imply a daily batch posting suite whose programs are **not** in the repository (see [Overview → gaps](README.md#known-gaps-and-ambiguities-flagged-during-orientation)).

## Seed data

ASCII fixed-width files in `00.phase-1-input/data/ASCII/` (numeric fields use zoned-decimal overpunch characters, e.g. trailing `{` for a positive zero digit — visible in `acctdata.txt` line 1):

| File | Rows | Layout |
|---|---|---|
| `acctdata.txt` | 50 | `CVACT01Y` |
| `carddata.txt` | 50 | `CVACT02Y` |
| `cardxref.txt` | 50 | `CVACT03Y` |
| `custdata.txt` | 50 | `CVCUS01Y` |
| `dailytran.txt` | 300 | `CVTRA06Y` |
| `discgrp.txt` | 51 | `CVTRA02Y` |
| `tcatbal.txt` | 50 | `CVTRA01Y` |
| `trancatg.txt` | 18 | `CVTRA04Y` |
| `trantype.txt` | 7 | `CVTRA03Y` |

EBCDIC equivalents are in `00.phase-1-input/data/EBCDIC/*.PS` (12 files), including `USRSEC.PS` (10 users — the only user seed; no ASCII version exists) and the byte-identical duplicates `ACCDATA.PS`/`ACCTDATA.PS`. No seed file exists for `TRANSACT` itself.
