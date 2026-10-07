# CardDemo — User Stories Catalog

Migration-ready user stories extracted from the legacy COBOL/CICS CardDemo application
(working tree `00.phase-1-input/`, branch `vorflux/migrate-carddemo-spring-react`).

Every story is verified against the checked-out source; citations are
`<path>, lines <n>–<m>` (and paragraph names) in the legacy programs.

**User roles identified** (from `00.phase-1-input/cpy/COCOM01Y.cpy` user-type flags and
`00.phase-1-input/cbl/COSGN00C.cbl` lines 227–240):

| Role | Description | Evidence |
|------|-------------|----------|
| Regular User (bank/call-center staff) | Signs on with type `U`; uses the main menu (account, card, transaction, report, bill-pay functions) | COSGN00C.cbl 230–240; COMEN02Y.cpy 19–92 |
| Administrator | Signs on with type `A`; routed to the admin menu for user-security maintenance | COSGN00C.cbl 230–234; COADM02Y.cpy 19–48 |
| Operations / Batch (integration) | Receives report JCL submitted from the online screen via TDQ `JOBS` to the internal reader; batch proc produces the printed report | CORPT00C.cbl 462–535; proc/TRANREPT.prc 21–80 |

---

## Module 1: Sign-on & Session (COSGN00C / BMS COSGN00)

### STORY-001: Sign On to CardDemo

**User Story**: "As a regular user or administrator, I want to sign on with my user ID and password so that I can securely access the CardDemo functions my role allows."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl` — MAIN-PARA lines 80–96, PROCESS-ENTER-KEY lines 108–140, READ-USER-SEC-FILE lines 209–257; screen `00.phase-1-input/bms/COSGN00.bms`

**Acceptance Criteria**:
- User ID and password entry fields are presented with the sign-on screen (first entry, EIBCALEN = 0, lines 80–83).
- Blank user ID is rejected with "Please enter User ID ..." and cursor on the User ID field (lines 118–122).
- Blank password is rejected with "Please enter Password ..." and cursor on the Password field (lines 123–127).
- User ID and password are upper-cased before verification (lines 132–136).
- Credentials are verified against the USRSEC security file by user-ID key (lines 211–219).
- Unknown user ID (file response 13) shows "User not found. Try again ..." (lines 247–251).
- Wrong password shows "Wrong Password. Try again ..." with cursor on Password (lines 241–246).
- Any other file error shows "Unable to verify the User ..." (lines 252–256).
- On success the signed-on user ID and user type are carried in the session context (CDEMO-USER-ID / CDEMO-USER-TYPE, lines 224–228).

**User Journey Context**:
- Entry Point: CICS transaction `CC00` (line 37); first screen of the application.
- User Actions: Type user ID and password; press Enter.
- Expected Outcomes: Valid admin users land on the admin menu; valid regular users land on the main menu; invalid input redisplays the sign-on screen with a specific error.

**Business Value**: Protects customer account, card, and transaction data by allowing only authenticated users into the system, and establishes the identity/role used for authorization downstream.

---

### STORY-002: Route Me to the Menu for My Role

**User Story**: "As an administrator, I want to be taken to the admin menu after sign-on (while regular users go to the main menu) so that each role immediately sees only the functions relevant to it."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl` — READ-USER-SEC-FILE lines 230–240

**Acceptance Criteria**:
- After successful authentication, a user whose security record type is Admin (CDEMO-USRTYP-ADMIN) is transferred to program COADM01C (lines 230–234).
- All other authenticated users are transferred to the regular main menu COMEN01C (lines 235–239).
- The session context passed to the menu contains the user ID, user type, and originating transaction/program (lines 224–228).

**User Journey Context**:
- Entry Point: Successful Enter on the sign-on screen.
- User Actions: None beyond signing on; routing is automatic.
- Expected Outcomes: Admins see "User List/Add/Update/Delete (Security)" options; regular users see the ten business options.

**Business Value**: Enforces separation of duties — security administration is kept away from day-to-day business users without extra navigation for either role.

---

### STORY-003: Exit the Application

**User Story**: "As a signed-on user, I want to exit the application from the sign-on screen so that I end my session cleanly with a confirmation message."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl` — MAIN-PARA lines 88–90, SEND-PLAIN-TEXT lines 162–172; thank-you text in `00.phase-1-input/cpy/CSMSG01Y.cpy`

**Acceptance Criteria**:
- Pressing PF3 on the sign-on screen displays the thank-you message (CCDA-MSG-THANK-YOU) as plain text and ends the pseudo-conversation (lines 88–90, 164–172).
- Any key other than Enter/PF3 shows the invalid-key message and redisplays the sign-on screen (lines 91–94).
- From every menu, PF3 returns the user to the sign-on screen (COMEN01C.cbl 96–98; COADM01C.cbl 96–98), from which PF3 exits.

**User Journey Context**:
- Entry Point: PF3 from the sign-on screen (or PF3 from a menu first).
- User Actions: Press PF3.
- Expected Outcomes: "Thank you..." closing message; terminal freed.

**Business Value**: Gives users a clear, deliberate way to end their session, reducing the risk of abandoned signed-on terminals.

---

## Module 2: Menus & Navigation (COMEN01C, COADM01C)

### STORY-004: Choose a Business Function from the Main Menu

**User Story**: "As a regular user, I want a numbered menu of all business functions so that I can reach account, card, transaction, report, and bill-payment features with a single choice."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COMEN01C.cbl` — PROCESS-ENTER-KEY lines 115–165, BUILD-MENU-OPTIONS lines 236–277; option table `00.phase-1-input/cpy/COMEN02Y.cpy` lines 21–92; screen `00.phase-1-input/bms/COMEN01.bms`

