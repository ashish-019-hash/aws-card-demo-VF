# CardDemo User Stories

## Scope and role map

This catalog covers the observable CICS/BMS workflows and the user-visible transaction-report batch behavior under `00.phase-1-input`. It excludes file access and other implementation-only behavior except where it produces a user outcome.

| Role | Supported goals |
|---|---|
| Authenticated user | Sign in; use the main menu; view and update accounts/cards; browse and view transactions; add transactions; request reports; make bill payments. |
| Security administrator | Use the administration menu; list, add, update, and delete security users. |
| Operations/report recipient | Run the submitted transaction-report job and receive the formatted report for the requested date range. |

## Module: Sign-on and navigation

### STORY-001: Authenticate and reach the appropriate menu

**User Story**: "As an application user, I want to sign in with my user ID and password so that I can access the functions available to my user type."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:108-140 (PROCESS-ENTER-KEY); 209-257 (READ-USER-SEC-FILE); bms/COSGN00.bms:26-206 (COSGN0A)`

**Acceptance Criteria**:
- The sign-on screen requires both a user ID and a password; when either is blank, it identifies the missing field and keeps the user on sign-on.
- The entered user ID and password are each converted to uppercase before verification. The converted password is then compared verbatim to the password stored for the uppercase user-ID key; the stored credential is not uppercased or otherwise normalized during verification.
- A valid administrator is routed to the administration menu, while any other valid user is routed to the main menu.
- An invalid password displays “Wrong Password. Try again ...”; an unknown user displays “User not found. Try again ...”; a verification failure displays “Unable to verify the User ...”.
- Any unsupported key on sign-on displays the standard invalid-key message rather than authenticating the user.

**User Journey Context**:
- Entry Point: CICS transaction `CC00`/program `COSGN00C` (defined at `csd/CARDDEMO.CSD:378-387`).
- User Actions: Enter user ID and password, then press Enter.
- Expected Outcomes: The user enters the authorized menu or receives a field-specific/error response.

**Business Value**: Restricts application access and places users in the correct functional journey.

### STORY-002: Select an authorized main-menu capability

**User Story**: "As an authenticated user, I want to select a numbered main-menu option so that I can begin the account, card, transaction, report, or payment task I need."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COMEN01C.cbl:75-165 (MAIN-PARA, PROCESS-ENTER-KEY); cpy/COMEN02Y.cpy:19-92 (CARDDEMO-MAIN-MENU-OPTIONS); bms/COMEN01.bms:26-163 (COMEN1A)`

**Acceptance Criteria**:
- The menu presents options for account view/update, card list/view/update, transaction list/view/add, transaction reports, and bill payment.
- A numeric option from 1 through 10 routes the user to its configured capability.
- Blank, zero, nonnumeric, or out-of-range options display “Please enter a valid option number...” and keep the menu available.
- A standard user attempting an administrator-only option receives “No access - Admin Only option...”.
- PF3 returns the user to sign-on; unsupported keys display the invalid-key message.

**User Journey Context**:
- Entry Point: Successful sign-on or return from a capability.
- User Actions: Enter a menu option and press Enter; use PF3 to leave the application.
- Expected Outcomes: The selected authorized screen opens, or the user receives an access/selection error.

**Business Value**: Provides a controlled, discoverable entry point to all operational functions.

### STORY-003: Select a security-administration capability

**User Story**: "As a security administrator, I want to select a user-security menu option so that I can manage application users."

**Story Type**: Administrative

**Source Location**: `cbl/COADM01C.cbl:75-155 (MAIN-PARA, PROCESS-ENTER-KEY); cpy/COADM02Y.cpy:20-48 (CARDDEMO-ADMIN-MENU-OPTIONS); bms/COADM01.bms:26-163 (COADM1A)`

**Acceptance Criteria**:
- The administration menu presents User List, User Add, User Update, and User Delete.
- A numeric option from 1 through 4 routes to its configured security-user function.
- Blank, zero, nonnumeric, or out-of-range selections display “Please enter a valid option number...”.
- PF3 returns to sign-on; unsupported keys display the invalid-key message.

**User Journey Context**:
- Entry Point: Successful administrator sign-on.
- User Actions: Choose a numbered administration option and press Enter.
- Expected Outcomes: The appropriate security-user workflow opens or the administrator receives a valid-selection error.

