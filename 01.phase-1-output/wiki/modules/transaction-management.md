# Functional Capability: Transaction Management

**Programs / Transactions:** COTRN00C / `CT00` (List), COTRN01C / `CT01` (View), COTRN02C / `CT02` (Add)

**Sources:** [`screen-flow.md`](../../screen-flow.md#9-list-transactions-cotrn00--cotrn00c--ct00)
(§9–11), [`business-rules-catalog.md`](../../business-rules-catalog.md#4-transaction-id-generation--duplicate-handling-cotrn02c-cobil00c)
(§4, §7: BR-010, BR-015), [`validation-rules.md`](../../validation-rules.md#11-transaction-list--cotrn00c-screen-cotrn00--txn-ct00)
(§11–13: VR-069–VR-094), [`user-stories.md`](../../user-stories.md#8-transaction-list-cotrn00c--transaction-ct00)
(§8–10: STORY-027–STORY-034), [`business-entities.md`](../../business-entities.md#entity-005-transaction)
(ENTITY-003, ENTITY-005, ENTITY-006, ENTITY-007).

## What This Module Does

Transaction Management lets a user browse the transaction log in pages, jump to and view a
single transaction's full detail, or add a brand-new transaction against an account/card —
with a confirm gate before the add is committed and an option to copy the previous
transaction as a starting point.

## Screens & Navigation

| Screen | Purpose | Navigation |
|---|---|---|
| List Transactions (COTRN00) | Browse, 10 rows per page, optional jump-to-ID | Type "S" on a row → View Transaction. Non-numeric jump ID → error. F7/F8 → page backward/forward. PF3 → Main Menu. |
| View Transaction (COTRN01) | Read-only lookup by ID | Found → full detail. Blank ID / not found → error. PF3 → Main Menu (or prior screen). F4 → clear for a new ID. F5 → List Transactions. |
| Add Transaction (COTRN02) | Enter new transaction, confirm, commit | Account ID or Card Number required (either). Field validation on type/category/source/description/amount/dates/merchant fields. Confirm=Y → transaction added, screen cleared. Confirm=N/blank → prompt, not added. F5 → copy last transaction as a starting point. PF3 → Main Menu (or prior screen). |

Full field lists and navigation detail:
[`screen-flow.md` §9–11`](../../screen-flow.md#9-list-transactions-cotrn00--cotrn00c--ct00).

## Entities Touched

| Entity | Role |
|---|---|
| [Transaction](../data-model.md#transaction) (ENTITY-005) | The record listed, viewed, and created |
| [Card](../data-model.md#card) (ENTITY-003) | Owning card, via `TRAN-CARD-NUM`; used to resolve the account/card for a new transaction |
| Transaction Type (ENTITY-006) | Classifies the transaction's type code (reference data — no online maintenance screen; see [Modernization Notes](../modernization-notes.md)) |
| Transaction Category (ENTITY-007) | Classifies the transaction's category code within its type (same reference-data caveat) |

## Business Rules

| ID | Rule |
|---|---|
| BR-010 | **New Transaction ID = current maximum + 1**, found by browsing the Transaction file backward from the highest possible key. This is not a database sequence — two concurrent Add-Transaction (or Bill Payment) requests can compute the same "next" ID and race; the loser gets a user-facing duplicate-key error rather than an automatic retry with a different ID. This is an observed contract to be knowingly preserved or deliberately replaced (e.g. with an atomic sequence generator), not silently fixed. |
| BR-015 | Transaction List shows a **fixed page size of 10**, using the same look-ahead-read pattern as Card List and User List. |

Full detail: [`business-rules-catalog.md` §4`](../../business-rules-catalog.md#4-transaction-id-generation--duplicate-handling-cotrn02c-cobil00c)
(BR-010 is shared with [Bill Payment](./bill-payment.md), which uses the identical
ID-generation mechanism for its payment transaction).

## Validation Rules (Summary)

| Screen | Rules | Coverage |
|---|---|---|
| List Transactions | VR-069–VR-070 | Row-selection must be "S"; jump-to Tran ID must be numeric if supplied |
| View Transaction | VR-071 | Tran ID must be supplied |
| Add Transaction | VR-072–VR-094 | Account ID/Card Number numeric + at least one required; all data fields required; type/category/merchant ID numeric; amount must match `-99999999.99` format; dates must match `YYYY-MM-DD` and be valid calendar dates (via the shared date utility); confirm must be Y/N |

Full rule table: [`validation-rules.md` §11–13`](../../validation-rules.md#11-transaction-list--cotrn00c-screen-cotrn00--txn-ct00).

## User Stories

STORY-027–STORY-029 (List), STORY-030 (View), STORY-031–STORY-034 (Add) cover: paged
browsing, jump-to-ID, viewing detail, adding via account or card lookup, copying the last
transaction, confirming the add, and the sequential-ID assignment behavior. See
[`user-stories.md` §8–10`](../../user-stories.md#8-transaction-list-cotrn00c--transaction-ct00).

## Related Pages

- [Card Management](./card-management.md) — the card a transaction is posted against
- [Bill Payment](./bill-payment.md) — shares the MAX+1 transaction-ID mechanism (BR-010)
- [Transaction Reporting](./reporting.md) — reports over this same Transaction data
