# Module: Transaction Management

[← Overview](../README.md) | [Architecture](../architecture.md) | [Data Overview](../data-overview.md)

## Purpose

Browse, inspect, and create records in the `TRANSACT` VSAM file (350-byte `TRAN-RECORD`, `00.phase-1-input/cpy/CVTRA05Y.cpy:4-18`, keyed by `TRAN-ID X(16)`).

| Function | Tran | Program | Mapset/Map | Screen source |
|---|---|---|---|---|
| Transaction List | CT00 | `00.phase-1-input/cbl/COTRN00C.cbl` (699 lines) | COTRN00 / COTRN0A | `00.phase-1-input/bms/COTRN00.bms` |
| Transaction View | CT01 | `00.phase-1-input/cbl/COTRN01C.cbl` (330 lines) | COTRN01 / COTRN1A | `00.phase-1-input/bms/COTRN01.bms` |
| Transaction Add | CT02 | `00.phase-1-input/cbl/COTRN02C.cbl` (783 lines) | COTRN02 / COTRN2A | `00.phase-1-input/bms/COTRN02.bms` |

## Transaction List (COTRN00C)

- File literal `WS-TRANSACT-FILE 'TRANSACT'` (`cbl/COTRN00C.cbl:39`).
- Pages forward with STARTBR + READNEXT (`cbl/COTRN00C.cbl:281-308`) and backward with READPREV (`:335-360`).
- Selecting a row routes to the view program: `MOVE 'COTRN01C' TO CDEMO-TO-PROGRAM` then `XCTL` (`cbl/COTRN00C.cbl:188-193`).

## Transaction View (COTRN01C)

Reads one record by key: `READ-TRANSACT-FILE` with `RIDFLD(TRAN-ID)` (`cbl/COTRN01C.cbl:267-273`) and displays it.

## Transaction Add (COTRN02C)

1. Resolves the account/card context: if the user enters an account id, reads the xref via `CXACAIX` (`READ-CXACAIX-FILE`, `cbl/COTRN02C.cbl:576-579`, invoked at `:208`); if a card number, via `CCXREF` (`READ-CCXREF-FILE`, `:609-612`, invoked at `:222`). File literals at `:41-42`.
2. Validates input fields; dates are checked by `CALL 'CSUTLDTC'` for the original and processing timestamps (`cbl/COTRN02C.cbl:393, 413`) — see [Shared Components](shared-components.md).
3. Determines the next key by browsing the file backwards from high-values: `STARTBR-TRANSACT-FILE` (`:642`) + `READPREV-TRANSACT-FILE` (`:673`), converting the last `TRAN-ID` to numeric and `ADD 1 TO WS-TRAN-ID-N` (`:449`).
4. Requires an explicit confirmation, then `WRITE-TRANSACT-FILE` (`:466`, paragraph at `:709-`).

## Notes

- There is no seed `TRANSACT` data in the repository; `00.phase-1-input/data/ASCII/dailytran.txt` uses the structurally identical `DALYTRAN-RECORD` layout (`00.phase-1-input/cpy/CVTRA06Y.cpy`).
- Transaction type and category reference data exist as copybooks and seed files (`00.phase-1-input/cpy/CVTRA03Y.cpy`, `CVTRA04Y.cpy`; `data/ASCII/trantype.txt`, `trancatg.txt`) but no online program in the tree reads them — they are used by the batch report step (see [Reporting](reporting.md)).
- Deeper rule/validation detail: `01.phase-1-output/business-rules-catalog.md`, `01.phase-1-output/validation-rules.md`.
