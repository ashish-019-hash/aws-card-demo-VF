# Module: Sign-on & Session

[← Overview](../README.md) | [User Types & Roles](../user-roles.md) | Next: [Menus & Navigation](menus.md)

## What it does

The application entry point. The user proves who they are against the `USRSEC` security file;
on success the system attaches the user's ID and role to the session and routes administrators
to the Admin Menu and regular users to the Main Menu. F3 exits the application with a
thank-you message. (Sources: [screen-flow.md](../../screen-flow.md) SCREEN-01;
[user-stories.md](../../user-stories.md) STORY-001–003.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Sign on with ID + password | COSGN00 (CC00 / COSGN00C) | [Application User (ENTITY-011)](../data-model.md#entity-catalog) | [RULE-DECISION-002](../../business-rules-catalog.md) (role routing) | [RULE-VAL-001–004](../../validation-rules.md) | STORY-001, STORY-002 |
| Exit the application | COSGN00, F3 | — | — | — | STORY-003 |

## Screens & navigation

- **COSGN00 — Sign-on** ([screen-flow.md SCREEN-01](../../screen-flow.md)): User ID + Password
  input; APPLID/SYSID display. Enter with valid admin credentials → COADM01 Admin Menu; valid
  regular-user credentials → COMEN01 Main Menu; blank/wrong/unknown credentials redisplay with
  a specific message; F3 → exit.
- Every menu's F3 leads back here, and any screen started without a signed-on session is
  bounced here ([screen-flow.md](../../screen-flow.md) "Safety net").

## Business logic

- **RULE-DECISION-002 — User role determines application entry point**: role `A` → admin menu
  (COADM01C), otherwise → main menu (COMEN01C); the role is carried with the session and
  governs entitlements thereafter ([business-rules-catalog.md](../../business-rules-catalog.md)).
- The credential check itself is classified as validation, not business logic
  (rules-catalog coverage note).

## Validations

| Rule | Check |
|---|---|
| [RULE-VAL-001](../../validation-rules.md) | User ID must be entered |
| [RULE-VAL-002](../../validation-rules.md) | Password must be entered |
| [RULE-VAL-003](../../validation-rules.md) | User ID must exist in the security file |
| [RULE-VAL-004](../../validation-rules.md) | Entered password must match the stored password |

VAL-003 runs only after VAL-001/002 pass; VAL-004 only after the record is found
(validation-rules dependency summary).

## Data touched

Reads [ENTITY-011 Application User](../data-model.md#entity-catalog) (`USRSEC` file) by user-ID key.
Password storage/comparison is plaintext — see [Modernization Notes](../modernization-notes.md).