**Acceptance Criteria**:
- The menu lists the 10 configured options: Account View, Account Update, Credit Card List, Credit Card View, Credit Card Update, Transaction List, Transaction View, Transaction Add, Transaction Reports, Bill Payment (COMEN02Y.cpy lines 25–84).
- A non-numeric, zero, or out-of-range option shows "Please enter a valid option number..." (COMEN01C.cbl 127–134).
- An option flagged admin-only selected by a regular user shows "No access - Admin Only option... " (lines 136–143).
- A valid option transfers control to the mapped program with the session context (lines 145–156).
- An option mapped to a "DUMMY" program shows "This option <name> is coming soon ..." in green instead of failing (lines 146, 157–164).
- PF3 returns to the sign-on screen (lines 96–98); other keys show the invalid-key message (lines 99–102).

**User Journey Context**:
- Entry Point: Transaction `CM00` / automatic transfer after sign-on.
- User Actions: Type the option number (1–10); press Enter.
- Expected Outcomes: The chosen business screen opens; invalid choices are explained on the same screen.

**Business Value**: One hub for all day-to-day card-servicing work, with role protection built in, so staff can navigate the whole application without memorizing transaction codes.

---

### STORY-005: Choose a Security Function from the Admin Menu

**User Story**: "As an administrator, I want an admin menu of user-security functions so that I can list, add, update, and delete application users from one place."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COADM01C.cbl` — MAIN-PARA lines 82–105, PROCESS-ENTER-KEY lines 115–155; option table `00.phase-1-input/cpy/COADM02Y.cpy` lines 20–42; screen `00.phase-1-input/bms/COADM01.bms`

**Acceptance Criteria**:
- The admin menu lists 4 options: User List (Security), User Add (Security), User Update (Security), User Delete (Security) mapped to COUSR00C/01C/02C/03C (COADM02Y.cpy lines 24–42).
- A non-numeric, zero, or out-of-range option shows "Please enter a valid option number..." (COADM01C.cbl 127–134).
- A valid option transfers control to the selected user-security program with session context (lines 137–146).
- PF3 returns to the sign-on screen (lines 96–98); other keys show the invalid-key message (lines 99–102).
- Calling the menu without a session (EIBCALEN = 0) routes back to sign-on (lines 82–84).

**User Journey Context**:
- Entry Point: Automatic transfer after admin sign-on (transaction `CA00`).
- User Actions: Type option number 1–4; press Enter.
- Expected Outcomes: The chosen user-maintenance screen opens.

**Business Value**: Central, admin-only control point for managing who can access the system.

---

## Module 3: Account Servicing (COACTVWC, COACTUPC)

### STORY-006: View an Account and Its Customer Details

**User Story**: "As a regular user, I want to look up an account by its 11-digit number and see the account and owning-customer details so that I can answer servicing questions quickly."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COACTVWC.cbl` — input edit lines 640–676 (2100-EDIT-ACCT area), read orchestration lines 696–725, 9200/9300/9400 reads lines 727–861; messages lines 111–134; screen `00.phase-1-input/bms/COACTVW.bms`

**Acceptance Criteria**:
- A blank account filter prompts for input instead of searching (blank flag set, lines 653–660; prompt messages at lines 111–123).
- An account number that is not an 11-digit non-zero number is rejected with "Account number must be a non zero 11 digit number" (lines 662–669; message 88-levels at lines 125–128).
- The account is resolved via the card-xref file, then the account master, then the customer master; each miss produces its specific message: "Did not find this account in account card xref file" / "...account master file" / "Did not find associated customer in master file" (88-levels lines 129–134; read handling lines 738–861).
- On success, account data and the associated customer's data are both displayed (FOUND-ACCT-IN-MASTER / FOUND-CUST-IN-MASTER, lines 471–494).
- PF3 exits back to the calling program/menu (XCTL, lines 326–354).
- Unexpected file errors surface as a file-error message rather than silently failing (ERROR-OPNAME handling, lines 760–762, 810–812, 859–861).

**User Journey Context**:
- Entry Point: Main menu option 1 (COMEN02Y.cpy lines 25–28); transaction `CAVW`.
- User Actions: Enter the account number; press Enter.
- Expected Outcomes: Full account + customer profile on screen, or a precise explanation of why nothing was found.

**Business Value**: Fast, reliable account lookup is the backbone of customer servicing calls and the gateway to update workflows.

---

### STORY-007: Update Account and Customer Details with Confirmation

