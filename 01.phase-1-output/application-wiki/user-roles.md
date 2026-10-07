# User Types & Roles

[← Overview](README.md) | [Business Rules & Validation Index](rules-and-validations.md)

Three user types appear across the Phase 1 artifacts
([user-stories.md](../user-stories.md) roles table;
[business-glossary.md](../business-glossary.md) "Parties and Access").

## Regular User (type `U`) — bank/call-center staff

Signs on and is routed to the **Main Menu** (10 options). Can perform every customer-servicing
function; in the current menu configuration all ten main-menu options are flagged `U`
(open to regular users) — see [RULE-DECISION-003](../business-rules-catalog.md).

| Capability | Module | Stories |
|---|---|---|
| View / update accounts and customer data | [Account Servicing](modules/account-servicing.md) | STORY-006, 007 |
| List / view / update credit cards | [Credit Card Servicing](modules/card-servicing.md) | STORY-008–011 |
| List / view / add transactions | [Transactions](modules/transactions.md) | STORY-012–016 |
| Pay an account's bill in full | [Bill Payment](modules/bill-payment.md) | STORY-017 |
| Request transaction reports | [Transaction Reports](modules/reporting.md) | STORY-018 |

## Administrator (type `A`)

Signs on and is routed to the **Admin Menu** (4 options) — user-security maintenance only.
Role routing is [RULE-DECISION-002](../business-rules-catalog.md); segregation of duties is
the stated business intent (admins manage users; regular users work with customer data).

| Capability | Module | Stories |
|---|---|---|
| List application users | [User Security Administration](modules/user-administration.md) | STORY-020, 021 |
| Add / update / delete users (incl. role assignment) | [User Security Administration](modules/user-administration.md) | STORY-022–024 |

## Operations / Batch (integration role)

Not an interactive sign-on. Receives the report JCL submitted from the online Reports screen
via TDQ `JOBS` and produces the printed transaction report
([STORY-019](../user-stories.md), [Transaction Reports](modules/reporting.md)).

## Role enforcement points

| Enforcement | Where | Reference |
|---|---|---|
| Role decides post-sign-on entry point (admin vs. main menu) | COSGN00C | RULE-DECISION-002; RULE-VAL-003/004 |
| Per-option required-role flag; regular users denied admin-only options | COMEN01C | RULE-DECISION-003; RULE-VAL-006 |
| User-security functions reachable only from the admin menu | COADM01C option table | RULE-DECISION-003 description |
| Unsigned sessions bounced to Sign-on from every screen | all programs | [screen-flow.md](../screen-flow.md) "Safety net" |

The user record itself (ID, name, password, role) is [ENTITY-011](data-model.md#entity-catalog).
