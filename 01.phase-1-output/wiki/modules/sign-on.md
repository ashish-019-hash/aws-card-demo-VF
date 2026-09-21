# Functional Capability: Sign-On

**Program / Transaction:** COSGN00C / `CC00` · **Screen:** Sign-On (COSGN00)

**Sources:** [`screen-flow.md`](../../screen-flow.md#1-sign-on-screen-cosgn00--cosgn00c--cc00),
[`business-rules-catalog.md`](../../business-rules-catalog.md#1-sign-on--authorization)
(BR-001, BR-002), [`validation-rules.md`](../../validation-rules.md#3-sign-on--cosgn00c-screen-cosgn00--txn-cc00)
(VR-001, VR-002), [`user-stories.md`](../../user-stories.md#1-sign-on-cosgn00c--transaction-cc00)
(STORY-001–STORY-006), [`business-entities.md`](../../business-entities.md#entity-010-user-security-profile)
(ENTITY-010).

## What This Module Does

Sign-On is the entry point every person sees. It asks for a User ID and Password,
validates them against the User entity, and routes the person to the Main Menu (regular
user) or the Admin Menu (administrator) based on their stored user type. Every other
capability in the application is reachable only after this screen succeeds.

## Screen & Navigation

| Screen | Navigation |
|---|---|
| Sign-On (COSGN00) | Valid Admin login → Admin Menu. Valid regular-user login → Main Menu. Wrong password / User ID not found / blank fields → stays on Sign-On with a specific message. PF3 → ends the session with a "thank you" message. Any other key → "Invalid key pressed..." |

Full field list and navigation detail: [`screen-flow.md` §1](../../screen-flow.md#1-sign-on-screen-cosgn00--cosgn00c--cc00).

## Entities Touched

| Entity | Role |
|---|---|
| [User](../data-model.md#user-security-profile) (ENTITY-010) | Looked up by User ID; password and user type drive the sign-on decision |

## Business Rules

| ID | Rule |
|---|---|
| BR-001 | Sign-on credential match is **case-forced on input** (User ID and Password both upper-cased before comparison) but **case-sensitive on the stored password** — a stored password containing any lower-case character can never match. Documented as an observed legacy quirk, not a designed rule. |
| BR-002 | Once credentials match, `SEC-USR-TYPE` (`A`/`U`) drives a hard routing decision: Admin → Admin Menu (COADM01C), everyone else → Main Menu (COMEN01C). This single flag is the entire access-control model of the application. |

Full detail: [`business-rules-catalog.md` §1](../../business-rules-catalog.md#1-sign-on--authorization).

## Validation Rules

| ID | Field | Rule |
|---|---|---|
| VR-001 | User ID | Must be supplied |
| VR-002 | Password | Must be supplied |

(Credential match itself and "user not found" are authentication *decisions*, not shape
validations — they're covered under Business Rules above and in
[`validation-rules.md` §1.2](../../validation-rules.md#12-what-is-excluded-and-why), not
repeated here as validation rules.)

## User Stories

STORY-001–STORY-006 cover: regular-user sign-on success, admin sign-on success, wrong
password, unknown User ID, blank-field prompts, and exiting via PF3. See
[`user-stories.md` §1](../../user-stories.md#1-sign-on-cosgn00c--transaction-cc00) for full
acceptance criteria and exact legacy message text.

## Related Pages

- [User Types & Roles](../user-types-and-roles.md) — what Admin vs. Regular User unlocks
- [Menu Navigation](./menu-navigation.md) — where sign-on routes to next
