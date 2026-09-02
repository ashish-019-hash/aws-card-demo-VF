# Validation Rules Catalog

## Scope and interpretation

This catalog covers every COBOL program (`00.phase-1-input/cbl/*.cbl`) and relevant procedure/working-storage copybook (`00.phase-1-input/cpy/*`) under the phase-1 input. BMS maps and BMS copybooks were reviewed only for field context and are excluded because they contain layout/display definitions rather than data-integrity logic. CICS/file response handling, missing-record responses, calculations, and screen-navigation controls are excluded as technical handling or processing rather than validation.

A single catalog rule can list several source locations where the same business constraint is enforced. “Blank” below means `SPACES` or `LOW-VALUES` (and, where explicitly tested, zero).

## Account and customer maintenance

### RULE-VAL-001

**Rule Description**: An account-update lookup requires an account number.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1783-1817` (`1210-EDIT-ACCOUNT`).

**Field(s) Involved**: `CC-ACCT-ID` (account number).

**Validation Condition**: Reject a blank account number.

**Trigger Conditions**: Account-update details have not yet been fetched; `1200-EDIT-MAP-INPUTS` performs the account edit (`COACTUPC.cbl:1433-1446`).

### RULE-VAL-002

**Rule Description**: A supplied account number must be a non-zero numeric 11-digit account identifier.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1799-1817` (`1210-EDIT-ACCOUNT`).

**Field(s) Involved**: `CC-ACCT-ID`, `CC-ACCT-ID-N`.

**Validation Condition**: Reject when `CC-ACCT-ID IS NOT NUMERIC` or the numeric representation is zero. The field’s fixed input definition and returned message identify it as 11 digits.

**Trigger Conditions**: A nonblank account number is submitted for account-update lookup.

### RULE-VAL-003

**Rule Description**: Account active status is mandatory and restricted to `Y` or `N`.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1472-1476,1856-1894` (`1200-EDIT-MAP-INPUTS`, `1220-EDIT-YESNO`).

**Field(s) Involved**: `ACUP-NEW-ACTIVE-STATUS`.

**Validation Condition**: Reject blank/zero status and reject any value other than `Y` or `N`.

**Trigger Conditions**: A fetched account has changed and is being validated before update; validation is skipped when no change, already-confirmed, or already-saved state applies (`COACTUPC.cbl:1463-1468`).

### RULE-VAL-004

**Rule Description**: Required monetary account fields must be supplied as valid signed decimal amounts.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1484-1527,2180-2222` (`1200-EDIT-MAP-INPUTS`, `1250-EDIT-SIGNED-9V2`).

**Field(s) Involved**: `ACUP-NEW-CREDIT-LIMIT-X`, `ACUP-NEW-CASH-CREDIT-LIMIT-X`, `ACUP-NEW-CURR-BAL-X`, `ACUP-NEW-CURR-CYC-CREDIT-X`, `ACUP-NEW-CURR-CYC-DEBIT-X`.

**Validation Condition**: Each field must be nonblank and accepted by `TEST-NUMVAL-C` as a signed numeric value with up to two decimal places.

**Trigger Conditions**: A changed account is submitted for update. This is a format/presence check; it does not derive or calculate an amount.

### RULE-VAL-005

**Rule Description**: Account open, card expiry, reissue, and customer date-of-birth values must be valid calendar dates in the application’s `CCYYMMDD` representation.

**COBOL Source Location**: Invocation: `00.phase-1-input/cbl/COACTUPC.cbl:1478-1507,1533-1543`; reusable calendar-date validation: `00.phase-1-input/cpy/CSUTLDPY.cpy:18-205,209-329`; date-of-birth reasonableness validation: `00.phase-1-input/cpy/CSUTLDPY.cpy:341-370`; date working-storage domains: `00.phase-1-input/cpy/CSUTLDWY.cpy:4-57`.

**Field(s) Involved**: `ACUP-NEW-OPEN-DATE`, `ACUP-NEW-EXPIRAION-DATE`, `ACUP-NEW-REISSUE-DATE`, `ACUP-NEW-CUST-DOB-YYYY-MM-DD`.

