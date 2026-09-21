# Functional Capability: Card Management

**Programs / Transactions:** COCRDLIC / `CCLI` (List), COCRDSLC / `CCDL` (View), COCRDUPC / `CCUP` (Update)

**Sources:** [`screen-flow.md`](../../screen-flow.md#6-list-credit-cards-cocrdli--cocrdlic--ccli)
(§6–8), [`business-rules-catalog.md`](../../business-rules-catalog.md#br-004-card-list-program-resets-session-user-type-to-regular-user-on-entry-and-on-exit)
(BR-004, BR-005, BR-009, BR-014, BR-015), [`validation-rules.md`](../../validation-rules.md#8-card-list--cocrdlic-screen-cocrdli--txn-ccli)
(§8–10: VR-054–VR-068), [`user-stories.md`](../../user-stories.md#5-card-list-cocrdlic--transaction-ccli)
(§5–7: STORY-020–STORY-026), [`business-entities.md`](../../business-entities.md#entity-003-card)
(ENTITY-002, ENTITY-003, ENTITY-004).

## What This Module Does

Card Management lets a user browse/filter the full list of credit cards, look up a single
card's read-only detail, or edit a card's embossed name, active status, and expiry date
with the same two-step confirm-then-save pattern used by Account Update.

## Screens & Navigation

| Screen | Purpose | Navigation |
|---|---|---|
| List Credit Cards (COCRDLI) | Browse/filter, 7 rows per page | Optional Account ID / Card Number filters (AND semantics, BR-014). Select a card → its detail screen. F7/F8 → page backward/forward. No matches → error. PF3 → Main Menu. |
| View Card Detail (COCRDSL) | Read-only lookup by account and/or card number | Found → shows name, status, expiry. Not found / no search key → error. PF3 → Main Menu (or prior screen). |
| Update Card (COCRDUP) | Look up by card number, edit, confirm, save | Lookup → editable name/status/expiry. Validation errors → stays on screen. Real change + no errors → confirmation prompt, F5 enabled. F5 → saved unless someone else changed the record first (BR-009) — then re-shown, with baseline refreshed. F12 → discard pending change. PF3 → Main Menu (or prior screen). |

Full field lists and navigation detail:
[`screen-flow.md` §6–8`](../../screen-flow.md#6-list-credit-cards-cocrdli--cocrdlic--ccli).

## Entities Touched

| Entity | Role |
|---|---|
| [Card](../data-model.md#card) (ENTITY-003) | The record listed, viewed, and updated — card number, embossed name, CVV, expiry, active status |
| [Account](../data-model.md#account) (ENTITY-002) | Owning account (via `CARD-ACCT-ID`); optional filter key on the list screen |
| [Card-Account-Customer Cross-Reference](../data-model.md#card-account-customer-cross-reference) (ENTITY-004) | Used to resolve card ↔ account ↔ customer identity |

## Business Rules

| ID | Rule |
|---|---|
| BR-004 | The Card List program (COCRDLIC) **unconditionally resets the session's user type to "Regular User"** on entry and on exit, and always routes exit back to the regular Main Menu, never the Admin Menu. Under normal navigation this has no visible effect (Card List isn't on the Admin Menu), but it's a latent authorization-state hazard flagged for a modernized implementation to avoid reproducing. |
| BR-005 | No account-ownership scoping applies here too — any signed-on user can browse or update any card by number, or filter to any account by ID. See [User Types & Roles](../user-types-and-roles.md#authorization-model--what-exists-and-what-doesnt). |
| BR-009 | Card Update follows the **same lock → conflict-check → rewrite pattern** as Account Update (BR-006–BR-008), scoped to the single Card file. Difference: on a conflict, the comparison baseline **is** refreshed with the current values before the next attempt (unlike the Account Update nuance in BR-007). |
| BR-014 | Card List filtering by account number and/or card number is optional; **both filters, when supplied, apply together (AND)** — leaving both blank browses every card in the system. |
| BR-015 | Card List shows a **fixed page size of 7**, determined by a look-ahead read past the current page (not shown, only used to flag "more records exist"). |

Full detail: [`business-rules-catalog.md` §3, §7`](../../business-rules-catalog.md#3-card-update--concurrency--persistence-contract-cocrdupc).

## Validation Rules (Summary)

| Screen | Rules | Coverage |
|---|---|---|
| List Credit Cards | VR-054–VR-057 | Optional account/card filter format; at most one row selected; selection flag must be `S`/`U`/blank |
| View Card Detail | VR-058–VR-059 | Optional account/card filter format |
| Update Card | VR-060–VR-068 | Search-key required/format; embossed name required + alphabetic; active status Y/N; expiry month 1–12; expiry year 1950–2099 |

Full rule table: [`validation-rules.md` §8–10`](../../validation-rules.md#8-card-list--cocrdlic-screen-cocrdli--txn-ccli).

## User Stories

STORY-020–STORY-022 (List), STORY-023 (View), STORY-024–STORY-026 (Update) cover: browsing,
filtering, selecting a card, looking up a single card, editing with confirm, and being
blocked by a concurrent edit. See
[`user-stories.md` §5–7`](../../user-stories.md#5-card-list-cocrdlic--transaction-ccli).

## Related Pages

- [Account Management](./account-management.md) — the account a card belongs to
- [Transaction Management](./transaction-management.md) — transactions posted against a card
- [User Types & Roles](../user-types-and-roles.md) — BR-004's authorization-state hazard
