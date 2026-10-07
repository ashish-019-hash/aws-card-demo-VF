# Module: Bill Payment

[← Overview](../README.md) | [Architecture](../architecture.md) | [Key Workflows](../key-workflows.md)

## Purpose

Pay an account's current balance **in full**: writes a payment transaction to `TRANSACT` and zeroes the account balance.

| Artifact | Path |
|---|---|
| Program | `00.phase-1-input/cbl/COBIL00C.cbl` (572 lines), transaction **CB00** |
| Screen | Mapset COBIL00 / map COBIL0A, `00.phase-1-input/bms/COBIL00.bms` |
| Data | ACCTDAT (`cpy/CVACT01Y.cpy`), CXACAIX (`cpy/CVACT03Y.cpy`), TRANSACT (`cpy/CVTRA05Y.cpy`) |

## Behavior (as coded)

Main flow (`cbl/COBIL00C.cbl:177-245` and the paragraphs it performs):

1. Reads the account (`READ-ACCTDAT-FILE`, invoked at `:177, 184`; paragraph at `:343-`), displaying the current balance; requires `Y` in the confirm field to proceed (`WS-CONF-PAY-FLG` / `CONF-PAY-YES`, `:51-53, 173-176`).
2. Resolves the card for the account via `CXACAIX` (`READ-CXACAIX-FILE`, invoked at `:211`, paragraph at `:408-`; card number into `TRAN-CARD-NUM` at `:225`).
3. Finds the highest existing transaction id by browsing backward: `STARTBR-TRANSACT-FILE` (`:213`, paragraph `:441-`) + `READPREV-TRANSACT-FILE` (`:214`, paragraph `:472-`), then increments it for the new record.
4. Builds the payment transaction: description `'BILL PAYMENT - ONLINE'` (`:223`), merchant name `'BILL PAYMENT'` (`:227`), amount = `ACCT-CURR-BAL`, and writes it (`WRITE-TRANSACT-FILE`, `:233`, paragraph `:510-`).
5. Zeroes the account balance and rewrites the account record (`EXEC CICS REWRITE` at `:379`).
6. PF3 exits via `XCTL PROGRAM(CDEMO-TO-PROGRAM)` (`:282`).

The exact transaction type/category codes written are business-rule detail owned by `01.phase-1-output/business-rules-catalog.md`.

## Notes

- Payment is all-or-nothing — there is no partial-payment input on the screen; the amount is taken from the account's current balance.
- The new transaction id generation duplicates the pattern used by [Transaction Add](transaction-management.md) (browse backwards, increment).
