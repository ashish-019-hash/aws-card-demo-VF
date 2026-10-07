# Business Rules Catalog — CardDemo (Legacy COBOL/CICS)

**Scope**: All COBOL programs (`00.phase-1-input/cbl/`), copybooks (`00.phase-1-input/cpy/`), and batch JCL procedures (`00.phase-1-input/proc/`, `00.phase-1-input/ctl/`) in the checked-out working tree of branch `vorflux/migrate-carddemo-spring-react`.

**Method**: Extraction per `/code/.skills/user/business-rules/SKILL.md`. Each rule below encodes business knowledge that would exist in any re-implementation of this system. Input validation (field format/presence checks, SSN/phone/state/ZIP lookups in `CSLKPCDY.cpy`, date validation via `CSUTLDTC.cbl`), data conversion (`NUMVAL`/`NUMVAL-C` computes in `COACTUPC.cbl` lines 1079–1139, `CORPT00C.cbl` lines 305–325), sequential transaction-ID generation (`COTRN02C.cbl` lines 444–452, `COBIL00C.cbl` lines 212–217), screen pagination (`COTRN00C.cbl`, `COUSR00C.cbl`, `COCRDLIC.cbl`), optimistic-locking change detection (`COACTUPC.cbl`, `COCRDUPC.cbl`), and CICS housekeeping were reviewed and deliberately **excluded**.

This repository is the online (CICS) portion of CardDemo only; no batch interest/fee-calculation programs are present in the working tree. The report-formatting batch program `CBTRN03C` referenced by `TRANREPT.prc` is not in the repository, so only the selection/ordering rules defined in the JCL itself are catalogued.

---

## Payments

### RULE-CALC-001: Bill Payment Settles the Full Account Balance

**Description**: An online bill payment always pays off the customer's entire current account balance — there is no partial-payment option. The payment is recorded as a transaction against the credit card linked to the account, and the account balance is reduced by the payment amount (bringing it to zero). Every bill payment is classified with a fixed business profile: transaction type `02`, transaction category `2`, source `POS TERM`, description `BILL PAYMENT - ONLINE`, and the reserved internal merchant `999999999` / `BILL PAYMENT`.

**Source**: `00.phase-1-input/cbl/COBIL00C.cbl`, lines 210–235 (payment amount set to full balance at line 224: `MOVE ACCT-CURR-BAL TO TRAN-AMT`; classification at lines 220–229; card resolved from the account cross-reference at lines 211 and 225; balance update at line 234: `COMPUTE ACCT-CURR-BAL = ACCT-CURR-BAL - TRAN-AMT`).

**Logic**:
- Payment amount = Account Current Balance (full settlement, no partial amount accepted).
- Transaction is charged to the card number obtained from the account's card cross-reference record (`XREF-CARD-NUM`).
- New Account Current Balance = Current Balance − Payment Amount (i.e., zero after a successful payment).
- The payment transaction carries the fixed classification: type `02`, category `2`, source `POS TERM`, merchant ID `999999999`, merchant name `BILL PAYMENT`.

**Variables**:
- Input: `ACCT-CURR-BAL` (account current balance), `XREF-CARD-NUM` (card linked to the account).
- Output: `TRAN-AMT` (payment transaction amount), updated `ACCT-CURR-BAL`, new transaction record on the transaction file.

**Impact**: Defines how customers settle their credit-card debt online. The all-or-nothing settlement model, the balance posting formula, and the fixed bill-payment classification codes must all be preserved in any migration so that downstream reporting and accounting recognize bill payments correctly.

---

### RULE-THRESHOLD-001: Bill Payment Allowed Only When a Positive Balance Is Owed

**Description**: A bill payment is rejected when the account's current balance is zero or negative (i.e., nothing is owed or the account is in credit). The customer is told "You have nothing to pay...".

**Source**: `00.phase-1-input/cbl/COBIL00C.cbl`, lines 197–205 (`IF ACCT-CURR-BAL <= ZEROS ... MOVE 'You have nothing to pay...'`).

**Logic**: IF Account Current Balance ≤ 0 THEN block the payment.

**Variables**:
- Input: `ACCT-CURR-BAL` (account current balance).
- Output: Payment blocked / allowed decision.

