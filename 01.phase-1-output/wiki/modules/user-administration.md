# Module: User Administration (Admin only)

[← Overview](../README.md) | [Architecture](../architecture.md) | Related: [Authentication](authentication.md)

## Purpose

Full CRUD over application users in the `USRSEC` VSAM file. Reached only through the admin menu (`00.phase-1-input/cpy/COADM02Y.cpy:22-43`); the four programs are the admin menu's four options.

| Function | Tran | Program | Mapset/Map | Core operation |
|---|---|---|---|---|
| User List | CU00 | `00.phase-1-input/cbl/COUSR00C.cbl` (695 lines) | COUSR00 / COUSR0A | STARTBR/READNEXT paging (`:284-311`), READPREV backward (`:338-343`) |
| User Add | CU01 | `00.phase-1-input/cbl/COUSR01C.cbl` (299 lines) | COUSR01 / COUSR1A | `WRITE-USER-SEC-FILE` → `EXEC CICS WRITE` (`:238-240`) |
| User Update | CU02 | `00.phase-1-input/cbl/COUSR02C.cbl` (414 lines) | COUSR02 / COUSR2A | `UPDATE-USER-SEC-FILE` → `EXEC CICS REWRITE` (`:358-360`) |
| User Delete | CU03 | `00.phase-1-input/cbl/COUSR03C.cbl` (359 lines) | COUSR03 / COUSR3A | `DELETE-USER-SEC-FILE` → `EXEC CICS DELETE` (`:305-307`) |

All four use `WS-USRSEC-FILE 'USRSEC  '` (e.g. `cbl/COUSR01C.cbl:39`, `cbl/COUSR03C.cbl:39`).

## List-to-detail navigation

From the user list, a row selection routes to update (`MOVE 'COUSR02C' TO CDEMO-TO-PROGRAM` + XCTL, `cbl/COUSR00C.cbl:192-197`) or delete (`'COUSR03C'`, `:202-207`).

## Record maintained

`SEC-USER-DATA` (`00.phase-1-input/cpy/CSUSR01Y.cpy:17-23`): user id (key), first/last name, password (plaintext, `X(8)`), user type (`'A'`/`'U'`). See [Authentication](authentication.md) for how this record controls sign-on and menu routing.

Field validations (required fields, etc.) are owned by `01.phase-1-output/validation-rules.md`.
