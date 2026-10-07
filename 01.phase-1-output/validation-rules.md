# CardDemo — Validation Rules Catalog

**Repository**: `ashish-019-hash/aws-card-demo-VF` (branch `vorflux/migrate-carddemo-spring-react`)
**Source scanned**: all 18 COBOL programs in `00.phase-1-input/cbl/`, all BMS maps in `00.phase-1-input/bms/`, and all copybooks in `00.phase-1-input/cpy/` (including the procedure-division date-edit copybook `CSUTLDPY.cpy` and the lookup-table copybook `CSLKPCDY.cpy`).

## Scope and Classification

This catalog contains **business-level validation rules only** — checks that protect data
integrity and input validity before data is accepted or persisted.

**Excluded by design** (per the extraction skill):

- *Calculation logic* — e.g. bill-payment balance computation (`COMPUTE ACCT-CURR-BAL = ACCT-CURR-BAL - TRAN-AMT`, COBIL00C.cbl:235), transaction-ID generation (`ADD 1 TO WS-TRAN-ID-N`, COTRN02C.cbl:449), report date-window derivation (CORPT00C.cbl:215-253). These belong to the business-rules catalog.
- *Technical / system-error validation* — CICS `RESP` checks for I/O failures ("Unable to lookup User...", file open/read/write/lock errors), abend handling, and `SEND`/`RECEIVE` plumbing.
- *Display-only constraints* — BMS field lengths, colors, cursor positioning, attribute protection (e.g. COACTUPC 3300-SETUP-SCREEN-ATTRS). BMS maps were reviewed only to confirm which input fields feed each validation.
- *PF-key/AID checks* ("Invalid key pressed") — screen navigation control, not data validation.

Line numbers refer to the files as checked out on this branch.

## Shared Validation Infrastructure

These reusable routines and lookup tables are referenced by many rules below:

| Component | Source | Purpose |
|---|---|---|
| Generic edit paragraphs `1215-EDIT-MANDATORY`, `1220-EDIT-YESNO`, `1225-EDIT-ALPHA-REQD`, `1230-EDIT-ALPHANUM-REQD`, `1235-EDIT-ALPHA-OPT`, `1240-EDIT-ALPHANUM-OPT`, `1245-EDIT-NUM-REQD`, `1250-EDIT-SIGNED-9V2` | `00.phase-1-input/cbl/COACTUPC.cbl` lines 1824-2223 | Required/optional, alpha-only, alphanumeric, numeric-non-zero, and signed-decimal field edits, parameterized by `WS-EDIT-VARIABLE-NAME` and `WS-EDIT-ALPHANUM-LENGTH` |
| Date edit paragraphs `EDIT-DATE-CCYYMMDD`, `EDIT-YEAR-CCYY`, `EDIT-MONTH`, `EDIT-DAY`, `EDIT-DAY-MONTH-YEAR`, `EDIT-DATE-LE`, `EDIT-DATE-OF-BIRTH` | `00.phase-1-input/cpy/CSUTLDPY.cpy` lines 18-372 (88-levels in `cpy/CSUTLDWY.cpy` lines 9-57) | Full CCYYMMDD date validation reused for every date field in Account Update |
| Date utility subprogram `CSUTLDTC` | `00.phase-1-input/cbl/CSUTLDTC.cbl` (wraps LE `CEEDAYS`) | Called by CSUTLDPY (`EDIT-DATE-LE`, cpy line 293), COTRN02C (lines 393, 413) and CORPT00C (lines 392, 412) to confirm a date actually exists on the calendar |
| Lookup tables `VALID-PHONE-AREA-CODE` (line 30), `VALID-GENERAL-PURP-CODE` (line 521), `VALID-US-STATE-CODE` (line 1013), `VALID-US-STATE-ZIP-CD2-COMBO` (line 1073) | `00.phase-1-input/cpy/CSLKPCDY.cpy` | North-America area codes, US state codes, and valid state + first-2-zip-digit combinations |
| User security record `SEC-USER-DATA` | `00.phase-1-input/cpy/CSUSR01Y.cpy` lines 18-23 | Field layout backing the sign-on and user-admin validations |

---

## 1. Authentication — Sign-On (COSGN00C, screen COSGN00)

### RULE-VAL-001

**Rule Description**: User ID must be entered to sign on.

**COBOL Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 118-122

**Field(s) Involved**: `USERIDI OF COSGN0AI` (User ID, 8 chars)

**Validation Condition**: User ID must not be spaces or low-values. Error: "Please enter User ID ...".

**Trigger Conditions**: ENTER pressed on the sign-on screen (`EVALUATE TRUE WHEN USERIDI OF COSGN0AI = SPACES OR LOW-VALUES`).

### RULE-VAL-002

**Rule Description**: Password must be entered to sign on.

**COBOL Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 123-127

**Field(s) Involved**: `PASSWDI OF COSGN0AI` (Password, 8 chars)

**Validation Condition**: Password must not be spaces or low-values. Error: "Please enter Password ...".

**Trigger Conditions**: ENTER pressed and User ID already supplied (`WHEN PASSWDI OF COSGN0AI = SPACES OR LOW-VALUES`).

### RULE-VAL-003

**Rule Description**: The entered User ID must exist in the user security file.

**COBOL Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl`, paragraph `READ-USER-SEC-FILE`, lines 247-251

**Field(s) Involved**: `WS-USER-ID` (upper-cased User ID) against `USRSEC` file key `SEC-USR-ID`

**Validation Condition**: A record keyed by the User ID must exist in `USRSEC`. Error on response code 13 (not found): "User not found. Try again ...".

**Trigger Conditions**: Only after RULE-VAL-001 and RULE-VAL-002 pass (`IF NOT ERR-FLG-ON PERFORM READ-USER-SEC-FILE`, lines 138-140).

### RULE-VAL-004

**Rule Description**: The entered password must match the password stored for the user.

**COBOL Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl`, paragraph `READ-USER-SEC-FILE`, lines 223 and 241-246

**Field(s) Involved**: `WS-USER-PWD` (upper-cased input) vs `SEC-USR-PWD` (stored, `cpy/CSUSR01Y.cpy` line 21)

**Validation Condition**: `SEC-USR-PWD = WS-USER-PWD`; otherwise error "Wrong Password. Try again ...".

**Trigger Conditions**: Only after the user record is found (RULE-VAL-003, `WHEN 0` branch of the read).

---

## 2. Menu Option Entry (COMEN01C / COADM01C)

### RULE-VAL-005

**Rule Description**: A main-menu option must be a number between 1 and the number of menu options.

**COBOL Source Location**: `00.phase-1-input/cbl/COMEN01C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 127-134

**Field(s) Involved**: `OPTIONI OF COMEN1AI` (menu option), `WS-OPTION`

**Validation Condition**: Option (after right-trim and zero-fill) must be numeric, non-zero, and not greater than `CDEMO-MENU-OPT-COUNT`. Error: "Please enter a valid option number...".

**Trigger Conditions**: ENTER pressed on the main menu (`IF WS-OPTION IS NOT NUMERIC OR WS-OPTION > CDEMO-MENU-OPT-COUNT OR WS-OPTION = ZEROS`).

### RULE-VAL-006

**Rule Description**: A regular (non-admin) user may not select an admin-only menu option.

**COBOL Source Location**: `00.phase-1-input/cbl/COMEN01C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 136-143

**Field(s) Involved**: `CDEMO-USER-TYPE` (88-level `CDEMO-USRTYP-USER`), `CDEMO-MENU-OPT-USRTYPE(WS-OPTION)` (from `cpy/COMEN02Y.cpy`)

