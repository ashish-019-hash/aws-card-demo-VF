# Module: Credit Card Management

[← Overview](../README.md) | [Architecture](../architecture.md) | [Data Overview](../data-overview.md)

## Purpose

List, view, and update credit card records stored in the `CARDDAT` VSAM file (keyed by card number, with alternate index `CARDAIX` keyed by account id).

| Function | Tran | Program | Mapset/Map | Screen source |
|---|---|---|---|---|
| Credit Card List | CCLI | `00.phase-1-input/cbl/COCRDLIC.cbl` (1,459 lines) | COCRDLI / CCRDLIA | `00.phase-1-input/bms/COCRDLI.bms` |
| Credit Card View | CCDL | `00.phase-1-input/cbl/COCRDSLC.cbl` (887 lines) | COCRDSL / CCRDSLA | `00.phase-1-input/bms/COCRDSL.bms` |
| Credit Card Update | CCUP | `00.phase-1-input/cbl/COCRDUPC.cbl` (1,560 lines) | COCRDUP / CCRDUPA | `00.phase-1-input/bms/COCRDUP.bms` |

## Data touched

| CICS FILE | Record copybook | Access |
|---|---|---|
| CARDDAT (card master, key `CARD-NUM X(16)`) | `00.phase-1-input/cpy/CVACT02Y.cpy` | STARTBR/READNEXT/READPREV (list); READ (view); READ UPDATE + REWRITE (update) |
| CARDAIX (alternate path by `CARD-ACCT-ID`) | same record | READ when only the account id is known |

File-name literals `'CARDDAT '`/`'CARDAIX '`: `cbl/COCRDSLC.cbl:187-190`, `cbl/COCRDUPC.cbl:252-254`, `cbl/COCRDLIC.cbl:214-217`.

## Credit Card List (COCRDLIC)

- Pages through `CARDDAT` 7 rows at a time (`WS-MAX-SCREEN-LINES VALUE 7`, `cbl/COCRDLIC.cbl:177-178`) using STARTBR (`:1129`), READNEXT (`:1146, 1197`), and READPREV for backward paging (`:1273-1322`); page state is kept in the COMMAREA (`WS-CA-SCREEN-NUM`, `CA-FIRST-PAGE`, `CA-LAST-PAGE-SHOWN`, `cbl/COCRDLIC.cbl:237-240`).
- Filtering: account/card filters come from COMMAREA context or screen input; the screen-setup logic keys off `CDEMO-ACCT-ID = 0` / `CDEMO-CARD-NUM = 0` (`cbl/COCRDLIC.cbl:847-864`).
  - **Ambiguity:** the header comment says admins see all cards and non-admins only their account's cards (`cbl/COCRDLIC.cbl:5-7`), but the program never tests `CDEMO-USRTYP-ADMIN` when filtering — the behavior is driven by whether account/card context is present. Treat the role-based description as unverified.
- Row selection: one-character action per row, `88 SELECT-OK VALUES 'S', 'U'` — `'S'` (view) XCTLs to `COCRDSLC`, `'U'` (update) XCTLs to `COCRDUPC` (`cbl/COCRDLIC.cbl:77-79, 538, 566`).

## Credit Card View (COCRDSLC)

Reads one card either directly by card number (`FILE (LIT-CARDFILENAME)`, `cbl/COCRDSLC.cbl:743`) or via the account path (`FILE (LIT-CARDFILENAME-ACCT-PATH)`, `:784`) and displays it. PF3 returns to the caller.

## Credit Card Update (COCRDUPC)

- Fetches the card via `9100-GETCARD-BYACCTCARD` (`cbl/COCRDUPC.cbl:1376-1415`).
- After field edits and an explicit confirmation step, re-reads the record for UPDATE (`:1383`) and `REWRITE FILE(LIT-CARDFILENAME)` (`:1478`) — same optimistic re-check pattern as [Account Update](account-management.md).

## Notes

- The card record includes `CARD-CVV-CD` and the typo field `CARD-EXPIRAION-DATE` (`00.phase-1-input/cpy/CVACT02Y.cpy:7-9`).
- Program `COCRDSEC` ("CREDIT CARD SEARCH", transaction `CDV1`) is defined in the CSD but has no source in the tree (`00.phase-1-input/csd/CARDDEMO.CSD:211-218, 388-398`).
- Validation specifics are owned by `01.phase-1-output/validation-rules.md`.
