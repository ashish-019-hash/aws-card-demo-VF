# Module: Account Servicing

[← Overview](../README.md) | [Data Model](../data-model.md) | Next: [Credit Card Servicing](card-servicing.md)

## What it does

Look up an account by its 11-digit number and see — or safely change — the full account and
owning-customer picture: status, limits, balances, lifecycle dates, plus the customer's name,
address, phones, SSN, date of birth, FICO score, and EFT account. The account's customer is
always resolved through the card cross-reference file, because no direct Customer↔Account key
exists. (Sources: [screen-flow.md](../../screen-flow.md) SCREEN-04/05;
[user-stories.md](../../user-stories.md) STORY-006/007;
[business-entities.md](../../business-entities.md) ENTITY-004.)

## Cross-reference

| Function | Screen (Tran / Program) | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| View account + customer details | COACTVW (CAVW / COACTVWC) | [Account (002), Customer (001), Card-XREF (004)](../data-model.md#entity-catalog) | — (read-and-display only) | [RULE-VAL-008–010](../../validation-rules.md) | STORY-006 |
| Update account + customer details | COACTUP (CAUP / COACTUPC) | Account (002), Customer (001), Card-XREF (004) | — (validation/update plumbing only) | [RULE-VAL-011–034](../../validation-rules.md) | STORY-007 |

The business-rules catalog explicitly found **no business rules** in these two programs —
only field validation, data conversion, and optimistic-locking update plumbing
([coverage note](../../business-rules-catalog.md)).

## Screens & navigation

- **COACTVW — Account View**: enter an 11-digit account number → three-step read chain
  (cross-reference → account master → customer master), each miss with its own message.
  F3 → caller or Main Menu.
- **COACTUP — Account Update**: fetch → overtype any field → Enter validates every changed
  field → "F5=Save" confirmation → records locked, re-checked, and rewritten. F12 discards
  edits; F3 exits. Save outcomes reported individually (success / lock error / changed by
  another user / update failed). ([screen-flow.md](../../screen-flow.md) SCREEN-05.)

## Validation highlights (full list: [validation-rules.md §3–4](../../validation-rules.md))

| Area | Rules |
|---|---|
| Account search key: supplied, 11-digit non-zero, on file | VAL-008–013 |
| Y/N flags (active status, primary cardholder) | VAL-014, VAL-032 |
| Dates: full CCYYMMDD calendar validation; DOB not in future | VAL-015, VAL-016 |
| Money fields: signed decimal, all five required | VAL-017 |
| SSN three-part rules (000/666/900-999 area ban) | VAL-018–020 |
| FICO score 300–850 | VAL-021 |
| Names alphabetic; address/city/state/ZIP/country edits | VAL-022–028 |
| Cross-field: state + first-2-ZIP-digits combination | VAL-029 |
| Phone: optional-as-whole, valid NANP number if any part entered | VAL-030 |
| EFT account ID 10-digit non-zero | VAL-031 |
| No-change detection; optimistic-concurrency re-check at save | VAL-033, VAL-034 |

This is the densest validation surface in the application (27 of the 81 rules) — flagged in
[Modernization Notes](../modernization-notes.md).

## Data touched

READ `CXACAIX` (xref by account), `ACCTDAT`, `CUSTDAT`; COACTUPC also READ-UPDATE + REWRITE
both masters ([screen-flow.md data-sources table](../../screen-flow.md);
[business-entities.md](../../business-entities.md) ENTITY-001/002 usage).