**Validation Condition**: If the signed-on user is type 'U' (regular) and the selected option is flagged user-type 'A' (admin), reject with "No access - Admin Only option... ".

**Trigger Conditions**: Only after RULE-VAL-005 passes (`IF CDEMO-USRTYP-USER AND CDEMO-MENU-OPT-USRTYPE(WS-OPTION) = 'A'`).

### RULE-VAL-007

**Rule Description**: An admin-menu option must be a number between 1 and the number of admin options.

**COBOL Source Location**: `00.phase-1-input/cbl/COADM01C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 127-134

**Field(s) Involved**: `OPTIONI OF COADM1AI`, `WS-OPTION`

**Validation Condition**: Option must be numeric, non-zero, and not greater than `CDEMO-ADMIN-OPT-COUNT`. Error: "Please enter a valid option number...".

**Trigger Conditions**: ENTER pressed on the admin menu.

---

## 3. Account View (COACTVWC, screen COACTVW)

### RULE-VAL-008

**Rule Description**: An account number must be supplied to view an account.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTVWC.cbl`, paragraph `2210-EDIT-ACCOUNT`, lines 653-662

**Field(s) Involved**: `CC-ACCT-ID` (Account ID search key, 11 chars, from `ACCTSIDI OF CACTVWAI`)

**Validation Condition**: Account ID must not be low-values or spaces; a blank filter sets `FLG-ACCTFILTER-BLANK` and prompts the user for an account.

**Trigger Conditions**: ENTER pressed on the account-view screen (`2200-EDIT-MAP-INPUTS` → `2210-EDIT-ACCOUNT`, lines 622-644).

### RULE-VAL-009

**Rule Description**: The account number must be an 11-digit, non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTVWC.cbl`, paragraph `2210-EDIT-ACCOUNT`, lines 666-676 (message constant lines 125-128)

**Field(s) Involved**: `CC-ACCT-ID` / `CC-ACCT-ID-N`

**Validation Condition**: `CC-ACCT-ID` must be numeric and not all zeroes. Error: "Account number must be a non zero 11 digit number".

**Trigger Conditions**: Account ID supplied (RULE-VAL-008 passed).

### RULE-VAL-010

**Rule Description**: The requested account must exist — in the card cross-reference file, the account master, and the customer master.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTVWC.cbl`, paragraphs `9200-GETCARDXREF-BYACCT` (line 723, not-found message line 750), `9300-GETACCTDATA-BYACCT` (line 774, message line 799), `9400-GETCUSTDATA-BYCUST` (line 825, message line 849)

**Field(s) Involved**: `CC-ACCT-ID` vs `CARDXREF` key; `XREF-CUST-ID` vs `CUSTDAT` key; account vs `ACCTDAT` key

**Validation Condition**: CICS READ must return NORMAL on each file; DFHRESP(NOTFND) raises `INPUT-ERROR` with "Account ... not found in Cross ref file", "Account ... not found in Acct Master file", or "Customer ... not found in Customer Master file" (88-levels `DID-NOT-FIND-*`, lines 129-134).

**Trigger Conditions**: Only after the account filter is valid (RULE-VAL-008/009), during `9000-READ-ACCT`.

---

## 4. Account Update (COACTUPC, screen COACTUP)

Account Update has two phases. Phase 1 (details not yet fetched) validates only the
search key (RULE-VAL-011/012). Phase 2 (details on screen) runs the full field-edit
suite in `1200-EDIT-MAP-INPUTS` (COACTUPC.cbl lines 1429-1676) — but **only when a change
has been detected** between old and new values (`1205-COMPARE-OLD-NEW`, lines 1681-1775;
skip condition lines 1463-1468).

### RULE-VAL-011

**Rule Description**: An account number must be supplied before account details can be fetched for update.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1210-EDIT-ACCOUNT`, lines 1787-1797

**Field(s) Involved**: `CC-ACCT-ID` (Account ID search key)

**Validation Condition**: Must not be low-values or spaces; a blank sets `FLG-ACCTFILTER-BLANK` and prompts for an account.

**Trigger Conditions**: `ACUP-DETAILS-NOT-FETCHED` state (search phase), lines 1433-1446.

### RULE-VAL-012

**Rule Description**: The account number search key must be an 11-digit, non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1210-EDIT-ACCOUNT`, lines 1802-1817

**Field(s) Involved**: `CC-ACCT-ID` / `CC-ACCT-ID-N`

**Validation Condition**: Numeric and non-zero. Error: "Account Number if supplied must be a 11 digit Non-Zero Number".

**Trigger Conditions**: Account ID supplied (RULE-VAL-011 passed).

### RULE-VAL-013

**Rule Description**: The account on the update screen must exist in the card cross-reference, account master, and customer master files.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraphs `9200-GETCARDXREF-BYACCT` (lines 3650-3698, message line 3677), `9300-GETACCTDATA-BYACCT` (lines 3701-3748, message line 3726), `9400-GETCUSTDATA-BYCUST` (lines 3752-3797, message line 3776)

**Field(s) Involved**: Account ID vs `CARDXREF`, `ACCTDAT`, `CUSTDAT` keys

**Validation Condition**: Each keyed read must find a record; DFHRESP(NOTFND) sets `INPUT-ERROR` and the corresponding "... not found ..." message.

**Trigger Conditions**: Search key valid (RULE-VAL-011/012), during `9000-READ-ACCT` (lines 3608-3647).

### RULE-VAL-014

**Rule Description**: Account Active Status must be entered and must be Y or N.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1220-EDIT-YESNO`, lines 1856-1893 (applied to status at lines 1472-1476; 88-level `FLG-YES-NO-ISVALID VALUES 'Y','N'` at line 78)

**Field(s) Involved**: `ACUP-NEW-ACTIVE-STATUS` (Account Status)

**Validation Condition**: Not blank/low-values/zeros ("Account Status must be supplied.") and value in {Y, N} ("Account Status must be Y or N.").

**Trigger Conditions**: Update phase, change detected (`CHANGE-HAS-OCCURRED`).

### RULE-VAL-015

**Rule Description**: Every date entered on the account update screen (Open Date, Expiry Date, Reissue Date, Date of Birth) must be a complete, real calendar date in CCYYMMDD form.

**COBOL Source Location**: `00.phase-1-input/cpy/CSUTLDPY.cpy`, paragraphs `EDIT-DATE-CCYYMMDD` through `EDIT-DATE-LE` (lines 18-331); invoked from `00.phase-1-input/cbl/COACTUPC.cbl` lines 1478-1482 (Open Date), 1490-1494 (Expiry Date), 1503-1507 (Reissue Date), 1533-1538 (Date of Birth)

**Field(s) Involved**: `ACUP-NEW-OPEN-DATE`, `ACUP-NEW-EXPIRAION-DATE`, `ACUP-NEW-REISSUE-DATE`, `ACUP-NEW-CUST-DOB-YYYY-MM-DD` via `WS-EDIT-DATE-CCYYMMDD`

**Validation Condition**: Year supplied and numeric (cpy lines 30-61); century must be 19 or 20 (lines 70-84, 88-levels `THIS-CENTURY`/`LAST-CENTURY` in `cpy/CSUTLDWY.cpy` lines 9-10); month supplied and between 1 and 12 (lines 94-141); day supplied and between 1 and 31 (lines 154-200); day/month combination valid — no day 31 in a 30-day month (lines 213-226), no Feb 30 (lines 228-241), Feb 29 only in leap years (lines 243-272); and the final date must pass the LE `CEEDAYS` check via `CSUTLDTC` (lines 284-320).

**Trigger Conditions**: Update phase, change detected; each date field is edited independently with its own error-flag group.

### RULE-VAL-016

**Rule Description**: Date of Birth cannot be in the future.

**COBOL Source Location**: `00.phase-1-input/cpy/CSUTLDPY.cpy`, paragraph `EDIT-DATE-OF-BIRTH`, lines 341-372; invoked from `00.phase-1-input/cbl/COACTUPC.cbl` lines 1539-1543

**Field(s) Involved**: `ACUP-NEW-CUST-DOB-YYYY-MM-DD`

**Validation Condition**: Current date (as day integer) must be greater than the entered birth date; otherwise "Date of Birth: cannot be in the future".

**Trigger Conditions**: Conditional — runs only if the DOB already passed the full date edit (`IF WS-EDIT-DT-OF-BIRTH-ISVALID`, COACTUPC.cbl line 1539).

### RULE-VAL-017

**Rule Description**: All money fields on the account update screen (Credit Limit, Cash Credit Limit, Current Balance, Current Cycle Credit, Current Cycle Debit) must be supplied and must be valid signed decimal amounts.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1250-EDIT-SIGNED-9V2`, lines 2180-2219; applied at lines 1484-1488 (Credit Limit), 1496-1501 (Cash Credit Limit), 1509-1513 (Current Balance), 1515-1520 (Current Cycle Credit), 1522-1527 (Current Cycle Debit)

