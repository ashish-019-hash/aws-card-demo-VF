# Module: User Security Administration

[← Overview](../README.md) | Prev: [Transaction Reports](reporting.md) | [User Types & Roles](../user-roles.md)

## What it does

Admin-only maintenance of the application's users: a pageable user list with jump-to actions,
plus add, update, and delete screens. New users are created with an explicit role (`A`/`U`),
updates cover name/password/type, and deletion is a deliberate fetch-review-F5 sequence.
These four functions exist only on the Admin Menu.
(Sources: [screen-flow.md](../../screen-flow.md) SCREEN-14–17;
[user-stories.md](../../user-stories.md) STORY-020–024;
[business-rules-catalog.md](../../business-rules-catalog.md) RULE-DECISION-003.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| List users, page with F7/F8 | COUSR00 (CU00 / COUSR00C) | [Application User (011)](../data-model.md#entity-catalog) | — (list/pagination only) | [RULE-VAL-074](../../validation-rules.md) | STORY-020 |
| Jump to update (`U`) / delete (`D`) from the list | COUSR00 | User (011) | — | VAL-074 | STORY-021 |
| Add a user (name, ID, password, role) | COUSR01 (CU01 / COUSR01C) | User (011) | — (user CRUD with field validation) | [RULE-VAL-075, VAL-076](../../validation-rules.md) | STORY-022 |
| Update a user's name / password / role | COUSR02 (CU02 / COUSR02C) | User (011) | — | [RULE-VAL-077–079, VAL-081](../../validation-rules.md) | STORY-023 |
| Delete a user | COUSR03 (CU03 / COUSR03C) | User (011) | — | [RULE-VAL-079, VAL-080](../../validation-rules.md) | STORY-024 |

Admin-only reachability of this whole module is governed by
[RULE-DECISION-002/003](../../business-rules-catalog.md) (see [Menus](menus.md)).

## Screens & navigation ([screen-flow.md SCREEN-14–17](../../screen-flow.md))

- **COUSR00 — User List**: 10 users/page (ID, name, type); optional starting-user-ID filter;
  `U` → COUSR02, `D` → COUSR03 with the user pre-loaded; F7/F8 page; F3 → Admin Menu.
- **COUSR01 — User Add**: five mandatory fields; duplicate IDs rejected; success clears the form.
- **COUSR02 — User Update**: fetch by ID → overtype → F5 saves (requires an actual change);
  F3 applies a pending valid update then returns; F12 returns without saving.
- **COUSR03 — User Delete**: fetch by ID → review name/type (read-only) → F5 deletes.

## Validations (full list: [validation-rules.md §13](../../validation-rules.md))

| Rule | Check |
|---|---|
| VAL-074 | List row action must be `U` or `D` |
| VAL-075 | Add: all five fields (first/last name, ID, password, type) required |
| VAL-076 | New user ID must be unique |
| VAL-077 / VAL-080 | User ID required to look up / update / delete |
| VAL-078 | Update save: name/password/type all required |
| VAL-079 | The user being updated or deleted must exist |
| VAL-081 | Update accepted only when at least one field changed |

## Data touched

`USRSEC` (user security file): browse (list), WRITE (add), READ + REWRITE (update),
READ + DELETE (delete) ([screen-flow.md data-sources table](../../screen-flow.md);
[business-entities.md](../../business-entities.md) ENTITY-011 usage).