**Validation Condition**: Year, month, and day are mandatory; year is numeric with century `19` or `20`; month is numeric 1–12; day is numeric 1–31; invalid month/day combinations are rejected (31-day months, February 30, and February 29 in a non-leap year). A final date-service validation rejects any remaining invalid calendar date. For the customer date of birth specifically, the date must be strictly earlier than the current date; today and future dates are rejected (`CSUTLDPY.cpy:343-368`).

**Trigger Conditions**: A changed account is submitted. Date of birth performs the additional date-of-birth edit only after basic date validation succeeds (`COACTUPC.cbl:1539-1543`).

### RULE-VAL-006

**Rule Description**: Customer FICO score must be a non-zero numeric value from 300 through 850.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1545-1555,2110-2176,2514-2531`; range declaration: `00.phase-1-input/cbl/COACTUPC.cbl:845-849`.

**Field(s) Involved**: `ACUP-NEW-CUST-FICO-SCORE-X`, `ACUP-NEW-CUST-FICO-SCORE`.

**Validation Condition**: Reject blank, nonnumeric, or zero input; after that check, accept only 300–850 inclusive.

**Trigger Conditions**: A changed account is submitted; the range test runs only if the required-numeric test succeeds.

### RULE-VAL-007

**Rule Description**: Customer first and last names are required alphabetic values; middle name is optional but, if supplied, must be alphabetic.

**COBOL Source Location**: Field invocations: `00.phase-1-input/cbl/COACTUPC.cbl:1560-1582`; reusable checks: `00.phase-1-input/cbl/COACTUPC.cbl:1898-1952,2012-2058` (`1225-EDIT-ALPHA-REQD`, `1235-EDIT-ALPHA-OPT`).

**Field(s) Involved**: `ACUP-NEW-CUST-FIRST-NAME`, `ACUP-NEW-CUST-MIDDLE-NAME`, `ACUP-NEW-CUST-LAST-NAME`.

**Validation Condition**: First and last name cannot be blank and may contain only alphabetic characters and spaces. A blank middle name is accepted; a populated middle name is subject to the same alphabetic-character restriction.

**Trigger Conditions**: A changed account is submitted.

### RULE-VAL-008

**Rule Description**: Customer address line 1, city, state, country, ZIP code, and EFT account ID are required; each has its declared character-domain check.

**COBOL Source Location**: Field invocations: `00.phase-1-input/cbl/COACTUPC.cbl:1584-1655`; generic checks: `00.phase-1-input/cbl/COACTUPC.cbl:1824-1853,1898-1952,2110-2176`.

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-LINE-1`, `ACUP-NEW-CUST-ADDR-LINE-3` (city), `ACUP-NEW-CUST-ADDR-STATE-CD`, `ACUP-NEW-CUST-ADDR-COUNTRY-CD`, `ACUP-NEW-CUST-ADDR-ZIP`, `ACUP-NEW-CUST-EFT-ACCOUNT-ID`.

**Validation Condition**: Address line 1 must be nonblank. City, state, and country must be nonblank alphabetic values. The first five characters of the ZIP code (`ACUP-NEW-CUST-ADDR-ZIP(1:5)`) and the EFT account ID must be nonblank, numeric, and non-zero. Address line 2 is explicitly optional (`COACTUPC.cbl:1613-1615`).

**Trigger Conditions**: A changed account is submitted.

### RULE-VAL-009

**Rule Description**: Customer state code must be a valid U.S. state code.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1592-1602,2493-2512`; allowed-code lookup declaration: `00.phase-1-input/cpy/CSLKPCDY.cpy:1013-1072`.

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-STATE-CD`, `US-STATE-CODE-TO-EDIT`.

**Validation Condition**: After the state passes the required alphabetic check, reject it unless it matches the `VALID-US-STATE-CODE` domain.

**Trigger Conditions**: A changed account is submitted and `FLG-ALPHA-ISVALID` is true.

### RULE-VAL-010

