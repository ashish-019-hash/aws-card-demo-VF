# CardDemo — User Stories Catalog

**Source:** CardDemo COBOL/CICS application, `00.phase-1-input/` (cbl/, bms/, cpy/, csd/, proc/)
**Reference:** `01.phase-1-output/codebase-wiki.md` (system map)

## Personas

| Persona | COMMAREA marker | What they do in CardDemo |
|---------|-----------------|---------------------------|
| **Admin** | `SEC-USR-TYPE = 'A'` (`CDEMO-USRTYP-ADMIN`) | Signs on and lands on the Admin Menu (COADM01C); manages application users (list/add/update/delete). Admin accounts can also reach every regular-user screen — the CSD/menu tables route both admin and regular sign-ons through the same downstream programs once a screen is invoked directly, and none of the current main-menu options are flagged admin-only (see US-010). |
| **Regular user** | `SEC-USR-TYPE = 'U'` (`CDEMO-USRTYP-USER`) | Signs on and lands on the Main Menu (COMEN01C); views/updates accounts and cards, lists/views/adds transactions, pays bills, and requests transaction reports. |

Stories are grouped by module/screen, in the order a user would encounter them. Every story cites the COBOL program and paragraph/line range that implements it; ranges were verified against the checked-out source.

---

## 1. Sign-On (COSGN00C — transaction `CC00`)

### STORY-001: Regular user signs on and reaches the main menu

**User Story**: As a regular user, I want to sign on with my user ID and password so that I can reach my main menu and start working with accounts, cards, and transactions.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:108-140` (PROCESS-ENTER-KEY), `cbl/COSGN00C.cbl:209-240` (READ-USER-SEC-FILE)

**Acceptance Criteria**:
- On first entry (`EIBCALEN = 0`) the sign-on screen is displayed with the cursor positioned on the User ID field [FILE:cbl/COSGN00C.cbl:80-83].
- Entering a valid User ID and Password that match a `USRSEC` record with `SEC-USR-TYPE = 'U'` transfers control (XCTL) to `COMEN01C`, the main menu [FILE:cbl/COSGN00C.cbl:221-239].
- The user ID entered is folded to upper case before lookup and before being carried in the COMMAREA [FILE:cbl/COSGN00C.cbl:132-136].

**User Journey Context**:
- Entry Point: User starts CICS transaction `CC00` (sign-on screen).
- User Actions: Enters User ID and Password, presses Enter.
- Expected Outcomes: User is authenticated and lands on the Main Menu.

**Business Value**: Establishes the identity and access boundary for every downstream operation; without this, no account/card/transaction work can happen.

---

### STORY-002: Admin signs on and reaches the admin menu

**User Story**: As an administrator, I want to sign on with my admin credentials so that I am routed to the Admin Menu instead of the regular user menu.

**Story Type**: Administrative

**Source Location**: `cbl/COSGN00C.cbl:221-240` (READ-USER-SEC-FILE, admin branch)

**Acceptance Criteria**:
- A successful credential match where `SEC-USR-TYPE = 'A'` (`CDEMO-USRTYP-ADMIN`) causes XCTL to `COADM01C` instead of `COMEN01C` [FILE:cbl/COSGN00C.cbl:230-239].
- The COMMAREA carries `CDEMO-USER-ID` and `CDEMO-USER-TYPE` forward so the Admin Menu program knows the caller is an admin [FILE:cbl/COSGN00C.cbl:224-228].

**User Journey Context**:
- Entry Point: Transaction `CC00`.
- User Actions: Enters admin User ID and Password, presses Enter.
- Expected Outcomes: Lands on the Admin Menu (user list/add/update/delete options).

**Business Value**: Separates administrative capability (user security management) from regular banking-style operations, enforcing role-based routing at the point of login.

---

### STORY-003: User is rejected for the wrong password

**User Story**: As a user (admin or regular), I want to be told when my password is wrong so that I can retry without wondering whether my account exists.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:221-246`

**Acceptance Criteria**:
- If the User ID is found in `USRSEC` but `SEC-USR-PWD` does not equal the entered password, the screen re-displays with the message `"Wrong Password. Try again ..."` and the cursor is placed on the password field (`PASSWDL = -1`) [FILE:cbl/COSGN00C.cbl:241-245].
- No program transfer occurs; the sign-on transaction (`CC00`) is re-invoked (`RETURN TRANSID`) [FILE:cbl/COSGN00C.cbl:98-102].

**User Journey Context**:
- Entry Point: Sign-on screen, Enter key with a User ID that exists but a wrong password.
- User Actions: Retypes the password.
- Expected Outcomes: User is returned to the same screen with a clear, specific error and can retry immediately.

**Business Value**: Gives actionable, low-friction feedback on invalid credentials, reducing support calls while not confirming or denying which specific field was wrong beyond "password."

---

### STORY-004: User is told their User ID does not exist

**User Story**: As a user, I want to be told when my User ID is not recognized so that I know to check my ID (versus my password).

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:247-251` (`WHEN 13` = `USRSEC` NOTFND)

**Acceptance Criteria**:
- If the `USRSEC` read returns response code 13 (record not found), the screen redisplays with `"User not found. Try again ..."` and the cursor is placed on the User ID field (`USERIDL = -1`) [FILE:cbl/COSGN00C.cbl:247-251].
- Any other unexpected file-access response shows `"Unable to verify the User ..."` instead [FILE:cbl/COSGN00C.cbl:252-256].

**User Journey Context**:
- Entry Point: Sign-on screen, Enter key with an unknown User ID.
- User Actions: Corrects the User ID and retries.
- Expected Outcomes: Clear distinction between "unknown user" and "system error" cases.

**Business Value**: Faster self-service recovery from typos in the User ID field.

---

### STORY-005: User is prompted for missing User ID or Password

**User Story**: As a user, I want the system to tell me when I left the User ID or Password field blank so that I don't waste a round trip on an incomplete submission.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:117-130`

**Acceptance Criteria**:
- Submitting with a blank User ID shows `"Please enter User ID ..."` and places the cursor on the User ID field [FILE:cbl/COSGN00C.cbl:118-122].
- Submitting with a User ID present but a blank Password shows `"Please enter Password ..."` and places the cursor on the Password field [FILE:cbl/COSGN00C.cbl:123-127].
- Neither the `USRSEC` file nor any credential comparison is invoked in these cases [FILE:cbl/COSGN00C.cbl:138-140] — the lookup is skipped entirely.

**User Journey Context**:
- Entry Point: Sign-on screen, Enter key pressed with one or both fields empty.
- User Actions: Fills in the missing field(s) and resubmits.
- Expected Outcomes: Field-specific prompts guide completion without a generic error.

**Business Value**: Prevents unnecessary file reads for incomplete submissions and gives a precise, field-level prompt.

---

### STORY-006: User exits the sign-on screen

**User Story**: As a user, I want to press PF3 on the sign-on screen so that I can cleanly back out of the application.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COSGN00C.cbl:85-96` (EVALUATE EIBAID), `cbl/COSGN00C.cbl:159-172` (SEND-PLAIN-TEXT)

**Acceptance Criteria**:
- Pressing PF3 sends a plain-text "thank you" message (`CCDA-MSG-THANK-YOU`) and ends the transaction without a further `RETURN TRANSID`, i.e. no further screen loop [FILE:cbl/COSGN00C.cbl:88-90, 162-172].
- Pressing any key other than Enter or PF3 keeps the user on the sign-on screen with `"Invalid key pressed..."`-class message (`CCDA-MSG-INVALID-KEY`) [FILE:cbl/COSGN00C.cbl:91-94].

**User Journey Context**:
- Entry Point: Sign-on screen.
- User Actions: Presses PF3 (or presses an unsupported key).
- Expected Outcomes: Session terminates gracefully on PF3; unsupported keys are rejected with guidance.

**Business Value**: Predictable exit path and clear feedback on unsupported input reduce confusion for terminal users.

---

## 2. Main Menu & Admin Menu Navigation (COMEN01C — `CM00`, COADM01C — `CA00`)

### STORY-007: Regular user navigates the main menu to a business function

**User Story**: As a regular user, I want to pick a numbered option from the main menu so that I can jump straight to the account, card, transaction, bill-pay, or report screen I need.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COMEN01C.cbl:115-165` (PROCESS-ENTER-KEY), `cpy/COMEN02Y.cpy:19-92` (10 menu options and target programs)