**Field(s) Involved**: `ACUP-NEW-CREDIT-LIMIT-X`, `ACUP-NEW-CASH-CREDIT-LIMIT-X`, `ACUP-NEW-CURR-BAL-X`, `ACUP-NEW-CURR-CYC-CREDIT-X`, `ACUP-NEW-CURR-CYC-DEBIT-X`

**Validation Condition**: Field must not be blank/low-values ("<field> must be supplied.") and `FUNCTION TEST-NUMVAL-C` must return 0, i.e. a valid signed number with up to 2 decimals ("<field> is not valid").

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-018

**Rule Description**: SSN first segment must be a 3-digit non-zero number and must not be 000, 666, or in the 900–999 range.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1265-EDIT-US-SSN`, lines 2439-2464 (88-level `INVALID-SSN-PART1 VALUES 0, 666, 900 THRU 999` at lines 121-123)

**Field(s) Involved**: `ACUP-NEW-CUST-SSN-1` (SSN chars 1-3)

**Validation Condition**: Required, all numeric, non-zero (via `1245-EDIT-NUM-REQD`); and not an invalid area number ("SSN: First 3 chars: should not be 000, 666, or between 900 and 999").

**Trigger Conditions**: Update phase, change detected; the 000/666/900-999 check runs only if the numeric edit passed (`IF FLG-EDIT-US-SSN-PART1-ISVALID`, line 2448).

### RULE-VAL-019

**Rule Description**: SSN middle segment must be a 2-digit non-zero number (01–99).

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1265-EDIT-US-SSN`, lines 2469-2475 (via `1245-EDIT-NUM-REQD`, lines 2109-2175)

**Field(s) Involved**: `ACUP-NEW-CUST-SSN-2` (SSN chars 4-5)

**Validation Condition**: Required, all numeric, and not zero.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-020

**Rule Description**: SSN last segment must be a 4-digit non-zero number (0001–9999).

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1265-EDIT-US-SSN`, lines 2481-2487 (via `1245-EDIT-NUM-REQD`)

**Field(s) Involved**: `ACUP-NEW-CUST-SSN-3` (SSN chars 6-9)

**Validation Condition**: Required, all numeric, and not zero.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-021

**Rule Description**: FICO credit score must be a 3-digit number between 300 and 850.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1545-1556 (numeric edit) and paragraph `1275-EDIT-FICO-SCORE`, lines 2514-2530 (88-level `FICO-RANGE-IS-VALID VALUES 300 THROUGH 850` at lines 848-849)

**Field(s) Involved**: `ACUP-NEW-CUST-FICO-SCORE-X` / `ACUP-NEW-CUST-FICO-SCORE`

**Validation Condition**: Required, all numeric, non-zero (via `1245-EDIT-NUM-REQD`); then value must be in 300–850 ("FICO Score: should be between 300 and 850").

**Trigger Conditions**: Range check is conditional on the numeric edit passing (`IF FLG-FICO-SCORE-ISVALID`, line 1553).

### RULE-VAL-022

**Rule Description**: Customer First Name and Last Name are required and may contain alphabetic characters and spaces only.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1225-EDIT-ALPHA-REQD`, lines 1898-1950; applied at lines 1560-1566 (First Name, length 25) and 1576-1582 (Last Name, length 25)

**Field(s) Involved**: `ACUP-NEW-CUST-FIRST-NAME`, `ACUP-NEW-CUST-LAST-NAME`

**Validation Condition**: Not blank ("<name> must be supplied.") and, after converting all alphabetic characters and spaces away, nothing remains ("<name> can have alphabets only.").

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-023

**Rule Description**: Customer Middle Name is optional, but if entered it may contain alphabetic characters and spaces only.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1235-EDIT-ALPHA-OPT`, lines 2012-2056; applied at lines 1568-1574

**Field(s) Involved**: `ACUP-NEW-CUST-MIDDLE-NAME`

**Validation Condition**: Blank is accepted as valid; a non-blank value must contain only alphabets/spaces ("Middle Name can have alphabets only.").

**Trigger Conditions**: Update phase, change detected; alphabetic check applies only when the field is non-blank.

### RULE-VAL-024

**Rule Description**: Address Line 1 is required.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1215-EDIT-MANDATORY`, lines 1824-1851; applied at lines 1584-1590

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-LINE-1`

**Validation Condition**: Must not be low-values, spaces, or zero-length after trim ("Address Line 1 must be supplied."). (Address Line 2 is explicitly optional — comment at line 1613.)

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-025

**Rule Description**: City is required and alphabetic.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1615-1621 (via `1225-EDIT-ALPHA-REQD`)

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-LINE-3` (labelled "City", length 50)

**Validation Condition**: Not blank; alphabets and spaces only.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-026

**Rule Description**: State is required, alphabetic (2 chars), and must be a valid US state/territory code.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1592-1602 (required/alpha via `1225-EDIT-ALPHA-REQD`) and paragraph `1270-EDIT-US-STATE-CD`, lines 2493-2510; lookup table `VALID-US-STATE-CODE` in `00.phase-1-input/cpy/CSLKPCDY.cpy` line 1013

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-STATE-CD`

**Validation Condition**: Not blank; alphabetic; and value present in the US state-code list ("State: is not a valid state code").

**Trigger Conditions**: State-code lookup is conditional on the alpha edit passing (`IF FLG-ALPHA-ISVALID`, line 1599).

### RULE-VAL-027

**Rule Description**: Zip code is required and must be a 5-digit non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1605-1611 (via `1245-EDIT-NUM-REQD`, lines 2109-2175)

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-ZIP`

**Validation Condition**: Not blank ("Zip must be supplied."), all numeric ("Zip must be all numeric."), not zero ("Zip must not be zero.").

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-028