**Business Value**: Gives authorized administrators a dedicated path for user-security maintenance.

## Module: Account inquiry and maintenance

### STORY-004: View a credit-card account

**User Story**: "As an application user, I want to look up an account so that I can see its account, card, and customer details."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTVWC.cbl:262-408 (0000-MAIN); 596-683 (2000-PROCESS-INPUTS, 2210-EDIT-ACCOUNT); 687-870 (9000-READ-ACCT through 9400-GETCUSTDATA-BYCUST); bms/COACTVW.bms:25-374 (CACTVWA)`

**Acceptance Criteria**:
- The user can enter an account identifier and submit the account-view screen.
- For a valid account, the screen displays the retrieved account information together with linked card and customer information.
- A blank or invalid account input is rejected by the account edit routine and the user remains on the inquiry screen.
- If the account, associated card cross-reference, account data, or customer data cannot be found, the screen reports the lookup failure rather than displaying an unrelated record.
- The screen supports return/navigation behavior defined in the main flow, including exit to its calling menu.

**User Journey Context**:
- Entry Point: Main-menu option 1 or transaction `CAVW` (`csd/CARDDEMO.CSD:317-326`).
- User Actions: Enter an account identifier and submit the inquiry.
- Expected Outcomes: A consolidated view of the account relationship or a lookup/validation message.

**Business Value**: Lets staff quickly inspect the information needed to service an account.

### STORY-005: Update a credit-card account

**User Story**: "As an application user, I want to retrieve and update an account’s maintained details so that account and customer information stays current."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:859-1021 (0000-MAIN); 1025-1036 (1000-PROCESS-INPUTS); 1429-1678 (1200-EDIT-MAP-INPUTS); 1681-1777 (1205-COMPARE-OLD-NEW); 2562-2643 (2000-DECIDE-ACTION); 3888-4105 (9600-WRITE-PROCESSING); 4109-4193 (9700-CHECK-CHANGE-IN-REC); bms/COACTUP.bms:25-508 (CACTUPA)`

**Acceptance Criteria**:
- The user can retrieve an account and see its initial/original values before committing changes.
- Required account fields are validated before processing; the workflow also validates yes/no inputs, required alphabetic/alphanumeric/numeric inputs, US phone number, SSN, state code, FICO score, ZIP code, and signed monetary values where those fields are supplied.
- Invalid input is retained for correction and the workflow highlights/reports the relevant validation issue instead of saving invalid data.
- If no maintained value differs from its original value, the workflow does not write a redundant update.
- Before writing, the workflow locks and rereads both the account and customer records and compares them with the values originally shown. If either record changed while the user was editing, it does not overwrite the newer data and returns to the detail state.
- When valid changed data is submitted, the workflow rewrites the account and customer records; if the customer rewrite fails after a successful account rewrite, it issues a rollback so the account-and-customer change is not left partially applied. The card cross-reference is not updated by this workflow.

**User Journey Context**:
- Entry Point: Main-menu option 2.
- User Actions: Identify an account, review populated values, edit allowed values, and submit the change.
- Expected Outcomes: Valid changes persist; invalid or unchanged submissions remain available for correction/review.

**Business Value**: Keeps account servicing data accurate while preventing malformed or no-op updates.

## Module: Credit-card inquiry and maintenance

### STORY-006: Browse the credit-card list

**User Story**: "As an application user, I want to browse credit cards in pages so that I can locate a card to inspect or service."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDLIC.cbl:298-621 (0000-MAIN); 951-1119 (2000-RECEIVE-SCREEN through 2250-EDIT-ARRAY); 1123-1409 (9000-READ-FORWARD through 9500-FILTER-RECORDS); bms/COCRDLI.bms:25-340 (CCRDLIA)`

**Acceptance Criteria**:
- The card-list screen displays card records in a multi-row page and maintains a page number.
- The user can filter the listing by account and/or card input after those inputs pass validation.
- PF7 retrieves the preceding page and PF8 retrieves the next page where records exist.
- At the beginning or end of the available results, the user receives an explanatory boundary message rather than an invalid page.
- Invalid account/card search values or unsupported keys produce an on-screen validation/error response and preserve the ability to retry.

**User Journey Context**:
- Entry Point: Main-menu option 3 or transaction `CCLI` (`csd/CARDDEMO.CSD:357-366`).
- User Actions: Supply optional filters, browse with PF7/PF8, and select/list a card as needed.
- Expected Outcomes: A pageable, filtered card list or an actionable validation/boundary message.

**Business Value**: Reduces the effort to find cards across the portfolio.

### STORY-007: View a credit-card’s details

**User Story**: "As an application user, I want to find a credit card by account/card identifier so that I can review the card’s details."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDSLC.cbl:248-408 (0000-MAIN); 582-722 (2000-PROCESS-INPUTS through 2220-EDIT-CARD); 726-810 (9000-READ-DATA through 9150-GETCARD-BYACCT); bms/COCRDSL.bms:25-153 (CCRDSLA)`

