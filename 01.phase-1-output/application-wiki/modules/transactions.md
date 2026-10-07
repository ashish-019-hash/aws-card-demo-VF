# Module: Transactions

[← Overview](../README.md) | Prev: [Credit Card Servicing](card-servicing.md) | Next: [Bill Payment](bill-payment.md)

## What it does

Browse posted card transactions ten per page, drill into one transaction's full detail (card,
type, category, source, amount, merchant, timestamps), and key a new transaction against an
account or card with full field validation and a Y/N confirmation before it posts.
(Sources: [screen-flow.md](../../screen-flow.md) SCREEN-09/10/11;
[user-stories.md](../../user-stories.md) STORY-012–016.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Browse transactions, page with F7/F8 | COTRN00 (CT00 / COTRN00C) | [Transaction (005)](../data-model.md#entity-catalog) | — (list/pagination only) | [RULE-VAL-050, VAL-051](../../validation-rules.md) | STORY-012 |
| Open one transaction with `S` | COTRN00 | Transaction (005) | — | VAL-050 | STORY-013 |
| View full transaction detail | COTRN01 (CT01 / COTRN01C) | Transaction (005) | — (read-and-display only) | [RULE-VAL-052, VAL-053](../../validation-rules.md) | STORY-014 |
| Add a transaction with confirmation | COTRN02 (CT02 / COTRN02C) | Transaction (005), Card-XREF (004), Account (002), Card (003) | — (capture + sequential ID only; values stored as-is) | [RULE-VAL-054–063](../../validation-rules.md) | STORY-015 |
| Pre-fill the form from the latest transaction (F5) | COTRN02 | Transaction (005) | — | key-field edits re-run (VAL-054–056) | STORY-016 |

The business-rules catalog found no business computation in these programs; transaction-ID
generation ("read highest + 1") is classified as technical plumbing
([coverage note](../../business-rules-catalog.md)) but is a migration concern — see
[Modernization Notes](../modernization-notes.md).

## Screens & navigation

- **COTRN00 — Transaction List**: 10 rows/page (ID, date, description, amount); optional
  numeric transaction-ID filter repositions the list; `S` → COTRN01; F7/F8 page with
  top/bottom messages; F3 → Main Menu.
- **COTRN01 — Transaction View**: arrives pre-loaded from the list or takes a transaction ID;
  F4 clears, F5 jumps to the list, F3 → caller or Main Menu.
- **COTRN02 — Transaction Add**: enter account **or** card number (the other is
  auto-resolved via the cross-reference), fill all data fields, Enter validates, confirm `Y`
  to write; on success the form resets and shows the new ID. F4 clears; F5 copies the most
  recent transaction into the form.

## Validations (full list: [validation-rules.md §8–10](../../validation-rules.md))

| Area | Rules |
|---|---|
| List: selection must be `S`; ID filter numeric | VAL-050, VAL-051 |
| View: ID required and on file | VAL-052, VAL-053 |
| Add keys: account or card required, numeric, in cross-reference | VAL-054–056 |
| Add data: all 11 fields required; type/category numeric | VAL-057, VAL-058 |
| Amount in exact `-99999999.99` format | VAL-059 |
| Dates `YYYY-MM-DD` and real calendar dates (via CSUTLDTC) | VAL-060 |
| Merchant ID numeric | VAL-061 |
| Explicit Y/N confirmation; unique transaction ID at write | VAL-062, VAL-063 |

## Data touched

`TRANSACT` (browse/read/write), `CXACAIX` and `CCXREF` (key cross-validation on add)
([screen-flow.md data-sources table](../../screen-flow.md);
[business-entities.md](../../business-entities.md) ENTITY-005 usage).
