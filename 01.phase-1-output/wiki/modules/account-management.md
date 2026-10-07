# Module: Account Management

[← Overview](../README.md) | [Architecture](../architecture.md) | [Data Overview](../data-overview.md)

## Purpose

View and update account master data together with the owning customer's data. Account lookup always goes through the card cross-reference file's account-keyed alternate index path.

| Function | Tran | Program | Mapset/Map | Screen source |
|---|---|---|---|---|
| Account View | CAVW | `00.phase-1-input/cbl/COACTVWC.cbl` (941 lines) | COACTVW / CACTVWA | `00.phase-1-input/bms/COACTVW.bms` |
| Account Update | CAUP | `00.phase-1-input/cbl/COACTUPC.cbl` (4,236 lines — largest program) | COACTUP / CACTUPA | `00.phase-1-input/bms/COACTUP.bms` |

## Data touched

| CICS FILE | Record copybook | Access |
|---|---|---|
| CXACAIX (card xref, account path) | `00.phase-1-input/cpy/CVACT03Y.cpy` | READ by `XREF-ACCT-ID` |
| ACCTDAT (account master) | `00.phase-1-input/cpy/CVACT01Y.cpy` | READ; READ UPDATE + REWRITE in COACTUPC |
| CUSTDAT (customer master) | `00.phase-1-input/cpy/CVCUS01Y.cpy` | READ; READ UPDATE + REWRITE in COACTUPC |

File-name literals: `LIT-ACCTFILENAME 'ACCTDAT'`, `LIT-CUSTFILENAME 'CUSTDAT'`, `LIT-CARDXREFNAME-ACCT-PATH 'CXACAIX'` (`cbl/COACTVWC.cbl:184-193`).

## Account View (COACTVWC)

- `9000-READ-ACCT` (`cbl/COACTVWC.cbl:687-720`) drives a three-step read chain: card xref via `CXACAIX` (READ at `:727-736`) → account via `ACCTDAT` → customer via `CUSTDAT` (error handling referencing each file at `:763, 813, 862`).
- PF3 returns to the caller via `XCTL PROGRAM(...)` (`cbl/COACTVWC.cbl:349`).

## Account Update (COACTUPC)

The heavyweight program of the application. Structure (paragraph numbers are source paragraph names):

- `1200-EDIT-MAP-INPUTS` (`cbl/COACTUPC.cbl:1429-1678`) orchestrates a full field-edit suite, `1210-EDIT-ACCOUNT` through `1280-EDIT-US-STATE-ZIP-CD` (`cbl/COACTUPC.cbl:1783-2558`): mandatory, yes/no, alpha/alphanumeric required+optional, numeric, signed 9V2 amounts, US phone number, SSN, US state code, FICO score, and state+ZIP consistency.
- Reference data for those edits comes from `00.phase-1-input/cpy/CSLKPCDY.cpy` (1,318 lines of `88`-level lookup values: North-America phone area codes, US state codes, valid state+ZIP-prefix combinations) and the date-edit copybooks `CSUTLDWY`/`CSUTLDPY` (see [Shared Components](shared-components.md)).
- `1205-COMPARE-OLD-NEW` (`cbl/COACTUPC.cbl:1681-1777`) detects whether anything actually changed before an update is attempted.
- `2000-DECIDE-ACTION` routes a confirmed change to `9600-WRITE-PROCESSING` (`cbl/COACTUPC.cbl:2604-2605`).
- `9600-WRITE-PROCESSING` (`cbl/COACTUPC.cbl:3888-4105`) does READ UPDATE on both files, re-checks for concurrent change via `9700-CHECK-CHANGE-IN-REC` (`:3947-3948`, paragraph at `:4109-4193`), then `REWRITE FILE(LIT-ACCTFILENAME)` (`:4066`) and `REWRITE FILE(LIT-CUSTFILENAME)` (`:4086`) — an optimistic-locking pattern.
- Screen attribute handling is done by ~38 `COPY CSSETATY REPLACING ...` expansions (see [Shared Components](shared-components.md)).

## Notes

- Field-level validation detail is owned by `01.phase-1-output/validation-rules.md`; entity field lists by `01.phase-1-output/business-entities.md`.
- The account record field `ACCT-EXPIRAION-DATE` (`00.phase-1-input/cpy/CVACT01Y.cpy:11`) carries a typo preserved from source (likewise `CARD-EXPIRAION-DATE`, `00.phase-1-input/cpy/CVACT02Y.cpy:9`).
