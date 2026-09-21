# Functional Capability: User Administration

**Programs / Transactions:** COUSR00C / `CU00` (List), COUSR01C / `CU01` (Add),
COUSR02C / `CU02` (Update), COUSR03C / `CU03` (Delete) — **Administrator only**

**Sources:** [`screen-flow.md`](../../screen-flow.md#14-list-users-cousr00--cousr00c--cu00--administrator-only)
(§14–17), [`business-rules-catalog.md`](../../business-rules-catalog.md#8-user-administration-cousr00ccousr03c)
(§8: BR-016; also BR-015, shared), [`validation-rules.md`](../../validation-rules.md#16-user-list--cousr00c-screen-cousr00--txn-cu00)
(§16–19: VR-115–VR-128), [`user-stories.md`](../../user-stories.md#13-user-list-cousr00c--transaction-cu00-admin-only)
(§13–16: STORY-044–STORY-050), [`business-entities.md`](../../business-entities.md#entity-010-user-security-profile)
(ENTITY-010).

## What This Module Does

User Administration is the Admin-only capability to manage who is allowed to sign in:
browse/search the list of users, create a new one, update an existing one's name/password/
type, or delete one. It is the only place in the application where the User entity itself
is edited (as opposed to being read, at Sign-On).

## Screens & Navigation

| Screen | Purpose | Navigation |
|---|---|---|
| List Users (COUSR00) | Browse/filter, 10 rows per page | Optional User ID filter. Type "U" on a row → Update User. Type "D" → Delete User. F7/F8 → page backward/forward. PF3 → Admin Menu. |
| Add User (COUSR01) | Create a new user | All fields (First/Last Name, User ID, Password, User Type) required; User Type must be A or U (see validation gap note below). Valid → user created, screen cleared for the next entry. PF3 → Admin Menu. |
| Update User (COUSR02) | Look up and edit an existing user | Lookup by User ID. F5 → save immediately, stay on screen. F3 → save and return to Admin Menu. F12 → discard and return without saving. Unlike Account/Card Update, there is **no separate Y/N confirm step** — F3/F5 save immediately. |
| Delete User (COUSR03) | Look up and remove a user | Lookup shows the user's name/type read-only, as a visual double-check. F5 → deletes. F3/F12 → return to Admin Menu without deleting. No separate Y/N confirm field — **F5 itself is the confirmation gesture.** |

Full field lists and navigation detail:
[`screen-flow.md` §14–17`](../../screen-flow.md#14-list-users-cousr00--cousr00c--cu00--administrator-only).

## Entities Touched

| Entity | Role |
|---|---|
| [User (Security Profile)](../data-model.md#user-security-profile) (ENTITY-010) | The record listed, created, updated, and deleted — user ID, name, password, and A/U type |

## Business Rules

| ID | Rule |
|---|---|
| BR-016 | **User ID uniqueness on Add** (enforced by the file key — a duplicate ID is rejected with "User ID already exist..."), **no-op guard on Update** (rejected with "Please modify to update..." if nothing actually changed, same pattern as Account/Card update's BR-006), and **two-step confirm-then-commit on Delete** (Enter shows the record read-only; only pressing PF5 actually deletes — there's no dedicated Y/N field). |
| BR-015 | User List shows a **fixed page size of 10**, same look-ahead-read pattern as Card List and Transaction List. |

Full detail: [`business-rules-catalog.md` §8`](../../business-rules-catalog.md#8-user-administration-cousr00ccousr03c).

## Validation Rules (Summary)

| Screen | Rules | Coverage |
|---|---|---|
| List Users | VR-115 | Row-selection must be U or D |
| Add User | VR-116–VR-120 | First/Last Name, User ID, Password, User Type all required |
| Update User | VR-121–VR-126 | User ID (lookup and update), First/Last Name, Password, User Type all required |
| Delete User | VR-127–VR-128 | User ID required (lookup and delete confirm) |

Full rule table: [`validation-rules.md` §16–19`](../../validation-rules.md#16-user-list--cousr00c-screen-cousr00--txn-cu00).

> **Gap carried from Phase 1:** Add User does not itself re-check that the supplied User
> Type is restricted to `A`/`U` — those code values are only interpreted later, at
> Sign-On. No explicit rejection message exists in Add User for an out-of-range User Type.
> See [`validation-rules.md` §17`](../../validation-rules.md#17-add-user--cousr01c-screen-cousr01--txn-cu01)
> for the full note.

## User Stories

STORY-044–STORY-045 (List), STORY-046 (Add), STORY-047–STORY-048 (Update), STORY-049–
STORY-050 (Delete) cover: browsing/filtering, selecting a user for update/delete, creating
a user, editing and saving, and the PF5 delete-confirmation gesture. See
[`user-stories.md` §13–16`](../../user-stories.md#13-user-list-cousr00c--transaction-cu00-admin-only).

## Related Pages

- [User Types & Roles](../user-types-and-roles.md) — the A/U type this module manages
- [Sign-On](./sign-on.md) — where a User record created here is later authenticated