**Acceptance Criteria**:
- The user can submit an account identifier and/or card identifier according to the screen’s supported search fields.
- Account and card inputs are validated before card data is retrieved.
- A matching record displays the card detail screen.
- When a card cannot be found by account-plus-card or by account, the user receives a not-found outcome rather than stale data.
- Unsupported keys display the invalid-key message; navigation returns to the calling menu/screen.

**User Journey Context**:
- Entry Point: Main-menu option 4 or transaction `CCDL` (`csd/CARDDEMO.CSD:347-356`).
- User Actions: Enter account/card search values and submit.
- Expected Outcomes: The requested card detail or a correction/not-found response.

**Business Value**: Provides the card-level information needed for servicing and issue resolution.

### STORY-008: Update a credit card

**User Story**: "As an application user, I want to update a card’s maintained details so that the card record reflects its current holder, status, and expiry information."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDUPC.cbl:367-560 (0000-MAIN); 564-945 (1000-PROCESS-INPUTS through 1260-EDIT-EXPIRY-YEAR); 948-1029 (2000-DECIDE-ACTION); 1343-1494 (9000-READ-DATA through 9200-WRITE-PROCESSING); 1498-1521 (9300-CHECK-CHANGE-IN-REC); bms/COCRDUP.bms:25-168 (CCRDUPA)`

**Acceptance Criteria**:
- The user can identify a card by account/card values and retrieve its current card details.
- Account and card identifiers, cardholder name, card status, expiry month, and expiry year are validated before a save action proceeds.
- Invalid inputs leave the user on the update screen with the relevant correction message/field focus.
- The workflow checks whether the record has changed and does not write an unchanged card.
- A valid changed card record is saved and the user sees the updated result/status.

**User Journey Context**:
- Entry Point: Main-menu option 5.
- User Actions: Retrieve the card, edit maintained details, and submit the update.
- Expected Outcomes: A confirmed card update or a validation/no-change response.

**Business Value**: Ensures card servicing changes are accurate and intentional.

## Module: Transaction inquiry and capture

### STORY-009: Browse and select transactions

**User Story**: "As an application user, I want to browse transactions in pages and select a transaction so that I can investigate its details."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN00C.cbl:94-141 (MAIN-PARA); 146-229 (PROCESS-ENTER-KEY); 231-274 (PROCESS-PF7-KEY, PROCESS-PF8-KEY); 277 onward (PROCESS-PAGE-FORWARD); bms/COTRN00.bms:26-460 (COTRN0A)`

**Acceptance Criteria**:
- The transaction-list screen accepts an optional transaction ID filter only when it is numeric.
- The screen displays transaction records in pages and lets the user select a row using `S`/`s` to open transaction view.
- Any selection value other than `S`/`s` displays “Invalid selection. Valid value is S”.
- PF7 navigates to a prior page and PF8 navigates to a next page; attempting either at a list boundary displays the corresponding top/bottom message.
- A nonnumeric transaction ID or unsupported key produces an on-screen error and leaves the list available for retry.

**User Journey Context**:
- Entry Point: Main-menu option 6.
- User Actions: Optionally enter a numeric transaction ID, browse with PF7/PF8, and select a row.
- Expected Outcomes: A page of transactions, a selected transaction’s detail screen, or an input/boundary response.

**Business Value**: Makes historical transaction activity discoverable for servicing and investigation.

### STORY-010: View a transaction’s details

