# Functional Capability: Bill Payment

**Program / Transaction:** COBIL00C / `CB00` · **Screen:** Bill Payment (COBIL00)

**Sources:** [`screen-flow.md`](../../screen-flow.md#12-bill-payment-cobil00--cobil00c--cb00)
(§12), [`business-rules-catalog.md`](../../business-rules-catalog.md#5-bill-payment-cobil00c)
(§5: BR-011, BR-012; also BR-010, shared), [`validation-rules.md`](../../validation-rules.md#14-bill-payment--cobil00c-screen-cobil00--txn-cb00)
(§14: VR-095–VR-097), [`user-stories.md`](../../user-stories.md#11-bill-payment-cobil00c--transaction-cb00)
(§11: STORY-035–STORY-038), [`business-entities.md`](../../business-entities.md#entity-002-account)
(ENTITY-002, ENTITY-004, ENTITY-005).

## What This Module Does

Bill Payment pays off an account's entire outstanding balance in a single step — there is
no partial-payment option. The user looks up an account, sees the current balance, and
confirms; on confirmation, one transaction record is written for the full balance and the
account balance is driven to exactly zero.

## Screen & Navigation

| Screen | Navigation |
|---|---|
| Bill Payment (COBIL00) | Account ID required. Balance ≤ 0 → "You have nothing to pay..." message, no payment created. Balance > 0 → confirm prompt. Confirm=Y → payment transaction written, balance zeroed, updated (zero) balance shown. Confirm=N → screen cleared for a new attempt. Confirm blank/other → prompt/error. PF3 → Main Menu (or prior screen). |

Full field list and navigation detail:
[`screen-flow.md` §12`](../../screen-flow.md#12-bill-payment-cobil00--cobil00c--cb00).

## Entities Touched

| Entity | Role |
|---|---|
| [Account](../data-model.md#account) (ENTITY-002) | The balance being read and then zeroed |
| [Card-Account-Customer Cross-Reference](../data-model.md#card-account-customer-cross-reference) (ENTITY-004) | Resolves the card number to attach to the payment transaction |
| [Transaction](../data-model.md#transaction) (ENTITY-005) | The single payment record written on confirmation |

## Business Rules

| ID | Rule |
|---|---|
| BR-011 | A bill payment is **only allowed when the account balance is positive** — zero or negative balance shows "You have nothing to pay..." and stops. (Observed nuance: this check is skipped for a pass where the user answered "N" to confirm, because an error flag from that branch is already set — a control-flow detail, not corrected here.) |
| BR-012 | A bill payment **always pays the full current balance in one transaction and zeroes the account** — there is no partial-payment entry. The payment transaction is built with fixed content (type `'02'`, category `2`, source `'POS TERM'`, description `'BILL PAYMENT - ONLINE'`, merchant ID `999999999`, merchant name `'BILL PAYMENT'`). |
| BR-010 | The payment transaction's ID is assigned by the **same MAX+1 mechanism** used by Transaction Add — see [Transaction Management](./transaction-management.md#business-rules) for the full mechanics and its concurrency exposure. |

Full detail: [`business-rules-catalog.md` §5`](../../business-rules-catalog.md#5-bill-payment-cobil00c).

## Validation Rules

| ID | Field | Rule |
|---|---|---|
| VR-095 | Account ID | Must be supplied |
| VR-096 | Confirm | Must be Y/N/blank; any other value rejected |
| VR-097 | Confirm | If account is valid but confirm isn't yet Y, the user must confirm before payment posts |

Full rule table: [`validation-rules.md` §14`](../../validation-rules.md#14-bill-payment--cobil00c-screen-cobil00--txn-cb00).

## User Stories

STORY-035–STORY-038 cover: looking up the balance, paying in full with a recorded
transaction, the required confirm step, and the "nothing to pay" outcome. See
[`user-stories.md` §11`](../../user-stories.md#11-bill-payment-cobil00c--transaction-cb00).

## Related Pages

- [Account Management](./account-management.md) — the account whose balance is paid
- [Transaction Management](./transaction-management.md) — shares the MAX+1 ID mechanism