**Rule Description**: Country code is required and alphabetic (3 chars).

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1623-1630 (via `1225-EDIT-ALPHA-REQD`)

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-COUNTRY-CD`

**Validation Condition**: Not blank; alphabets and spaces only.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-029

**Rule Description**: State + Zip cross-field check: the first two digits of the zip code must be valid for the entered state.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1280-EDIT-US-STATE-ZIP-CD`, lines 2536-2557; lookup `VALID-US-STATE-ZIP-CD2-COMBO` in `00.phase-1-input/cpy/CSLKPCDY.cpy` line 1073

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-STATE-CD` + `ACUP-NEW-CUST-ADDR-ZIP(1:2)`

**Validation Condition**: Concatenated state + first-2-zip value must appear in the USPS-derived combo table; else "Invalid zip code for state" (both state and zip flagged).

**Trigger Conditions**: Conditional cross-field edit — runs only when both the state and zip individual edits passed (`IF FLG-STATE-ISVALID AND FLG-ZIPCODE-ISVALID`, lines 1665-1669).

### RULE-VAL-030

**Rule Description**: Phone numbers are optional as a whole, but if any part of a phone number is entered, the full number must be a valid US phone number: 3-digit non-zero area code that is a valid North America general-purpose area code, 3-digit non-zero prefix, and 4-digit non-zero line number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraphs `1260-EDIT-US-PHONE-NUM` (lines 2225-2244, all-blank short-circuit lines 2234-2241), `EDIT-AREA-CODE` (lines 2246-2314), `EDIT-US-PHONE-PREFIX` (lines 2316-2367), `EDIT-US-PHONE-LINENUM` (lines 2370-2421); area-code lookup `VALID-GENERAL-PURP-CODE` in `00.phase-1-input/cpy/CSLKPCDY.cpy` line 521; applied to Phone 1 at lines 1632-1638 and Phone 2 at lines 1640-1646

**Field(s) Involved**: `ACUP-NEW-CUST-PHONE-NUM-1` and `ACUP-NEW-CUST-PHONE-NUM-2` (parts A=area, B=prefix, C=line) in `(999)999-9999` layout

**Validation Condition**: If all three parts are blank, the phone is accepted as valid (not mandatory). Otherwise: area code supplied, numeric, non-zero, and in the NANP general-purpose list ("Not valid North America general purpose area code"); prefix supplied, numeric ("Prefix code must be A 3 digit number."), non-zero; line number supplied, numeric ("Line number code must be A 4 digit number."), non-zero.

**Trigger Conditions**: Update phase, change detected; part-level edits run only when the phone is not entirely blank.

### RULE-VAL-031

**Rule Description**: EFT Account ID is required and must be a 10-digit non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1648-1655 (via `1245-EDIT-NUM-REQD`)

**Field(s) Involved**: `ACUP-NEW-CUST-EFT-ACCOUNT-ID`

**Validation Condition**: Not blank, all numeric, not zero.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-032

**Rule Description**: Primary Card Holder indicator must be entered and must be Y or N.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, lines 1657-1662 (via `1220-EDIT-YESNO`, lines 1856-1893)

**Field(s) Involved**: `ACUP-NEW-CUST-PRI-HOLDER-IND`

**Validation Condition**: Not blank/zeros ("Primary Card Holder must be supplied.") and in {Y, N} ("Primary Card Holder must be Y or N.").

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-033

**Rule Description**: An account update is accepted only when at least one field actually changed from the fetched values.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `1205-COMPARE-OLD-NEW`, lines 1681-1775; skip logic lines 1463-1468

**Field(s) Involved**: All `ACUP-NEW-*` vs `ACUP-OLD-*` account and customer fields

**Validation Condition**: If every new value equals the corresponding old value (case-insensitive, trimmed for text fields), `NO-CHANGES-DETECTED` is set and the field edits/confirmation flow is bypassed — nothing is written.

**Trigger Conditions**: Update phase, each time the screen is received after details were fetched.

### RULE-VAL-034

**Rule Description**: An account/customer update is rejected if another user changed the records between fetch and save (optimistic-concurrency data-integrity check).

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl`, paragraph `9600-WRITE-PROCESSING` comparison logic at lines 4143 and 4189 (`SET DATA-WAS-CHANGED-BEFORE-UPDATE TO TRUE`), handling at lines 3950 and 2611; 88-level at line 521

**Field(s) Involved**: Re-read `ACCTDAT`/`CUSTDAT` records vs `ACUP-OLD-*` snapshot

**Validation Condition**: The records re-read under lock must still match the values originally fetched; otherwise the update is abandoned and the user is told the record changed.

**Trigger Conditions**: User pressed F5 to confirm and save (`ACUP-CHANGES-OKAYED-AND-DONE` path).

---

## 5. Card List (COCRDLIC, screen COCRDLI)

### RULE-VAL-035

**Rule Description**: The account filter on the card list is optional, but if entered it must be an 11-digit number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl`, paragraph `2210-EDIT-ACCOUNT`, lines 1003-1030 (blank accepted at lines 1007-1013; numeric check lines 1017-1029)

**Field(s) Involved**: `CC-ACCT-ID` (from `ACCTSIDI OF CCRDLIAI`)

**Validation Condition**: Blank/zero filter is treated as "no filter" (not an error). A non-blank filter must be numeric: "ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER".

**Trigger Conditions**: ENTER pressed on the card list (`2200-EDIT-INPUTS`, lines 985-997).

### RULE-VAL-036

**Rule Description**: The card-number filter on the card list is optional, but if entered it must be a 16-digit number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl`, paragraph `2220-EDIT-CARD`, lines 1036-1067 (blank accepted lines 1042-1048; numeric check lines 1052-1066)

**Field(s) Involved**: `CC-CARD-NUM` (from `CARDSIDI OF CCRDLIAI`)

**Validation Condition**: Blank/zero is accepted. Non-blank must be numeric: "CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER".

**Trigger Conditions**: ENTER pressed on the card list.

### RULE-VAL-037

**Rule Description**: A row-selection code on the card list must be 'S' (view) or 'U' (update).

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl`, paragraph `2250-EDIT-ARRAY`, lines 1099-1115 (88-levels `SELECT-OK VALUES 'S','U'` and `SELECT-BLANK` at lines 77-82; message constant "INVALID ACTION CODE" at line 126)

**Field(s) Involved**: `WS-EDIT-SELECT(1..7)` (from `CRDSEL1I`–`CRDSEL7I OF CCRDLIAI`)

**Validation Condition**: Each non-blank selection character must be 'S' or 'U'; anything else flags the row and shows "INVALID ACTION CODE".

**Trigger Conditions**: Runs only when the filter edits produced no error (`IF INPUT-ERROR GO TO 2250-EDIT-ARRAY-EXIT`, lines 1075-1077).

### RULE-VAL-038

**Rule Description**: Only one card row may be selected at a time.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl`, paragraph `2250-EDIT-ARRAY`, lines 1079-1095

**Field(s) Involved**: `WS-EDIT-SELECT-FLAGS` (all 7 row-selection fields)

**Validation Condition**: Tally of 'S'/'U' characters across the 7 rows must not exceed 1; otherwise `WS-MORE-THAN-1-ACTION` and every selected row is flagged in error.

**Trigger Conditions**: Same as RULE-VAL-037 (no prior filter error).

---

## 6. Card View (COCRDSLC, screen COCRDSL)

### RULE-VAL-039

