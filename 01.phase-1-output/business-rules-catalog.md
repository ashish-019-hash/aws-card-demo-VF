# Business Rules Catalog

## Scope and approach

This catalog covers the COBOL programs and copybooks under `00.phase-1-input`. It records only consequential payment and reporting-period logic. Input-format checks, required-field checks, lookup and file-processing mechanics, screen pagination, identifier sequencing, display formatting, and optimistic-locking checks are intentionally excluded as validation or technical logic.

### RULE-DECISION-001: Payment Is Available Only for a Positive Account Balance

**Description**: An account may be paid only when its current balance is greater than zero. An account with a zero or negative balance has no amount available for an online bill payment.

**Source**: `00.phase-1-input/cbl/COBIL00C.cbl`, lines 197-205

**Logic**: If `ACCT-CURR-BAL <= 0`, do not proceed with the bill-payment flow; otherwise, a confirmed payment may be processed.

**Variables**:
- Input: Account current balance (`ACCT-CURR-BAL`)
- Output: Payment eligibility

**Impact**: Prevents a payment transaction from being created when the account does not have an outstanding positive balance.

### RULE-CALC-002: Online Bill Payment Settles the Full Current Balance

**Description**: A confirmed online bill payment is always for the account's entire current balance, rather than for a customer-entered partial amount. The payment transaction amount is set to that balance and the same amount is deducted from the balance.

**Source**: `00.phase-1-input/cbl/COBIL00C.cbl`, lines 208-235

**Logic**: `payment amount = current account balance`; `new current balance = current account balance - payment amount`.

**Variables**:
- Input: Account current balance (`ACCT-CURR-BAL`)
- Output: Bill-payment transaction amount (`TRAN-AMT`) and updated account current balance (`ACCT-CURR-BAL`)

**Impact**: A successful confirmed online payment records the full outstanding balance as a bill-payment transaction and reduces the account balance to zero.

### RULE-DECISION-003: Monthly Transaction Report Covers the Current Calendar Month

**Description**: When the monthly report option is selected, the report period begins on the first day of the current month and ends on the final day of that month. The final date is derived as the day before the first day of the following month, including the December-to-January year transition.

**Source**: `00.phase-1-input/cbl/CORPT00C.cbl`, lines 212-238

**Logic**: `start date = current year-current month-01`; `end date = (first day of next month) - 1 day`.

**Variables**:
- Input: Current system date and monthly report selection
- Output: Report start date and report end date

**Impact**: Ensures a monthly transaction report includes transactions processed throughout the current calendar month, including months that cross a year boundary when calculating the next month.

### RULE-DECISION-004: Yearly Transaction Report Covers the Current Calendar Year

**Description**: When the yearly report option is selected, the report period is the current calendar year, from January 1 through December 31.

**Source**: `00.phase-1-input/cbl/CORPT00C.cbl`, lines 239-255

**Logic**: `start date = current year-01-01`; `end date = current year-12-31`.

**Variables**:
- Input: Current system year and yearly report selection
- Output: Report start date and report end date

**Impact**: Produces an annual transaction report for the complete current calendar year.

## Exclusions

No additional calculations, thresholds, approval criteria, or aggregations in the reviewed COBOL and copybooks met the business-rule threshold. In particular, the remaining arithmetic is used for screen paging, transaction identifier generation, date or numeric conversion, and input validation; account, card, customer, and transaction maintenance otherwise performs data movement and persistence without encoded business calculations or decisions.
