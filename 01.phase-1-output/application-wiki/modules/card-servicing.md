# Module: Credit Card Servicing

[← Overview](../README.md) | Prev: [Account Servicing](account-servicing.md) | Next: [Transactions](transactions.md)

## What it does

Browse credit cards seven per page (optionally filtered by account and/or card number), jump to
one card's detail, and update a card's embossed name, active status, or expiry date with
validation and an explicit F5 save confirmation.
(Sources: [screen-flow.md](../../screen-flow.md) SCREEN-06/07/08;
[user-stories.md](../../user-stories.md) STORY-008–011.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Browse/filter cards, page with F7/F8 | COCRDLI (CCLI / COCRDLIC) | [Card (003), Account (002) via filter](../data-model.md#entity-catalog) | — (list/pagination only) | [RULE-VAL-035–038](../../validation-rules.md) | STORY-008 |
| Select a row with `S` (view) / `U` (update) | COCRDLI | Card (003) | — | VAL-037, VAL-038 | STORY-009 |
| View one card's details | COCRDSL (CCDL / COCRDSLC) | Card (003) | — (read-and-display only) | [RULE-VAL-039–041](../../validation-rules.md) | STORY-010 |
| Update name / status / expiry | COCRDUP (CCUP / COCRDUPC) | Card (003) | — (validation/update plumbing only) | [RULE-VAL-042–049](../../validation-rules.md) | STORY-011 |

The business-rules catalog found no business rules in these three programs
([coverage note](../../business-rules-catalog.md)).

## Screens & navigation

- **COCRDLI — Credit Card List**: first page shown on entry; optional 11-digit account and/or
  16-digit card filters; `S` on a row → COCRDSL, `U` → COCRDUP (selected keys passed in
  context); F7/F8 page with "NO MORE/PREVIOUS PAGES" messages at the ends; F3 → Main Menu.
- **COCRDSL — Credit Card Detail**: arrives pre-loaded from the list or takes account + card
  keys; shows embossed name, status, expiry. F3 → caller (list) or Main Menu.
- **COCRDUP — Credit Card Update**: fetch → overtype → Enter validates → F5 saves (rewrite with
  concurrency re-check); completion returns to the list when entered from it; F12 reverts.

## Validations (full list: [validation-rules.md §5–7](../../validation-rules.md))

| Area | Rules |
|---|---|
| List filters optional but numeric (11/16 digits) | VAL-035, VAL-036 |
| Row action must be `S`/`U`; only one row selectable | VAL-037, VAL-038 |
| Detail/update keys required, numeric, combination on file | VAL-039–044 |
| Embossed name required, alphabetic + spaces only | VAL-045 |
| Card active status Y/N | VAL-046 |
| Expiry month 1–12; expiry year 1950–2099 | VAL-047, VAL-048 |
| No-change detection + optimistic-concurrency re-check | VAL-049 |

## Data touched

`CARDDAT` (card master, by card number) and alternate index `CARDAIX` (by account):
list browses, detail reads, update READ-UPDATE + REWRITE
([screen-flow.md data-sources table](../../screen-flow.md);
[business-entities.md](../../business-entities.md) ENTITY-003 usage).

## Known ambiguity

The card-list header comment describes admin-vs-user filtering, but the orientation wiki
verified the program filters by whether account/card context is present, not by role — treat
the role-based description as unverified
([orientation wiki — Card Management](../../wiki/modules/card-management.md)).