**Acceptance Criteria**:
- The menu displays 10 numbered options built from `CDEMO-MENU-OPT-NAME` entries 1–10 (Account View, Account Update, Credit Card List, Credit Card View, Credit Card Update, Transaction List, Transaction View, Transaction Add, Transaction Reports, Bill Payment) [FILE:cpy/COMEN02Y.cpy:21-84].
- Entering the option number and pressing Enter performs `EXEC CICS XCTL` to the associated program (e.g., option `1` → `COACTVWC`) [FILE:cbl/COMEN01C.cbl:145-156].
- The COMMAREA is stamped with `CDEMO-FROM-TRANID`/`CDEMO-FROM-PROGRAM` = the menu's own tranid/program so the destination screen knows how to return [FILE:cbl/COMEN01C.cbl:147-151].

**User Journey Context**:
- Entry Point: Main Menu, reached right after regular-user sign-on.
- User Actions: Types a 1–2 digit option number, presses Enter.
- Expected Outcomes: Control transfers to the selected screen with context preserved for a later "return to menu."

**Business Value**: Single, consistent launch point for every regular-user capability in the system.

---

### STORY-008: User is warned about an invalid or out-of-range menu option

**User Story**: As a regular user, I want to be told when I type an option number that doesn't exist so that I can correct it immediately.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COMEN01C.cbl:117-134`

**Acceptance Criteria**:
- If the typed option is non-numeric, greater than `CDEMO-MENU-OPT-COUNT` (10), or zero, the message `"Please enter a valid option number..."` is shown and no XCTL occurs [FILE:cbl/COMEN01C.cbl:127-134].
- Blank digits in the option field are right-justified and zero-filled before validation (e.g. typing " 3" is treated as "03") [FILE:cbl/COMEN01C.cbl:117-124].

**User Journey Context**:
- Entry Point: Main Menu.
- User Actions: Types an invalid option (e.g. "99", "AB", "0") and presses Enter.
- Expected Outcomes: Screen redisplays with the option-number error; no navigation happens.

**Business Value**: Prevents accidental navigation to undefined functionality and gives immediate, specific feedback.

---

### STORY-009: Regular user is blocked from an admin-only menu option

**User Story**: As a regular user, I want to be stopped from selecting a menu option that is restricted to administrators so that I cannot accidentally reach functionality outside my role.

**Story Type**: Administrative

**Source Location**: `cbl/COMEN01C.cbl:136-143`, `cpy/COMEN02Y.cpy:29,35,41,47,53,59,65,72,78,84` (`CDEMO-MENU-OPT-USRTYPE` per option)

**Acceptance Criteria**:
- If the signed-on user's type is `'U'` and the selected option's `CDEMO-MENU-OPT-USRTYPE` is `'A'`, the message `"No access - Admin Only option... "` is shown and no XCTL occurs [FILE:cbl/COMEN01C.cbl:136-143].
- **Observed data note:** in the shipped `COMEN02Y` copybook all 10 main-menu options are currently flagged `'U'` [FILE:cpy/COMEN02Y.cpy:29,35,41,47,53,59,65,72,78,84], so this gate is implemented but not presently triggered by any main-menu entry — it only fires if a future option is marked `'A'`.

**User Journey Context**:
- Entry Point: Main Menu.
- User Actions: Selects an option flagged admin-only (were one configured).
- Expected Outcomes: Access denied with a role-specific message; regular user stays on the main menu.

**Business Value**: Enforces role-based access control at the menu layer, defending in depth even if a screen is reachable by transaction ID directly.

---

### STORY-010: Admin navigates the admin menu to a user-management function

**User Story**: As an administrator, I want to pick a numbered option from the admin menu so that I can list, add, update, or delete application users.

**Story Type**: Administrative

**Source Location**: `cbl/COADM01C.cbl:115-155` (PROCESS-ENTER-KEY), `cpy/COADM02Y.cpy:19-48` (4 admin options and target programs)

**Acceptance Criteria**:
- The admin menu displays 4 numbered options: User List (Security), User Add (Security), User Update (Security), User Delete (Security) [FILE:cpy/COADM02Y.cpy:24-42].
- Entering the option number and pressing Enter performs `EXEC CICS XCTL` to the corresponding program (`COUSR00C`…`COUSR03C`) [FILE:cbl/COADM01C.cbl:136-146].
- An option number that is non-numeric, zero, or exceeds `CDEMO-ADMIN-OPT-COUNT` (4) shows `"Please enter a valid option number..."` [FILE:cbl/COADM01C.cbl:127-134].

**User Journey Context**:
- Entry Point: Admin Menu, reached right after admin sign-on.
- User Actions: Types a 1-digit option number, presses Enter.
- Expected Outcomes: Control transfers to the selected user-management screen.

**Business Value**: Gives administrators a dedicated, isolated launch point for security/user-management operations that regular users never see.

---

### STORY-011: User returns to sign-on from a menu

**User Story**: As a user (admin or regular), I want to press PF3 on my menu so that I can log out back to the sign-on screen.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COMEN01C.cbl:96-98, 170-177` (RETURN-TO-SIGNON-SCREEN); `cbl/COADM01C.cbl:96-98, 160-167`

**Acceptance Criteria**:
- Pressing PF3 on either menu sets the destination program to `COSGN00C` (unless a different `CDEMO-TO-PROGRAM` was already set) and performs XCTL there [FILE:cbl/COMEN01C.cbl:170-177].

**User Journey Context**:
- Entry Point: Main Menu or Admin Menu.
- User Actions: Presses PF3.
- Expected Outcomes: User is returned to the sign-on screen.

**Business Value**: Consistent, predictable exit/log-out behavior from every top-level menu.

---

## 3. Account View (COACTVWC — transaction `CAVW`)

### STORY-012: User looks up an account's details

**User Story**: As a regular user, I want to enter an account number and view its balance, credit limits, dates, and the associated customer's details so that I can answer questions about that account.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTVWC.cbl:687-720` (9000-READ-ACCT), `cbl/COACTVWC.cbl:1-2000` overall map population

**Acceptance Criteria**:
- Entering a valid 11-digit account number and pressing Enter looks up the card cross-reference (`CCXREF`/`CARDXREF`) by account, then the account master (`ACCTDAT`), then the customer master (`CUSTDAT`) by the customer ID found on the account [FILE:cbl/COACTVWC.cbl:693-712].
- On success, the screen shows the account's active status, current balance, credit limit, cash credit limit, current cycle credit/debit, open/expiration/reissue dates, and the customer's name/address/phone/SSN/DOB/FICO score (via the copied `CACTVWA`/`CVACT01Y`/`CVCUS01Y` layouts) with the info message `"Displaying details of given Account"` [FILE:cbl/COACTVWC.cbl:115-116].
- If the search box is left blank on a first visit, the screen prompts `"Enter or update id of account to display"` [FILE:cbl/COACTVWC.cbl:113-114, 463].

**User Journey Context**:
- Entry Point: Main Menu option 1, or the "View" action from the Card List/Card Detail screens.
- User Actions: Types the 11-digit account number, presses Enter.
- Expected Outcomes: Read-only account and customer detail is displayed.