**Rule Description**: The first two ZIP digits must be compatible with the supplied U.S. state.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1664-1669,2535-2558`; allowed state/ZIP-prefix combinations: `00.phase-1-input/cpy/CSLKPCDY.cpy:1073-1132`.

**Field(s) Involved**: `ACUP-NEW-CUST-ADDR-STATE-CD`, `ACUP-NEW-CUST-ADDR-ZIP(1:2)`.

**Validation Condition**: Reject a state plus first-two-ZIP-digits combination not in `VALID-US-STATE-ZIP-CD2-COMBO`.

**Trigger Conditions**: A changed account is submitted and both individual state and ZIP validations have succeeded.

### RULE-VAL-011

**Rule Description**: Each optional U.S. phone number must be either entirely blank or a valid non-zero North American number with a recognized general-purpose area code.

**COBOL Source Location**: Invocation: `00.phase-1-input/cbl/COACTUPC.cbl:1632-1646`; validation: `00.phase-1-input/cbl/COACTUPC.cbl:2225-2428`; area-code domain: `00.phase-1-input/cpy/CSLKPCDY.cpy:521-930`.

**Field(s) Involved**: `ACUP-NEW-CUST-PHONE-NUM-1`, `ACUP-NEW-CUST-PHONE-NUM-2`; component fields `WS-EDIT-US-PHONE-NUMA` (3), `NUMB` (3), `NUMC` (4).

**Validation Condition**: If any component is supplied, area code, prefix, and line number are mandatory, numeric, and non-zero. The area code must satisfy `VALID-GENERAL-PURP-CODE`; component widths are fixed at 3/3/4 by the data definitions (`COACTUPC.cbl:87-99`).

**Trigger Conditions**: A changed account is submitted. The all-blank case exits as valid before component checks (`COACTUPC.cbl:2234-2244`).

### RULE-VAL-012

**Rule Description**: Customer Social Security number must contain required numeric 3-2-4 components, and the first three digits cannot be 000, 666, or 900–999.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1529-1531,2431-2489`; prohibited first-part domain: `00.phase-1-input/cbl/COACTUPC.cbl:117-146`.

**Field(s) Involved**: `ACUP-NEW-CUST-SSN-1`, `ACUP-NEW-CUST-SSN-2`, `ACUP-NEW-CUST-SSN-3`.

**Validation Condition**: All three fixed-width components are required, numeric, and non-zero through the generic numeric validation. In addition, the first 3-digit component must not be 000, 666, or 900–999.

**Trigger Conditions**: A changed account is submitted; the forbidden first-part check runs only after that component is numeric-valid.

### RULE-VAL-013

**Rule Description**: Primary-cardholder indicator is mandatory and restricted to `Y` or `N`.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTUPC.cbl:1657-1662,1856-1894`.

**Field(s) Involved**: `ACUP-NEW-CUST-PRI-HOLDER-IND`.

**Validation Condition**: Reject blank/zero or a value other than `Y` or `N`.

**Trigger Conditions**: A changed account is submitted.

## Card search, list, and maintenance

### RULE-VAL-014

**Rule Description**: Card-related account filters must be numeric 11-digit account identifiers when supplied.

**COBOL Source Location**: `00.phase-1-input/cbl/COACTVWC.cbl:649-683`; `00.phase-1-input/cbl/COCRDLIC.cbl:1003-1032`; `00.phase-1-input/cbl/COCRDSLC.cbl:647-681`; `00.phase-1-input/cbl/COCRDUPC.cbl:721-758`.

**Field(s) Involved**: `CC-ACCT-ID`, `CC-ACCT-ID-N`.

**Validation Condition**: Reject nonnumeric input. Account-view additionally rejects zero. In the card list and search flows blank/zero acts as an omitted optional filter; card update requires a nonblank filter before a record can be fetched.

**Trigger Conditions**: Account view, card list/search filter submission, or card-update record lookup.

### RULE-VAL-015

**Rule Description**: Card filters must be numeric 16-digit card identifiers when supplied, and card update requires one before record lookup.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl:1036-1069`; `00.phase-1-input/cbl/COCRDSLC.cbl:685-722`; `00.phase-1-input/cbl/COCRDUPC.cbl:762-802`.

**Field(s) Involved**: `CC-CARD-NUM`, `CC-CARD-NUM-N`.

**Validation Condition**: Reject nonnumeric card input. Blank/zero is an omitted optional filter for list/search but is rejected for the card-update lookup.

