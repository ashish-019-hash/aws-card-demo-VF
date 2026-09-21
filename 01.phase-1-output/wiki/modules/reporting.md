# Functional Capability: Transaction Reporting

**Program / Transaction:** CORPT00C / `CR00` · **Screen:** Transaction Reports (CORPT00)
**Batch component:** `TRANREPT` JCL procedure (see [Architecture & Technology Summary](../architecture.md#batch-component))

**Sources:** [`screen-flow.md`](../../screen-flow.md#13-transaction-reports-corpt00--corpt00c--cr00)
(§13), [`business-rules-catalog.md`](../../business-rules-catalog.md#6-transaction-report-request-corpt00c)
(§6: BR-013), [`validation-rules.md`](../../validation-rules.md#15-report-request--corpt00c-screen-corpt00--txn-cr00)
(§15: VR-098–VR-114), [`user-stories.md`](../../user-stories.md#12-transaction-report-request-corpt00c--transaction-cr00)
(§12: STORY-039–STORY-043), [`codebase-wiki.md`](../../codebase-wiki.md#54-transaction-report-request-cr00--corpt00c--jobs-td-queue)
(§5.4, batch chain).

## What This Module Does

Transaction Reporting lets a user request a printed transaction report for the current
month, the current year, or a custom date range, and — after an explicit confirmation —
submits the request as a background job rather than generating the report inline.

## Screen & Navigation

| Screen | Navigation |
|---|---|
| Transaction Reports (CORPT00) | Exactly one of Monthly/Yearly/Custom must be chosen. Custom requires a valid start/end date. Confirm=Y → job submitted, success message shown. Confirm=N → screen cleared. Confirm blank/other → prompt/error. Submission failure (writing the job queue) → "Unable to Write TDQ (JOBS)...". PF3 → Main Menu. |

Full field list and navigation detail:
[`screen-flow.md` §13`](../../screen-flow.md#13-transaction-reports-corpt00--corpt00c--cr00).

## What Happens After Submission (Batch)

Confirming the request writes a job-submission entry to a CICS transient-data queue
(`JOBS`); a background job reader executes the `TRANREPT` JCL procedure, which unloads the
Transaction file, sorts/filters by the requested date range, and (per `codebase-wiki.md`)
invokes a formatting program (`CBTRN03C`) referenced by the JCL but not found in the source
tree available to Phase 1 — see [Modernization Notes](../modernization-notes.md#carried-forward-gaps).
This is the only documented batch/background processing path in the whole application.

## Entities Touched

| Entity | Role |
|---|---|
| [Transaction](../data-model.md#transaction) (ENTITY-005) | The data the report is drawn from (via the batch job, not read online by CORPT00C itself) |
| Transaction Type / Transaction Category (ENTITY-006, ENTITY-007) | Provide the type/category descriptions printed on the report |

## Business Rules

| ID | Rule |
|---|---|
| BR-013 | **Report date-range derivation by type, plus mandatory Y/N confirm before submission.** Monthly = 1st through last day of the current month (computed, not hard-coded). Yearly = Jan 1–Dec 31 of the current year. Custom = user-supplied start/end date, individually validated via the shared date utility (an internal exception code `'2513'` is treated as acceptable even without a clean severity code — a documented quirk of the date-check utility). The job is never queued without an explicit "Y" confirmation; "N" clears the form; any other value is rejected. |

Full detail: [`business-rules-catalog.md` §6`](../../business-rules-catalog.md#6-transaction-report-request-corpt00c).

## Validation Rules (Summary)

| Area | Rules | Coverage |
|---|---|---|
| Report-type selection | VR-098 | Exactly one of Monthly/Yearly/Custom |
| Custom date required-fields | VR-099–VR-104 | Start/End month/day/year each required |
| Custom date range checks | VR-105–VR-110 | Month ≤ 12, day ≤ 31, year numeric |
| Custom date calendar validity | VR-111–VR-112 | Composed date validated via the shared date utility |
| Confirm | VR-113–VR-114 | Must be supplied; must be Y/N |

Full rule table: [`validation-rules.md` §15`](../../validation-rules.md#15-report-request--corpt00c-screen-corpt00--txn-cr00).

## User Stories

STORY-039–STORY-043 cover: monthly, yearly, and custom report requests, the mandatory
confirm step, and the background job submission. See
[`user-stories.md` §12`](../../user-stories.md#12-transaction-report-request-corpt00c--transaction-cr00).

## Related Pages

- [Transaction Management](./transaction-management.md) — the data source for the report
- [Architecture & Technology Summary](../architecture.md) — the batch chain this module triggers
- [Modernization Notes](../modernization-notes.md) — the missing `CBTRN03C` batch program