**Business Value**: Gives staff a fast, read-only way to confirm account status and customer identity without risk of accidental changes.

---

### STORY-013: User is guided when the account number is missing, malformed, or not found

**User Story**: As a regular user, I want specific error messages when my account-number search fails so that I know exactly what to fix.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTVWC.cbl:620-685` (2210-EDIT-ACCOUNT), `cbl/COACTVWC.cbl:121-136` (message conditions)

**Acceptance Criteria**:
- Blank account number: message `"Account number not provided"` [FILE:cbl/COACTVWC.cbl:121-122, 655-658].
- Non-numeric or all-zero account number: message `"Account number must be a non zero 11 digit number"` [FILE:cbl/COACTVWC.cbl:125-128, 668].
- Account not present in the card cross-reference file: message `"Did not find this account in account card xref file"` [FILE:cbl/COACTVWC.cbl:129-130].
- Account present in cross-reference but missing from the account master: message `"Did not find this account in account master file"` [FILE:cbl/COACTVWC.cbl:131-132].
- Customer record missing from the customer master: message `"Did not find associated customer in master file"` [FILE:cbl/COACTVWC.cbl:133-134].
- In every failure case the account fields remain protected/unchanged and no partial data is shown.

**User Journey Context**:
- Entry Point: Account View screen.
- User Actions: Submits a blank, malformed, or non-existent account number.
- Expected Outcomes: A message identifying exactly which lookup step failed.

**Business Value**: Reduces support escalations by telling staff precisely where a lookup broke down (bad input vs. missing account vs. missing customer record).

---

### STORY-014: User navigates from Account View to the associated card list

**User Story**: As a regular user, I want to move from an account's detail screen to that account's card list so that I can see which cards are tied to the account I'm reviewing.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTVWC.cbl:306-345` (PF-key routing to `COCRDLIC`)

**Acceptance Criteria**:
- PF3 from Account View returns to the calling program (the Main Menu by default, or whichever screen navigated here) [FILE:cbl/COACTVWC.cbl:322-345].

**User Journey Context**:
- Entry Point: Account View.
- User Actions: Presses PF3.
- Expected Outcomes: Returns to the previous screen (menu or card list) with account context preserved.

**Business Value**: Keeps account-review and card-review workflows linked without forcing the user back to the main menu each time.

---

## 4. Account Update (COACTUPC — transaction `CAUP`)

### STORY-015: User looks up an account to prepare an update

**User Story**: As a regular user, I want to search for an account by ID on the update screen so that I can see its current editable values before changing them.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:1440-1465` (1200-EDIT-MAP-INPUTS gate), account/customer field population

**Acceptance Criteria**:
- The prompt `"Enter or update id of account to update"` is shown before any account is fetched [FILE:cbl/COACTUPC.cbl:465-466].
- On finding the account and customer, all editable fields (active status, balance, credit limits, dates, group ID, and customer name/address/phone/SSN/DOB/FICO/EFT account) are populated and the message `"Update account details presented above."` is shown [FILE:cbl/COACTUPC.cbl:467-468].
- The same missing/malformed/not-found error messages as Account View apply to the search step (`Account number not provided`, `...must be a non zero 11 digit number`, `Did not find this account in account master file`, `Did not find associated customer in master file`) [FILE:cbl/COACTUPC.cbl:483-503].

**User Journey Context**:
- Entry Point: Main Menu option 2, or "Update" action from the Card List screen.
- User Actions: Enters account number, presses Enter.
- Expected Outcomes: Editable account/customer form is displayed, pre-filled with current values.

**Business Value**: Lets staff correct account and customer records without a separate lookup step.

---

### STORY-016: User edits account/customer fields and the system detects no real change

**User Story**: As a regular user, I want the system to tell me when I haven't actually changed anything so that I don't submit a no-op update.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:1460-1470` (1205-COMPARE-OLD-NEW invocation), `cbl/COACTUPC.cbl:1681-1777` (1205-COMPARE-OLD-NEW)

**Acceptance Criteria**:
- After Enter, the new field values are compared field-by-field against the values originally fetched (`ACUP-NEW-*` vs `ACUP-OLD-*`, case-insensitive for text) [FILE:cbl/COACTUPC.cbl:1681-1777].
- If every field matches, the message `"No change detected with respect to values fetched."` is shown and no confirmation/save step is offered [FILE:cbl/COACTUPC.cbl:486-487, 1463-1466].

**User Journey Context**:
- Entry Point: Account Update screen with data already fetched.
- User Actions: Presses Enter without editing any field.
- Expected Outcomes: Informational message; screen stays in edit mode.

**Business Value**: Avoids unnecessary file locks/rewrites and false "success" messages for edits that didn't actually happen.

---

### STORY-017: User edits an account and confirms the save (two-step confirm)

**User Story**: As a regular user, I want to review a summary confirmation before my account changes are actually written so that I get one last chance to catch a mistake.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:1460-1480` (confirm-gate state machine), `cbl/COACTUPC.cbl:2960-3005`

**Acceptance Criteria**:
- After Enter with valid, changed field values, the screen shows `"Changes validated.Press F5 to save"` and does **not** write anything yet [FILE:cbl/COACTUPC.cbl:471-472, 1674].
- Pressing PF5 while in this "validated, not yet confirmed" state is required to actually commit the change; any other key (including Enter) re-displays the same confirm prompt [FILE:cbl/COACTUPC.cbl:906-909].
- On successful write, the message changes to `"Changes committed to database"` [FILE:cbl/COACTUPC.cbl:473-474].

**User Journey Context**:
- Entry Point: Account Update screen, after editing one or more fields.
- User Actions: Presses Enter to validate, reviews the confirm prompt, presses PF5 to save.
- Expected Outcomes: Account and customer master records are updated only after the explicit PF5 confirmation.

**Business Value**: Two-step confirm prevents accidental commits of sensitive financial data (balances, credit limits) from a single keystroke.

---

### STORY-018: User is blocked from saving when someone else changed the record first

**User Story**: As a regular user, I want to be warned if another user modified this account/customer record while I was editing it so that I don't overwrite their change without knowing.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:3947-3951` (9600-WRITE-PROCESSING gate), `cbl/COACTUPC.cbl:4109-4193` (9700-CHECK-CHANGE-IN-REC)

**Acceptance Criteria**:
- Immediately before rewriting, the program re-reads the account (`ACCTDAT`, `UPDATE`) and customer (`CUSTDAT`, `UPDATE`) records for update and compares every field the user saw when they started editing (`ACUP-OLD-*`) against what is now on file [FILE:cbl/COACTUPC.cbl:3888-3948, 4109-4192].
- If any compared field differs (account status, balance, limits, cycle credit/debit, open/expiry/reissue dates, group ID, or any customer name/address/phone/SSN/DOB/EFT/FICO field), the record is **not** rewritten, and the message `"Record changed by some one else. Please review"` is shown [FILE:cbl/COACTUPC.cbl:520-521, 4143, 4189-4190].
- The user must re-fetch the account (losing their pending edits) and reapply their change against the current data — the program does not attempt to merge changes.

**User Journey Context**:
- Entry Point: Account Update screen, at the moment of PF5 confirm.
- User Actions: Presses PF5 to save; another user's change is detected underneath.
- Expected Outcomes: Save is refused with a clear "changed by someone else" message instead of silently overwriting.

**Business Value**: Optimistic-concurrency protection prevents lost updates in a system where the same account can be opened by two staff members at once.

---

### STORY-019: User sees a failure message if the update cannot be committed

