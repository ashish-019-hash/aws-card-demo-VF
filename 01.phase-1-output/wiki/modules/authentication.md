# Module: Authentication / Sign-on

[← Overview](../README.md) | [Architecture](../architecture.md) | Next: [Menus & Navigation](menu-navigation.md)

## Purpose

Entry point of the application. Transaction **CC00** runs program **COSGN00C**, which presents the sign-on screen (mapset `COSGN00`, map `COSGN0A`), authenticates the user against the `USRSEC` VSAM file, and routes to the correct menu by user type.

| Artifact | Path |
|---|---|
| Program | `00.phase-1-input/cbl/COSGN00C.cbl` (260 lines) |
| Screen | `00.phase-1-input/bms/COSGN00.bms`, symbolic map `00.phase-1-input/cpy-bms/COSGN00.CPY` |
| User record | `00.phase-1-input/cpy/CSUSR01Y.cpy:17-23` (`SEC-USER-DATA`) |
| CICS defs | Transaction CC00 → COSGN00C at `00.phase-1-input/csd/CARDDEMO.CSD:378-387`; file USRSEC at `:88-99` |

## Behavior (as coded)

1. Program constants: `WS-PGMNAME 'COSGN00C'`, `WS-TRANID 'CC00'`, `WS-USRSEC-FILE 'USRSEC  '` (`cbl/COSGN00C.cbl:36-39`).
2. The sign-on screen shows titles, transaction/program names, current date/time, and the CICS APPLID/SYSID obtained via `EXEC CICS ASSIGN` (`cbl/COSGN00C.cbl:198-204`).
3. `READ-USER-SEC-FILE` (`cbl/COSGN00C.cbl:209-250`) reads `USRSEC` by the entered user id and compares the stored password to the typed one in **plaintext** (`IF SEC-USR-PWD = WS-USER-PWD`, line 223).
4. On success it populates the shared COMMAREA (`CDEMO-USER-ID`, `CDEMO-USER-TYPE`, context = enter) and transfers control:
   - user type `'A'` (`CDEMO-USRTYP-ADMIN`) → `XCTL PROGRAM('COADM01C')` (admin menu), lines 231-234
   - otherwise → `XCTL PROGRAM('COMEN01C')` (main menu), lines 236-239
5. Wrong password → message `'Wrong Password. Try again ...'` and the screen is re-sent (lines 242-245).

## User record shape

`SEC-USER-DATA` (`cpy/CSUSR01Y.cpy:17-23`): `SEC-USR-ID X(8)` (key), first/last name `X(20)` each, `SEC-USR-PWD X(8)`, `SEC-USR-TYPE X(1)`, filler `X(23)` — LRECL 80, matching the USRSEC KSDS in `00.phase-1-input/catlg/LISTCAT.txt`.

Seed users exist only in EBCDIC form (`00.phase-1-input/data/EBCDIC/AWS.M2.CARDDEMO.USRSEC.PS`); decoded, the file contains 10 users including `ADMIN001`/`PASSWORD`/type `A`.

## Modernization flags

- Plaintext password storage/comparison (see also [Overview → gaps](../README.md#known-gaps-and-ambiguities-flagged-during-orientation)).
- Authorization is a single one-character role flag carried in the COMMAREA for the whole session.

Related: [User Administration](user-administration.md) maintains the same `USRSEC` file. Deeper rule/validation detail: see `01.phase-1-output/validation-rules.md` and `01.phase-1-output/business-rules-catalog.md`.
