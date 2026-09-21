# Behavioral equivalence check: COBOL source vs. Spring Boot backend

This note records the Phase C behavioral-equivalence verification required by the
migration pipeline. For each business rule with a non-trivial calculation or decision
(see `01.phase-1-output/business-rules-catalog.md`), the COBOL statement and the Java
implementation are placed side by side, and the way the equivalence was verified is stated.

Legend for **Verified by**:

- **UT** — backend unit test (`mvn -q test`)
- **IT** — Testcontainers integration test against a real PostgreSQL
- **E2E** — Playwright test in `03.phase-3-output/frontend/e2e/` against the live stack
- **Manual** — curl / psql check against the running dev stack

## 1. Transaction ID allocation (BR-010)

| Aspect | COBOL (`COTRN02C.cbl:449`, `COBIL00C.cbl:214-219`) | Java (`TransactionService.nextTranId`, `TranIdAllocator`) |
|---|---|---|
| Next id | `READPREV` on TRANSACT (highest key) then `ADD 1 TO WS-TRAN-ID-N` | `SELECT MAX(tran_id)` + 1, formatted to 16 digits, under a `PESSIMISTIC_WRITE` lock on the single `tran_id_allocator` row |
| Duplicate at write | `WRITE` returns DUPKEY → "Tran ID already exist..." shown to user | Unique constraint violation → `409 CONFLICT`; the row lock makes this unreachable in practice |

**Verified by:** UT (`TransactionServiceTest`), IT (parallel allocation test: 10 concurrent adds
produce 10 distinct sequential ids), E2E (`transaction.spec.ts` STORY-033/034/BR-010).

**Deviation:** the lock serializes allocations, so the legacy "duplicate key" path is
no longer observable. The result (strictly increasing ids, no gaps under contention) is
equal or better.

## 2. Bill payment record contents and balance update (BR-011, BR-012)

| Field | COBOL (`COBIL00C.cbl:220-234`) | Java (`BillPaymentService.pay`) |
|---|---|---|
| `TRAN-TYPE-CD` | `'02'` | `"02"` |
| `TRAN-CAT-CD` | `2` | `2` |
| `TRAN-SOURCE` | `'POS TERM'` | `"POS TERM"` |
| `TRAN-DESC` | `'BILL PAYMENT - ONLINE'` | `"BILL PAYMENT - ONLINE"` |
| `TRAN-AMT` | `ACCT-CURR-BAL` (full balance) | `account.getCurrBal()` |
| `TRAN-CARD-NUM` | `XREF-CARD-NUM` | `xref.getCardNum()` |
| `TRAN-MERCHANT-ID` | `999999999` | `999999999L` |
| `TRAN-MERCHANT-NAME` | `'BILL PAYMENT'` | `"BILL PAYMENT"` |
| `TRAN-MERCHANT-CITY/ZIP` | `'N/A'` / `'N/A'` | `"N/A"` / `"N/A"` |
| `TRAN-ORIG-TS`, `TRAN-PROC-TS` | current timestamp | `TransactionService.nowTimestamp()` (26-char legacy format) |
| Balance | `ACCT-CURR-BAL = ACCT-CURR-BAL - TRAN-AMT` (→ 0) | `currBal.subtract(amount)` (→ 0) |
| Guard | balance `<= 0` → "You have nothing to pay..." | same message, returned as `paid: false` with the current balance |

**Verified by:** UT (`BillPaymentServiceTest`), IT, E2E (`bill-payment.spec.ts` STORY-039/040/BR-012),
Manual (psql: after paying account 10, one new `transactions` row with type `02`, category `2`,
merchant `999999999`; `accounts.acct_curr_bal = 0`).

## 3. Report period derivation (BR-013)