**User Story**: As a regular user, I want a clear message if my confirmed update still fails to save so that I know to retry rather than assume it worked.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COACTUPC.cbl:4066-4105` (REWRITE calls and RESP handling)

**Acceptance Criteria**:
- If the account record cannot be locked for update, the message is `"Could not lock account record for update"` [FILE:cbl/COACTUPC.cbl:522-523].
- If the customer record cannot be locked for update, the message is `"Could not lock customer record for update"` [FILE:cbl/COACTUPC.cbl:524-525].
- If the account or customer `REWRITE` itself fails after locking, the message is `"Update of record failed"` [FILE:cbl/COACTUPC.cbl:526-527, 4079, 4098-4102].

**User Journey Context**:
- Entry Point: Account Update screen, at PF5 confirm, after the concurrency check has passed.
- User Actions: Presses PF5; a file-level error occurs during the actual write.
- Expected Outcomes: Explicit failure message instead of a false "success."

**Business Value**: Distinguishes system/file errors from business-rule rejections (like the concurrency conflict), which helps operations diagnose real outages versus normal contention.

---

## 5. Card List (COCRDLIC — transaction `CCLI`)

### STORY-020: User browses the full list of credit cards

**User Story**: As a regular user, I want to browse all credit cards in pages so that I can find a specific card without knowing its exact number up front.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDLIC.cbl:373-580` (paging EVALUATE), `cbl/COCRDLIC.cbl:665-745` (page/row rendering)

**Acceptance Criteria**:
- Each page shows up to 7 card rows (`WS-EDIT-SELECT-FLAGS` sized for 7 entries) with account number, card number, and status [FILE:cbl/COCRDLIC.cbl:69-94, 683-745].
- The current page number is displayed (`WS-CA-SCREEN-NUM` → `PAGENOO`) [FILE:cbl/COCRDLIC.cbl:665-667].
- PF8 (page down) advances to the next page while a next page exists; PF7 (page up) returns to a previous page unless already on the first page [FILE:cbl/COCRDLIC.cbl:373-374, 439-513].

**User Journey Context**:
- Entry Point: Main Menu option 3.
- User Actions: Presses PF7/PF8 to move between pages of cards.
- Expected Outcomes: A scrollable, paged card list.

**Business Value**: Makes the full card portfolio browsable without needing search knowledge in advance.

---

### STORY-021: User filters the card list by account number and/or card number

**User Story**: As a regular user, I want to filter the card list to a specific account or a specific card number so that I can narrow a long list down to what I'm looking for.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDLIC.cbl:1003-1050` (2210-EDIT-ACCOUNT, 2220-EDIT-CARD)

**Acceptance Criteria**:
- Supplying an 11-digit numeric account number filters the list to cards on that account [FILE:cbl/COCRDLIC.cbl:1003-1029].
- Supplying a 16-digit numeric card number filters to that specific card [FILE:cbl/COCRDLIC.cbl:1034 onward].
- Leaving both filters blank browses all cards; an invalid (non-numeric or wrong-length) filter value is rejected with a validation message and rows are protected from selection until corrected [FILE:cbl/COCRDLIC.cbl:1017-1024].
- If no cards match the filter, the message `"NO RECORDS FOUND FOR THIS SEARCH CONDITION."` is shown [FILE:cbl/COCRDLIC.cbl:121-122].

**User Journey Context**:
- Entry Point: Card List screen.
- User Actions: Types an account number and/or card number into the filter fields, presses Enter.
- Expected Outcomes: List is scoped to the matching card(s), or an explicit "no records" message.

**Business Value**: Turns a potentially very long card list into a quick account- or card-scoped lookup.

---

### STORY-022: User selects a card from the list to view its detail

**User Story**: As a regular user, I want to mark a row with "S" and submit so that I jump straight into that card's detail screen.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDLIC.cbl:77-78` (`SELECT-OK` = 'S'/'U'), `cbl/COCRDLIC.cbl:518-545`

**Acceptance Criteria**:
- Typing `S` in a row's select field and pressing Enter navigates to the Card Detail (view) screen for that row's account/card [FILE:cbl/COCRDLIC.cbl:518-545].
- Typing `U` navigates instead to the Card Update screen for that row [FILE:cbl/COCRDLIC.cbl:546-577].
- Any other non-blank value in the select field produces `"INVALID ACTION CODE"` [FILE:cbl/COCRDLIC.cbl:125-126].
- Marking more than one row is rejected with `"PLEASE SELECT ONLY ONE RECORD TO VIEW OR UPDATE"` [FILE:cbl/COCRDLIC.cbl:123-124].

**User Journey Context**:
- Entry Point: Card List screen, after browsing/filtering to the desired page.
- User Actions: Types `S` (or `U`) next to one card row, presses Enter.
- Expected Outcomes: Navigates to Card View or Card Update pre-loaded with that card's account/card number.

**Business Value**: One-keystroke drill-down from a list to detail, with guardrails against ambiguous multi-select input.

---

## 6. Card View (COCRDSLC — transaction `CCDL`)

### STORY-023: User looks up a specific card by account and/or card number

**User Story**: As a regular user, I want to search for a card by account number, card number, or both so that I can see its full detail (holder name, status, expiry) read-only.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDSLC.cbl:127-158` (message set), card lookup paragraphs

**Acceptance Criteria**:
- Entering only an account number, only a card number, or both is accepted; entering neither shows `"Please enter Account and Card Number"` [FILE:cbl/COCRDSLC.cbl:128-129].
- A non-numeric or non-11-digit account number shows `"Account number must be a non zero 11 digit number"`; a non-numeric or non-16-digit card number shows `"Card number if supplied must be a 16 digit number"` [FILE:cbl/COCRDSLC.cbl:143-149].
- On success the message is `"   Displaying requested details"` and the card's holder name, embossed name, active status, and expiry date are shown read-only [FILE:cbl/COCRDSLC.cbl:126-127].
- If the account has no matching card cross-reference entry, `"Did not find this account in cards database"` is shown; if no card matches the combined search, `"Did not find cards for this search condition"` is shown [FILE:cbl/COCRDSLC.cbl:151-154].

**User Journey Context**:
- Entry Point: Main Menu option 4, or "S" selection from the Card List.
- User Actions: Enters an account and/or card number, presses Enter.
- Expected Outcomes: Read-only card detail is displayed.

**Business Value**: Fast, safe way to confirm a card's status and holder without any risk of accidental edits.

---

## 7. Card Update (COCRDUPC — transaction `CCUP`)

### STORY-024: User updates a card's expiry date, active status, and embossed name

**User Story**: As a regular user, I want to change a card's expiry month/year, active status (Y/N), and cardholder name so that card records stay accurate.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDUPC.cbl:91-99` (valid-value 88-levels), `cbl/COCRDUPC.cbl:160-213` (message set)

**Acceptance Criteria**:
- Active status must be `Y` or `N`; anything else is rejected with `"Card Status must be Y or N"`-class message driven by `CARD-STATUS-MUST-BE-YES-NO` [FILE:cbl/COCRDUPC.cbl:91, 195-196].
- Expiry month must be between 1 and 12 (`VALID-MONTH VALUES 1 THRU 12`); otherwise `"..."` per `CARD-EXPIRY-MONTH-NOT-VALID` [FILE:cbl/COCRDUPC.cbl:95, 197-198].
- Expiry year must be between 1950 and 2099 (`VALID-YEAR VALUES 1950 THRU 2099`); otherwise per `CARD-EXPIRY-YEAR-NOT-VALID` [FILE:cbl/COCRDUPC.cbl:99, 199-200].
- Cardholder/embossed name must contain only alphabetic characters and spaces; otherwise `"..."` per `WS-NAME-MUST-BE-ALPHA` [FILE:cbl/COCRDUPC.cbl:183-184].
- A found card's current values are shown before edit, message `"Displaying requested details"`-class (`FOUND-CARDS-FOR-ACCOUNT`) [FILE:cbl/COCRDUPC.cbl:160-161].

