# Functional Capability: Account Management

**Programs / Transactions:** COACTVWC / `CAVW` (View), COACTUPC / `CAUP` (Update)

**Sources:** [`screen-flow.md`](../../screen-flow.md#4-view-account-coactvw--coactvwc--cavw)
(§4, §5), [`business-rules-catalog.md`](../../business-rules-catalog.md#2-account-update--concurrency--persistence-contract-coactupc)
(§2: BR-006, BR-007, BR-008), [`validation-rules.md`](../../validation-rules.md#6-account-view--coactvwc-screen-coactvw--txn-cavw)
(§6–7: VR-005–VR-053), [`user-stories.md`](../../user-stories.md#3-account-view-coactvwc--transaction-cavw)
(§3–4: STORY-012–STORY-019), [`business-entities.md`](../../business-entities.md#entity-002-account)
(ENTITY-001, ENTITY-002, ENTITY-004, ENTITY-011).

## What This Module Does

Account Management lets a signed-on user look up an account by its ID and see its full
detail (balances, credit limits, and the linked customer's personal information), or edit
that detail with a two-step confirm-then-save workflow. It is the richest validation
surface in the whole application — nearly half of all 130 cataloged validation rules
belong to Account Update alone.

## Screens & Navigation

| Screen | Purpose | Navigation |
|---|---|---|
| View Account (COACTVW) | Read-only lookup and display | Successful lookup → shows details. Not-found/blank/non-numeric ID → error, stays on screen. PF3 → Main Menu (or prior screen). |
| Update Account (COACTUP) | Look up, edit, confirm, save | Lookup → editable details. Validation errors → stays on screen, field flagged. No-op edit → no confirmation offered (BR-006). Real change + no errors → confirmation prompt, F5 enabled. F5 → saved, unless someone else changed the record first (BR-007) — then re-shown with a message. F12 → discard pending change. PF3 → Main Menu (or prior screen). |

Full field lists and navigation detail:
[`screen-flow.md` §4–5](../../screen-flow.md#4-view-account-coactvw--coactvwc--cavw).

## Entities Touched

| Entity | Role |
|---|---|
| [Account](../data-model.md#account) (ENTITY-002) | The record being viewed/updated — balance, limits, dates, group ID |
| [Customer](../data-model.md#customer) (ENTITY-001) | The linked cardholder's personal detail, shown and edited alongside the account |
| [Card-Account-Customer Cross-Reference](../data-model.md#card-account-customer-cross-reference) (ENTITY-004) | Resolves which customer/card belong to the account being viewed |
| Geographic & Phone Reference Codes (ENTITY-011) | Validates the customer's state code, state+zip combination, and phone area code during update |

## Business Rules

| ID | Rule |
|---|---|
| BR-006 | **Change detection before confirm** — account and customer fields are compared old-vs-new; if nothing actually changed, no save confirmation is offered and nothing is written. |
| BR-007 | **Optimistic-concurrency re-check at save** — immediately before writing, the live records are re-read and compared against the values shown when editing started; a mismatch (someone else changed it) aborts the save and re-shows the screen, rather than overwriting. Note: on conflict, the comparison baseline is *not* automatically refreshed inside this routine (a nuance worth confirming during a rebuild). |
| BR-008 | **Two-file locked update with rollback** — saving requires locking and rewriting both the Account and Customer records as one all-or-nothing unit; if the second rewrite fails after the first succeeded, an explicit `SYNCPOINT ROLLBACK` undoes both. |

Full detail: [`business-rules-catalog.md` §2`](../../business-rules-catalog.md#2-account-update--concurrency--persistence-contract-coactupc).

## Validation Rules (Summary)

Account View has 2 rules (VR-005–VR-006, account-ID filter format). Account Update has 49
rules (VR-007–VR-030c, §7.1–7.3) covering required/format/range checks field-by-field via a
set of reusable "editor" paragraphs, plus dedicated logic for:

| Area | Rules | What they check |
|---|---|---|
| Dates (Open, Expiry, Reissue, DOB) | VR-030–VR-035 | Year/month/day format and range, calendar-day legality (leap years), DOB strictly in the past |
| SSN (3 parts) | VR-036–VR-039 | Format + the classic "not 000/666/900-999" first-3-digit exclusion |
| FICO score | VR-040 | Must be 300–850 |
| US state code | VR-041 | Must be a valid 2-letter state/territory code |
| State + Zip cross-check | VR-042 | State code and first 2 digits of Zip must be a valid combination |
| US phone number (×2) | VR-043–VR-053 | Area/prefix/line format, non-zero, valid NANP area code |

Full rule table: [`validation-rules.md` §6–7`](../../validation-rules.md#6-account-view--coactvwc-screen-coactvw--txn-cavw).
Dependency diagram (which checks gate which): [`validation-dependencies.svg`](../../validation-dependencies.svg).

## User Stories

STORY-012–STORY-014 (View) and STORY-015–STORY-019 (Update) cover: successful lookup,
error/not-found handling, navigating to the card list, editing with no real change,
two-step confirm-and-save, blocked save on concurrent edit, and save-failure feedback. See
[`user-stories.md` §3–4`](../../user-stories.md#3-account-view-coactvwc--transaction-cavw).

## Related Pages

- [Card Management](./card-management.md) — reachable from Account View via the linked card
- [Data Model](../data-model.md) — full entity definitions
- [Modernization Notes](../modernization-notes.md) — the concurrency-baseline nuance in BR-007
