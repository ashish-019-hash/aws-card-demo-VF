# Module: Menus & Navigation

[← Overview](../README.md) | [Architecture](../architecture.md) | Prev: [Authentication](authentication.md)

## Purpose

Two data-driven menu programs route signed-on users to every function. Navigation everywhere else follows the pseudo-conversational pattern described in [Architecture → Runtime model](../architecture.md#runtime-model).

| Menu | Tran | Program | Mapset/Map | Option table |
|---|---|---|---|---|
| Main menu (regular users) | CM00 | `00.phase-1-input/cbl/COMEN01C.cbl` | COMEN01 / COMEN1A | `00.phase-1-input/cpy/COMEN02Y.cpy` |
| Admin menu | CA00 | `00.phase-1-input/cbl/COADM01C.cbl` | COADM01 / COADM1A | `00.phase-1-input/cpy/COADM02Y.cpy` |

## Option tables (data-driven dispatch)

Menu entries are copybook constants redefined as an `OCCURS` table of number / name / program / user-type:

- Main menu: `CDEMO-MENU-OPT-COUNT = 10` (`cpy/COMEN02Y.cpy:21`), entries at `cpy/COMEN02Y.cpy:23-85`, table redefinition `:87-92` (`CDEMO-MENU-OPT-NUM`, `-NAME X(35)`, `-PGMNAME X(8)`, `-USRTYPE X(1)`).
- Admin menu: `CDEMO-ADMIN-OPT-COUNT = 4` (`cpy/COADM02Y.cpy:20`), entries at `:22-43`, redefinition `:44-48`.

### Main menu options (`cpy/COMEN02Y.cpy:23-85`)

| # | Name (as coded) | Program | User type |
|---|---|---|---|
| 1 | Account View | COACTVWC | U |
| 2 | Account Update | COACTUPC | U |
| 3 | Credit Card List | COCRDLIC | U |
| 4 | Credit Card View | COCRDSLC | U |
| 5 | Credit Card Update | COCRDUPC | U |
| 6 | Transaction List | COTRN00C | U |
| 7 | Transaction View | COTRN01C | U |
| 8 | Transaction Add | COTRN02C | U (alternate label `'Transaction Add (Admin Only)'` is commented out at `cpy/COMEN02Y.cpy:69`) |
| 9 | Transaction Reports | CORPT00C | U |
| 10 | Bill Payment | COBIL00C | U |

### Admin menu options (`cpy/COADM02Y.cpy:22-43`)

| # | Name | Program |
|---|---|---|
| 1 | User List (Security) | COUSR00C |
| 2 | User Add (Security) | COUSR01C |
| 3 | User Update (Security) | COUSR02C |
| 4 | User Delete (Security) | COUSR03C |

## Dispatch and authorization

`COMEN01C` validates the typed option number — non-numeric, zero, or greater than `CDEMO-MENU-OPT-COUNT` is rejected (`cbl/COMEN01C.cbl:126-135`) — and blocks options whose `CDEMO-MENU-OPT-USRTYPE` is `'A'` when the session user is not an admin, with message `'No access - Admin Only option... '` (`cbl/COMEN01C.cbl:136-141`). A valid choice resets the program context and does `XCTL PROGRAM(CDEMO-MENU-OPT-PGMNAME(WS-OPTION))` (`cbl/COMEN01C.cbl:151-155`).

Every target program returns to its caller on PF3 via `XCTL PROGRAM(CDEMO-TO-PROGRAM)` using the COMMAREA routing fields (e.g. `cbl/COMEN01C.cbl:176`, `cbl/COBIL00C.cbl:282`, `cbl/COACTVWC.cbl:349`).

PF-key decoding is standardized by the copybook `00.phase-1-input/cpy/CSSTRPFY.cpy` (`YYYY-STORE-PFKEY` paragraph, line 17), which maps CICS AID bytes to a common PF-key field — see [Shared Components](shared-components.md).

Full per-screen field and navigation detail is owned by `01.phase-1-output/screen-flow.md`.