**User Journey Context**:
- Entry Point: Main Menu option 5, or "U" selection from the Card List.
- User Actions: Searches for the card, edits status/expiry/name, presses Enter to validate.
- Expected Outcomes: Validated changes are staged for confirmation.

**Business Value**: Keeps card status and expiry current (e.g., deactivating lost cards, correcting misspelled names) directly from the servicing screen.

---

### STORY-025: User confirms a card update before it is saved

**User Story**: As a regular user, I want to explicitly confirm my card changes before they're written so that I have a final checkpoint against mistakes.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDUPC.cbl:281-290` (CCUP state 88-levels), `cbl/COCRDUPC.cbl:162-171` (confirm messages)

**Acceptance Criteria**:
- After Enter validates changed fields, the screen shows `"Changes validated.Press F5 to save"` (`PROMPT-FOR-CONFIRMATION`) and does not write [FILE:cbl/COCRDUPC.cbl:166-167, 286].
- Only PF5 in this state commits the change; the state machine tracks `CCUP-CHANGES-OK-NOT-CONFIRMED` ('N') until PF5 moves it to `CCUP-CHANGES-OKAYED-AND-DONE` ('C') [FILE:cbl/COCRDUPC.cbl:286-287].
- On success, `"Changes committed to database"` (`CONFIRM-UPDATE-SUCCESS`) is shown [FILE:cbl/COCRDUPC.cbl:168-169].

**User Journey Context**:
- Entry Point: Card Update screen, after editing fields.
- User Actions: Presses Enter to validate, then PF5 to confirm and save.
- Expected Outcomes: Card record is written only after explicit confirmation.

**Business Value**: Mirrors the account-update safety pattern for card data, preventing accidental single-keystroke commits to card status/expiry.

---

### STORY-026: User is blocked from saving a card changed by someone else

**User Story**: As a regular user, I want to be warned if another user changed this card while I was editing it so that I don't blindly overwrite their change.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COCRDUPC.cbl:205-213` (message set), CCUP concurrency check paragraph

**Acceptance Criteria**:
- Before the final rewrite, the current `CARDDAT` record is re-read for update and compared against the values the user originally fetched.
- If the card record was changed since it was fetched, the update is refused and `"Record changed by some one else..."` (`DATA-WAS-CHANGED-BEFORE-UPDATE`) is shown instead of committing [FILE:cbl/COCRDUPC.cbl:207-208].
- If the record cannot be locked at all, `"Could not lock ... for update"` (`COULD-NOT-LOCK-FOR-UPDATE`) is shown [FILE:cbl/COCRDUPC.cbl:205-206]; if the write itself fails after locking, `"Update of record failed"` (`LOCKED-BUT-UPDATE-FAILED`) is shown [FILE:cbl/COCRDUPC.cbl:209-210].

**User Journey Context**:
- Entry Point: Card Update screen, at PF5 confirm.
- User Actions: Presses PF5; another user's change to the same card is detected.
- Expected Outcomes: Save is refused with a specific concurrency message; user must re-fetch and redo the edit.

**Business Value**: Same optimistic-concurrency protection as Account Update, extended to card records, avoiding lost updates on a shared resource.

---

## 8. Transaction List (COTRN00C — transaction `CT00`)

### STORY-027: User browses the transaction log in pages

**User Story**: As a regular user, I want to page through the transaction list so that I can review recent activity without knowing a specific transaction ID.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN00C.cbl:122-131` (EIBAID routing), `cbl/COTRN00C.cbl:234-266` (PROCESS-PF7-KEY/PROCESS-PF8-KEY)

**Acceptance Criteria**:
- PF8 pages forward and PF7 pages backward through the transaction file, browsing by transaction ID order [FILE:cbl/COTRN00C.cbl:125-128, 234-266].
- Each page displays a fixed set of transaction rows with the ability to select one with `S` for detail.

**User Journey Context**:
- Entry Point: Main Menu option 6.
- User Actions: Presses PF7/PF8 to move between pages.
- Expected Outcomes: A scrollable, paged transaction list.

**Business Value**: Lets staff review transaction history without a specific ID in hand.

---

### STORY-028: User jumps directly to a transaction ID from the list screen

**User Story**: As a regular user, I want to type a specific transaction ID on the list screen so that I can jump straight to that point in the list instead of paging through everything.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN00C.cbl:206-224` (PROCESS-ENTER-KEY, Tran ID handling)

**Acceptance Criteria**:
- Entering a numeric value in the Tran ID field and pressing Enter starts the browse from that transaction ID (`CDEMO-CT00-PAGE-NUM` reset to 0, forward browse begins there) [FILE:cbl/COTRN00C.cbl:220-224].
- A non-numeric Tran ID entry is rejected with `"Tran ID must be Numeric ..."` and the cursor is placed back on the field [FILE:cbl/COTRN00C.cbl:209-217].
- Leaving the Tran ID field blank browses from the beginning (`LOW-VALUES` moved to `TRAN-ID`) [FILE:cbl/COTRN00C.cbl:206-207].

**User Journey Context**:
- Entry Point: Transaction List screen.
- User Actions: Types a transaction ID, presses Enter.
- Expected Outcomes: The list re-displays starting from (or near) that transaction ID.

**Business Value**: Turns a potentially huge transaction log into something navigable by a known reference ID.

---

### STORY-029: User selects a transaction row to view its detail

**User Story**: As a regular user, I want to mark a transaction row with "S" and submit so that I open its full detail screen.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN00C.cbl:190-203` (row-selection EVALUATE)

**Acceptance Criteria**:
- Marking exactly one row with `S` and pressing Enter navigates to Transaction View (`COTRN01C`) for that transaction.
- Marking a row with anything other than `S` (or blank) shows `"Invalid selection. Valid value is S"` [FILE:cbl/COTRN00C.cbl:197-199].

**User Journey Context**:
- Entry Point: Transaction List screen.
- User Actions: Types `S` next to a transaction, presses Enter.
- Expected Outcomes: Navigates to that transaction's detail view.

**Business Value**: One-keystroke drill-down from list to detail, consistent with the Card List selection pattern.

---

## 9. Transaction View (COTRN01C — transaction `CT01`)

### STORY-030: User looks up a transaction's full detail by ID

**User Story**: As a regular user, I want to enter a transaction ID and see its full detail (amount, dates, merchant, card) so that I can research or confirm a specific transaction.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN01C.cbl:144-190` (PROCESS-ENTER-KEY)

**Acceptance Criteria**:
- Leaving the Tran ID field blank shows `"Tran ID can NOT be empty..."` and the cursor is placed on the field; no lookup is attempted [FILE:cbl/COTRN01C.cbl:146-151].
- On a successful lookup, the screen shows card number, transaction type/category/source codes, amount, description, origination and processing timestamps, and merchant ID/name/city/ZIP [FILE:cbl/COTRN01C.cbl:174-188].

**User Journey Context**:
- Entry Point: Main Menu option 7, or "S" selection from the Transaction List.
- User Actions: Enters or arrives with a transaction ID, presses Enter.
- Expected Outcomes: Full read-only transaction detail is displayed.

**Business Value**: Gives staff a complete picture of a single transaction for dispute research or customer inquiries.

---

## 10. Transaction Add (COTRN02C — transaction `CT02`)

### STORY-031: User adds a new transaction by looking up either the account or the card