**Trigger Conditions**: Card list/search filter submission or card-update record lookup.

### RULE-VAL-016

**Rule Description**: Card-list row actions are limited to one selected row and to valid selection codes.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDLIC.cbl:1073-1119` (`2250-EDIT-ARRAY`).

**Field(s) Involved**: `WS-EDIT-SELECT-FLAGS`, `SELECT-OK(I)`, `SELECT-BLANK(I)`.

**Validation Condition**: Reject more than one `S` or `U` action across rows. For each populated row action, reject a code that is neither valid nor blank.

**Trigger Conditions**: Card list input has no prior account/card-filter error.

### RULE-VAL-017

**Rule Description**: A changed card’s embossed name is required and may contain only alphabetic characters and spaces.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl:806-841` (`1230-EDIT-NAME`).

**Field(s) Involved**: `CCUP-NEW-CRDNAME`.

**Validation Condition**: Reject blank/zero and reject any nonalphabetic non-space character.

**Trigger Conditions**: Card details were fetched, data changed, and the update has not already been confirmed or saved (`COCRDUPC.cbl:679-708`).

### RULE-VAL-018

**Rule Description**: A changed card’s active status is mandatory and restricted to `Y` or `N`.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl:845-874` (`1240-EDIT-CARDSTATUS`).

**Field(s) Involved**: `CCUP-NEW-CRDSTCD`.

**Validation Condition**: Reject blank/zero or a value other than `Y` or `N`.

**Trigger Conditions**: Changed-card update validation.

### RULE-VAL-019

**Rule Description**: A changed card’s expiry month is mandatory and must be 1 through 12.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl:877-910`; allowed range declaration: `00.phase-1-input/cbl/COCRDUPC.cbl:91-96`.

**Field(s) Involved**: `CCUP-NEW-EXPMON`, `CARD-MONTH-CHECK`.

**Validation Condition**: Reject blank/zero and any value outside the `VALID-MONTH` domain (1–12).

**Trigger Conditions**: Changed-card update validation.

### RULE-VAL-020

**Rule Description**: A changed card’s expiry year is mandatory and must be 1950 through 2099.

**COBOL Source Location**: `00.phase-1-input/cbl/COCRDUPC.cbl:913-945`; allowed range declaration: `00.phase-1-input/cbl/COCRDUPC.cbl:97-100`.

**Field(s) Involved**: `CCUP-NEW-EXPYEAR`, `CARD-YEAR-CHECK`.

**Validation Condition**: Reject blank/zero and any value outside the `VALID-YEAR` domain (1950–2099).

**Trigger Conditions**: Changed-card update validation.

## User and navigation inputs

### RULE-VAL-021

**Rule Description**: Main and administration menu choices must be non-zero numeric positions within the configured menu’s option count.

**COBOL Source Location**: `00.phase-1-input/cbl/COADM01C.cbl:115-155`; `00.phase-1-input/cbl/COMEN01C.cbl:115-165`.

**Field(s) Involved**: `OPTIONI`, `WS-OPTION`, `CDEMO-ADMIN-OPT-COUNT`, `CDEMO-MENU-OPT-COUNT`.

**Validation Condition**: Reject a nonnumeric choice, zero, or a choice greater than the applicable configured option count.

**Trigger Conditions**: Enter is pressed on the administrator or general menu.

### RULE-VAL-022

**Rule Description**: The general-menu program contains a configuration-dependent administrator-only access check; it is not active for the supplied menu configuration.

**COBOL Source Location**: Access-check branch: `00.phase-1-input/cbl/COMEN01C.cbl:136-143` (`PROCESS-ENTER-KEY`); supplied option-role configuration: `00.phase-1-input/cpy/COMEN02Y.cpy:21-84`; role field/domain: `00.phase-1-input/cpy/COCOM01Y.cpy:25-28`.

**Field(s) Involved**: `CDEMO-USRTYP-USER`, `CDEMO-MENU-OPT-USRTYPE(WS-OPTION)`.

**Validation Condition**: If a standard user selects an option whose configured required type is `A`, the branch rejects the selection. In the supplied `COMEN02Y.cpy`, all ten configured menu options have required type `U`; therefore no current option can activate this branch. It is documented as a dormant/configuration-dependent authorization check, not an enforced current-menu constraint.

