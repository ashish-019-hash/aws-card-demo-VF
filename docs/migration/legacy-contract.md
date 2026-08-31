# Legacy contract freeze

This document freezes the source evidence and migration decisions for CardDemo task 1. It is based on the immutable contents of `00.phase-1-input/`; that directory is input only and must not be edited, regenerated, or reformatted.

## Approved migration decisions

- Deliver the migration as **one complete PR**, organized and tested in independently green phases.
- EBCDIC CP037 is canonical. ASCII is an incomplete mirror and is governed by the allow-list in [source-divergences.md](source-divergences.md).
- Passwords are case-sensitive and hashed/verified exactly as submitted. This deliberately differs from `COSGN00C`, which uppercases passwords before its legacy comparison.
- `processed_ts` is nullable. Reports use `REPORT_TIMESTAMP_MODE=processed-or-original|processed`; the default is `processed-or-original` (`COALESCE(processed_ts, original_ts)`).
- `COCRDSEC` and its `CDV1` assets are excluded: CSD references `COCRDSEC`, but no program source, map, or copybook is present.
- `CBTRN03C` is absent. The report formatter is therefore a specified target interpretation, not byte-equivalence to an executable legacy formatter.

## Program inventory and replacement ownership

The CSD defines 19 program entries, including the excluded `COCRDSEC`; 17 of its entries have matching COBOL source. The 18th available COBOL source, `CSUTLDTC`, is the reusable callable date validator. Copybooks `CSUTLDPY` and `CSUTLDWY` provide its reusable date routine/storage contract even though they are not standalone program sources.

| Legacy source / CSD entry | Legacy responsibility | NestJS replacement module | Evidence / dependencies |
| --- | --- | --- | --- |
| `COSGN00C` | sign-on | `auth` | `CSUSR01Y`; intentional password-case change documented above |
| `COUSR00C` | user menu | `users` | `CSUSR01Y`, routes to user actions |
| `COUSR01C` | user list | `users` | `CSUSR01Y` |
| `COUSR02C` | user maintenance | `users` | `CSUSR01Y` |
| `COUSR03C` | user detail | `users` | `CSUSR01Y` |
| `COACTVWC` | account/customer view | `accounts`, `customers` | `CVACT01Y`, `CVACT02Y`, `CVACT03Y`, `CVCUS01Y`, `CSUSR01Y` |
| `COACTUPC` | account/customer update | `accounts`, `customers` | `CVACT01Y`, `CVACT03Y`, `CVCUS01Y`, `CSLKPCDY`, `CSUTLDPY` |
| `COCRDLIC` | card list | `cards` | `CVACT02Y`, `CSUSR01Y` |
| `COCRDSLC` | card select/detail | `cards` | `CVACT02Y`, `CVCUS01Y`, `CSUSR01Y` |
| `COCRDUPC` | card update | `cards` | `CVACT02Y`, `CVCUS01Y`, `CSUSR01Y` |
| `COTRN00C` | transaction menu/list | `transactions` | `CVTRA05Y` |
| `COTRN01C` | transaction create | `transactions` | `CVTRA05Y` |
| `COTRN02C` | transaction view | `transactions` | `CVTRA05Y`, `CVACT01Y`, `CVACT03Y` |
| `COBIL00C` | bill payment | `payments` | `CVACT01Y`, `CVACT03Y`, `CVTRA05Y` |
| `CORPT00C` | report request | `reports` plus async worker | `CVTRA05Y`; formatter source `CBTRN03C` absent |
| `CSUTLDTC` | callable date validation | `common/validation` | calls Language Environment `CEEDAYS` |
| `COMEN01C` | common menu/navigation | route authorization and Swagger navigation | `CSUSR01Y`, CICS XCTL routing |
| `COADM01C` | administration menu | route authorization and Swagger navigation | `CSUSR01Y`, CICS XCTL routing |
| `COCRDSEC` | referenced CSD program | excluded | no `.cbl`, BMS map, or copybook; no replacement parity claim |

## Fixed-width datasets, layouts, and keys

`LISTCAT.txt` supplies the VSAM key/average record lengths; the listed copybooks supply field order. All widths below are bytes. Signed display fields retain the sign zone in their final byte. `FILLER` is part of the persisted physical record even when it has no database destination.