**User Story**: "As a regular user, I want to fetch an account, edit its account and customer fields, and confirm before saving so that corrections (address, phone, limits, status, FICO, etc.) are applied safely."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl` — main decision lines 859–1021 and 2000-DECIDE-ACTION lines 2562–2643; edits 1200-EDIT-MAP-INPUTS lines 1429–1678 with edit paragraphs 1210–1280 (lines 1783–2558); change detection 1205-COMPARE-OLD-NEW lines 1681–1777; save 9600-WRITE-PROCESSING lines 3888–4105 and 9700-CHECK-CHANGE-IN-REC lines 4109–4193; messages lines 462–530; screen `00.phase-1-input/bms/COACTUP.bms`

**Acceptance Criteria**:
- Searching requires a non-zero 11-digit account number; failures show "Account number must be a non zero 11 digit number" (messages lines 493–496; edit 1210-EDIT-ACCOUNT lines 1783–1820).
- After a successful fetch the screen shows "Details of selected account shown above" / "Update account details presented above." prompts (88-levels lines 466–471).
- Field edits are enforced before any save, including: Account Active Status must be Y or N (lines 503–504, 1220-EDIT-YESNO lines 1856–1894); Credit Limit must be supplied and valid (lines 505–508); card expiry month 1–12 and valid year (lines 509–512); names alphabetic only (lines 487–488); US phone number parts numeric/valid (edit vars lines 82–115, 1260-EDIT-US-PHONE-NUM lines 2225–2427); SSN in valid parts (lines 117–146, 1265-EDIT-US-SSN lines 2431–2489); US state code and state/zip combination (1270/1280, lines 2493–2558); FICO score validity flags (lines 231–234, 1275-EDIT-FICO-SCORE lines 2514–2531).
- If nothing was changed relative to fetched values, the save is refused with "No change detected with respect to values fetched." (message lines 491–492; compare lines 1681–1777).
- When edits pass, the user is prompted "Changes validated.Press F5 to save" and must press PF5 to commit (message lines 472–473; PF5 gating lines 907–910, 2603–2643).
- A successful commit rewrites both the account record and, when customer data changed, the customer record, then shows "Changes committed to database" (REWRITE lines 4066, 4086; message lines 474–475).
- Concurrency and locking failures are reported specifically: "Could not lock account record for update", "Could not lock customer record for update", "Record changed by some one else. Please review", "Update of record failed" (88-levels lines 517–524; checked in 9600/9700 lines 3888–4193).
- PF12 returns to the fetched-details view; PF3 exits to the menu (lines 907–928, 2572 ff.).

**User Journey Context**:
- Entry Point: Main menu option 2 (COMEN02Y.cpy lines 31–34); transaction `CAUP`.
- User Actions: Enter account number → review fetched details → overtype fields → Enter to validate → PF5 to confirm save.
- Expected Outcomes: Account/customer master records updated atomically with explicit success or failure feedback.

**Business Value**: Lets staff keep customer contact data, limits, and account status accurate — with validation and optimistic-locking safeguards that prevent bad or conflicting data from being saved.

---

## Module 4: Credit Card Servicing (COCRDLIC, COCRDSLC, COCRDUPC)

### STORY-008: Browse Credit Cards with Filters and Paging

**User Story**: "As a regular user, I want a pageable list of credit cards, optionally filtered by account number and/or card number, so that I can find the card I need to service."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl` — filter edits lines 1004–1065; paging decisions lines 408–445 and messages lines 898–921; browse/read lines 1157–1250 with 9500-FILTER-RECORDS call line 1159; screen `00.phase-1-input/bms/COCRDLI.bms`

**Acceptance Criteria**:
- The account filter, if supplied, must be an 11-digit number; otherwise the row-selection fields are protected and "ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER" is shown (lines 1019–1028).
- The card filter, if supplied, must be a 16-digit number; otherwise "CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER" is shown (lines 1054–1065).
- Up to 7 cards are listed per page with per-row select fields (WS-EDIT-SELECT array lines 69–88; row moves lines 683–738).
- PF8 pages forward; PF7 pages back; paging past the ends shows "NO MORE PAGES TO DISPLAY" / "NO PREVIOUS PAGES TO DISPLAY" (lines 898–912).
- End of file during forward browse shows "NO MORE RECORDS TO SHOW" (lines 1219, 1239).
- Records are filtered against the supplied criteria during the browse (9500-FILTER-RECORDS, lines 1159–1160).
- PF3 exits back to the main menu (lines 384–406); invalid function keys are treated as Enter (lines 370–380).

**User Journey Context**:
- Entry Point: Main menu option 3 (COMEN02Y.cpy lines 37–40); transaction `CCLI`.
- User Actions: Optionally type account/card filters; press Enter; PF7/PF8 to page.
- Expected Outcomes: A navigable, filtered card inventory.

**Business Value**: Staff can locate any card quickly even when the customer only knows part of the identifying data.

---

### STORY-009: Select a Card from the List to View or Update