**Trigger Conditions**: A general-menu option has passed range validation, the signed-in user has type `U`, and the selected option is configured with type `A`.

### RULE-VAL-023

**Rule Description**: User creation and user update require first name, last name, user ID, password, and user type; user lookup/deletion requires user ID.

**COBOL Source Location**: Create: `00.phase-1-input/cbl/COUSR01C.cbl:115-151`; update lookup: `00.phase-1-input/cbl/COUSR02C.cbl:143-164`; update save: `00.phase-1-input/cbl/COUSR02C.cbl:177-215`; delete lookup/delete: `00.phase-1-input/cbl/COUSR03C.cbl:142-190`.

**Field(s) Involved**: `FNAMEI`, `LNAMEI`, `USERIDI`/`USRIDINI`, `PASSWDI`, `USRTYPEI`.

**Validation Condition**: Reject blank or low-value required fields. The programs do not impose further format or domain validation on these fields.

**Trigger Conditions**: Enter on user-add; user-update lookup and save; user-delete lookup and delete, respectively.

### RULE-VAL-024

**Rule Description**: A new user ID must be unique.

**COBOL Source Location**: `00.phase-1-input/cbl/COUSR01C.cbl:238-266` (`WRITE-USER-SEC-FILE`).

**Field(s) Involved**: `USERIDI`, `SEC-USR-ID`.

**Validation Condition**: Reject creation when writing the security record returns `DFHRESP(DUPKEY)` or `DFHRESP(DUPREC)`, indicating that the user-ID key already exists.

**Trigger Conditions**: User-add required-field checks have succeeded and the program writes the new security record using `SEC-USR-ID` as its keyed record ID.

### RULE-VAL-025

**Rule Description**: Sign-on requires both user ID and password.

**COBOL Source Location**: `00.phase-1-input/cbl/COSGN00C.cbl:117-140` (`PROCESS-ENTER-KEY`).

**Field(s) Involved**: `USERIDI OF COSGN0AI`, `PASSWDI OF COSGN0AI`.

**Validation Condition**: Reject a user ID that is spaces or low-values. If user ID is present, reject a password that is spaces or low-values. No credential-format or password-policy rule is implemented in this block.

**Trigger Conditions**: Enter is processed on the sign-on screen. The user-ID check is evaluated first; the password check runs only when the user ID is present. Security-file lookup runs only if neither required-field error is set (`COSGN00C.cbl:132-140`).

## Billing, reporting, and transaction processing

### RULE-VAL-026

**Rule Description**: Bill payment requires an account ID, and confirmation accepts only `Y` or `N` when populated.

**COBOL Source Location**: `00.phase-1-input/cbl/COBIL00C.cbl:154-191` (`PROCESS-ENTER-KEY`).

**Field(s) Involved**: `ACTIDINI`, `CONFIRMI`.

**Validation Condition**: Reject a blank account ID. Confirmation may be blank, `Y`/`y`, or `N`/`n`; reject any other value.

**Trigger Conditions**: Enter on the bill-payment screen after account ID validation.

### RULE-VAL-027

**Rule Description**: Transaction list selection requires action code `S` when an action and transaction selection are supplied; a transaction-ID filter, if supplied, must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN00C.cbl:183-219`.

**Field(s) Involved**: `CDEMO-CT00-TRN-SEL-FLG`, `CDEMO-CT00-TRN-SELECTED`, `TRNIDINI`.

**Validation Condition**: Reject an action code other than `S`/`s` when a row action and selected transaction are present. Blank transaction ID is allowed as no filter; a populated ID must be numeric.

**Trigger Conditions**: Transaction-list Enter processing.

### RULE-VAL-028

**Rule Description**: Transaction detail view requires a transaction ID.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN01C.cbl:144-160` (`PROCESS-ENTER-KEY`).

**Field(s) Involved**: `TRNIDINI`.

**Validation Condition**: Reject blank or low-value input.

**Trigger Conditions**: Enter on the transaction-view screen.

### RULE-VAL-029