| Logical dataset (canonical EBCDIC file) | Copybook | Width / key | Exact field order (width) |
| --- | --- | --- | --- |
| Customers (`CUSTDATA.PS`) | `CVCUS01Y` | 500 / `CUST-ID` first 9 | ID 9; first 25; middle 25; last 25; address 1/2/3 50 each; state 2; country 3; ZIP 10; phone 1/2 15 each; SSN 9; government ID 20; DOB 10; EFT account 10; primary holder 1; FICO 3; filler 168 |
| Accounts (`ACCTDATA.PS`, duplicate `ACCDATA.PS`) | `CVACT01Y` | 300 / `ACCT-ID` first 11 | ID 11; active 1; current/credit/cash-credit balances 12 each; open/expiration/reissue dates 10 each; cycle credit/debit 12 each; address ZIP 10; group ID 10; filler 178 |
| Cards (`CARDDATA.PS`) | `CVACT02Y` | 150 / `CARD-NUM` first 16; AIX account key 11 at offset 5 (zero-based) | card 16; account 11; CVV 3; embossed name 50; expiration 10; active 1; filler 59 |
| Card cross references (`CARDXREF.PS`) | `CVACT03Y` | 50 / `XREF-CARD-NUM` first 16; AIX account key 11 at offset 25 | card 16; customer 9; account 11; filler 14 |
| Transactions (`DALYTRAN.PS`, and one-record `.INIT`) | `CVTRA05Y` / `CVTRA06Y` | 350 / transaction ID first 16; AIX timestamp key 26 at offset 5 | ID 16; type 2; category 4; source 10; description 100; amount 11; merchant ID 9; merchant name/city 50 each; merchant ZIP 10; card 16; original/processed timestamps 26 each; filler 20 |
| Users (`USRSEC.PS`) | `CSUSR01Y` | 80 / user ID first 8 | ID 8; first name 20; last name 20; password 8; type 1; filler 23 |
| Disclosure groups (`DISCGRP.PS`) | `CVTRA02Y` | 50 / composite group 10 + type 2 + category 4 | group 10; type 2; category 4; interest rate 6; filler 28 |
| Transaction category balances (`TCATBALF.PS`) | `CVTRA01Y` | 50 / composite account 11 + type 2 + category 4 | account 11; type 2; category 4; balance 11; filler 22 |
| Transaction categories (`TRANCATG.PS`) | `CVTRA04Y` | 60 / composite type 2 + category 4 | type 2; category 4; description 50; filler 4 |
| Transaction types (`TRANTYPE.PS`) | `CVTRA03Y` | 60 / type first 2 | type 2; description 50; filler 8 |

The `test/fixtures/legacy/manifest.json` records every available source/mirror file’s SHA-256, count, physical record width, and ASCII terminator size. `scripts/verify-legacy-contract.py` proves the copybook width sums and manifest invariants.

## Validation contract

### Dates

`CSUTLDPY`/`CSUTLDWY` define `CCYYMMDD` validation. API-facing date text may be formatted with separators, but validation preserves the legacy rules:

- year is four numeric digits with century **19** or **20** only;
- month is 01–12; day is real for the month;
- Gregorian leap-year rules apply (including century exceptions);
- required date segments cannot be blanks or low values;
- date of birth must be strictly before today.

`CSUTLDTC` is separate legacy evidence for real calendar validation through `CEEDAYS`; it does not replace the explicit 19/20 API write constraint.

### `CSLKPCDY` lookups

`COACTUPC` uses `VALID-GENERAL-PURP-CODE` for phone validation, plus `VALID-US-STATE-CODE` and `VALID-US-STATE-ZIP-CD2-COMBO`. The full copybook lookups are generated into `src/common/validation/legacy-validation-lookups.ts` by `scripts/generate-legacy-validation-lookups.py`.

The generated module embeds the source SHA-256:

```text
CSLKPCDY.cpy SHA-256: 098d384b9580abd5b4b77ae9c33b8cb65b28be45390130b22c48c3714200cca2
```

The verifier regenerates in memory/on disk and fails if the checked-in constants do not reproduce exactly. This captures North American phone area-code categories, US state codes, and state-plus-first-two-ZIP combinations without hand-maintained drift.

### Import versus API validation

Import validation enforces fixed widths, PIC structure/scales, dates, identities, representability, and proven references. It preserves structurally valid legacy FICO values from `000` through `999`, including canonical values below 300, and retains unusual ZIP/group text exactly.

New API writes apply the stricter legacy-derived business rules: FICO 300–850 when supplied, valid state/ZIP and phone lookups, real 19xx/20xx dates, prior DOB, and relevant required/optional field rules. An unrelated patch must not reject an already-imported FICO anomaly.

## Explicit parity boundaries

- `ACCT-ADDR-ZIP` and `ACCT-GROUP-ID` are independent ten-byte source fields. The account-49 anomaly has `ZEROAPR` in canonical ZIP and blank group; no account-group-to-disclosure-group foreign key may be inferred.
- `processed_ts` remains null when blank/low-valued on import; it is never synthesized by copying `original_ts`.
- The raw fixture samples establish one card per canonical account. `test/fixtures/synthetic/multi-card-payment.json`, outside immutable source inputs, proves the chosen payment rule: select the ascending lowest card number for an account with multiple xrefs.
- Legacy list/view/display logic informs functional replacement; REST authentication, OpenAPI, optimistic versions, report worker behavior, and missing source artifacts are target contracts, not claims of byte-for-byte CICS UI parity.