**Rule Description**: An account number must be supplied to look up a card, and it must be an 11-digit number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDSLC.cbl`, paragraph `2210-EDIT-ACCOUNT`, lines 647-681 (blank check lines 651-663; numeric check lines 665-677; '*' and spaces normalized to low-values at lines 615-621)

**Field(s) Involved**: `CC-ACCT-ID` / `CC-ACCT-ID-N` (from `ACCTSIDI OF CCRDSLAI`)

**Validation Condition**: Blank or zero sets `FLG-ACCTFILTER-BLANK` with a prompt to supply the account; a supplied value must be numeric ("ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER").

**Trigger Conditions**: ENTER pressed on the card detail screen (`2200-EDIT-MAP-INPUTS`, lines 608-642).

### RULE-VAL-040

**Rule Description**: A card number must be supplied to look up a card, and it must be a 16-digit number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDSLC.cbl`, paragraph `2220-EDIT-CARD`, lines 685-720 (blank check lines 691-703; numeric check lines 706-718)

**Field(s) Involved**: `CC-CARD-NUM` / `CC-CARD-NUM-N` (from `CARDSIDI OF CCRDSLAI`)

**Validation Condition**: Blank or zero sets `FLG-CARDFILTER-BLANK` with a prompt; a supplied value must be numeric ("CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER").

**Trigger Conditions**: ENTER pressed on the card detail screen.

### RULE-VAL-041

**Rule Description**: The requested account/card combination must exist in the card file.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDSLC.cbl`, card-read handling at line 760 (`SET DID-NOT-FIND-ACCTCARD-COMBO`) and line 799 (`SET DID-NOT-FIND-ACCT-IN-CARDXREF`); message constants lines 151-155 ("Did not find this account card combination", "Did not find cards for this search condition")

**Field(s) Involved**: Account ID + Card Number vs `CARDDAT`/`CARDAIX` keys

**Validation Condition**: Keyed read must return a record; NOTFND raises `INPUT-ERROR` with a did-not-find message.

**Trigger Conditions**: Both filters valid (RULE-VAL-039/040 passed), during `9000-READ-DATA`.

---

## 7. Card Update (COCRDUPC, screen COCRDUP)

Card Update mirrors Account Update: search-key edits first; detail edits run only
after details are fetched **and** a change is detected (`1200-EDIT-MAP-INPUTS`, lines
641-715; no-change comparison lines 680-693).

### RULE-VAL-042

**Rule Description**: Account number search key is required and must be an 11-digit non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1210-EDIT-ACCOUNT`, lines 721-756 (blank/zero check lines 725-736; numeric check lines 740-755)

**Field(s) Involved**: `CC-ACCT-ID` / `CC-ACCT-ID-N`

**Validation Condition**: Blank, spaces, or all-zero prompts for an account; non-blank must be numeric ("ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER").

**Trigger Conditions**: `CCUP-DETAILS-NOT-FETCHED` (search phase), lines 645-661.

### RULE-VAL-043

**Rule Description**: Card number search key is required and must be a 16-digit non-zero number.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1220-EDIT-CARD`, lines 762-800 (blank/zero check lines 768-780; numeric check lines 784-799)

**Field(s) Involved**: `CC-CARD-NUM` / `CC-CARD-NUM-N`

**Validation Condition**: Blank, spaces, or all-zero prompts for a card number; non-blank must be numeric ("CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER").

**Trigger Conditions**: Search phase (details not fetched).

### RULE-VAL-044

**Rule Description**: The account/card combination being updated must exist in the card file.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, line 1400 (`SET DID-NOT-FIND-ACCTCARD-COMBO TO TRUE`); 88-level and message at lines 201-204

**Field(s) Involved**: Account ID + Card Number vs `CARDDAT` key

**Validation Condition**: Keyed read must find the card; NOTFND raises "Did not find this account card combination".

**Trigger Conditions**: Search keys valid (RULE-VAL-042/043), during `9000-READ-DATA`.

### RULE-VAL-045

**Rule Description**: Embossed name on the card is required and may contain alphabetic characters and spaces only.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1230-EDIT-NAME`, lines 806-840 (blank check lines 811-820; alpha-only INSPECT check lines 823-837)

**Field(s) Involved**: `CCUP-NEW-CRDNAME` (Card Embossed Name)

**Validation Condition**: Not blank/zeros; after converting alphabets and spaces away nothing may remain (`WS-NAME-MUST-BE-ALPHA` message).

**Trigger Conditions**: Update phase, change detected (lines 696-699).

### RULE-VAL-046

**Rule Description**: Card Active Status must be entered and must be Y or N.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1240-EDIT-CARDSTATUS`, lines 845-873 (88-level `FLG-YES-NO-VALID VALUES 'Y','N'` at lines 89-91; message constant "Card Active Status must be Y or N" at line 196)

**Field(s) Involved**: `CCUP-NEW-CRDSTCD` (Card Active Status)

**Validation Condition**: Not blank/zeros and value in {Y, N}.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-047

**Rule Description**: Card expiry month must be entered and must be a number from 1 to 12.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1250-EDIT-EXPIRY-MON`, lines 877-908 (88-level `VALID-MONTH VALUES 1 THRU 12` at line 95; message constant at line 198)

**Field(s) Involved**: `CCUP-NEW-EXPMON` (Card Expiry Month)

**Validation Condition**: Not blank/zeros; numeric value within 1–12 ("Card expiry month must be between 1 and 12").

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-048

**Rule Description**: Card expiry year must be entered and must be between 1950 and 2099.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, paragraph `1260-EDIT-EXPIRY-YEAR`, lines 913-944 (88-level `VALID-YEAR VALUES 1950 THRU 2099` at line 99)

**Field(s) Involved**: `CCUP-NEW-EXPYEAR` (Card Expiry Year)

**Validation Condition**: Not blank/zeros; numeric value within 1950–2099.

**Trigger Conditions**: Update phase, change detected.

### RULE-VAL-049

**Rule Description**: A card update is accepted only when the new data differs from the fetched data, and is rejected if the record was changed by someone else before the save.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl`, no-change comparison lines 680-693 (`SET NO-CHANGES-DETECTED`); concurrency check lines 1455 and 1511 (`SET DATA-WAS-CHANGED-BEFORE-UPDATE`), 88-level with message "Record changed by some one else. Please review" at lines 207-208

**Field(s) Involved**: `CCUP-NEW-CARDDATA` vs `CCUP-OLD-CARDDATA`; re-read `CARD-RECORD` vs fetched snapshot

**Validation Condition**: Case-insensitive compare of new vs old card data must show a difference before edits/confirmation proceed; at save time the re-read record must still equal the originally fetched values.

**Trigger Conditions**: Change detection on each re-entry after fetch; concurrency check on confirmed save (F5).

---

## 8. Transaction List (COTRN00C, screen COTRN00)

### RULE-VAL-050

**Rule Description**: A row selection on the transaction list must be 'S' (view detail).

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 183-203 (error message "Invalid selection. Valid value is S" at lines 197-200)

**Field(s) Involved**: `SEL0001I`–`SEL0010I OF COTRN0AI` → `CDEMO-CT00-TRN-SEL-FLG`

**Validation Condition**: A non-blank selection flag must be 'S' or 's'; any other character produces the invalid-selection message.

**Trigger Conditions**: ENTER pressed with a non-blank selection against a listed transaction (`IF (CDEMO-CT00-TRN-SEL-FLG NOT = SPACES AND LOW-VALUES) AND (CDEMO-CT00-TRN-SELECTED NOT = SPACES AND LOW-VALUES)`).

### RULE-VAL-051

**Rule Description**: The transaction-ID filter is optional, but if entered it must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 206-220

**Field(s) Involved**: `TRNIDINI OF COTRN0AI` (Transaction ID search filter, 16 digits)

**Validation Condition**: Blank means "list from the beginning"; a non-blank value must be numeric ("Tran ID must be Numeric ...").

**Trigger Conditions**: ENTER pressed on the transaction list.

---

## 9. Transaction View (COTRN01C, screen COTRN01)

### RULE-VAL-052

**Rule Description**: A Transaction ID must be entered to view a transaction.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN01C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 146-156

**Field(s) Involved**: `TRNIDINI OF COTRN1AI`

**Validation Condition**: Not spaces or low-values ("Tran ID can NOT be empty...").

**Trigger Conditions**: ENTER pressed on the transaction view screen.

### RULE-VAL-053

**Rule Description**: The requested transaction must exist in the transaction file.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN01C.cbl`, paragraph `READ-TRANSACT-FILE`, lines 280-296 (message "Transaction ID NOT found..." at line 285)

