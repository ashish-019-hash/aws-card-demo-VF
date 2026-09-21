# User Types & Roles

**Source:** [`user-stories.md`](../user-stories.md) (Personas section) and
[`business-rules-catalog.md`](../business-rules-catalog.md) (BR-002, BR-005),
[`business-glossary.md`](../business-glossary.md) (Admin/Regular User/User Type entries).

CardDemo recognizes exactly **two** user types, both stored in the same field
(`SEC-USR-TYPE` on the User entity, carried in-session as `CDEMO-USER-TYPE`). There is no
finer-grained per-screen or per-record permission model beyond this single flag
(BR-002) — see the note on authorization scope below.

## Admin

- **Marker:** `SEC-USR-TYPE = 'A'`
- **After sign-on:** routed to the Admin Menu ([Menu Navigation](./modules/menu-navigation.md))
- **Can do:** list, add, update, and delete application users
  ([User Administration](./modules/user-administration.md))
- **Also can do:** reach every regular-user screen — the menu/routing tables route both
  admin and regular sign-ons through the same downstream programs once a screen is invoked
  directly, and none of the 10 main-menu options are currently flagged admin-only (see
  STORY-010 and BR-003 below)

## Regular User

- **Marker:** `SEC-USR-TYPE = 'U'`
- **After sign-on:** routed to the Main Menu ([Menu Navigation](./modules/menu-navigation.md))
- **Can do:** view/update accounts, view/update cards, browse/view/add transactions, pay a
  bill in full, request transaction reports — the 10 main-menu options, detailed in
  [Account Management](./modules/account-management.md),
  [Card Management](./modules/card-management.md),
  [Transaction Management](./modules/transaction-management.md),
  [Bill Payment](./modules/bill-payment.md), and
  [Transaction Reporting](./modules/reporting.md).

## Authorization Model — What Exists and What Doesn't

Two business rules from `business-rules-catalog.md` matter for any team building on top of
this role model:

- **BR-003 — "Admin Only" menu gate is defined but currently unreachable.** The main menu
  has logic to reject an option flagged admin-only for a regular user, but every one of the
  10 current menu options is hard-coded as `'U'` in the options table — the gate exists in
  code but nothing triggers it today.
- **BR-005 — No account-ownership scoping.** The User entity carries no link to a specific
  Customer ID or Account ID. Any authenticated user of either type can view or update any
  account, card, or transaction by supplying its ID — there is no "this is my account"
  restriction anywhere in the legacy system. If a modernized system needs that restriction,
  it is a **new** design decision, not a carry-over from CardDemo's current behavior.

There is also a latent state-mutation hazard specific to Card Management — see BR-004 in
[Card Management](./modules/card-management.md#business-rules) — where the card-list
program unconditionally resets the session's recorded user type to "Regular User," which
would silently downgrade an Admin session if that screen were ever reached by one (it isn't,
under normal navigation, because Card List is not on the Admin Menu).

## Where Personas Are Not Distinguished

Phase 1's user stories and screen-flow analysis show that once a regular user reaches an
account, card, or transaction screen, the workflow does not vary by persona — the same
screen, fields, and rules apply regardless of which regular user is signed on. The only
persona-based branch point in the whole system is the one at sign-on (BR-002) and the
admin-only menu (BR-003, dead code today).