**User Story**: "As a regular user, I want to mark one listed card with S (view) or U (update) so that I jump straight into that card's detail or update screen without retyping its numbers."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl` — selection edit lines 1079–1110; view branch lines 518–544; update branch lines 546–572; error text line 124

**Acceptance Criteria**:
- Valid row selection values are `S` or `U` (88-level SELECT-OK, line 77).
- Selecting more than one row, or an invalid character, flags the rows in error and shows "PLEASE SELECT ONLY ONE RECORD TO VIEW OR UPDATE" (lines 124, 1097–1110; error rows marked with `*`, lines 752–830).
- An `S` selection transfers to the card detail program (COCRDSLC) with the chosen account and card number in context (lines 518–544).
- A `U` selection transfers to the card update program (COCRDUPC) with the chosen account and card number in context (lines 546–572).

**User Journey Context**:
- Entry Point: Card list screen with results displayed.
- User Actions: Type `S` or `U` next to one card; press Enter.
- Expected Outcomes: Card detail or card update screen opens pre-loaded with that card.

**Business Value**: Removes error-prone retyping of 16-digit card numbers and streamlines the list → detail → update servicing flow.

---

### STORY-010: View a Single Card's Details

**User Story**: "As a regular user, I want to look up one credit card by account and card number so that I can see its embossed name, status, and expiry date."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COCRDSLC.cbl` — input edits lines 637–712; read handling lines 735–805; screen `00.phase-1-input/bms/COCRDSL.bms`

**Acceptance Criteria**:
- With both filters blank, the user is prompted to supply search keys instead of a search running (lines 637–646).
- Account number must be an 11-digit non-zero number; card number must be a 16-digit number; failures set input-error prompts and protect the search (lines 648–712).
- A not-found account/card combination reports the miss distinctly (DID-NOT-FIND-ACCT-IN-CARDXREF / DID-NOT-FIND-ACCTCARD-COMBO, lines 151–154, 755–799).
- On success the card's details are displayed ("Details of selected card shown above" semantics via FOUND-CARDS-FOR-ACCOUNT, lines 129, 474–476, 753–754).
- PF3 returns to the calling program or main menu (lines 307–335).
- File errors are reported with the failing operation name rather than a blank screen (lines 763–803).

**User Journey Context**:
- Entry Point: Main menu option 4 (COMEN02Y.cpy lines 43–46), or `S` selection from the card list; transaction `CCDL`.
- User Actions: Enter account + card number (or arrive pre-filled); press Enter.
- Expected Outcomes: Single-card detail display.

**Business Value**: Verifying card attributes (name, status, expiry) is a core step in card servicing and dispute handling.

---

### STORY-011: Update a Card's Name, Status, and Expiry with Confirmation

**User Story**: "As a regular user, I want to edit a card's embossed name, active status, and expiry date and confirm before saving so that card data stays correct without accidental changes."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl` — state model lines 285–290; search edits lines 722–798; field edit flags lines 66–72 and month/year rules lines 92–99; save 9200-WRITE-PROCESSING lines 1420–1494 (REWRITE line 1478) and 9300-CHECK-CHANGE-IN-REC lines 1498–1521; messages lines 156–216; screen `00.phase-1-input/bms/COCRDUP.bms`

**Acceptance Criteria**:
- Account number must be a non-zero 11-digit number and card number a 16-digit number before a fetch runs; blanks prompt "Please enter Account and Card Number" (messages lines 162–163, 177–180, 190–194; edits lines 722–798).
- Card embossed name must be present and may only contain letters and spaces ("Card name not provided" / "Card name can only contain alphabets and spaces", lines 181–184; name flags lines 66–68).
- Card active status must be Y or N (lines 195–196).
- Expiry month must be 1–12 and expiry year within 1950–2099 ("Card expiry month must be between 1 and 12" / "Invalid card expiry year", lines 197–200; VALID-MONTH/VALID-YEAR lines 92–99).
- If no field differs from the fetched values, the save is refused with "No change detected with respect to values fetched." (lines 187–188).
- Validated changes require explicit confirmation: "Changes validated.Press F5 to save" before commit (lines 166–167; CCUP state lines 285–290).
- A successful save rewrites the card record and reports "Changes committed to database" (REWRITE line 1478; message lines 168–169).
- Failure paths report specifically: "Could not lock record for update", "Record changed by some one else. Please review", "Update of record failed", "Changes unsuccessful. Please try again" (lines 170–171, 205–212; CCUP-CHANGES-OKAYED-LOCK-ERROR/FAILED lines 289–290).

**User Journey Context**:
- Entry Point: Main menu option 5 (COMEN02Y.cpy lines 49–52), or `U` selection from the card list (keys pre-validated, lines 479–489); transaction `CCUP`.
- User Actions: Fetch card → overtype name/status/expiry → Enter to validate → F5 to save.
- Expected Outcomes: Card master updated with explicit success/failure feedback.

**Business Value**: Keeps card status and embossing data accurate (e.g., deactivating a lost card, fixing a misspelled name) while two-step confirmation and concurrency checks prevent costly mistakes.

---

## Module 5: Transactions (COTRN00C, COTRN01C, COTRN02C)

### STORY-012: Browse Transactions Page by Page

**User Story**: "As a regular user, I want a pageable list of transactions, optionally starting from a transaction ID I enter, so that I can review account activity."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COTRN00C.cbl` — PROCESS-ENTER-KEY lines 146–230; PF7/PF8 lines 234–276; browse paragraphs lines 591–698; screen `00.phase-1-input/bms/COTRN00.bms`