**Field(s) Involved**: `TRAN-ID` vs `TRANSACT` file key

**Validation Condition**: Keyed read must return NORMAL; NOTFND produces "Transaction ID NOT found...".

**Trigger Conditions**: Only after RULE-VAL-052 passes (`IF NOT ERR-FLG-ON`, line 158).

---

## 10. Transaction Add (COTRN02C, screen COTRN02)

### RULE-VAL-054

**Rule Description**: Either an Account ID or a Card Number must be entered to add a transaction.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-KEY-FIELDS`, lines 224-229

**Field(s) Involved**: `ACTIDINI OF COTRN2AI`, `CARDNINI OF COTRN2AI`

**Validation Condition**: At least one of the two keys must be non-blank ("Account or Card Number must be entered...").

**Trigger Conditions**: ENTER (or F5 copy-last) on the transaction add screen (`WHEN OTHER` of the key-field EVALUATE).

### RULE-VAL-055

**Rule Description**: If an Account ID is entered it must be numeric; if a Card Number is entered it must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-KEY-FIELDS`, lines 196-203 (account) and 210-217 (card)

**Field(s) Involved**: `ACTIDINI OF COTRN2AI`, `CARDNINI OF COTRN2AI`

**Validation Condition**: "Account ID must be Numeric..." / "Card Number must be Numeric...".

**Trigger Conditions**: The respective key field is non-blank.

### RULE-VAL-056

**Rule Description**: The entered Account ID (or Card Number) must exist in the card cross-reference.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `READ-CXACAIX-FILE` (message "Account ID NOT found..." at line 593) and paragraph `READ-CCXREF-FILE` (message "Card Number NOT found..." at line 626)

**Field(s) Involved**: `XREF-ACCT-ID` vs `CXACAIX` key; `XREF-CARD-NUM` vs `CCXREF` key

**Validation Condition**: Keyed read must return NORMAL; NOTFND raises the not-found error. On success the counterpart key is auto-filled (lines 208-209, 222-223).

**Trigger Conditions**: After the numeric edit of the supplied key (RULE-VAL-055).

### RULE-VAL-057

**Rule Description**: All transaction data fields are required: Type CD, Category CD, Source, Description, Amount, Orig Date, Proc Date, Merchant ID, Merchant Name, Merchant City, Merchant Zip.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-DATA-FIELDS`, lines 251-320

**Field(s) Involved**: `TTYPCDI`, `TCATCDI`, `TRNSRCI`, `TDESCI`, `TRNAMTI`, `TORIGDTI`, `TPROCDTI`, `MIDI`, `MNAMEI`, `MCITYI`, `MZIPI` (all `OF COTRN2AI`)

**Validation Condition**: Each field must not be spaces or low-values; each has its own "... can NOT be empty..." message, checked in the order listed.

**Trigger Conditions**: After the key fields validate (RULE-VAL-054..056); skipped (fields cleared) if a key-field error already occurred (lines 237-249).

### RULE-VAL-058

**Rule Description**: Transaction Type Code and Category Code must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-DATA-FIELDS`, lines 322-337

**Field(s) Involved**: `TTYPCDI OF COTRN2AI` (2 digits), `TCATCDI OF COTRN2AI` (4 digits)

**Validation Condition**: "Type CD must be Numeric..." / "Category CD must be Numeric...".

**Trigger Conditions**: All required fields present (RULE-VAL-057).

### RULE-VAL-059

**Rule Description**: Transaction Amount must be entered in the exact signed format `-99999999.99` (sign, 8 digits, decimal point, 2 digits).

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-DATA-FIELDS`, lines 339-351

**Field(s) Involved**: `TRNAMTI OF COTRN2AI`

**Validation Condition**: Position 1 must be '-' or '+'; positions 2-9 numeric; position 10 must be '.'; positions 11-12 numeric. Error: "Amount should be in format -99999999.99".

**Trigger Conditions**: All required fields present.

### RULE-VAL-060

**Rule Description**: Orig Date and Proc Date must be in `YYYY-MM-DD` format and must be real calendar dates.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-DATA-FIELDS` — format checks lines 353-366 (Orig) and 368-381 (Proc); calendar checks via `CALL 'CSUTLDTC'` lines 389-407 (Orig, "Orig Date - Not a valid date...") and 409-427 (Proc, "Proc Date - Not a valid date...")

**Field(s) Involved**: `TORIGDTI OF COTRN2AI`, `TPROCDTI OF COTRN2AI`

**Validation Condition**: Positions 1-4 numeric, '-' at 5, 6-7 numeric, '-' at 8, 9-10 numeric ("... should be in format YYYY-MM-DD"); then the LE date service (via `CSUTLDTC`, `cbl/CSUTLDTC.cbl`) must report severity 0000 (message 2513 "insufficient data" tolerated).

**Trigger Conditions**: All required fields present; calendar check follows the format check.

### RULE-VAL-061

**Rule Description**: Merchant ID must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `VALIDATE-INPUT-DATA-FIELDS`, lines 430-436

**Field(s) Involved**: `MIDI OF COTRN2AI` (9 digits)

**Validation Condition**: "Merchant ID must be Numeric...".

**Trigger Conditions**: All required fields present.

### RULE-VAL-062

**Rule Description**: Adding the transaction must be explicitly confirmed with Y; only Y/y and N/n (or blank, which re-prompts) are accepted.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 169-188

**Field(s) Involved**: `CONFIRMI OF COTRN2AI`

**Validation Condition**: 'Y'/'y' proceeds; 'N'/'n'/blank re-prompts "Confirm to add this transaction..."; any other value → "Invalid value. Valid values are (Y/N)...".

**Trigger Conditions**: After all key and data field validations pass.

### RULE-VAL-063

**Rule Description**: A new transaction must have a unique Transaction ID.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl`, paragraph `WRITE-TRANSACT-FILE`, lines 735-741 (message "Tran ID already exist..." at line 738, on DFHRESP DUPKEY/DUPREC)

**Field(s) Involved**: `TRAN-ID` vs `TRANSACT` file primary key

**Validation Condition**: The keyed write must not collide with an existing transaction ID.

**Trigger Conditions**: Confirmed add (RULE-VAL-062 passed with 'Y').

---

## 11. Bill Payment (COBIL00C, screen COBIL00)

### RULE-VAL-064

**Rule Description**: Account ID must be entered to make a bill payment.

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 158-167 (message "Acct ID can NOT be empty..." at line 161)

**Field(s) Involved**: `ACTIDINI OF COBIL0AI`

**Validation Condition**: Not spaces or low-values.

**Trigger Conditions**: ENTER pressed on the bill-payment screen.

### RULE-VAL-065

**Rule Description**: The account must exist in the account master (and in the cross-reference when the payment is confirmed).

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl`, paragraphs `READ-ACCTDAT-FILE` (message "Account ID NOT found..." at line 361), `UPDATE-ACCTDAT-FILE` read-for-update (line 392), `READ-CXACAIX-FILE` (line 425)