**User Story**: "As an application user, I want to retrieve a transaction by ID so that I can review its amount, source, dates, and merchant details."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN01C.cbl:94-139 (MAIN-PARA); 144-192 (PROCESS-ENTER-KEY); 265 onward (READ-TRANSACT-FILE); bms/COTRN01.bms:26-269 (COTRN1A)`

**Acceptance Criteria**:
- A transaction ID is required to perform a direct transaction lookup.
- For a found transaction, the screen displays transaction ID, card number, type/category codes, source, amount, description, origin and processing timestamps, and merchant ID/name/city/ZIP.
- An empty transaction ID is rejected with “Tran ID can NOT be empty...”.
- A missing or unreadable transaction produces the read routine’s error outcome rather than displaying unrelated transaction data.
- PF5 returns to the transaction list; PF4 clears the current screen; unsupported keys display the invalid-key message.

**User Journey Context**:
- Entry Point: Main-menu option 7 or selection from the transaction list.
- User Actions: Enter or inherit a transaction ID and submit; optionally return to the list.
- Expected Outcomes: Complete transaction detail or a recoverable lookup error.

**Business Value**: Supports accurate investigation of individual transaction activity.

### STORY-011: Add a transaction

**User Story**: "As an application user, I want to capture a confirmed transaction for an account or card so that the transaction history is complete."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN02C.cbl:120-188 (MAIN-PARA, PROCESS-ENTER-KEY); 193-437 (VALIDATE-INPUT-KEY-FIELDS, VALIDATE-INPUT-DATA-FIELDS); 442-466 (ADD-TRANSACTION); 469-495 (COPY-LAST-TRAN-DATA); bms/COTRN02.bms:26-303 (COTRN2A)`

**Acceptance Criteria**:
- The user must provide either a numeric account ID or a numeric card number; the workflow resolves the corresponding other identifier.
- The type code, category code, source, amount, description, origin date, processing date, merchant ID, merchant name, merchant city, and merchant ZIP are mandatory.
- Type/category codes and merchant ID must be numeric; amount must match `-99999999.99`; origin/processing dates must match `YYYY-MM-DD` and be calendar-valid.
- The user must confirm with `Y`/`y` to add the transaction. Blank or `N`/`n` requests confirmation; any other confirmation value is rejected as invalid.
- A confirmed, valid submission creates a new transaction ID after the latest existing ID; no transaction is added when validation or confirmation fails.
- PF5 validates the supplied account/card, copies editable data from the latest transaction, then proceeds through the normal add path. Therefore, if the copied/present values pass validation and `CONFIRM` is `Y`/`y`, PF5 can create a new transaction; it is not a copy-only action.

**User Journey Context**:
- Entry Point: Main-menu option 8.
- User Actions: Identify an account or card, enter transaction and merchant details, confirm with Y, and submit; optionally use PF5 to copy the latest transaction data.
- Expected Outcomes: A recorded transaction or field-specific feedback that allows correction.

**Business Value**: Maintains a usable, attributable transaction history for account servicing and reporting.

## Module: Bill payment

### STORY-012: Pay an outstanding account balance

**User Story**: "As an application user, I want to confirm an online bill payment for an account so that its outstanding balance is paid and the payment is recorded."

**Story Type**: Customer-Facing

**Source Location**: `cbl/COBIL00C.cbl:99-149 (MAIN-PARA); 154-244 (PROCESS-ENTER-KEY); 287 onward (SEND-BILLPAY-SCREEN and account/transaction routines); bms/COBIL00.bms:26-136 (COBIL0A)`

**Acceptance Criteria**:
- An account ID is required; a blank account ID displays “Acct ID can NOT be empty...”.
- The screen displays the account’s current balance before payment is confirmed.
- If the current balance is zero or below, no payment is made and the user sees “You have nothing to pay...”.
- The confirmation field accepts `Y`/`y` and `N`/`n`; any other value displays “Invalid value. Valid values are (Y/N)...”. A blank confirmation asks the user to confirm.
- On `Y`/`y`, the system records a “BILL PAYMENT - ONLINE” transaction for the full current balance and reduces the account balance by that same amount.
- On `N`/`n`, the screen is cleared and no payment transaction or balance update is made. PF4 also clears the current screen; PF3 returns to the calling menu.