**Acceptance Criteria**:
- The list shows up to 10 transactions per page with ID, date, description, and amount (POPULATE-TRAN-DATA lines 381–448; map COTRN00.bms).
- A transaction-ID filter, if entered, must be numeric; otherwise "Tran ID must be Numeric ..." is shown (lines 206–219).
- PF8 pages forward; at the end, "You have reached the bottom of the page..." is shown (lines 127–128, 639–642); pressing PF8 on the last page shows "You are already at the bottom of the page..." (lines 257–270).
- PF7 pages backward; at the top, "You have reached the top of the page..." / "You are already at the top of the page..." are shown (lines 234–248, 673–676).
- PF3 returns to the main menu (lines 122–124); invalid keys show the invalid-key message (lines 129–132).
- Browse failures show "Unable to lookup transaction..." rather than a hang (lines 614–615, 648–649, 682–683).

**User Journey Context**:
- Entry Point: Main menu option 6 (COMEN02Y.cpy lines 55–58); transaction `CT00`.
- User Actions: Optionally enter a starting transaction ID; press Enter; PF7/PF8 to page.
- Expected Outcomes: Ordered, navigable view of transaction activity.

**Business Value**: Transaction review is the primary tool for answering "what was this charge?" servicing questions and spotting suspicious activity.

---

### STORY-013: Open a Transaction from the List

**User Story**: "As a regular user, I want to mark a listed transaction with S so that its full detail opens without retyping the 16-digit transaction ID."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COTRN00C.cbl` — selection handling lines 148–205

**Acceptance Criteria**:
- Typing `S` (or `s`) next to a row transfers to the transaction view program with that transaction ID in context (lines 185–196).
- Any other selection character shows "Invalid selection. Valid value is S" (lines 197–203).
- Only the first marked row is taken (EVALUATE order, lines 148–182).

**User Journey Context**:
- Entry Point: Transaction list with results.
- User Actions: Type `S` beside one transaction; press Enter.
- Expected Outcomes: Transaction detail screen opens pre-loaded.

**Business Value**: Fast drill-down from summary to detail during customer calls.

---

### STORY-014: View Full Transaction Detail

**User Story**: "As a regular user, I want to see every attribute of one transaction (card, type, category, source, amount, merchant, timestamps) so that I can fully explain a charge."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COTRN01C.cbl` — main flow lines 108–134; PROCESS-ENTER-KEY lines 144–195; READ-TRANSACT-FILE lines 267–298; screen `00.phase-1-input/bms/COTRN01.bms`

**Acceptance Criteria**:
- A blank transaction ID is rejected with "Tran ID can NOT be empty..." (lines 146–151).
- A not-found ID shows "Transaction ID NOT found..." (lines 283–286); other read errors show "Unable to lookup Transaction..." (lines 291–293).
- On success, the transaction's stored fields are displayed on the detail map.
- PF4 clears the screen for a fresh lookup (lines 123–124, CLEAR-CURRENT-SCREEN lines 301–307).
- PF5 jumps to the transaction list (lines 125–127); PF3 returns to the previous program or main menu (lines 115–122).

**User Journey Context**:
- Entry Point: Main menu option 7 (COMEN02Y.cpy lines 61–64) or `S` from the transaction list; transaction `CT01`.
- User Actions: Enter (or arrive with) a transaction ID; press Enter.
- Expected Outcomes: Complete single-transaction record on screen.

**Business Value**: The authoritative view for dispute investigation and charge explanations.

---

### STORY-015: Add a New Transaction with Validation and Confirmation

**User Story**: "As a regular user, I want to key a new transaction against an account or card, have every field validated, and confirm before it posts so that only complete, well-formed transactions enter the system."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl` — confirm flow lines 164–190; VALIDATE-INPUT-KEY-FIELDS lines 193–232; VALIDATE-INPUT-DATA-FIELDS lines 235–435; ADD-TRANSACTION lines 442–466; WRITE-TRANSACT-FILE lines 711–748; screen `00.phase-1-input/bms/COTRN02.bms`

**Acceptance Criteria**:
- Either an account ID or a card number must be entered ("Account or Card Number must be entered...", lines 225–227); each must be numeric when supplied (lines 198–214).
- The account/card is cross-validated against the xref files; misses show "Account ID NOT found..." or "Card Number NOT found..." (lines 591–594, 624–627).
- All data fields are mandatory, each with its own message: Type CD, Category CD, Source, Description, Amount, Orig Date, Proc Date, Merchant ID, Merchant Name, Merchant City, Merchant Zip (lines 253–315).
- Format rules are enforced: Type/Category codes numeric (lines 324–332); amount in `-99999999.99` format (lines 344–346); dates in `YYYY-MM-DD` (lines 359–376); dates must be real calendar dates, verified via the date utility ("Orig Date - Not a valid date..." / "Proc Date - Not a valid date...", lines 401–423; utility `00.phase-1-input/cbl/CSUTLDTC.cbl`); Merchant ID numeric (lines 431–433).
- Posting requires explicit confirmation: blank confirm prompts "Confirm to add this transaction..." and only `Y/y` posts; `N/n` cancels; anything else shows "Invalid value. Valid values are (Y/N)..." (lines 171–190).
- The new transaction ID is generated as last-ID + 1 (ADD-TRANSACTION lines 442–466) and success shows "Transaction added successfully." with the new ID (lines 726–734).
- A duplicate ID shows "Tran ID already exist..." and other write failures show "Unable to Add Transaction..." (lines 735–746).
- PF4 clears all fields; PF3 returns to the previous screen/menu (lines 136–145).

**User Journey Context**:
- Entry Point: Main menu option 8 (COMEN02Y.cpy lines 67–72); transaction `CT02`.
- User Actions: Enter account/card keys → fill transaction fields → Enter → confirm `Y`.
- Expected Outcomes: Transaction written to the transaction file with a visible new ID.

**Business Value**: Lets staff post manual transactions (adjustments, offline captures) while validation and confirmation protect financial data integrity.

---

### STORY-016: Copy the Last Transaction into the Entry Form

**User Story**: "As a regular user, I want to pre-fill the add-transaction form from the most recent transaction so that keying repetitive entries is faster and less error-prone."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl` — PF5 dispatch lines 146–147; COPY-LAST-TRAN-DATA lines 471–494