**Field(s) Involved**: `ACCT-ID` / `XREF-ACCT-ID` vs `ACCTDAT` and `CXACAIX` keys

**Validation Condition**: Keyed reads must return NORMAL; NOTFND produces "Account ID NOT found...".

**Trigger Conditions**: Account ID supplied (RULE-VAL-064 passed).

### RULE-VAL-066

**Rule Description**: A bill payment is allowed only when the account has a positive current balance.

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 197-206 (message "You have nothing to pay..." at line 201)

**Field(s) Involved**: `ACCT-CURR-BAL` (account current balance)

**Validation Condition**: `ACCT-CURR-BAL` must be greater than zero; a zero or negative balance blocks the payment.

**Trigger Conditions**: Account found and no prior error (`IF NOT ERR-FLG-ON ... IF ACCT-CURR-BAL <= ZEROS AND ACTIDINI OF COBIL0AI NOT = SPACES AND LOW-VALUES`).

### RULE-VAL-067

**Rule Description**: The full-balance payment must be explicitly confirmed with Y; only Y/y, N/n, or blank (re-prompt) are accepted.

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 173-191 (invalid-value message at line 187) and re-prompt "Confirm to make a bill payment..." at lines 237-239

**Field(s) Involved**: `CONFIRMI OF COBIL0AI`

**Validation Condition**: 'Y'/'y' executes the payment; 'N'/'n' clears the screen; blank re-prompts; any other value → "Invalid value. Valid values are (Y/N)...".

**Trigger Conditions**: Account ID supplied and balance positive.

### RULE-VAL-068

**Rule Description**: The generated bill-payment transaction must have a unique Transaction ID.

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl`, paragraph `WRITE-TRANSACT-FILE`, lines 533-539 (message "Tran ID already exist..." at line 536, on DUPKEY/DUPREC)

**Field(s) Involved**: `TRAN-ID` vs `TRANSACT` file primary key

**Validation Condition**: The keyed write must not collide with an existing transaction ID.

**Trigger Conditions**: Confirmed payment (RULE-VAL-067 passed with 'Y').

---

## 12. Transaction Reports (CORPT00C, screen CORPT00)

### RULE-VAL-069

**Rule Description**: A report type (Monthly, Yearly, or Custom) must be selected.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 437-442 (message "Select a report type to print report...")

**Field(s) Involved**: `MONTHLYI`, `YEARLYI`, `CUSTOMI` (all `OF CORPT0AI`)

**Validation Condition**: At least one of the three selection fields must be non-blank (`WHEN OTHER` of the report-type EVALUATE, lines 212-443).

**Trigger Conditions**: ENTER pressed on the report screen.

### RULE-VAL-070

**Rule Description**: For a Custom report, all six date components (start month/day/year, end month/day/year) are required.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 258-303

**Field(s) Involved**: `SDTMMI`, `SDTDDI`, `SDTYYYYI`, `EDTMMI`, `EDTDDI`, `EDTYYYYI` (all `OF CORPT0AI`)

**Validation Condition**: Each component must not be spaces/low-values; messages "Start Date - Month can NOT be empty...", "Start Date - Day can NOT be empty...", "Start Date - Year can NOT be empty...", and the matching End Date messages.

**Trigger Conditions**: Custom report selected (`WHEN CUSTOMI OF CORPT0AI NOT = SPACES AND LOW-VALUES`, line 256).

### RULE-VAL-071

**Rule Description**: Custom-report date components must be numeric and within range: months 1–12, days 1–31, years numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 329-336 (start month ≤ 12), 338-345 (start day ≤ 31), 347-353 (start year numeric), 355-362 (end month), 364-371 (end day), 373-379 (end year)

**Field(s) Involved**: `SDTMMI`, `SDTDDI`, `SDTYYYYI`, `EDTMMI`, `EDTDDI`, `EDTYYYYI`

**Validation Condition**: Each month must be numeric and not greater than 12 ("... Not a valid Month..."); each day numeric and not greater than 31 ("... Not a valid Day..."); each year numeric ("... Not a valid Year...").

**Trigger Conditions**: Custom report selected and all components supplied (RULE-VAL-070).

### RULE-VAL-072

**Rule Description**: The assembled custom start and end dates must be real calendar dates.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 388-406 (start date, "Start Date - Not a valid date...") and 408-426 (end date, "End Date - Not a valid date..."), via `CALL 'CSUTLDTC'`

**Field(s) Involved**: `WS-START-DATE`, `WS-END-DATE` (YYYY-MM-DD)

**Validation Condition**: `CSUTLDTC` (LE `CEEDAYS`) must report severity '0000' (message 2513 tolerated).

**Trigger Conditions**: Component-level edits passed (RULE-VAL-071).

### RULE-VAL-073

**Rule Description**: Report submission must be confirmed; the confirmation value must be Y or N.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl`, paragraph `SUBMIT-JOB-TO-INTRDR`, lines 464-494 (blank re-prompt "Please confirm to print the ... report..." lines 464-474; invalid value message '"..." is not a valid value to confirm...' lines 484-493)

**Field(s) Involved**: `CONFIRMI OF CORPT0AI`

**Validation Condition**: Blank re-prompts; 'Y'/'y' submits; 'N'/'n' cancels and clears; any other value is rejected.

**Trigger Conditions**: A report type was chosen and (for Custom) all date validations passed.

---

## 13. User Administration (COUSR00C/01C/02C/03C)

### RULE-VAL-074

**Rule Description**: A row selection on the user list must be 'U' (update) or 'D' (delete).

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR00C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 185-216 (message "Invalid selection. Valid values are U and D" at lines 210-213)

**Field(s) Involved**: `SEL0001I`–`SEL0010I OF COUSR0AI` → `CDEMO-CU00-USR-SEL-FLG`

**Validation Condition**: A non-blank selection flag must be 'U'/'u' or 'D'/'d'.

**Trigger Conditions**: ENTER pressed with a non-blank selection against a listed user.

### RULE-VAL-075

**Rule Description**: To add a user, First Name, Last Name, User ID, Password, and User Type are all required.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR01C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 117-147

**Field(s) Involved**: `FNAMEI`, `LNAMEI`, `USERIDI`, `PASSWDI`, `USRTYPEI` (all `OF COUSR1AI`)

**Validation Condition**: Each field must not be spaces/low-values, checked in order with messages "First Name can NOT be empty...", "Last Name can NOT be empty...", "User ID can NOT be empty...", "Password can NOT be empty...", "User Type can NOT be empty...".

**Trigger Conditions**: ENTER pressed on the Add User screen.

### RULE-VAL-076