**Rule Description**: Adding a transaction requires confirmation `Y` or `N`; blank confirmation prompts the user rather than creating the transaction.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:165-188`.

**Field(s) Involved**: `CONFIRMI`.

**Validation Condition**: Accept `Y`/`y` to add; accept `N`/`n` or blank as non-add/prompt states; reject all other values.

**Trigger Conditions**: Transaction-add confirmation is evaluated.

### RULE-VAL-030

**Rule Description**: A new transaction must identify either an account or a card, and any supplied identifier must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:193-230` (`VALIDATE-INPUT-KEY-FIELDS`).

**Field(s) Involved**: `ACTIDINI`, `CARDNINI`.

**Validation Condition**: If account ID is supplied, it must be numeric; otherwise, if card number is supplied, it must be numeric. Reject when both are absent.

**Trigger Conditions**: Transaction-add input validation. Account input takes precedence; a valid account lookup populates card, and a valid card lookup populates account.

### RULE-VAL-031

**Rule Description**: Transaction type code, category code, source, description, amount, original date, processing date, merchant ID, merchant name, merchant city, and merchant ZIP are mandatory.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:235-320` (`VALIDATE-INPUT-DATA-FIELDS`).

**Field(s) Involved**: `TTYPCDI`, `TCATCDI`, `TRNSRCI`, `TDESCI`, `TRNAMTI`, `TORIGDTI`, `TPROCDTI`, `MIDI`, `MNAMEI`, `MCITYI`, `MZIPI`.

**Validation Condition**: Reject blank or low-value input for each listed field.

**Trigger Conditions**: Transaction-add input validation; fields are cleared first when a prior error flag is on (`COTRN02C.cbl:237-249`).

### RULE-VAL-032

**Rule Description**: Transaction type and category codes must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:322-337`.

**Field(s) Involved**: `TTYPCDI`, `TCATCDI`.

**Validation Condition**: Reject either code if it is not numeric.

**Trigger Conditions**: Transaction-add data-field validation after required-field checks.

### RULE-VAL-033

**Rule Description**: Transaction amount must follow the signed fixed-decimal format `-99999999.99` (the sign position accepts `-` or `+`).

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:339-351`.

**Field(s) Involved**: `TRNAMTI`.

**Validation Condition**: Reject unless position 1 is `-` or `+`, positions 2–9 are numeric, position 10 is `.`, and positions 11–12 are numeric.

**Trigger Conditions**: Transaction-add data-field validation after amount presence validation.

### RULE-VAL-034

**Rule Description**: Transaction original and processing dates must use `YYYY-MM-DD` format and represent valid calendar dates.

**COBOL Source Location**: Format: `00.phase-1-input/cbl/COTRN02C.cbl:353-381`; calendar validation: `00.phase-1-input/cbl/COTRN02C.cbl:389-427`; called validator: `00.phase-1-input/cbl/CSUTLDTC.cbl:112-151`.

**Field(s) Involved**: `TORIGDTI`, `TPROCDTI`.

**Validation Condition**: Reject if the year/month/day portions are not numeric or separators at positions 5 and 8 are not hyphens. Then reject a non-calendar date reported by `CSUTLDTC` (except status/message `2513`, which the program deliberately does not treat as an invalid date).

**Trigger Conditions**: Transaction-add data-field validation after each date’s required-field check.

### RULE-VAL-035

**Rule Description**: Merchant ID must be numeric.

**COBOL Source Location**: `00.phase-1-input/cbl/COTRN02C.cbl:430-436`.

**Field(s) Involved**: `MIDI`.

**Validation Condition**: Reject a nonnumeric merchant ID.

**Trigger Conditions**: Transaction-add data-field validation after merchant-ID presence validation.

### RULE-VAL-036

**Rule Description**: Each created transaction ID must be unique.

**COBOL Source Location**: Transaction-add ID allocation: `00.phase-1-input/cbl/COTRN02C.cbl:442-466`; transaction-add duplicate enforcement: `00.phase-1-input/cbl/COTRN02C.cbl:711-741`; bill-payment ID allocation and duplicate enforcement: `00.phase-1-input/cbl/COBIL00C.cbl:210-225,510-539`.

**Field(s) Involved**: `TRAN-ID`.

**Validation Condition**: Both transaction creation flows allocate the next ID after the highest existing ID and reject a write returning `DFHRESP(DUPKEY)` or `DFHRESP(DUPREC)`, so a duplicate transaction-ID key cannot be created.

**Trigger Conditions**: A validated transaction add is confirmed, or a confirmed bill payment creates its corresponding transaction record.

### RULE-VAL-037

**Rule Description**: A custom transaction report requires a complete numeric start and end date, with month no greater than 12 and day no greater than 31.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl:256-379` (`PROCESS-ENTER-KEY`).

