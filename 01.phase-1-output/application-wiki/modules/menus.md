# Module: Menus & Navigation

[← Overview](../README.md) | Prev: [Sign-on & Session](sign-on.md) | [User Types & Roles](../user-roles.md)

## What it does

Two data-driven navigation hubs. The **Main Menu** gives regular users one numbered list of all
ten business functions; the **Admin Menu** gives administrators the four user-security
functions. Each menu option carries a required-role flag, so entitlement is enforced per
function, not just by which menu a user sees.
(Sources: [screen-flow.md](../../screen-flow.md) SCREEN-02/03;
[user-stories.md](../../user-stories.md) STORY-004–005;
[business-rules-catalog.md](../../business-rules-catalog.md) RULE-DECISION-003.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Choose a business function (options 1–10) | COMEN01 (CM00 / COMEN01C) | session role from [ENTITY-011](../data-model.md#entity-catalog) | [RULE-DECISION-003](../../business-rules-catalog.md) (admin-only denial) | [RULE-VAL-005, VAL-006](../../validation-rules.md) | STORY-004 |
| Choose a security function (options 1–4) | COADM01 (CA00 / COADM01C) | session role | — | [RULE-VAL-007](../../validation-rules.md) | STORY-005 |

## Menu options

**Main Menu** (all currently flagged `U` — open to regular users):
1 Account View → COACTVW · 2 Account Update → COACTUP · 3 Credit Card List → COCRDLI ·
4 Credit Card View → COCRDSL · 5 Credit Card Update → COCRDUP · 6 Transaction List → COTRN00 ·
7 Transaction View → COTRN01 · 8 Transaction Add → COTRN02 · 9 Transaction Reports → CORPT00 ·
10 Bill Payment → COBIL00 ([screen-flow.md SCREEN-02](../../screen-flow.md)).

**Admin Menu**: 1 User List → COUSR00 · 2 User Add → COUSR01 · 3 User Update → COUSR02 ·
4 User Delete → COUSR03 ([screen-flow.md SCREEN-03](../../screen-flow.md)).

## Navigation behavior

- Enter with a valid option number transfers to the mapped screen; non-numeric / zero /
  out-of-range options stay with "Please enter a valid option number...".
- A regular user selecting an admin-only option is refused with "No access - Admin Only
  option... " (RULE-DECISION-003 / RULE-VAL-006).
- An option mapped to a placeholder ("DUMMY") program shows "This option … is coming soon ...".
- F3 from either menu returns to the Sign-on screen.

## Modernization relevance

The role flag is **data-driven per option** — a migrated system must keep per-function role
checks, not just separate menus (RULE-DECISION-003 impact note). See
[Modernization Notes](../modernization-notes.md).