**Rule Description**: A new User ID must be unique in the user security file.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR01C.cbl`, paragraph `WRITE-USER-SEC-FILE`, lines 260-265 (message "User ID already exist..." at line 263, on DUPKEY/DUPREC)

**Field(s) Involved**: `SEC-USR-ID` vs `USRSEC` file primary key

**Validation Condition**: The keyed write must not collide with an existing user record.

**Trigger Conditions**: All required fields present (RULE-VAL-075).

### RULE-VAL-077

**Rule Description**: To look up or update a user, the User ID is required.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR02C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 145-151, and paragraph `UPDATE-USER-INFO`, lines 180-186

**Field(s) Involved**: `USRIDINI OF COUSR2AI`

**Validation Condition**: Not spaces/low-values ("User ID can NOT be empty...").

**Trigger Conditions**: ENTER (lookup) or F5 (save) on the Update User screen.

### RULE-VAL-078

**Rule Description**: When saving a user update, First Name, Last Name, Password, and User Type are all required.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR02C.cbl`, paragraph `UPDATE-USER-INFO`, lines 186-213

**Field(s) Involved**: `FNAMEI`, `LNAMEI`, `PASSWDI`, `USRTYPEI` (all `OF COUSR2AI`)

**Validation Condition**: Each must not be spaces/low-values ("... can NOT be empty...").

**Trigger Conditions**: F5 pressed to save on the Update User screen, after RULE-VAL-077.

### RULE-VAL-079

**Rule Description**: The user being updated or deleted must exist in the user security file.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR02C.cbl`, paragraph `READ-USER-SEC-FILE`, message "User ID NOT found..." at lines 342 and 379; `00.phase-1-input/cbl/COUSR03C.cbl`, messages at lines 289 and 325

**Field(s) Involved**: `SEC-USR-ID` vs `USRSEC` file key

**Validation Condition**: Keyed read must return NORMAL; NOTFND produces "User ID NOT found...".

**Trigger Conditions**: User ID supplied (RULE-VAL-077 / RULE-VAL-080).

### RULE-VAL-080

**Rule Description**: To delete a user, the User ID is required.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR03C.cbl`, paragraph `PROCESS-ENTER-KEY`, lines 144-155, and paragraph `DELETE-USER-INFO`, lines 203-214

**Field(s) Involved**: `USRIDINI OF COUSR3AI`

**Validation Condition**: Not spaces/low-values ("User ID can NOT be empty...").

**Trigger Conditions**: ENTER (lookup) or F5 (delete) on the Delete User screen.

### RULE-VAL-081

**Rule Description**: A user update is accepted only when at least one field actually changed.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR02C.cbl`, paragraph `UPDATE-USER-INFO`, lines 216-247 (field-by-field compare lines 220-236; message "Please modify to update ..." at lines 242-244)

**Field(s) Involved**: `FNAMEI`/`LNAMEI`/`PASSWDI`/`USRTYPEI` vs stored `SEC-USR-FNAME`/`SEC-USR-LNAME`/`SEC-USR-PWD`/`SEC-USR-TYPE`

**Validation Condition**: At least one entered value must differ from the stored record (`USR-MODIFIED-YES`); otherwise the update is rejected with "Please modify to update ...".

**Trigger Conditions**: F5 pressed, all required fields present, user record found.

---

## Cross-Field and Conditional Dependency Summary

| Dependent rule | Depends on | Nature |
|---|---|---|
| RULE-VAL-003 (user exists) | VAL-001, VAL-002 | Runs only when both credentials supplied |
| RULE-VAL-004 (password match) | VAL-003 | Runs only when user record found |
| RULE-VAL-006 (admin-only option) | VAL-005 | Runs only on a structurally valid option |
| RULE-VAL-010 / VAL-013 (account exists) | VAL-008/009, VAL-011/012 | Runs only on a valid account key |
| RULE-VAL-016 (DOB not future) | VAL-015 | Runs only when DOB is a valid date |
| RULE-VAL-018 part-1 range | numeric edit of SSN part 1 | Runs only when part 1 is numeric |
| RULE-VAL-021 FICO range | FICO numeric edit | Runs only when FICO is numeric |
| RULE-VAL-026 state-code lookup | state alpha edit | Runs only when state passed alpha edit |
| RULE-VAL-029 (state+zip combo) | VAL-026, VAL-027 | Cross-field; runs only when both fields individually valid |
| RULE-VAL-030 phone part edits | phone not entirely blank | Conditional-required group |
| RULE-VAL-014..033 (field edits) | VAL-033 change detection | Whole edit suite skipped when nothing changed |
| RULE-VAL-034 / VAL-049 (concurrency) | confirmed save | Runs only at save time |
| RULE-VAL-037/038 (selection codes) | VAL-035/036 | Skipped if a filter edit failed |
| RULE-VAL-041 / VAL-044 (combo exists) | VAL-039/040, VAL-042/043 | Runs only on valid keys |
| RULE-VAL-056 (xref exists) | VAL-055 | Runs only on a numeric key |
| RULE-VAL-057..061 (data fields) | VAL-054..056 | Cleared/skipped on key-field error |
| RULE-VAL-062 / VAL-067 / VAL-073 (confirmations) | all field edits | Final gate before write |
| RULE-VAL-063 / VAL-068 / VAL-076 (uniqueness) | confirmation | Enforced at write time |
| RULE-VAL-071/072 (date ranges, real dates) | VAL-070 | Custom report only |
| RULE-VAL-066 (positive balance) | VAL-064/065 | Runs only when account found |
| RULE-VAL-078/079/081 | VAL-077 | Run only when User ID supplied |

## Shared Field Dependencies

- **Account ID (11 digits)** — validated by VAL-008/009 (COACTVWC), VAL-011/012 (COACTUPC), VAL-035 (COCRDLIC), VAL-039 (COCRDSLC), VAL-042 (COCRDUPC), VAL-054/055 (COTRN02C), VAL-064 (COBIL00C). Same business constraint ("11-digit non-zero number") implemented per program.
- **Card Number (16 digits)** — VAL-036 (COCRDLIC), VAL-040 (COCRDSLC), VAL-043 (COCRDUPC), VAL-054/055 (COTRN02C).
- **Transaction ID** — VAL-051 (filter), VAL-052/053 (view), VAL-063/068 (uniqueness at write).
- **User ID** — VAL-001/003 (sign-on), VAL-075/076 (add), VAL-077/079 (update), VAL-080/079 (delete).
- **Y/N confirmation pattern** — VAL-062 (add transaction), VAL-067 (bill pay), VAL-073 (report submit).
- **Y/N status pattern** — VAL-014 (account status), VAL-032 (primary holder), VAL-046 (card status).
- **Date validity (CSUTLDTC / CSUTLDPY)** — VAL-015/016 (account dates), VAL-060 (transaction dates), VAL-072 (report dates).
- **Lookup tables (CSLKPCDY)** — VAL-026 (state codes), VAL-029 (state+zip combos), VAL-030 (phone area codes).

## Verification Checklist

- [x] Every COBOL file in `00.phase-1-input/cbl/` scanned (18/18): COACTUPC, COACTVWC, COADM01C, COBIL00C, COCRDLIC, COCRDSLC, COCRDUPC, COMEN01C, CORPT00C, COSGN00C, COTRN00C, COTRN01C, COTRN02C, COUSR00C, COUSR01C, COUSR02C, COUSR03C, CSUTLDTC (date utility — mechanism only, surfaced through VAL-015, VAL-060, VAL-072)
- [x] Related copybooks scanned: CSUTLDPY (date edits), CSUTLDWY (date flags), CSLKPCDY (lookup tables), CSUSR01Y (user record), CVCRD01Y/COCOM01Y (communication fields); BMS maps reviewed for field identification only
- [x] Calculations, technical/system-error handling, and display-only constraints excluded
- [x] Every rule carries program + line/paragraph references verified on this branch
- [x] Companion diagram: `01.phase-1-output/validation-dependencies.svg`