**User Story**: As a regular user, I want to enter either an account number or a card number so that the system fills in the other one for me automatically before I add a transaction.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN02C.cbl:189-227` (VALIDATE-INPUT-KEY-FIELDS)

**Acceptance Criteria**:
- Supplying an account number looks it up in the account-to-card cross-reference (`CXACAIX`) and auto-fills the associated card number [FILE:cbl/COTRN02C.cbl:191-209].
- Supplying a card number instead looks it up in the card cross-reference (`CCXREF`) and auto-fills the associated account number [FILE:cbl/COTRN02C.cbl:210-223].
- Supplying neither shows `"Account or Card Number must be entered..."` [FILE:cbl/COTRN02C.cbl:224-227].
- A non-numeric account or card number is rejected with `"Account ID must be Numeric..."` / `"Card Number must be Numeric..."` respectively [FILE:cbl/COTRN02C.cbl:195-197, 213-215].
- A lookup miss shows `"Unable to lookup Acct in XREF AIX file..."` or `"Unable to lookup Card # in XREF file..."` as appropriate [FILE:cbl/COTRN02C.cbl:600-601, 633-634].

**User Journey Context**:
- Entry Point: Main Menu option 8.
- User Actions: Enters an account number or a card number, presses Enter.
- Expected Outcomes: Both the account and card fields are populated and cross-validated before the rest of the form is edited.

**Business Value**: Saves the operator from having to know both identifiers; the system resolves the relationship for them.

---

### STORY-032: User copies the last transaction on the account/card as a starting point

**User Story**: As a regular user, I want to copy the most recent transaction's details onto the add-transaction form so that I don't have to retype similar merchant/amount information from scratch.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN02C.cbl:469-495` (COPY-LAST-TRAN-DATA)

**Acceptance Criteria**:
- Triggering "copy last" re-validates the account/card key fields, then browses the transaction file backward from the highest key to find the most recent transaction for that context [FILE:cbl/COTRN02C.cbl:471-479].
- All copyable fields — type code, category code, source, amount, description, origination/processing timestamps, and merchant ID/name/city/ZIP — are pre-filled from that last transaction [FILE:cbl/COTRN02C.cbl:481-491].
- After copying, the normal Enter-key validation flow runs again so the user can still edit the copied values before confirming [FILE:cbl/COTRN02C.cbl:493].

**User Journey Context**:
- Entry Point: Transaction Add screen, with account/card already identified.
- User Actions: Presses the "copy last transaction" key.
- Expected Outcomes: The form is pre-filled with the prior transaction's details for editing.

**Business Value**: Speeds up entry of recurring or similar transactions (e.g., repeated merchant charges) for the operator.

---

### STORY-033: User confirms adding a transaction before it is written

**User Story**: As a regular user, I want to explicitly confirm before a new transaction is saved so that I don't accidentally post a transaction from a stray Enter key.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN02C.cbl:167-187` (CONFIRMI EVALUATE)

**Acceptance Criteria**:
- Entering `Y`/`y` in the Confirm field and pressing Enter performs the add [FILE:cbl/COTRN02C.cbl:168-170].
- Entering `N`/`n`, leaving it blank, or leaving it unset shows `"Confirm to add this transaction..."` and does not write [FILE:cbl/COTRN02C.cbl:171-180].
- Any other value shows `"Invalid value. Valid values are (Y/N)..."` [FILE:cbl/COTRN02C.cbl:181-186].

**User Journey Context**:
- Entry Point: Transaction Add screen, after key/data fields are validated.
- User Actions: Types `Y` in the Confirm field, presses Enter.
- Expected Outcomes: Transaction is written only on an explicit `Y` confirmation.

**Business Value**: Prevents accidental postings of new transactions, which directly affect account balances.

---

### STORY-034: New transaction is assigned the next sequential transaction ID

**User Story**: As a regular user, I want the system to assign a new, unique transaction ID automatically so that I never have to invent or type one myself.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COTRN02C.cbl:442-465` (ADD-TRANSACTION)

**Acceptance Criteria**:
- On confirmed add, the program browses the transaction file backward from the highest possible key (`HIGH-VALUES`) to find the current maximum transaction ID, then adds 1 to derive the new ID [FILE:cbl/COTRN02C.cbl:444-451].
- The new transaction is written with that ID via `EXEC CICS WRITE`; on success the message is `"Transaction added successfully. Your Tran ID is <id>."` [FILE:cbl/COTRN02C.cbl:707-716].
- If the derived key already exists on file (a duplicate-key race), the write is rejected with `"Tran ID already exist..."` and the user must resubmit [FILE:cbl/COTRN02C.cbl:717-722].

**User Journey Context**:
- Entry Point: Transaction Add screen, at confirmed Enter.
- User Actions: Confirms with `Y`.
- Expected Outcomes: A new transaction record appears with a system-generated, sequential ID.

**Business Value**: Guarantees unique, ordered transaction identifiers without manual coordination between operators — the same MAX+1 pattern used by Bill Payment (STORY-036).

---

## 11. Bill Payment (COBIL00C — transaction `CB00`)

### STORY-035: User looks up an account's current balance for payment

**User Story**: As a regular user, I want to enter an account number and see its current balance so that I know how much I'm about to pay off.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COBIL00C.cbl:156-195` (PROCESS-ENTER-KEY, balance fetch)

**Acceptance Criteria**:
- Leaving the account ID blank shows `"Acct ID can NOT be empty..."` [FILE:cbl/COBIL00C.cbl:157-161].
- Supplying a valid account ID reads the account master and displays `ACCT-CURR-BAL` in the Current Balance field [FILE:cbl/COBIL00C.cbl:193-194].

**User Journey Context**:
- Entry Point: Main Menu option 10.
- User Actions: Enters the account ID, presses Enter.
- Expected Outcomes: Current balance is displayed for review before paying.

**Business Value**: Lets the customer/operator see the exact amount that will be charged before committing to "pay in full."

---

### STORY-036: User pays an account's full balance and a payment transaction is recorded

**User Story**: As a regular user, I want to pay off an account's entire current balance in one step so that the account is brought to zero and the payment is recorded as a transaction.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COBIL00C.cbl:204-231` (payment-processing branch)

**Acceptance Criteria**:
- On confirmed payment (`Y`/`y`), a new transaction is generated with type code `'02'`, category `2`, source `'POS TERM'`, description `'BILL PAYMENT - ONLINE'`, amount equal to the full `ACCT-CURR-BAL`, and the account's card number, using the same MAX+1 transaction-ID derivation as Transaction Add [FILE:cbl/COBIL00C.cbl:210-224].
- The account's current balance is then reduced by the paid amount (`ACCT-CURR-BAL = ACCT-CURR-BAL - TRAN-AMT`), effectively zeroing it for a full-balance payment, and the account master record is rewritten [FILE:cbl/COBIL00C.cbl:225-227].
- The transaction's origination and processing timestamps are both set to the current time via `EXEC CICS ASKTIME`/`FORMATTIME` [FILE:cbl/COBIL00C.cbl:221-223, 256-268].

**User Journey Context**:
- Entry Point: Bill Payment screen, with account balance displayed.
- User Actions: Confirms payment with `Y`, presses Enter.
- Expected Outcomes: A `POS TERM` "BILL PAYMENT - ONLINE" transaction for the full balance is created, and the account balance drops to zero.

**Business Value**: Automates the common "pay my whole balance" customer request into a single, auditable transaction, keeping the transaction log and account balance consistent.

---

### STORY-037: User must explicitly confirm before the bill payment is posted

**User Story**: As a regular user, I want to confirm before the bill payment is actually posted so that a stray Enter doesn't charge the account.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COBIL00C.cbl:169-186` (CONFIRMI EVALUATE)

**Acceptance Criteria**:
- Leaving Confirm blank re-reads the account and shows the balance but does not post; the message becomes `"Confirm to make a bill payment..."` [FILE:cbl/COBIL00C.cbl:179-180, 228-230].
- Entering `N`/`n` clears the screen (`CLEAR-CURRENT-SCREEN`) and does not post [FILE:cbl/COBIL00C.cbl:175-178].
- Entering `Y`/`y` proceeds to post the payment (see STORY-036).
- Any other value shows `"Invalid value. Valid values are (Y/N)..."` [FILE:cbl/COBIL00C.cbl:181-186].