**Impact**: Prevents zero-value or credit-balance payments, so no meaningless payment transactions are ever created and customers cannot overpay into a credit position through the bill-payment function.

---

### RULE-DECISION-001: Bill Payment Requires Explicit Customer Confirmation

**Description**: A bill payment is executed only after the customer explicitly confirms it (enters `Y`). If the customer has not yet confirmed, the system shows the balance due and prompts "Confirm to make a bill payment..."; entering `N` cancels and clears the request. No funds move without an affirmative confirmation.

**Source**: `00.phase-1-input/cbl/COBIL00C.cbl`, lines 172–191 (confirmation evaluation: `Y`/`y` sets payment-confirmed, `N`/`n` cancels) and lines 210, 236–240 (payment executes only `IF CONF-PAY-YES`, otherwise the confirmation prompt is shown).

**Logic**:
- IF confirmation = `Y` THEN execute the payment (RULE-CALC-001).
- IF confirmation = `N` THEN cancel and clear the request.
- IF confirmation is blank THEN display balance due and request confirmation before any money movement.

**Variables**:
- Input: Customer confirmation response (`CONFIRMI`), account current balance (shown to the customer before confirming).
- Output: Payment executed / cancelled / pending-confirmation decision.

**Impact**: Guarantees that a full-balance debit is never triggered by a single accidental keystroke — a two-step authorization is a business control on money movement that must survive migration.

---

## Access and Entitlements

### RULE-DECISION-002: User Role Determines Application Entry Point

**Description**: After successful sign-on, the system routes the user based on their role on the security record: administrators (`A`) are taken to the administration menu; regular users (`U`) are taken to the customer/main menu. The role is carried with the session and governs what the user can do thereafter.

**Source**: `00.phase-1-input/cbl/COSGN00C.cbl`, lines 223–240 (role captured at line 227: `MOVE SEC-USR-TYPE TO CDEMO-USER-TYPE`; routing at lines 230–240: `IF CDEMO-USRTYP-ADMIN` → XCTL `COADM01C`, ELSE → XCTL `COMEN01C`). Role codes defined in `00.phase-1-input/cpy/COCOM01Y.cpy`, lines 26–28 (`'A'` = Admin, `'U'` = User).

**Logic**: IF user role = Admin (`A`) THEN route to the admin menu (user management functions); ELSE route to the main menu (account/card/transaction functions).

**Variables**:
- Input: `SEC-USR-TYPE` (role on the user security record).
- Output: Application entry point (admin menu vs. main menu) and session role context.

**Impact**: Separates administrative duties (user/security management) from customer-facing operations. The segregation of duties is a core business access policy, not a technical artifact.

---

### RULE-DECISION-003: Admin-Only Functions Are Denied to Regular Users

**Description**: Each main-menu function carries a required-role flag. A regular user who selects a function flagged admin-only is refused with "No access - Admin Only option...". In the current configuration all ten main-menu functions (account view/update, card list/view/update, transaction list/view/add, reports, bill payment) are open to regular users (`U`), while the four security functions — user list, add, update, and delete — exist only on the admin menu.

**Source**: `00.phase-1-input/cbl/COMEN01C.cbl`, lines 136–144 (`IF CDEMO-USRTYP-USER AND CDEMO-MENU-OPT-USRTYPE(WS-OPTION) = 'A'` → deny). Menu/role assignments: `00.phase-1-input/cpy/COMEN02Y.cpy`, lines 19–93 (ten options, each with a role flag, all currently `'U'`); admin-only function set: `00.phase-1-input/cpy/COADM02Y.cpy`, lines 19–42 (User List/Add/Update/Delete).

**Logic**: IF session role = regular user AND selected function requires Admin THEN deny access; ELSE transfer to the selected function.

**Variables**:
- Input: Session user role, selected menu option, option's required-role flag.
- Output: Access granted / denied decision.

**Impact**: Enforces the entitlement model at the function level. A migrated system must keep per-function role checks (not just separate menus), because the role flag is data-driven and can designate any function admin-only.

---

## Reporting

### RULE-CALC-002: Transaction Report Period Determination