**Acceptance Criteria**:
- Pressing PF5 validates the entered account/card keys, reads the latest transaction (browse from HIGH-VALUES, READPREV), and copies its type, category, source, amount, description, dates, and merchant fields into the input fields (lines 471–491).
- After copying, normal Enter-key validation/confirmation processing runs (line 494) — the copied data still cannot post without confirmation.
- If the key fields are invalid or the read fails, the respective error message is shown and nothing is copied (ERR-FLG guard, line 480).

**User Journey Context**:
- Entry Point: Add-transaction screen; PF5.
- User Actions: Enter account/card; press PF5; adjust fields; confirm.
- Expected Outcomes: Form pre-populated from the latest posted transaction.

**Business Value**: Cuts keystrokes and typos for high-volume manual posting.

---

## Module 6: Bill Payment (COBIL00C)

### STORY-017: Pay an Account's Full Balance Online

**User Story**: "As a regular user, I want to pay off an account's current balance in one confirmed step so that the customer's bill is settled and the balance goes to zero immediately."

**Story Type**: Customer-Facing

**Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl` — PROCESS-ENTER-KEY lines 154–247; WRITE-TRANSACT-FILE lines 510–546; UPDATE-ACCTDAT-FILE lines 377–401; screen `00.phase-1-input/bms/COBIL00.bms`

**Acceptance Criteria**:
- A blank account ID is rejected with "Acct ID can NOT be empty..." (lines 159–164).
- An unknown account shows "Account ID NOT found..." (lines 359–362 and xref check lines 423–426).
- The current balance is displayed after lookup (lines 193–195).
- If the balance is zero or negative, payment is refused with "You have nothing to pay..." (lines 197–206).
- Payment requires confirmation: blank confirm prompts "Confirm to make a bill payment..."; `N/n` cancels and clears; invalid values show "Invalid value. Valid values are (Y/N)..." (lines 173–190, 237–240).
- On `Y`, a payment transaction is created for the full balance with type `02`, category 2, source "POS TERM", description "BILL PAYMENT - ONLINE", merchant "BILL PAYMENT", and the account's card number from the xref, using a newly generated transaction ID (lines 210–233).
- The account balance is reduced by the paid amount and the account record updated (lines 235–236, 377–401).
- Success shows "Payment successful. " with the new transaction ID (lines 523–531); duplicate IDs show "Tran ID already exist..." and write errors "Unable to Add Bill pay Transaction..." (lines 533–543).
- PF4 clears the screen; PF3 returns to the menu (lines 128–137).

**User Journey Context**:
- Entry Point: Main menu option 10 (COMEN02Y.cpy lines 80–84); transaction `CB00`.
- User Actions: Enter account ID → Enter (see balance) → type `Y` to confirm → Enter.
- Expected Outcomes: Balance-clearing payment transaction recorded; account balance set to zero.

**Business Value**: One-step bill settlement during a customer contact, with a full audit trail via the generated payment transaction.

---

## Module 7: Transaction Reports (CORPT00C + batch proc TRANREPT)

### STORY-018: Request a Monthly, Yearly, or Custom-Date Transaction Report

**User Story**: "As a regular user, I want to request a transaction report for the current month, the current year, or a custom date range so that printed activity reports are produced without involving operations manually."

**Story Type**: Operational

**Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl` — PROCESS-ENTER-KEY lines 208–457; custom-date validation lines 258–423; SUBMIT-JOB-TO-INTRDR lines 462–511; WIRTE-JOBSUB-TDQ lines 515–535; screen `00.phase-1-input/bms/CORPT00.bms`

**Acceptance Criteria**:
- Selecting Monthly auto-fills the range from the 1st of the current month to its last day (lines 213–238).
- Selecting Yearly auto-fills January 1 to December 31 of the current year (lines 239–255).
- Selecting Custom requires all six date parts; each blank part has its own message (e.g., "Start Date - Month can NOT be empty...", lines 258–298) and each part is range/validity checked ("...Not a valid Month/Day/Year...", lines 331–376), with full-date validation via the date utility ("Start/End Date - Not a valid date...", lines 400–423; utility `00.phase-1-input/cbl/CSUTLDTC.cbl`).
- Submitting with no report type selected shows "Select a report type to print report..." (lines 438–442).
- Before submission the user must confirm: blank confirm prompts "Please confirm to print the <type> report..."; `N/n` cancels; other values show '"x" is not a valid value to confirm...' (lines 464–497).
- On `Y`, the prepared JCL (with the chosen date range as parameters, lines 429–432) is written line by line to extra-partition TDQ `JOBS` for internal-reader submission (lines 499–511, 515–523).
- TDQ write failure shows "Unable to Write TDQ (JOBS)..." (lines 530–532).
- Successful submission shows "<Monthly|Yearly|Custom> report submitted for printing ..." in green (lines 445–455).
- PF3 returns to the main menu (lines 187–189).