**User Journey Context**:
- Entry Point: Bill Payment screen, after balance is displayed.
- User Actions: Types `Y`, presses Enter.
- Expected Outcomes: Payment is only posted on explicit `Y` confirmation.

**Business Value**: Prevents accidental balance-clearing charges on the wrong account.

---

### STORY-038: User is told when there is nothing to pay

**User Story**: As a regular user, I want to be told when an account already has a zero or negative balance so that I don't try to pay off a balance that doesn't exist.

**Story Type**: Customer-Facing

**Source Location**: `cbl/COBIL00C.cbl:196-203`

**Acceptance Criteria**:
- If the looked-up account's current balance is less than or equal to zero, the message `"You have nothing to pay..."` is shown and no transaction is created [FILE:cbl/COBIL00C.cbl:196-203].
- This check happens after the account is successfully found, before any confirmation prompt is shown.

**User Journey Context**:
- Entry Point: Bill Payment screen.
- User Actions: Enters an account ID whose balance is zero or negative, presses Enter.
- Expected Outcomes: Informational message; no payment flow is offered.

**Business Value**: Avoids confusing zero/negative-amount "payments" and protects against posting a bogus transaction for an account that owes nothing.

---

## 12. Transaction Report Request (CORPT00C — transaction `CR00`)

### STORY-039: User requests a monthly transaction report

**User Story**: As a regular user, I want to request a report of this month's transactions so that I get a pre-scoped date range without calculating it myself.

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:211-235` (Monthly branch)

**Acceptance Criteria**:
- Selecting "Monthly" derives the start date as the 1st of the current month and the end date as the last day of the current month, both computed from `FUNCTION CURRENT-DATE` [FILE:cbl/CORPT00C.cbl:213-233].
- The derived range is passed as the report job's date parameters (`PARM-START-DATE-*`/`PARM-END-DATE-*`) [FILE:cbl/CORPT00C.cbl:218-219, 232-233].

**User Journey Context**:
- Entry Point: Main Menu option 9.
- User Actions: Marks the "Monthly" option, presses Enter.
- Expected Outcomes: A job request for the current month's transactions is prepared for submission.

**Business Value**: One-click access to "this month's activity" without manual date entry or arithmetic.

---

### STORY-040: User requests a yearly transaction report

**User Story**: As a regular user, I want to request a report covering the whole current year so that I can review annual activity in one job.

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:239-254` (Yearly branch)

**Acceptance Criteria**:
- Selecting "Yearly" derives the start date as January 1 and the end date as December 31 of the current year (`WS-CURDATE-YEAR`) [FILE:cbl/CORPT00C.cbl:240-253].

**User Journey Context**:
- Entry Point: Transaction Report screen.
- User Actions: Marks the "Yearly" option, presses Enter.
- Expected Outcomes: A full-year report job is prepared for submission.

**Business Value**: Simplifies annual reporting requests (e.g., for statements or audits) to a single selection.

---

### STORY-041: User requests a report for a custom date range

**User Story**: As a regular user, I want to type my own start and end dates so that I can get a report for exactly the period I need.

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:256-260, 419-433` (Custom branch and end-date validation)

**Acceptance Criteria**:
- Selecting "Custom" requires both a start date and an end date; a blank end date is rejected with `"End Date - Not a valid date..."` [FILE:cbl/CORPT00C.cbl:420-425].
- The entered start/end dates become the report job's date parameters directly (no derivation) [FILE:cbl/CORPT00C.cbl:429-433].

**User Journey Context**:
- Entry Point: Transaction Report screen.
- User Actions: Marks "Custom" and types a start and end date, presses Enter.
- Expected Outcomes: A report job is prepared for exactly the requested date range.

**Business Value**: Gives power users full control over the reporting window for ad hoc investigations.

---

### STORY-042: User must confirm before the report job is submitted

**User Story**: As a regular user, I want to confirm the report type before it's actually submitted so that I don't trigger an unwanted batch job by mistake.

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:463-493` (SUBMIT-JOB-TO-INTRDR confirm gate)

**Acceptance Criteria**:
- If the Confirm field is blank, the message `"Please confirm to print the <ReportType> report..."` is shown and the job is not submitted [FILE:cbl/CORPT00C.cbl:464-472].
- `Y`/`y` proceeds to submission; `N`/`n` clears the fields and does not submit [FILE:cbl/CORPT00C.cbl:478-484].
- Any other value shows `'"<value>" is not a valid value to confirm...'` [FILE:cbl/CORPT00C.cbl:485-492].

**User Journey Context**:
- Entry Point: Transaction Report screen, after a report type and (if custom) dates are chosen.
- User Actions: Types `Y`, presses Enter.
- Expected Outcomes: The job is submitted only after explicit confirmation.

**Business Value**: Avoids kicking off unnecessary batch report jobs from accidental key presses.

---

### STORY-043: User's confirmed report request is submitted as a background job

**User Story**: As a regular user, I want my confirmed report request to be handed off to a background job so that I don't have to wait online for the report to run.

**Story Type**: Operational

**Source Location**: `cbl/CORPT00C.cbl:494-536` (job-line loop and WIRTE-JOBSUB-TDQ)

**Acceptance Criteria**:
- On confirmation, the program writes the JCL job lines to the CICS transient data queue `JOBS`, one `WRITEQ TD` per line, stopping at the `/*EOF` marker or a blank line [FILE:cbl/CORPT00C.cbl:494-510, 517-524].
- On success, the message is `"<ReportType> report submitted for printing ..."` [FILE:cbl/CORPT00C.cbl:308-313].
- If any `WRITEQ TD` fails, the message is `"Unable to Write TDQ (JOBS)..."` and submission stops [FILE:cbl/CORPT00C.cbl:530-534].
- The `JOBS` queue is later read by a background processor that runs the `TRANREPT` JCL procedure to actually produce the report [FILE:proc/TRANREPT.prc:1-82], per the wiki's workflow section 5.4.

**User Journey Context**:
- Entry Point: Transaction Report screen, at confirmed submission.
- User Actions: Confirms with `Y`.
- Expected Outcomes: A job request is queued; the report itself is produced asynchronously.

**Business Value**: Decouples potentially long-running report generation from the interactive terminal session, so the user isn't blocked waiting for a batch job to finish.

---

## 13. User List (COUSR00C — transaction `CU00`, Admin only)

### STORY-044: Admin browses the list of application users

**User Story**: As an administrator, I want to page through the list of application users so that I can find a specific user to update or delete.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR00C.cbl:128-131` (PF7/PF8 routing)

**Acceptance Criteria**:
- PF8 pages forward and PF7 pages backward through the `USRSEC` file, browsing by User ID order [FILE:cbl/COUSR00C.cbl:128-131, 235-282].
- Each page shows up to 10 user rows with a select field per row [FILE:cbl/COUSR00C.cbl:75, 152-184].

**User Journey Context**:
- Entry Point: Admin Menu option 1.
- User Actions: Pages through the user list with PF7/PF8.
- Expected Outcomes: A scrollable list of application users.

**Business Value**: Gives administrators visibility into every account that can log into CardDemo.

---

### STORY-045: Admin selects a user from the list to update or delete

**User Story**: As an administrator, I want to mark a user row with "U" or "D" so that I jump straight to updating or deleting that user without retyping their ID.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR00C.cbl:152-215` (row-selection EVALUATE)