**Field(s) Involved**: `SDTMMI`, `SDTDDI`, `SDTYYYYI`, `EDTMMI`, `EDTDDI`, `EDTYYYYI`.

**Validation Condition**: When the custom-report selector is populated, reject blank start/end month, day, or year; reject nonnumeric month/day/year; reject month above 12 or day above 31. The source does not test lower bounds, date combinations, or chronological order, so no stronger condition is inferred.

**Trigger Conditions**: `CUSTOMI` is populated. Monthly and yearly report selectors derive dates instead and have no user-entered-date validation (`CORPT00C.cbl:212-255`).

### RULE-VAL-038

**Rule Description**: Report submission requires an explicit confirmation of `Y` or `N`.

**COBOL Source Location**: `00.phase-1-input/cbl/CORPT00C.cbl:462-510` (`SUBMIT-JOB-TO-INTRDR`).

**Field(s) Involved**: `CONFIRMI OF CORPT0AI`.

**Validation Condition**: Blank or low-value confirmation prompts for confirmation and prevents submission. `N`/`n` cancels by clearing the report fields and prevents submission. `Y`/`y` permits submission. Any other value is rejected as invalid and prevents submission.

**Trigger Conditions**: A monthly, yearly, or valid custom report has reached `SUBMIT-JOB-TO-INTRDR`; JCL queue submission is reached only when no confirmation error/cancellation flag is set.

## Reusable validation utilities

### RULE-VAL-039

**Rule Description**: The reusable date routine provides the calendar-date constraints used by account maintenance; it has no independent screen trigger.

**COBOL Source Location**: Calendar validation: `00.phase-1-input/cpy/CSUTLDPY.cpy:18-329`; date-of-birth reasonableness: `00.phase-1-input/cpy/CSUTLDPY.cpy:341-370`; domains in `00.phase-1-input/cpy/CSUTLDWY.cpy:4-57`.

**Field(s) Involved**: `WS-EDIT-DATE-CCYY`, `WS-EDIT-DATE-MM`, `WS-EDIT-DATE-DD`.

**Validation Condition**: Required numeric year/month/day; century 19 or 20; month 1–12; day 1–31; valid month/day combination including leap-year handling; date-service final verification. `EDIT-DATE-OF-BIRTH` additionally accepts only a date strictly before the current date; today and future dates set input error.

**Trigger Conditions**: A program performs `EDIT-DATE-CCYYMMDD` and the relevant component paragraphs. Current in-scope account-update calls are documented in RULE-VAL-005.

## Coverage notes

The following programs were scanned and contain no additional business/data-integrity validation beyond the rules above or contain only technical/CICS response handling: `CSUTLDTC.cbl` (called date-validation service, referenced by RULE-VAL-034), `COACTVWC.cbl`, `COCRDLIC.cbl`, `COCRDSLC.cbl`, `COCRDUPC.cbl`, `COADM01C.cbl`, `COMEN01C.cbl`, `COBIL00C.cbl`, `CORPT00C.cbl`, `COTRN00C.cbl`, `COTRN01C.cbl`, `COTRN02C.cbl`, `COUSR00C.cbl`, `COUSR01C.cbl`, `COUSR02C.cbl`, and `COUSR03C.cbl`. `COUSR00C.cbl` provides navigation only; its `U`/`D` selection is a UI navigation action rather than a persisted business-data rule. All relevant copybooks were scanned; `CSLKPCDY.cpy`, `CSUTLDPY.cpy`, and `CSUTLDWY.cpy` provide domains/routines referenced above. Other copybooks declare records, messages, maps, or technical constants and introduce no executable business validation.