**User Journey Context**:
- Entry Point: Main menu option 9 (COMEN02Y.cpy lines 74–78); transaction `CR00`.
- User Actions: Mark a report type (and dates for Custom) → Enter → confirm `Y`.
- Expected Outcomes: Batch report job queued; confirmation message on screen.

**Business Value**: Self-service report generation — business users trigger production of official transaction reports on demand instead of filing operations requests.

---

### STORY-019: Produce the Printed Transaction Report (Batch)

**User Story**: "As the operations/batch system, I want the submitted job to back up the transaction file, filter transactions to the requested date range sorted by card number, and format the printed report so that the requesting user receives accurate output."

**Story Type**: Integration

**Source Location**: `00.phase-1-input/proc/TRANREPT.prc` — unload step lines 21–31, sort/filter step lines 32–53 (INCLUDE COND on TRAN-PROC-DT between PARM-START-DATE and PARM-END-DATE, sorted by TRAN-CARD-NUM), report step STEP10R lines 54–80 (PGM=CBTRN03C with TRANFILE/CARDXREF/TRANTYPE/TRANCATG/DATEPARM inputs and TRANREPT output)

**Acceptance Criteria**:
- The transaction VSAM file is unloaded to a generation backup dataset before reporting (lines 21–31).
- Only transactions whose processing date falls within the submitted start/end dates are included, sorted ascending by card number (lines 44–46).
- The report step reads the filtered file plus card-xref, transaction-type, and transaction-category reference files and the date parameters, writing a 133-byte print-format report dataset (lines 54–80).
- Note for migration: the report program CBTRN03C is referenced by the proc (line 57) but its source is not present in this repository — the report layout must be reconstructed or re-specified during migration.

**User Journey Context**:
- Entry Point: JCL arriving on TDQ `JOBS` from CORPT00C (CORPT00C.cbl lines 515–523).
- User Actions: None (automatic); the requesting user later retrieves the printed report.
- Expected Outcomes: Date-filtered, card-ordered transaction report produced as a print dataset.

**Business Value**: Completes the user-triggered reporting workflow, turning an online request into deliverable business output.

---

## Module 8: User Security Administration (COUSR00C–COUSR03C)

### STORY-020: List Application Users

**User Story**: "As an administrator, I want a pageable list of all application users, optionally starting from a user ID, so that I can audit who has access."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COUSR00C.cbl` — PROCESS-ENTER-KEY lines 149–235; PF7/PF8 lines 237–279; browse paragraphs lines 586–693; screen `00.phase-1-input/bms/COUSR00.bms`

**Acceptance Criteria**:
- Up to 10 users are listed per page with ID, name, and type (POPULATE-USER-DATA lines 384–444).
- An optional user-ID filter positions the list at that key (lines 218–224).
- PF8/PF7 page forward/backward; boundary conditions show "You are already at the top/bottom of the page..." and "You have reached the top/bottom of the page..." (lines 251–254, 273–276, 637–640, 671–674).
- Browse errors show "Unable to lookup User..." (lines 609–610, 643–644, 677–678).
- PF3 returns to the admin menu (lines 125–127).

**User Journey Context**:
- Entry Point: Admin menu option 1 (COADM02Y.cpy lines 24–27); transaction `CU00`.
- User Actions: Optionally enter a starting user ID; Enter; PF7/PF8 to page.
- Expected Outcomes: Complete, navigable user inventory.

**Business Value**: Access-control oversight — administrators can review all accounts that can reach customer data.

---

### STORY-021: Jump from the User List to Update or Delete

**User Story**: "As an administrator, I want to mark a listed user with U (update) or D (delete) so that I maintain that user without retyping their ID."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COUSR00C.cbl` — selection handling lines 151–216

**Acceptance Criteria**:
- `U`/`u` transfers to the user-update program with the selected user ID in context (lines 190–200).
- `D`/`d` transfers to the user-delete program with the selected user ID in context (lines 200–210).
- Any other selection character shows "Invalid selection. Valid values are U and D" (lines 212–215).

**User Journey Context**:
- Entry Point: User list with results.
- User Actions: Type `U` or `D` beside one user; press Enter.
- Expected Outcomes: Update or delete screen opens pre-loaded with that user.

**Business Value**: Efficient, mistake-resistant user maintenance workflow.

---

### STORY-022: Add a New Application User

