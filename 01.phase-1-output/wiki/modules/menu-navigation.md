# Functional Capability: Menu Navigation

**Programs / Transactions:** COMEN01C / `CM00` (Main Menu), COADM01C / `CA00` (Admin Menu)

**Sources:** [`screen-flow.md`](../../screen-flow.md#2-main-menu-comen01--comen01c--cm00)
(§2, §3), [`business-rules-catalog.md`](../../business-rules-catalog.md#br-003-main-menu-admin-only-option-gate--defined-but-currently-unreachable)
(BR-003), [`validation-rules.md`](../../validation-rules.md#4-main-menu--comen01c-screen-comen01--txn-cm00)
(VR-003, VR-004), [`user-stories.md`](../../user-stories.md#2-main-menu--admin-menu-navigation-comen01c--cm00-coadm01c--ca00)
(STORY-007–STORY-011).

## What This Module Does

The two menus are the home screens a person lands on right after signing in: the Main Menu
(10 options) for regular users, and the Admin Menu (4 options) for administrators. Each is
a pure dispatcher — it validates the typed option number and transfers control (`XCTL`) to
the matching program, carrying the session context forward.

## Screens & Navigation

| Screen | Options | Navigation |
|---|---|---|
| Main Menu (COMEN01) | 10 (see table below) | Valid option → matching screen. Invalid/blank/zero/out-of-range option → stays on Main Menu with an error. PF3 → Sign-On. |
| Admin Menu (COADM01) | 4 (see table below) | Valid option → matching user-management screen. Invalid option → stays on Admin Menu with an error. PF3 → Sign-On. |

### Main Menu Options (10)

| # | Option | Goes to Module |
|---|---|---|
| 1 | Account View | [Account Management](./account-management.md) |
| 2 | Account Update | [Account Management](./account-management.md) |
| 3 | Credit Card List | [Card Management](./card-management.md) |
| 4 | Credit Card View | [Card Management](./card-management.md) |
| 5 | Credit Card Update | [Card Management](./card-management.md) |
| 6 | Transaction List | [Transaction Management](./transaction-management.md) |
| 7 | Transaction View | [Transaction Management](./transaction-management.md) |
| 8 | Transaction Add | [Transaction Management](./transaction-management.md) |
| 9 | Transaction Reports | [Transaction Reporting](./reporting.md) |
| 10 | Bill Payment | [Bill Payment](./bill-payment.md) |

### Admin Menu Options (4)

| # | Option | Goes to Module |
|---|---|---|
| 1 | User List | [User Administration](./user-administration.md) |
| 2 | User Add | [User Administration](./user-administration.md) |
| 3 | User Update | [User Administration](./user-administration.md) |
| 4 | User Delete | [User Administration](./user-administration.md) |

Full field/navigation detail: [`screen-flow.md` §2–3](../../screen-flow.md#2-main-menu-comen01--comen01c--cm00).

## Entities Touched

Neither menu program reads or writes a business entity directly — they are pure
dispatchers. Session/routing context is carried in the COMMAREA, which is technical
plumbing excluded from the entity catalog (see
[`business-entities.md` — Excluded Technical Structures](../../business-entities.md#excluded-technical-structures)).

## Business Rules

| ID | Rule |
|---|---|
| BR-003 | The Main Menu has logic to reject an "Admin Only" option for a regular user, but **all 10 current options are hard-coded as non-admin-only** — the gate exists but nothing currently triggers it. A copybook comment suggests Transaction Add was once intended to be admin-restricted. |

Full detail: [`business-rules-catalog.md` §1](../../business-rules-catalog.md#br-003-main-menu-admin-only-option-gate--defined-but-currently-unreachable).
(BR-002, the Admin-vs-Regular routing decision made at sign-on, is documented under
[Sign-On](./sign-on.md#business-rules) since that's where it's decided; it's what determines
which of these two menus a person reaches in the first place.)

## Validation Rules

| ID | Screen | Field | Rule |
|---|---|---|---|
| VR-003 | Main Menu | Option number | Must be numeric, non-zero, ≤ 10 |
| VR-004 | Admin Menu | Option number | Must be numeric, non-zero, ≤ 4 |

## User Stories

STORY-007–STORY-011 cover: regular-user menu navigation, invalid option handling, the
dead admin-only gate, admin menu navigation, and returning to Sign-On. See
[`user-stories.md` §2`](../../user-stories.md#2-main-menu--admin-menu-navigation-comen01c--cm00-coadm01c--ca00).

## Related Pages

- [User Types & Roles](../user-types-and-roles.md) — why these are two separate menus
- [Sign-On](./sign-on.md) — where the routing decision to reach one menu or the other is made