**Acceptance Criteria**:
- Marking a row `U` and pressing Enter navigates to User Update (`COUSR02C`) pre-loaded with that user's ID [FILE:cbl/COUSR00C.cbl:152-184, 188].
- Marking a row `D` navigates instead to User Delete (`COUSR03C`) [FILE:cbl/COUSR00C.cbl:188].
- Any other non-blank selection value shows `"Invalid selection. Valid values are U and D"` [FILE:cbl/COUSR00C.cbl:211-212].

**User Journey Context**:
- Entry Point: User List screen.
- User Actions: Types `U` or `D` next to a user, presses Enter.
- Expected Outcomes: Navigates to the corresponding user-management screen with that user's ID already filled in.

**Business Value**: Speeds up common admin workflows (correcting a user's role, removing a departed employee's access) directly from the list.

---

## 14. User Add (COUSR01C — transaction `CU01`, Admin only)

### STORY-046: Admin adds a new application user

**User Story**: As an administrator, I want to create a new application user with an ID, name, password, and user type so that a new staff member can sign on to CardDemo.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR01C.cbl:234-270` (WRITE-USER-SEC-FILE)

**Acceptance Criteria**:
- On successful write, the message is `"User <id> has been added ..."` [FILE:cbl/COUSR01C.cbl:250-255].
- If a user with that ID already exists (`DUPKEY`/`DUPREC` response), the message is `"User ID already exist..."` and no record is written [FILE:cbl/COUSR01C.cbl:260-265].
- Any other file error shows `"Unable to Add User..."` [FILE:cbl/COUSR01C.cbl:266-270].

**User Journey Context**:
- Entry Point: Admin Menu option 2.
- User Actions: Fills in User ID, first/last name, password, and user type (A/U), presses Enter.
- Expected Outcomes: A new `USRSEC` record is created, or a clear duplicate/error message is shown.

**Business Value**: Lets administrators self-service onboarding of new staff accounts without a separate provisioning tool.

---

## 15. User Update (COUSR02C — transaction `CU02`, Admin only)

### STORY-047: Admin looks up an existing user to update

**User Story**: As an administrator, I want to look up a user by ID so that I can see and change their name, password, or user type.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR02C.cbl:335-345`

**Acceptance Criteria**:
- Looking up a User ID that does not exist in `USRSEC` shows `"User ID NOT found..."` [FILE:cbl/COUSR02C.cbl:340-345].
- A found user's current first name, last name, and user type are displayed for edit.

**User Journey Context**:
- Entry Point: Admin Menu option 3, or "U" selection from the User List.
- User Actions: Enters or arrives with a User ID, presses Enter.
- Expected Outcomes: The user's editable profile is displayed.

**Business Value**: Lets administrators correct staff details or change a user's role (regular ↔ admin) as responsibilities change.

---

### STORY-048: Admin saves changes to a user's profile

**User Story**: As an administrator, I want to save my changes to a user's name, password, or user type so that the update takes effect immediately.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR02C.cbl:370-385`

**Acceptance Criteria**:
- If the user record disappears between lookup and save (`NOTFND` on the update attempt), the message is `"User ID NOT found..."` and nothing is written [FILE:cbl/COUSR02C.cbl:377-382].
- A successful rewrite commits the new name/password/user type to `USRSEC`.

**User Journey Context**:
- Entry Point: User Update screen, after editing fields.
- User Actions: Presses Enter to save.
- Expected Outcomes: The user's `USRSEC` record reflects the new values.

**Business Value**: Keeps user credentials and roles current without needing direct file access.

---

## 16. User Delete (COUSR03C — transaction `CU03`, Admin only)

### STORY-049: Admin looks up a user before deleting them

**User Story**: As an administrator, I want to look up a user by ID and see their name/type before deleting them so that I confirm I'm removing the right person.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR03C.cbl:142-172` (PROCESS-ENTER-KEY)

**Acceptance Criteria**:
- Leaving the User ID blank shows `"User ID can NOT be empty..."` [FILE:cbl/COUSR03C.cbl:145-149].
- A found user's first name, last name, and user type are displayed, with the prompt `"Press PF5 key to delete this user ..."` [FILE:cbl/COUSR03C.cbl:282-286].
- A User ID that does not exist shows `"User ID NOT found..."` [FILE:cbl/COUSR03C.cbl:287-291].

**User Journey Context**:
- Entry Point: Admin Menu option 4, or "D" selection from the User List.
- User Actions: Enters or arrives with a User ID, presses Enter.
- Expected Outcomes: The target user's details are shown, with an explicit instruction on how to actually delete them.

**Business Value**: Prevents blind deletes — the admin sees exactly who they're about to remove before doing so.

---

### STORY-050: Admin confirms and deletes a user with PF5

**User Story**: As an administrator, I want a separate confirmation key press to actually delete a user so that I can't remove an account by pressing Enter alone.

**Story Type**: Administrative

**Source Location**: `cbl/COUSR03C.cbl:109-122` (EIBAID routing to DELETE-USER-INFO), `cbl/COUSR03C.cbl:174-197, 305-330` (DELETE-USER-INFO / DELETE-USER-SEC-FILE)

**Acceptance Criteria**:
- Only pressing PF5 (not Enter) invokes `DELETE-USER-INFO`, which re-reads the user and issues `EXEC CICS DELETE` against `USRSEC` [FILE:cbl/COUSR03C.cbl:120-122, 174-197, 305-311].
- On success, the message is `"User <id> has been deleted ..."` [FILE:cbl/COUSR03C.cbl:315-322].
- If the user was already removed since the lookup, the delete responds with `"User ID NOT found..."` [FILE:cbl/COUSR03C.cbl:323-328].

**User Journey Context**:
- Entry Point: User Delete screen, after the target user is displayed.
- User Actions: Presses PF5.
- Expected Outcomes: The user's `USRSEC` record is removed, or a not-found message if it was already gone.

**Business Value**: A deliberate, separate confirmation key protects against accidental removal of a staff member's system access.

---

## Coverage Summary

| Area | Program(s) | Stories |
|------|-----------|---------|
| Sign-On | COSGN00C | STORY-001…STORY-006 |
| Main Menu / Admin Menu | COMEN01C, COADM01C | STORY-007…STORY-011 |
| Account View | COACTVWC | STORY-012…STORY-014 |
| Account Update | COACTUPC | STORY-015…STORY-019 |
| Card List | COCRDLIC | STORY-020…STORY-022 |
| Card View | COCRDSLC | STORY-023 |
| Card Update | COCRDUPC | STORY-024…STORY-026 |
| Transaction List | COTRN00C | STORY-027…STORY-029 |
| Transaction View | COTRN01C | STORY-030 |
| Transaction Add | COTRN02C | STORY-031…STORY-034 |
| Bill Payment | COBIL00C | STORY-035…STORY-038 |
| Transaction Report Request | CORPT00C | STORY-039…STORY-043 |
| User List | COUSR00C | STORY-044…STORY-045 |
| User Add | COUSR01C | STORY-046 |
| User Update | COUSR02C | STORY-047…STORY-048 |
| User Delete | COUSR03C | STORY-049…STORY-050 |

**Total: 50 user stories** across 16 screens/programs, covering both personas (Admin, Regular user), positive paths, and the required error/edge cases (invalid credentials, blank fields, optimistic-concurrency conflicts, confirm gates, pagination, and duplicate-key/not-found conditions).

---

## Delivery Note

This repository (`ashish-019-hash/aws-card-demo-VF`) is checked out locally with the Vorflux platform's git credential helper providing push access, and the task instructions for this extraction explicitly said **do not commit**. Per the skill's delivery guidance ("if no such write access is available, save the deliverable to the output location the user expects"), this file has been written directly to `01.phase-1-output/user-stories.md` on the current branch (`vorflux/carddemo-spring-react-migration`) and left uncommitted, alongside the sibling `01.phase-1-output/codebase-wiki.md`. No branch was created and no PR was opened, per the explicit "do not commit" instruction for this task.
