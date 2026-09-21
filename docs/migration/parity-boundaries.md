# Migration parity boundaries

This document defines what the CardDemo NestJS migration preserves, where it intentionally differs, and what cannot be claimed as executable legacy parity. It is a companion to the source evidence in [legacy-contract.md](legacy-contract.md) and the exact ASCII allow-list in [source-divergences.md](source-divergences.md).

## Scope and authority

`00.phase-1-input/` is immutable legacy evidence. The migration preserves its fixed-width layout evidence, identified business behavior, and canonical values where the source is complete. It does not reproduce CICS/BMS screen behavior byte-for-byte.

The implementation target is a PostgreSQL-backed `/api/v1` service, a fixed-width importer, and a report worker. REST authorization, JWTs, optimistic versions, OpenAPI, problem details, worker leases, and artifacts are deliberate modern contracts rather than claims of CICS UI equivalence. The importer, auth/users, and reports portions are present; the remaining domain endpoints and their complete OpenAPI/E2E coverage remain in progress.

## Canonical EBCDIC and partial ASCII

- Raw EBCDIC **CP037** files under `00.phase-1-input/data/EBCDIC/` are the canonical source.
- The importer must slice fixed-width raw bytes first and decode CP037 second. It validates all canonical records before a dependency-ordered, transactional write.
- `ACCDATA.PS` and `ACCTDATA.PS` are byte-identical duplicate account exports and must be deduplicated by hash.
- ASCII is an incomplete convenience mirror, never a complete database oracle or a substitute for canonical import.
- There is **no ASCII user file**. ASCII mode must report users missing and partial; it must not create credentials, authenticate, or claim a complete runnable migration.
- ASCII comparison normalizes only the known omitted 14-byte trailing `CARDXREF` filler. Every other unlisted field difference fails verification until reviewed with exact key, field, values, and rationale.
- EBCDIC wins every conflict. Canonical/ASCII database equality is not an acceptance condition.

The reviewed ASCII differences are:

| Dataset/key                         | Field           | Canonical EBCDIC | ASCII mirror | Required handling                                                              |
| ----------------------------------- | --------------- | ---------------- | ------------ | ------------------------------------------------------------------------------ |
| Every `CARDXREF` record             | trailing filler | 14 bytes         | omitted      | Append/normalize 14 spaces before field comparison.                            |
| Account `00000000049`               | `ACCT-ADDR-ZIP` | `ZEROAPR   `     | `A000000000` | Retain EBCDIC value in canonical import; do not move either value to group ID. |
| `DISCGRP` `DEFAULT` / `07` / `0001` | interest rate   | `15.00`          | `0.00`       | Retain EBCDIC value in canonical import.                                       |

See [source-divergences.md](source-divergences.md) for the authoritative detailed allow-list and source hashes.

## Authentication and user parity

`COSGN00C` uppercases passwords before legacy comparison. The API intentionally differs:

- User IDs are uppercase-normalized.
- Passwords are case-sensitive and bcrypt-hashed/verified exactly as submitted.
- Imported plaintext is retained only long enough to hash and is immediately discarded.
- Login returns one generic 401 for an unknown user or a mismatch; passwords never appear in responses, Swagger examples, or logs.

This is an intentional security and usability boundary, not a regression to be “corrected” by uppercasing API passwords.

## Import validation versus API validation

Import and API validation serve different purposes.

| Context          | Required behavior                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical import | Enforce physical width, PIC digit/scale structure, real dates, database representability, identities, and proven references. Preserve structurally valid source values.                                           |
| API create/patch | Apply stricter legacy-derived business rules only to supplied fields: real 19xx/20xx dates, date of birth before today, lookup-backed phone/state/ZIP rules, required/optional text, flags, and FICO constraints. |

### FICO split

The importer must preserve structurally valid FICO values `000..999`, including the 21 canonical values below 300, and record warnings as appropriate. API writes accept FICO `300..850` only when FICO is supplied. An unrelated patch must not fail solely because it leaves an imported below-300 FICO value unchanged.

### Account ZIP/group anomaly

`ACCT-ADDR-ZIP` and `ACCT-GROUP-ID` are two independent, ten-byte source fields. In canonical account `00000000049`, `ACCT-ADDR-ZIP` is `ZEROAPR   ` and group ID is blank. The ASCII mirror places `A000000000` in ZIP. No migration code may move a value between the fields or infer an account-group-to-disclosure-group foreign key.