**User Journey Context**:
- Entry Point: Main-menu option 10, including a selected account context when supplied by another flow.
- User Actions: Enter/select an account, review its current balance, enter Y to confirm payment, and submit.
- Expected Outcomes: The balance is paid and a payment transaction exists, or the user receives a validation/cancellation outcome.

**Business Value**: Gives users a direct way to settle outstanding account balances with an auditable transaction.

## Module: Security-user administration

### STORY-013: Browse and select security users

**User Story**: "As a security administrator, I want to browse security users and select one for maintenance so that I can manage access efficiently."

**Story Type**: Administrative

**Source Location**: `cbl/COUSR00C.cbl:97-144 (MAIN-PARA); 149-232 (PROCESS-ENTER-KEY); 235-277 (PROCESS-PF7-KEY, PROCESS-PF8-KEY); 280 onward (PROCESS-PAGE-FORWARD); bms/COUSR00.bms:26-459 (COUSR0A)`

**Acceptance Criteria**:
- The user list supports an optional user-ID starting/filter value and displays a paged list of security users.
- Selecting a displayed user with `U`/`u` opens user update; selecting with `D`/`d` opens user deletion.
- Any other nonblank selection produces “Invalid selection. Valid values are U and D”.
- PF7/PF8 navigate backward/forward; at the first/last available page the screen displays “You are already at the top of the page...” or “You are already at the bottom of the page...”.
- PF3 returns to administration and unsupported keys display the invalid-key message.

**User Journey Context**:
- Entry Point: Administration-menu option 1.
- User Actions: Search/browse, page through results, select a user with U or D.
- Expected Outcomes: A selected user opens in the relevant maintenance flow, or the list gives a selection/boundary error.

**Business Value**: Makes user-security records manageable at portfolio scale.

### STORY-014: Add a security user

**User Story**: "As a security administrator, I want to create a security user so that a new person can sign in with the assigned identity and user type."

**Story Type**: Administrative

**Source Location**: `cbl/COUSR01C.cbl:70 onward (MAIN-PARA and user-add processing); bms/COUSR01.bms:26-160 (COUSR1A); cpy/COADM02Y.cpy:29-32 (User Add option)`

**Acceptance Criteria**:
- The user-add screen is available from the administration menu and provides the security-user entry workflow.
- The user must supply a user ID, first name, last name, password, and user type before the create action can complete.
- The workflow validates the requested user ID against the security-user store so that a duplicate ID is not created.
- A successful valid submission creates the security-user record and returns a visible status outcome; an invalid/duplicate/create failure leaves the administrator able to correct the input.
- PF3 returns to the prior administration context and unsupported keys display an invalid-key response.

**User Journey Context**:
- Entry Point: Administration-menu option 2.
- User Actions: Enter the new user’s identity, password, and type; submit the create action.
- Expected Outcomes: A usable new security-user record or corrective feedback.

**Business Value**: Allows administrators to provision application access without technical intervention.

### STORY-015: Update a security user

**User Story**: "As a security administrator, I want to update a user’s name, password, or type so that their access profile remains accurate."

**Story Type**: Administrative

**Source Location**: `cbl/COUSR02C.cbl:90-138 (MAIN-PARA); 143-172 (PROCESS-ENTER-KEY); 177-245 (UPDATE-USER-INFO); bms/COUSR02.bms:26-165 (COUSR2A)`

**Acceptance Criteria**:
- A user ID is required to retrieve a user’s current first name, last name, password, and user type.
- Saving requires nonblank user ID, first name, last name, password, and user type; each missing field receives the named error message and field focus.
- The system updates the security-user record only when at least one editable value differs from the stored value.
- When no value changed, the screen displays “Please modify to update ...” and does not perform an update.
- PF5 saves the edited information; PF4 clears the screen; PF3 saves then returns to the previous screen; PF12 returns to administration.

**User Journey Context**:
- Entry Point: Administration-menu option 3 or `U` selection from the user list.
- User Actions: Retrieve a user, modify maintained fields, then use PF5 or PF3.
- Expected Outcomes: The changed profile persists, or the administrator receives a missing-field/no-change/error response.

**Business Value**: Keeps credentials and authorization attributes aligned with current staffing needs.

### STORY-016: Delete a security user