| Type | COBOL (`CORPT00C.cbl:212-254`) | Java (`ReportService.request`) |
|---|---|---|
| Monthly start | current year/month, day `'01'` | `today.withDayOfMonth(1)` |
| Monthly end | month+1 (roll year if >12), day 1, then `INTEGER-OF-DATE - 1` → last day of the current month | `start.plusMonths(1).minusDays(1)` |
| Yearly start | current year, `'01'`/`'01'` | `LocalDate.of(year, 1, 1)` |
| Yearly end | current year, `'12'`/`'31'` | `LocalDate.of(year, 12, 31)` |
| Custom | entered start/end, validated with `CSUTLDTC` | entered start/end, validated as `YYYY-MM-DD` real calendar dates (VR-107..112) |
| Confirm gate | blank → "Please confirm to print the <name> report..."; not Y/N → `"<value>" is not a valid value to confirm...` | same interpolated messages (VR-113, VR-114) |

**Verified by:** UT (`ReportServiceTest`: monthly/yearly period derived from today's date),
Manual (on 2026-09-21 a monthly request returned `2026-09-01`..`2026-09-30`; yearly returned
`2026-01-01`..`2026-12-31`), E2E (`report.spec.ts` STORY-041/042/043).

**Deviation:** the legacy program submits JCL to the internal reader. The backend records the
request and returns the derived period; no batch job exists in the modern stack.

## 4. Optimistic concurrency on account and card update (BR-007, BR-008, BR-009)

| Aspect | COBOL (`COACTUPC.cbl:4143-4190`, `COCRDUPC.cbl:207-208`) | Java (`AccountService.update`, `CardService.update`) |
|---|---|---|
| Re-read before write | `READ ... UPDATE` then compare every field to the screen's original copy | Client sends `{expected, updated}`; server compares `expected` to the current row field by field (`AccountFieldsComparator`, all fields incl. state/country) |
| Changed by another user | "Record changed by some one else. Please review" | same text, `409 CONFLICT`, `reason: DATA_CHANGED` |
| Rewrite failure | "Update of record failed" | same text, `409 CONFLICT`, `reason: UPDATE_FAILED` |
| No change entered | "No change detected with respect to values fetched." | same text, `changed: false` |

**Verified by:** UT, IT (parallel account-update test: exactly one of two concurrent stale
writers succeeds), E2E (`account.spec.ts` STORY-018, `card.spec.ts` STORY-026).

## 5. Sign-on routing and role gate (BR-001, BR-002, BR-003)

COBOL `COSGN00C` routes `CDEMO-USRTYP-USER = 'A'` to `COADM01C` and everything else to
`COMEN01C`; `COADM01C` accepts only admin users. The backend `SessionController` returns
`userType` and `MenuController` returns the role-appropriate menu; the frontend `MenuPage`
enforces the same split for direct navigation to `/menu` or `/admin`, and `AdminGate`
blocks `/users/*` for type `U`. **Verified by:** E2E (`sign-on.spec.ts`, `menu.spec.ts`,
`user-admin.spec.ts`).

**Known deviation (documented in `README.md`):** the legacy admin-only menu-option check
(BR-003 in `COMEN01C`) is dead code in the COBOL source because no regular-menu option is
flagged admin-only; the modern menu therefore has no per-option gate. Account ownership
scoping (BR-005) is not enforced by either the legacy program or the backend.

## 6. Transaction add validation and reference checks

`COTRN02C` validates numeric-ness only for type and category codes; unknown codes were
written as-is to the VSAM file. The backend adds referential checks (`VR-REF-001`,
`VR-REF-002`) that return `400 VALIDATION_FAILED` for unknown type or type/category
combinations, and the V2 Flyway migration enforces the same with foreign keys.
**This is an intentional deviation** (data-integrity improvement) and is labelled as a
modernization rule in `docs/api-contract.md`. **Verified by:** UT, IT, E2E
(`transaction.spec.ts`).

## 7. Data that could not be migrated 1:1

- `CBTRN03C` (batch transaction report) has no source in `00.phase-1-input/`; only the
  online request screen (`CORPT00C`) is migrated.
- The `customers_fico_range_chk` (300–850) database constraint was removed because the
  legacy `CUSTDAT` sample contains FICO scores below 300 (e.g. 274). The 300–850 rule is
  still enforced by the validation layer for new input.