## Optimistic REST updates

Legacy CICS flows do not provide REST version tokens. The migration adds explicit optimistic concurrency to avoid lost updates:

- Mutable user, account/customer, and card operations require an `expectedVersion`.
- Conditional update/delete compares the supplied version and increments the persisted version atomically.
- A stale version produces `409 VERSION_CONFLICT` and no mutation.
- An account patch that changes a customer subdocument requires both account and customer expected versions and rolls back if either comparison fails.
- These version requirements are target REST behavior, not byte-for-byte screen parity.

## Date and timestamp behavior

### Import input

The fixed-width importer accepts required `original_ts` as a complete `YYYY-MM-DD HH:mm:ss.SSSSSS` timestamp or a right-padded `YYYY-MM-DD`, normalized to `00:00:00.000000` UTC. It accepts the same values for `processed_ts`, plus all spaces/low values as SQL null. It rejects invalid dates, unsupported partial times, and trailing non-space junk. It never substitutes `original_ts` for a blank `processed_ts`.

### API input and output

API transaction input accepts `YYYY-MM-DD` or RFC 3339 date-times with `Z` or an explicit offset. Date-only becomes midnight UTC; non-null timestamps normalize to UTC microsecond text. Offsetless date-time strings and impossible dates are rejected.

PostgreSQL date, timestamp, timestamptz, and numeric values are represented as strings at the Node boundary. API payloads preserve exact dates, timestamps, decimals, and zero-padded IDs rather than using JavaScript floating-point numbers or host-timezone `Date` conversion.

### Report timestamp mode

`processed_ts` remains nullable. `REPORT_TIMESTAMP_MODE` supports:

- `processed-or-original` (default): report filtering uses `COALESCE(processed_ts, original_ts)`.
- `processed`: report filtering uses only `processed_ts` and excludes null values.

The selected mode is stored on the report job so retries remain deterministic when the environment setting later changes.

## Transactions and payment boundary

Transaction IDs are fixed 16-digit strings. Allocation is performed only through a bounded PostgreSQL sequence and SQL formatting; application code must not calculate `MAX(id) + 1`.

Manual transaction API input honors legacy `S9(9)V99` bounds, `-999999999.99..999999999.99`. Storage is wider: `numeric(12,2)`. This is intentional because `COBIL00C` copies account current balance (`S9(10)V99`) into transaction amount (`S9(9)V99`), where a legacy-width copy may truncate or overflow. The migrated payment service stores the full account balance losslessly and may therefore insert values beyond the manual transaction range.

The screen-only “copy last transaction” action is omitted. Payment is a specified atomic REST operation: lock the account, check its version/positive balance, choose the lexically lowest card number from xrefs, allocate an ID, insert the payment transaction, zero the balance, increment the account version, and commit together. The canonical fixtures have one card per account, so a separate synthetic fixture establishes the multi-card ordering rule.

## Missing legacy artifacts and report format

`COCRDSEC` / `CDV1` are excluded because no program source, BMS map, or copybook is present. No security-screen parity claim is made for them.

`CBTRN03C` is absent. Report formatting is therefore a specified target interpretation, not byte-equivalence to an executable COBOL baseline. The chosen contract is:

- monthly, yearly, and custom reports use inclusive UTC ranges;
- transaction selection uses the stored report timestamp mode;
- rows sort by card number then transaction ID;
- each logical page contains at most 55 transaction-detail records;
- each page starts with report/date headers and two column-header records; headers/totals do not count toward the 55 details;
- page total follows each page, account total follows each account break, and grand total follows the final account;
- every logical record is single-byte ASCII, truncated only by declared field width and right-padded to exactly **133 bytes**;
- LF separates records but is not included in the 133-byte LRECL; no CR or form feed is written;
- signed amount fields use 15-byte masks; an unrenderable amount is 15 asterisks and adds a warning without changing record width.

Report job claiming, leases, retries, artifact SHA-256/length, and download state are modern target behavior.

## What acceptance proves

Acceptance proves canonical EBCDIC import/reconciliation, explicit source anomaly preservation, allow-listed ASCII mirror verification, exact-value API/database contracts, and the specified REST/report behaviors. It does not prove:

- complete ASCII equivalence;
- invented ASCII user credentials;
- byte-for-byte CICS/BMS interaction parity;
- missing `COCRDSEC`/`CDV1` behavior;
- byte-equivalence to absent `CBTRN03C`.