**User Story**: "As an administrator, I want to create a user with name, ID, password, and type so that new staff or admins can access the system with the right privileges."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COUSR01C.cbl` — PROCESS-ENTER-KEY lines 115–160; WRITE-USER-SEC-FILE lines 238–275; screen `00.phase-1-input/bms/COUSR01.bms`

**Acceptance Criteria**:
- First Name, Last Name, User ID, Password, and User Type are all mandatory, each with its own message ("First Name can NOT be empty...", "Last Name can NOT be empty...", "User ID can NOT be empty...", "Password can NOT be empty...", "User Type can NOT be empty...", lines 117–146).
- On success the user record is written to the security file and "User <id> has been added ..." is shown (lines 251–258).
- A duplicate user ID is rejected with "User ID already exist..." (lines 260–264); other write errors show "Unable to Add User..." (lines 269–271).
- PF4 clears the entry fields (lines 96–97); PF3 returns to the admin menu (lines 93–95).

**User Journey Context**:
- Entry Point: Admin menu option 2 (COADM02Y.cpy lines 29–32); transaction `CU01`.
- User Actions: Fill all five fields; press Enter.
- Expected Outcomes: New sign-on credentials active immediately.

**Business Value**: Controlled onboarding of users with explicit role assignment (regular vs admin).

---

### STORY-023: Update an Existing User

**User Story**: "As an administrator, I want to fetch a user by ID, change their name, password, or type, and save so that credentials and privileges stay current."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COUSR02C.cbl` — main flow lines 108–130; PROCESS-ENTER-KEY lines 143–175; UPDATE-USER-INFO lines 177–246; READ/UPDATE paragraphs lines 320–390; screen `00.phase-1-input/bms/COUSR02.bms`

**Acceptance Criteria**:
- Fetching requires a user ID ("User ID can NOT be empty...", lines 145–150); unknown IDs show "User ID NOT found..." (lines 340–344).
- After a successful fetch the admin is prompted "Press PF5 key to save your updates ..." (lines 334–338).
- On save, all fields are re-validated as mandatory (First Name, Last Name, Password, User Type, lines 185–210).
- Saving with no changes shows "Please modify to update ..." (lines 237–240).
- A successful PF5 save rewrites the security record and shows "User <id> has been updated ..." (lines 369–375); failures show "User ID NOT found..." or "Unable to Update User..." (lines 377–387).
- PF4 clears the screen; PF3/PF12 return to the admin menu (lines 111–126).

**User Journey Context**:
- Entry Point: Admin menu option 3 (COADM02Y.cpy lines 34–37) or `U` from the user list; transaction `CU02`.
- User Actions: Enter user ID → Enter to fetch → modify fields → PF5 to save.
- Expected Outcomes: User record updated with explicit confirmation.

**Business Value**: Keeps access rights and passwords current (role changes, password resets) without deleting/recreating accounts.

---

### STORY-024: Delete an Application User

**User Story**: "As an administrator, I want to fetch a user by ID, review their details, and deliberately delete them so that departed staff immediately lose access."

**Story Type**: Administrative

**Source Location**: `00.phase-1-input/cbl/COUSR03C.cbl` — main flow lines 108–131; PROCESS-ENTER-KEY lines 142–171; DELETE-USER-INFO lines 174–194; READ/DELETE paragraphs lines 267–338; screen `00.phase-1-input/bms/COUSR03.bms`

**Acceptance Criteria**:
- Fetching requires a user ID ("User ID can NOT be empty...", lines 144–149); unknown IDs show "User ID NOT found..." (lines 287–291).
- After the fetch, the user's details are displayed with the prompt "Press PF5 key to delete this user ..." (lines 281–285) — deletion never happens on Enter alone.
- PF5 deletes the security record and shows "User <id> has been deleted ..." (lines 314–321); failures show "User ID NOT found..." or an update error (lines 323–333).
- PF4 clears the screen; PF3/PF12 return to the admin menu (lines 111–126).

**User Journey Context**:
- Entry Point: Admin menu option 4 (COADM02Y.cpy lines 39–42) or `D` from the user list; transaction `CU03`.
- User Actions: Enter user ID → Enter to fetch/review → PF5 to confirm deletion.
- Expected Outcomes: User can no longer sign on.

**Business Value**: Prompt, review-then-confirm access revocation reduces security exposure from stale accounts.

---

## Coverage Notes for Migration

- **All 17 online CICS programs** in `00.phase-1-input/cbl/` are covered: COSGN00C (STORY-001–003), COMEN01C (004), COADM01C (005), COACTVWC (006), COACTUPC (007), COCRDLIC (008–009), COCRDSLC (010), COCRDUPC (011), COTRN00C (012–013), COTRN01C (014), COTRN02C (015–016), COBIL00C (017), CORPT00C (018), COUSR00C (020–021), COUSR01C (022), COUSR02C (023), COUSR03C (024). The batch reporting proc TRANREPT.prc is covered by STORY-019.
- **CSUTLDTC.cbl** (CEEDAYS date-validation wrapper) is technical infrastructure invoked by STORY-015 and STORY-018 date edits; it is intentionally not a standalone story.
- **REPROC.prc / REPROCT.ctl** (VSAM REPRO housekeeping) have no user-visible output and are excluded per the extraction rules.
- Batch programs referenced by the proc (e.g., CBTRN03C) are **not present in this repository**; STORY-019's report formatting must be re-specified from the proc's datasets during migration.
