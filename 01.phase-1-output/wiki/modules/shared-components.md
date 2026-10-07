# Module: Shared Components & Utilities

[← Overview](../README.md) | [Architecture](../architecture.md)

## Called subprogram: CSUTLDTC (date validation)

`00.phase-1-input/cbl/CSUTLDTC.cbl` (157 lines) is the only non-CICS-transaction program in the tree. It is statically `CALL`ed with a date, a format string, and a result area, and validates the date via the Language Environment `CEEDAYS` API (`cbl/CSUTLDTC.cbl:116`), returning a severity code and message.

Callers:
- `CORPT00C` — report start/end dates (`00.phase-1-input/cbl/CORPT00C.cbl:392, 411-414`)
- `COTRN02C` — transaction original/processing timestamps (`00.phase-1-input/cbl/COTRN02C.cbl:393, 413`)

`CEEDAYS` itself is an LE service, not present in the tree.

## Screen-plumbing copybooks (`00.phase-1-input/cpy/`)

| Copybook | Role |
|---|---|
| `COCOM01Y.cpy` | `CARDDEMO-COMMAREA` — shared session/navigation state (see [Architecture](../architecture.md#shared-commarea)) |
| `COTTL01Y.cpy` | Screen title literals (`CCDA-TITLE01/02`) |
| `CSDAT01Y.cpy` | Current date/time work fields used on every screen header |
| `CSMSG01Y.cpy` | Common messages (e.g. thank-you / invalid-key) |
| `CSMSG02Y.cpy` | Abend data area |
| `CSSTRPFY.cpy` | `YYYY-STORE-PFKEY` — maps CICS AID bytes to a common PF-key field (`cpy/CSSTRPFY.cpy:17+`) |
| `CSSETATY.cpy` | Screen attribute setter, expanded via `COPY ... REPLACING` (39 `COPY CSSETATY` expansions in `COACTUPC` alone) |
| `CVCRD01Y.cpy` | Card work area (`CCARD-*` fields) shared by card/account programs |
| `CSUTLDWY.cpy`, `CSUTLDPY.cpy` | Date-edit work areas / procedure code used by `COACTUPC` |
| `CSLKPCDY.cpy` | 1,318 lines of `88`-level lookup data: NANP phone area codes, US state codes, state+ZIP-prefix combinations |

CICS-supplied copybooks `DFHAID` and `DFHBMSCA` are referenced by programs but are not in the tree (expected — they ship with CICS).

## Business record copybooks

Record layouts for VSAM files are listed in [Data Overview](../data-overview.md). Additional copybooks not used by any online program in the tree:

- `COSTM01.CPY` — "Transaction altered Layout for use in reporting" (`cpy/COSTM01.CPY:2`), a TRNX record keyed by card+id; batch-oriented.
- `CUSTREC.cpy` — near-duplicate of `CVCUS01Y.cpy` differing only in the DOB field name (`CUST-DOB-YYYYMMDD`, `cpy/CUSTREC.cpy:19` vs `CUST-DOB-YYYY-MM-DD`, `cpy/CVCUS01Y.cpy:19`).
- `UNUSED1Y.cpy` — explicitly named as unused.
- `CVTRA01Y.cpy` (transaction category balance), `CVTRA02Y.cpy` (disclosure group), `CVTRA06Y.cpy` (daily transaction), `CVTRA07Y.cpy` (report lines) — all batch-side layouts; their programs are not in the tree.

## BMS symbolic maps

Each mapset in `00.phase-1-input/bms/` has a generated symbolic-map copybook of the same name in `00.phase-1-input/cpy-bms/` (e.g. `bms/COSGN00.bms` ↔ `cpy-bms/COSGN00.CPY`). Programs copy these to address screen fields (`...I` input / `...O` output suffixes).