**User Story**: "As a security administrator, I want to delete a selected security user after an explicit delete action so that former or invalid users can no longer sign in."

**Story Type**: Administrative

**Source Location**: `cbl/COUSR03C.cbl:90-137 (MAIN-PARA); 142-192 (PROCESS-ENTER-KEY, DELETE-USER-INFO); 265-300 (READ-USER-SEC-FILE); 303-359 (DELETE-USER-SEC-FILE); bms/COUSR03.bms:26-149 (COUSR3A)`

**Acceptance Criteria**:
- A user ID is required before the workflow retrieves the user’s first name, last name, and type for review.
- A found user displays “Press PF5 key to delete this user ...”; retrieval does not itself delete the user.
- PF5 deletes the selected user and displays “User [ID] has been deleted ...”.
- An unknown user displays “User ID NOT found...”; a lookup/delete failure displays an error and does not claim that deletion succeeded.
- PF4 clears the current screen, PF3 returns to the previous screen, and PF12 returns to administration.

**User Journey Context**:
- Entry Point: Administration-menu option 4 or `D` selection from the user list.
- User Actions: Retrieve a user, verify the displayed identity, and press PF5 to delete.
- Expected Outcomes: The selected security user is removed only after the explicit delete action, or the administrator receives a recoverable error.

**Business Value**: Supports timely removal of obsolete access.

## Module: Transaction reporting and batch output

### STORY-017: Request a monthly, yearly, or custom transaction report

**User Story**: "As an application user, I want to request a confirmed transaction report for a monthly, yearly, or custom period so that transaction activity can be reviewed offline."

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:162-202 (MAIN-PARA); 208-456 (PROCESS-ENTER-KEY); 462-535 (SUBMIT-JOB-TO-INTRDR, WIRTE-JOBSUB-TDQ); bms/CORPT00.bms:26-227 (CORPT0A)`

**Acceptance Criteria**:
- The user can choose a Monthly report (current calendar month), Yearly report (current calendar year), or Custom report.
- A Custom report requires start and end month, day, and year; month must be numeric and no greater than 12, day numeric and no greater than 31, year numeric, and each assembled date must be calendar-valid.
- If no report type is selected, the user sees “Select a report type to print report...”.
- The user must confirm report submission with `Y`/`y`; blank confirmation requests confirmation, `N`/`n` clears/cancels, and another value is rejected.
- A confirmed request submits the generated job to the `JOBS` queue and displays “[Monthly|Yearly|Custom] report submitted for printing ...”.
- If the submission queue cannot be written, the user sees “Unable to Write TDQ (JOBS)...” rather than a success message.

**User Journey Context**:
- Entry Point: Main-menu option 9.
- User Actions: Choose report type, provide dates when custom, confirm with Y, and submit.
- Expected Outcomes: A print/report job is submitted for the requested period or field-specific correction/cancellation feedback is displayed.

**Business Value**: Provides operational reporting without requiring users to manually extract transactions.

### STORY-018: Produce the requested formatted transaction report

**User Story**: "As a report recipient, I want the submitted reporting job to filter and format transactions for the requested date range so that I receive a usable transaction report."

**Story Type**: Operational

**Source Location**: `proc/TRANREPT.prc:19-79 (TRANREPT procedure); cbl/CORPT00C.cbl:90-125 (generated job template); cbl/CORPT00C.cbl:462-535 (job submission)`

**Acceptance Criteria**:
- The batch procedure first unloads the processed transaction file to a dated backup generation.
- It filters transactions whose processing date is inclusively between the supplied start and end dates and sorts the selected data by card number.
- The reporting program `CBTRN03C` receives the filtered transactions, card cross-reference, transaction type/category data, and requested date parameters.
- The job creates a formatted `TRANREPT` output dataset with fixed 133-byte records.
- The report output is created only from the selected date-range data; an empty range yields no selected transaction detail records.

**User Journey Context**:
- Entry Point: A confirmed report request placed onto the CICS `JOBS` queue.
- User Actions: Operations runs the submitted batch job; report recipients consume the generated output.
- Expected Outcomes: A date-filtered, card-sorted formatted transaction report is available as the report output dataset.

**Business Value**: Turns transaction data into a repeatable operational artifact for review and distribution.