**Description**: When a customer requests a transaction report, the reporting period is derived from the report type:
- **Monthly**: from the 1st of the current month through the last day of the current month (the end date is computed by calendar arithmetic — first day of next month minus one day — so it is correct for 28/29/30/31-day months).
- **Yearly**: from January 1 through December 31 of the current year.
- **Custom**: the exact start and end dates the customer enters.

**Source**: `00.phase-1-input/cbl/CORPT00C.cbl` — Monthly: lines 213–238 (start = YYYY-MM-01 at lines 216–221; end = first-of-next-month − 1 day at lines 224–236); Yearly: lines 239–255 (Jan 1 start at lines 243–248, Dec 31 end at lines 250–253); Custom: lines 256 and 429–436 (user-entered dates become the report parameters).

**Logic**:
- Monthly: start = first day of current month; end = DATE-OF-INTEGER(INTEGER-OF-DATE(first day of next month) − 1).
- Yearly: start = January 1 of current year; end = December 31 of current year.
- Custom: start/end = customer-entered dates.

**Variables**:
- Input: Report type selected (Monthly / Yearly / Custom), current calendar date, customer-entered dates (custom only).
- Output: Report start date and end date (passed as parameters to the report batch job).

**Impact**: Defines what "a monthly report" and "a yearly report" mean to the business — calendar-month and calendar-year periods anchored to today, not rolling 30/365-day windows. Getting this wrong in migration would silently change report contents.

---

### RULE-DECISION-004: Report Content — Transactions Selected by Processing Date, Presented per Card

**Description**: The transaction report includes exactly those transactions whose *processing* date (not origination date) falls within the report period, inclusive of both endpoints, and presents them ordered/grouped by card number.

**Source**: `00.phase-1-input/proc/TRANREPT.prc`, lines 39–46 (selection field `TRAN-PROC-DT`; `SORT FIELDS=(TRAN-CARD-NUM,A)` at line 44; `INCLUDE COND=(TRAN-PROC-DT,GE,PARM-START-DATE,AND,TRAN-PROC-DT,LE,PARM-END-DATE)` at lines 45–46). Period parameters supplied by `CORPT00C.cbl` (see RULE-CALC-002).

**Logic**: Include a transaction IFF report-start-date ≤ transaction processing date ≤ report-end-date; order the report ascending by card number.

**Variables**:
- Input: Transaction processing date (`TRAN-PROC-TS` date portion), report start/end dates, card number.
- Output: The set and ordering of transactions appearing on the customer's report.

**Impact**: Establishes the business meaning of report membership: a transaction belongs to the period in which it was *processed*, even if it originated earlier. Card-number ordering reflects the per-card statement view the business expects.

---

## Summary

| Rule ID | Type | Name | Program |
|---|---|---|---|
| RULE-CALC-001 | CALC | Bill payment settles the full account balance | COBIL00C |
| RULE-THRESHOLD-001 | THRESHOLD | Bill payment allowed only when a positive balance is owed | COBIL00C |
| RULE-DECISION-001 | DECISION | Bill payment requires explicit customer confirmation | COBIL00C |
| RULE-DECISION-002 | DECISION | User role determines application entry point | COSGN00C |
| RULE-DECISION-003 | DECISION | Admin-only functions are denied to regular users | COMEN01C |
| RULE-CALC-002 | CALC | Transaction report period determination | CORPT00C |
| RULE-DECISION-004 | DECISION | Report content selected by processing date, per card | TRANREPT.prc |

**Coverage note**: The remaining programs were analyzed and found to contain no additional business rules: `COACTVWC`, `COCRDSLC`, `COTRN01C` (read-and-display only), `COCRDLIC`, `COTRN00C`, `COUSR00C` (list/pagination and screen filtering), `COACTUPC`, `COCRDUPC` (field validation, data conversion, and optimistic-locking update plumbing), `COUSR01C`/`COUSR02C`/`COUSR03C` (user CRUD with field validation), `COTRN02C` (transaction capture with field validation and sequential ID assignment — the entered values are stored as-is with no business computation), `COADM01C` (menu dispatch), `CSUTLDTC` (date-validation utility), and `COSGN00C`'s credential check itself (authentication mechanics, excluded as validation; only the post-authentication role routing is a business rule).
