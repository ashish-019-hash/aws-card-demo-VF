# Module: Bill Payment

[← Overview](../README.md) | Prev: [Transactions](transactions.md) | Next: [Transaction Reports](reporting.md)

## What it does

Settles an account's debt online in one confirmed step. The payment is **always the full
current balance** (no partial payments), is only allowed when a positive balance is owed,
requires an explicit `Y` confirmation, posts a fixed-profile "BILL PAYMENT - ONLINE"
transaction against the account's card, and reduces the balance to zero.
(Sources: [business-rules-catalog.md](../../business-rules-catalog.md) Payments;
[screen-flow.md](../../screen-flow.md) SCREEN-13; [user-stories.md](../../user-stories.md) STORY-017.)

This is the business-rule-richest screen in the application: 3 of the 7 catalogued business
rules live here.

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Pay the full account balance | COBIL00 (CB00 / COBIL00C) | [Account (002), Card-XREF (004), Transaction (005)](../data-model.md#entity-catalog) | [RULE-CALC-001, RULE-THRESHOLD-001, RULE-DECISION-001](../../business-rules-catalog.md) | [RULE-VAL-064–068](../../validation-rules.md) | STORY-017 |

## Business rules

| Rule | Summary |
|---|---|
| [RULE-CALC-001](../../business-rules-catalog.md) | Payment amount = full current balance; charged to the card resolved from the account's cross-reference; new balance = balance − payment (zero); fixed classification: type `02`, category `2`, source `POS TERM`, merchant `999999999` / `BILL PAYMENT` |
| [RULE-THRESHOLD-001](../../business-rules-catalog.md) | Payment blocked when balance ≤ 0 — "You have nothing to pay..." |
| [RULE-DECISION-001](../../business-rules-catalog.md) | No money moves without an explicit `Y` after the balance is shown; `N` cancels and clears |

## Screen & navigation ([screen-flow.md SCREEN-13](../../screen-flow.md))

Enter account ID → balance displayed → "Confirm to make a bill payment..." → `Y` writes the
payment transaction and zeroes the balance; `N` clears; invalid values are rejected. F4 clears;
F3 → caller or Main Menu. All outcomes stay on the screen with a message.

## Validations (full list: [validation-rules.md §11](../../validation-rules.md))

| Rule | Check |
|---|---|
| VAL-064 | Account ID must be entered |
| VAL-065 | Account must exist in master and cross-reference |
| VAL-066 | Current balance must be positive (validation face of RULE-THRESHOLD-001) |
| VAL-067 | Y/N confirmation (validation face of RULE-DECISION-001) |
| VAL-068 | Generated payment transaction ID must be unique |

## Data touched

READ + REWRITE `ACCTDAT` (balance update), READ `CXACAIX` (card for the account), browse +
WRITE `TRANSACT` (payment transaction with next sequential ID)
([business-entities.md](../../business-entities.md) ENTITY-002/004/005 usage).

## Modernization relevance

The all-or-nothing settlement model, the posting formula, and the fixed classification codes
must survive migration so downstream reporting recognizes bill payments
(RULE-CALC-001 impact note) — see [Modernization Notes](../modernization-notes.md).
