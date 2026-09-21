# CardDemo — Validation Rules Catalog

## 1. Purpose and Scope

This catalog documents every business-level **input validation rule** enforced by the
CardDemo COBOL/CICS screens (BMS maps + their associated online programs). A validation
rule is a check on the *shape, presence, range, permitted values, or cross-field
consistency* of data a user types into a screen — as opposed to a calculation, an
authorization decision, or a technical/system error.

Each rule has a stable ID (`VR-001`, `VR-002`, …) and is traced to its exact COBOL
source location using `[FILE:start-end]` line citations. All citations were verified
against the current checked-out source under `00.phase-1-input/` with `sed -n` /
`grep -n` — every range quoted below was read directly from the file before this
document was written.

### 1.1 What is included

- Required-field ("must be supplied") checks.
- Format checks: numeric-only, alphabetic-only, alphanumeric, fixed date/amount masks.
- Range checks: numeric ranges (e.g. FICO 300–850, card-expiry year 1950–2099).
- Code/value checks against a fixed list of permitted values (Y/N flags, US state
  codes, NANP area codes, action-selection codes).
- Cross-field consistency checks computed purely from the fields the user typed
  (state + zip, day/month/year combination, "date of birth must be in the past",
  phone number part completeness, either-or key requirements).

### 1.2 What is excluded (and why)

The following categories are intentionally **excluded** from this catalog because they
are not validations of the shape/permissible-value of user-entered data. They are
covered by the sibling `business-rules-catalog.md` / `screen-flow.md` deliverables
being produced in this same phase:

| Category | Example | Why excluded |
|---|---|---|
| Authentication / credential verification | COSGN00C "Wrong Password...", "User not found..." | Compares entered value against a stored secret/master record — an authentication decision, not a shape/format/range check on the input itself. |
| Authorization / access control | COMEN01C admin-only menu option gate | A permission decision based on the signed-on user's role, not a check on the option value's shape. |
| Record-not-found / foreign-key lookups | COTRN01C "Transaction ID NOT found...", COCRDUPC "DID-NOT-FIND-ACCT-IN-CARDXREF" | These fire only after a successful file read fails to find a match — a data-lookup/business outcome, not a validation of the key's format. |
| Technical/system error handling | COTRN01C "Unable to lookup Transaction..." (`DFHRESP(OTHER)`), CSUTLDPY `EDIT-DATE-LE` raw LE-services severity/message-code text | Reports of infrastructure/CICS response codes, not business validation text. |
| Workflow/state rules | COACTUPC/COCRDUPC "No change detected...", COTRN00C "You are already at the top/bottom of the page..." | Concurrency/navigation state, not input validation. |
| Calculations | Balance updates, interest computation | Explicitly out of scope per the validation-rule extraction skill. |

## 2. Rule Table Columns

| Column | Meaning |
|---|---|
| ID | Stable rule identifier `VR-###` |
| Screen / Program | BMS screen and its online program |
| Field(s) | Input field(s) the rule applies to |
| Rule | Plain-language validation condition |
| Error Message (exact text) | Verbatim text moved into the message field, as it appears in source |
| Trigger | When the check runs (paragraph / control flow condition) |
| Source | `[FILE:line-range]` |

## 3. Sign-On — COSGN00C (screen COSGN00 / txn CC00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-001 | User ID | Must be supplied (not spaces/low-values) | `Please enter User ID ...` | PROCESS-ENTER-KEY, on ENTER | `[COSGN00C.cbl:117-122]` |
| VR-002 | Password | Must be supplied (not spaces/low-values) | `Please enter Password ...` | PROCESS-ENTER-KEY, on ENTER | `[COSGN00C.cbl:123-127]` |

*(Credential match and "user not found" checks at `COSGN00C.cbl:222-255` are
authentication decisions — excluded, see §1.2.)*

## 4. Main Menu — COMEN01C (screen COMEN01 / txn CM00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-003 | Option number | Must be numeric, non-zero, and ≤ the number of configured menu options | `Please enter a valid option number...` | On ENTER, option selection | `[COMEN01C.cbl:127-134]` |

*(The admin-only-option access gate at `COMEN01C.cbl:136-143` is an authorization
decision based on user role — excluded, see §1.2.)*

## 5. Admin Menu — COADM01C (screen COADM01 / txn CA00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-004 | Option number | Must be numeric, non-zero, and ≤ the number of configured admin options | `Please enter a valid option number...` | On ENTER, option selection | `[COADM01C.cbl:127-134]` |

## 6. Account View — COACTVWC (screen COACTVW / txn CAVW)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-005 | Account ID (search filter) | If left blank, treated as "no filter" (prompts for input) — informational, no hard error | *(no error text — sets prompt state)* | 2210-EDIT-ACCOUNT | `[COACTVWC.cbl:653-662]` |
| VR-006 | Account ID (search filter) | If supplied, must be numeric and non-zero, effectively an 11-digit account number | `Account Filter must  be a non-zero 11 digit number` (double space after "must" is exact source text) | 2210-EDIT-ACCOUNT | `[COACTVWC.cbl:666-680]` |

## 7. Account Update — COACTUPC (screen COACTUP / txn CAUP)

This is the richest validation program in the system. It uses a set of generic,
reusable "editor" paragraphs, each invoked once per field with the field's display
name pre-loaded into `WS-EDIT-VARIABLE-NAME`; the editor prepends that name (via
`FUNCTION TRIM`) to a generic message suffix. The table below lists each field
together with the specific editor paragraph applied to it.

### 7.1 Search key

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-007 | Account ID (search key) | Must be supplied (not spaces/low-values) | `Account number not provided` | 1210-EDIT-ACCOUNT | `[COACTUPC.cbl:1783-1796]` |
| VR-008 | Account ID (search key) | If supplied, must be numeric and non-zero, 11 digits | `Account Number if supplied must be a 11 digit Non-Zero Number` | 1210-EDIT-ACCOUNT | `[COACTUPC.cbl:1799-1817]` |

### 7.2 Generic editor paragraphs (reused across many fields)

| ID | Editor Paragraph | Rule | Error Message(s) | Source |
|---|---|---|---|---|
| VR-009 | 1215-EDIT-MANDATORY | Field must be supplied | `<field> must be supplied.` | `[COACTUPC.cbl:1824-1852]` |
| VR-010 | 1220-EDIT-YESNO | Field must be supplied, and must be `Y` or `N` | `<field> must be supplied.` / `<field> must be Y or N.` | `[COACTUPC.cbl:1856-1894]` |
| VR-011 | 1225-EDIT-ALPHA-REQD | Field must be supplied and contain alphabetic characters (and spaces) only | `<field> must be supplied.` / `<field> can have alphabets only.` | `[COACTUPC.cbl:1898-1951]` |
| VR-012 | 1235-EDIT-ALPHA-OPT | Field is optional; if supplied, must be alphabetic (and spaces) only | `<field> can have alphabets only.` | `[COACTUPC.cbl:2012-2057]` |
| VR-013 | 1245-EDIT-NUM-REQD | Field must be supplied, must be numeric, and must not be zero | `<field> must be supplied.` / `<field> must be all numeric.` / `<field> must not be zero.` | `[COACTUPC.cbl:2109-2176]` |
| VR-014 | 1250-EDIT-SIGNED-9V2 | Field must be supplied and be a valid signed numeric value with 2 decimal places (`FUNCTION TEST-NUMVAL-C`) | `<field> must be supplied.` / `<field> is not valid` | `[COACTUPC.cbl:2180-2221]` |

### 7.3 Field-by-field application of the generic editors

| ID | Field | Editor Applied | Notes | Source (invocation site) |
|---|---|---|---|---|
| VR-015 | Account Status | VR-010 (1220-EDIT-YESNO) | | `[COACTUPC.cbl:1472-1476]` |
| VR-016 | Credit Limit | VR-014 (1250-EDIT-SIGNED-9V2) | | `[COACTUPC.cbl:1484-1488]` |
| VR-017 | Cash Credit Limit | VR-014 (1250-EDIT-SIGNED-9V2) | | `[COACTUPC.cbl:1496-1501]` |
| VR-018 | Current Balance | VR-014 (1250-EDIT-SIGNED-9V2) | | `[COACTUPC.cbl:1509-1513]` |
| VR-019 | Current Cycle Credit Limit | VR-014 (1250-EDIT-SIGNED-9V2) | | `[COACTUPC.cbl:1515-1520]` |
| VR-020 | Current Cycle Debit Limit | VR-014 (1250-EDIT-SIGNED-9V2) | | `[COACTUPC.cbl:1522-1527]` |
| VR-021 | FICO Score (numeric/format) | VR-013 (1245-EDIT-NUM-REQD, 3-digit) | Only runs 1275-EDIT-FICO-SCORE (VR-040) if this passes | `[COACTUPC.cbl:1545-1556]` |
| VR-022 | First Name | VR-011 (1225-EDIT-ALPHA-REQD, 25 chars) | | `[COACTUPC.cbl:1560-1566]` |
| VR-023 | Middle Name | VR-012 (1235-EDIT-ALPHA-OPT, 25 chars) | optional | `[COACTUPC.cbl:1568-1574]` |
| VR-024 | Last Name | VR-011 (1225-EDIT-ALPHA-REQD, 25 chars) | | `[COACTUPC.cbl:1576-1582]` |
| VR-025 | Address Line 1 | VR-009 (1215-EDIT-MANDATORY, 50 chars) | | `[COACTUPC.cbl:1584-1590]` |
| VR-026 | State (2 chars) | VR-011 (1225-EDIT-ALPHA-REQD) | Gate for VR-041 state-code check | `[COACTUPC.cbl:1592-1602]` |
| VR-027 | Zip (5 digits) | VR-013 (1245-EDIT-NUM-REQD, 5 chars) | Gate for VR-042 state+zip cross-check | `[COACTUPC.cbl:1605-1611]` |
| VR-028 | City | VR-011 (1225-EDIT-ALPHA-REQD, 50 chars) | | `[COACTUPC.cbl:1615-1621]` |
| VR-029 | Country (3 chars) | VR-011 (1225-EDIT-ALPHA-REQD) | | `[COACTUPC.cbl:1623-1630]` |
| VR-030b | EFT Account Id (10 digits) | VR-013 (1245-EDIT-NUM-REQD) | | `[COACTUPC.cbl:1648-1655]` |
| VR-030c | Primary Card Holder | VR-010 (1220-EDIT-YESNO) | | `[COACTUPC.cbl:1657-1662]` |

### 7.4 Dates (via `COPY CSUTLDPY`)

Open Date, Expiry Date, Reissue Date, and Date of Birth all run through
`EDIT-DATE-CCYYMMDD`, invoked at `[COACTUPC.cbl:1478-1482]` (Open Date),
`[COACTUPC.cbl:1490-1494]` (Expiry Date), `[COACTUPC.cbl:1503-1507]` (Reissue Date),
and `[COACTUPC.cbl:1533-1543]` (Date of Birth, which also chains into
EDIT-DATE-OF-BIRTH). The reusable sub-checks are:

| ID | Sub-check | Rule | Error Message | Source |
|---|---|---|---|---|
| VR-030 | EDIT-YEAR-CCYY | Year must be supplied, numeric (4 digits), century must be 19xx or 20xx | `<field> : Year must be supplied.` / `<field> must be 4 digit number.` / `<field> : Century is not valid.` | `[CSUTLDPY.cpy:25-90]` |
| VR-031 | EDIT-MONTH | Month must be supplied, numeric, 1–12 | `<field> : Month must be supplied.` / `<field>: Month must be a number between 1 and 12.` | `[CSUTLDPY.cpy:91-147]` |
| VR-032 | EDIT-DAY | Day must be supplied, numeric, 1–31 | `<field> : Day must be supplied.` / `<field>:day must be a number between 1 and 31.` | `[CSUTLDPY.cpy:150-207]` |
| VR-033 | EDIT-DAY-MONTH-YEAR | Cross-field: day must be legal for the given month (no day 31 in a 30-day month; no Feb 30; Feb 29 only in a leap year, checked via div-by-400/div-by-4 remainder) | `<field>:Cannot have 31 days in this month.` / `<field>:Cannot have 30 days in this month.` / `<field>:Not a leap year.Cannot have 29 days in this month.` | `[CSUTLDPY.cpy:209-282]` |
| VR-034 | EDIT-DATE-LE (fallback) | Final catch-all: date must be accepted by the LE `CEEDAYS` calendar-validity service (via `CALL 'CSUTLDTC'`) | `<field> validation error Sev code: <sev> Message code: <msgno>` | `[CSUTLDPY.cpy:284-325]`, external validator `[CSUTLDTC.cbl:103-154]` |
| VR-035 | EDIT-DATE-OF-BIRTH | Date of Birth specifically must be strictly earlier than today (`FUNCTION INTEGER-OF-DATE` comparison); only runs if the DOB passed VR-030–034 | `<field>:cannot be in the future ` (trailing space is exact source text) | `[CSUTLDPY.cpy:341-369]` |

### 7.5 SSN — 1265-EDIT-US-SSN (format XXX-XX-XXXX)

| ID | Part | Rule | Error Message | Source |
|---|---|---|---|---|
| VR-036 | SSN Part 1 (3 digits) | Must be supplied and numeric (via VR-013) | `SSN: First 3 chars must be supplied.` / `SSN: First 3 chars must be all numeric.` | `[COACTUPC.cbl:2439-2445]` |
| VR-037 | SSN Part 1 (3 digits) | Must not be 000, 666, or in 900–999 (only checked if VR-036 passed) | `SSN: First 3 chars: should not be 000, 666, or between 900 and 999` | `[COACTUPC.cbl:2448-2464]` |
| VR-038 | SSN Part 2 (2 digits) | Must be supplied and numeric (via VR-013) | `SSN 4th & 5th chars must be supplied.` / `SSN 4th & 5th chars must be all numeric.` | `[COACTUPC.cbl:2469-2475]` |
| VR-039 | SSN Part 3 (4 digits) | Must be supplied and numeric (via VR-013) | `SSN Last 4 chars must be supplied.` / `SSN Last 4 chars must be all numeric.` | `[COACTUPC.cbl:2481-2487]` |

### 7.6 FICO score, US state code, State+Zip cross-check

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-040 | FICO Score | Must be in range 300–850 (only checked if the field passed VR-021 numeric-required check) | `FICO Score: should be between 300 and 850` | 1275-EDIT-FICO-SCORE, gated by `FLG-FICO-SCORE-ISVALID` | `[COACTUPC.cbl:2514-2531]` (range list `[COACTUPC.cbl:848-849]`) |
| VR-041 | State code | Must be one of the valid 2-letter US state/territory codes (only checked if VR-026 alpha-required passed) | `State: is not a valid state code` | 1270-EDIT-US-STATE-CD, gated by `FLG-ALPHA-ISVALID` | `[COACTUPC.cbl:2493-2511]`; code list `[CSLKPCDY.cpy:1013-1069]` |
| VR-042 | State + Zip (cross-field) | State code + first 2 digits of Zip must match a valid state/zip-prefix combination (only checked if both VR-026/041 state and VR-027 zip individually passed) | `Invalid zip code for state` (not parameterized by field name) | 1280-EDIT-US-STATE-ZIP-CD, gated by `FLG-STATE-ISVALID AND FLG-ZIPCODE-ISVALID` | `[COACTUPC.cbl:2536-2558]`; combo list `[CSLKPCDY.cpy:1073-1313]` |

### 7.7 US phone number — 1260-EDIT-US-PHONE-NUM (applied to Phone Number 1 and 2)

| ID | Rule | Error Message | Source |
|---|---|---|---|
| VR-043 | Phone number as a whole is optional: valid if all 3 parts (area/prefix/line) are blank | *(no error — treated as valid blank)* | `[COACTUPC.cbl:2225-2245]` |
| VR-044 | Area code: if any part supplied, area code must be supplied | `<field>: Area code must be supplied.` | `[COACTUPC.cbl:2247-2259]` |
| VR-045 | Area code must be a 3-digit number | `<field>: Area code must be A 3 digit number.` | `[COACTUPC.cbl:2264-2278]` |
| VR-046 | Area code must not be zero | `<field>: Area code cannot be zero` | `[COACTUPC.cbl:2280-2294]` |
| VR-047 | Area code must be a valid NANP general-purpose area code | `<field>: Not valid North America general purpose area code` | `[COACTUPC.cbl:2296-2312]`; code list `[CSLKPCDY.cpy:521-930]` |
| VR-048 | Prefix: must be supplied | `<field>: Prefix code must be supplied.` | `[COACTUPC.cbl:2318-2330]` |
| VR-049 | Prefix must be a 3-digit number | `<field>: Prefix code must be A 3 digit number.` | `[COACTUPC.cbl:2335-2349]` |
| VR-050 | Prefix must not be zero | `<field>: Prefix code cannot be zero` | `[COACTUPC.cbl:2351-2365]` |
| VR-051 | Line number: must be supplied | `<field>: Line number code must be supplied.` | `[COACTUPC.cbl:2371-2383]` |
| VR-052 | Line number must be a 4-digit number | `<field>: Line number code must be A 4 digit number.` | `[COACTUPC.cbl:2388-2402]` |
| VR-053 | Line number must not be zero | `<field>: Line number code cannot be zero` | `[COACTUPC.cbl:2404-2418]` |

## 8. Card List — COCRDLIC (screen COCRDLI / txn CCLI)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-054 | Account filter | Optional; if supplied, must be numeric and non-zero (11 digits) | `ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER` | 2210-EDIT-ACCOUNT | `[COCRDLIC.cbl:1003-1030]` |
| VR-055 | Card filter | Optional; if supplied, must be numeric and non-zero (16 digits) | `CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER` | 2220-EDIT-CARD | `[COCRDLIC.cbl:1036-1067]` |
| VR-056 | Row selection flags | At most one row may be flagged `S` or `U` at a time | `PLEASE SELECT ONLY ONE RECORD TO VIEW OR UPDATE` | 2250-EDIT-ARRAY | `[COCRDLIC.cbl:1073-1117]` (message `[COCRDLIC.cbl:123-124]`) |
| VR-057 | Row selection flag (per row) | Each row's selection flag must be `S`, `U`, or blank | `INVALID ACTION CODE` | 2250-EDIT-ARRAY | `[COCRDLIC.cbl:1099-1114]` (message `[COCRDLIC.cbl:125-126]`) |

## 9. Card Search/Detail — COCRDSLC (screen COCRDSL / txn CCDL)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-058 | Account filter | Optional; if supplied, must be numeric and non-zero (11 digits) | `ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER` | 2210-EDIT-ACCOUNT | `[COCRDSLC.cbl:647-679]` |
| VR-059 | Card filter | Optional; if supplied, must be numeric and non-zero (16 digits) | `CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER` | 2220-EDIT-CARD | `[COCRDSLC.cbl:685-718]` |

## 10. Card Update — COCRDUPC (screen COCRDUP / txn CCUP)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-060 | Account number (search key) | Must be supplied | `Account number not provided` | 1210-EDIT-ACCOUNT | `[COCRDUPC.cbl:721-736]` |
| VR-061 | Account number (search key) | If supplied, must be numeric (11 digits) | `ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER` | 1210-EDIT-ACCOUNT | `[COCRDUPC.cbl:738-756]` |
| VR-062 | Card number (search key) | Must be supplied | `Card number not provided` | 1220-EDIT-CARD | `[COCRDUPC.cbl:762-780]` |
| VR-063 | Card number (search key) | If supplied, must be numeric (16 digits) | `CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER` | 1220-EDIT-CARD | `[COCRDUPC.cbl:784-800]` |
| VR-064 | Card embossed name | Must be supplied | `Card name not provided` | 1230-EDIT-NAME | `[COCRDUPC.cbl:806-820]` |
| VR-065 | Card embossed name | Must contain alphabetic characters (and spaces) only | `Card name can only contain alphabets and spaces` | 1230-EDIT-NAME | `[COCRDUPC.cbl:822-838]` |
| VR-066 | Card active status | Must be supplied and be `Y` or `N` | `Card Active Status must be Y or N` | 1240-EDIT-CARDSTATUS | `[COCRDUPC.cbl:845-874]` |
| VR-067 | Card expiry month | Must be supplied, numeric, 1–12 | `Card expiry month must be between 1 and 12` | 1250-EDIT-EXPIRY-MON | `[COCRDUPC.cbl:877-910]` |
| VR-068 | Card expiry year | Must be supplied, numeric, in range 1950–2099 | `Invalid card expiry year` | 1260-EDIT-EXPIRY-YEAR | `[COCRDUPC.cbl:913-946]` |

## 11. Transaction List — COTRN00C (screen COTRN00 / txn CT00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-069 | Row selection flag | Selection code (if entered on a row) must be `S` | `Invalid selection. Valid value is S` | PROCESS-ENTER-KEY | `[COTRN00C.cbl:183-204]` |
| VR-070 | Tran ID (jump-to) | Optional; if supplied, must be numeric | `Tran ID must be Numeric ...` | PROCESS-ENTER-KEY | `[COTRN00C.cbl:206-219]` |

## 12. Transaction View — COTRN01C (screen COTRN01 / txn CT01)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-071 | Tran ID | Must be supplied (not spaces/low-values) | `Tran ID can NOT be empty...` | PROCESS-ENTER-KEY | `[COTRN01C.cbl:146-155]` |

*("Transaction ID NOT found..." at `COTRN01C.cbl:283-288` is a file-lookup outcome,
not a shape validation — excluded, see §1.2.)*

## 13. Transaction Add — COTRN02C (screen COTRN02 / txn CT02)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-072 | Account ID | If supplied, must be numeric | `Account ID must be Numeric...` | VALIDATE-INPUT-KEY-FIELDS | `[COTRN02C.cbl:196-203]` |
| VR-073 | Card Number | If supplied, must be numeric | `Card Number must be Numeric...` | VALIDATE-INPUT-KEY-FIELDS | `[COTRN02C.cbl:210-217]` |
| VR-074 | Account ID / Card Number (cross-field) | At least one of Account ID or Card Number must be entered | `Account or Card Number must be entered...` | VALIDATE-INPUT-KEY-FIELDS | `[COTRN02C.cbl:224-230]` |
| VR-075 | Type Code | Must be supplied | `Type CD can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:252-257]` |
| VR-076 | Category Code | Must be supplied | `Category CD can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:258-263]` |
| VR-077 | Source | Must be supplied | `Source can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:264-269]` |
| VR-078 | Description | Must be supplied | `Description can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:270-275]` |
| VR-079 | Amount | Must be supplied | `Amount can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:276-281]` |
| VR-080 | Orig Date | Must be supplied | `Orig Date can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:282-287]` |
| VR-081 | Proc Date | Must be supplied | `Proc Date can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:288-293]` |
| VR-082 | Merchant ID | Must be supplied | `Merchant ID can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:294-299]` |
| VR-083 | Merchant Name | Must be supplied | `Merchant Name can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:300-305]` |
| VR-084 | Merchant City | Must be supplied | `Merchant City can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:306-311]` |
| VR-085 | Merchant Zip | Must be supplied | `Merchant Zip can NOT be empty...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:312-317]` |
| VR-086 | Type Code | Must be numeric | `Type CD must be Numeric...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:322-328]` |
| VR-087 | Category Code | Must be numeric | `Category CD must be Numeric...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:329-334]` |
| VR-088 | Amount | Must match the fixed format `-99999999.99` (sign, 8 digits, decimal point, 2 digits — checked positionally) | `Amount should be in format -99999999.99` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:339-351]` |
| VR-089 | Orig Date | Must match format `YYYY-MM-DD` (checked positionally) | `Orig Date should be in format YYYY-MM-DD` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:353-366]` |
| VR-090 | Proc Date | Must match format `YYYY-MM-DD` (checked positionally) | `Proc Date should be in format YYYY-MM-DD` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:368-381]` |
| VR-091 | Orig Date | Must be a valid calendar date (only checked if VR-089 format check passed), via `CALL 'CSUTLDTC'` | `Orig Date - Not a valid date...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:389-407]` |
| VR-092 | Proc Date | Must be a valid calendar date (only checked if VR-090 format check passed), via `CALL 'CSUTLDTC'` | `Proc Date - Not a valid date...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:409-427]` |
| VR-093 | Merchant ID | Must be numeric | `Merchant ID must be Numeric...` | VALIDATE-INPUT-DATA-FIELDS | `[COTRN02C.cbl:430-436]` |
| VR-094 | Confirm (add transaction) | Must be `Y`/`N`; blank is treated as "not confirmed" | `Confirm to add this transaction...` (blank) / `Invalid value. Valid values are (Y/N)...` (other) | PROCESS-ENTER-KEY | `[COTRN02C.cbl:169-188]` |

## 14. Bill Payment — COBIL00C (screen COBIL00 / txn CB00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-095 | Account ID | Must be supplied | `Acct ID can NOT be empty...` | PROCESS-ENTER-KEY | `[COBIL00C.cbl:158-167]` |
| VR-096 | Confirm (make payment) | Must be `Y`/`N`/blank; any other value is rejected | `Invalid value. Valid values are (Y/N)...` | PROCESS-ENTER-KEY | `[COBIL00C.cbl:185-190]` |
| VR-097 | Confirm (make payment) | If Account ID valid but confirm not yet `Y`, user must confirm before payment is posted | `Confirm to make a bill payment...` | PROCESS-ENTER-KEY | `[COBIL00C.cbl:236-240]` |

## 15. Report Request — CORPT00C (screen CORPT00 / txn CR00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-098 | Report type | One of Monthly / Yearly / Custom date range must be selected | `Select a report type to print report...` | MAIN-PARA / report-type EVALUATE | `[CORPT00C.cbl:437-442]` |
| VR-099 | Start Date - Month | Must be supplied (custom report) | `Start Date - Month can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:259-265]` |
| VR-100 | Start Date - Day | Must be supplied (custom report) | `Start Date - Day can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:266-272]` |
| VR-101 | Start Date - Year | Must be supplied (custom report) | `Start Date - Year can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:273-279]` |
| VR-102 | End Date - Month | Must be supplied (custom report) | `End Date - Month can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:280-286]` |
| VR-103 | End Date - Day | Must be supplied (custom report) | `End Date - Day can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:287-293]` |
| VR-104 | End Date - Year | Must be supplied (custom report) | `End Date - Year can NOT be empty...` | Custom date-range EVALUATE | `[CORPT00C.cbl:294-300]` |
| VR-105 | Start Date - Month | Must be numeric and ≤ 12 | `Start Date - Not a valid Month...` | after required-field checks | `[CORPT00C.cbl:329-336]` |
| VR-106 | Start Date - Day | Must be numeric and ≤ 31 | `Start Date - Not a valid Day...` | after required-field checks | `[CORPT00C.cbl:338-345]` |
| VR-107 | Start Date - Year | Must be numeric | `Start Date - Not a valid Year...` | after required-field checks | `[CORPT00C.cbl:347-353]` |
| VR-108 | End Date - Month | Must be numeric and ≤ 12 | `End Date - Not a valid Month...` | after required-field checks | `[CORPT00C.cbl:355-362]` |
| VR-109 | End Date - Day | Must be numeric and ≤ 31 | `End Date - Not a valid Day...` | after required-field checks | `[CORPT00C.cbl:364-371]` |
| VR-110 | End Date - Year | Must be numeric | `End Date - Not a valid Year...` | after required-field checks | `[CORPT00C.cbl:373-379]` |
| VR-111 | Start Date (composed) | Must be a valid calendar date (only checked once VR-099/101/105/106/107 all pass), via `CALL 'CSUTLDTC'` | `Start Date - Not a valid date...` | after range checks | `[CORPT00C.cbl:388-406]` |
| VR-112 | End Date (composed) | Must be a valid calendar date (only checked once VR-102/104/108/109/110 all pass), via `CALL 'CSUTLDTC'` | `End Date - Not a valid date...` | after range checks | `[CORPT00C.cbl:408-426]` |
| VR-113 | Confirm (print report) | Must be supplied | `Please confirm to print the <report> report...` (report name is interpolated) | SUBMIT-JOB-TO-INTRDR | `[CORPT00C.cbl:464-474]` |
| VR-114 | Confirm (print report) | Must be `Y`/`N`; any other value rejected | `"<value>" is not a valid value to confirm...` (entered value is interpolated) | SUBMIT-JOB-TO-INTRDR | `[CORPT00C.cbl:484-493]` |

## 16. User List — COUSR00C (screen COUSR00 / txn CU00)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-115 | Row selection flag | Selection code (if entered on a row) must be `U` or `D` | `Invalid selection. Valid values are U and D` | PROCESS-ENTER-KEY | `[COUSR00C.cbl:189-215]` |

## 17. Add User — COUSR01C (screen COUSR01 / txn CU01)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-116 | First Name | Must be supplied | `First Name can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR01C.cbl:117-123]` |
| VR-117 | Last Name | Must be supplied | `Last Name can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR01C.cbl:124-129]` |
| VR-118 | User ID | Must be supplied | `User ID can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR01C.cbl:130-135]` |
| VR-119 | Password | Must be supplied | `Password can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR01C.cbl:136-141]` |
| VR-120 | User Type | Must be supplied | `User Type can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR01C.cbl:142-147]` |

> **Note (gap):** COUSR01C does not itself re-check that the supplied User Type is
> restricted to the two defined code values `A` (Admin) or `U` (User) — those code
> values are defined only as 88-levels `CDEMO-USRTYP-ADMIN`/`CDEMO-USRTYP-USER` in
> `[COCOM01Y.cpy:26-28]` and are interpreted later (at sign-on, `COSGN00C.cbl:230`)
> rather than validated against at entry time. No explicit code/value-list rejection
> message exists in COUSR01C for an out-of-range User Type — flagged here for
> traceability rather than invented as a rule.

## 18. Update User — COUSR02C (screen COUSR02 / txn CU02)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-121 | User ID (lookup) | Must be supplied | `User ID can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR02C.cbl:145-155]` |
| VR-122 | User ID (update) | Must be supplied | `User ID can NOT be empty...` | UPDATE-USER-INFO | `[COUSR02C.cbl:179-185]` |
| VR-123 | First Name (update) | Must be supplied | `First Name can NOT be empty...` | UPDATE-USER-INFO | `[COUSR02C.cbl:186-191]` |
| VR-124 | Last Name (update) | Must be supplied | `Last Name can NOT be empty...` | UPDATE-USER-INFO | `[COUSR02C.cbl:192-197]` |
| VR-125 | Password (update) | Must be supplied | `Password can NOT be empty...` | UPDATE-USER-INFO | `[COUSR02C.cbl:198-203]` |
| VR-126 | User Type (update) | Must be supplied | `User Type can NOT be empty...` | UPDATE-USER-INFO | `[COUSR02C.cbl:204-209]` |

## 19. Delete User — COUSR03C (screen COUSR03 / txn CU03)

| ID | Field(s) | Rule | Error Message | Trigger | Source |
|---|---|---|---|---|---|
| VR-127 | User ID (lookup) | Must be supplied | `User ID can NOT be empty...` | PROCESS-ENTER-KEY | `[COUSR03C.cbl:144-154]` |
| VR-128 | User ID (delete confirm) | Must be supplied | `User ID can NOT be empty...` | DELETE-USER-INFO | `[COUSR03C.cbl:176-186]` |

## 20. Summary

**Total validation rules catalogued: 130** (IDs `VR-001` – `VR-128`, plus two lettered
sub-items `VR-030b` and `VR-030c` in §7.3's field-application table — each identifies
a distinct field-level validation invocation, so the per-program counts below sum to
130).

| Program | Screen | Rule count |
|---|---|---|
| COSGN00C | COSGN00 | 2 |
| COMEN01C | COMEN01 | 1 |
| COADM01C | COADM01 | 1 |
| COACTVWC | COACTVW | 2 |
| COACTUPC | COACTUP | 49 |
| COCRDLIC | COCRDLI | 4 |
| COCRDSLC | COCRDSL | 2 |
| COCRDUPC | COCRDUP | 9 |
| COTRN00C | COTRN00 | 2 |
| COTRN01C | COTRN01 | 1 |
| COTRN02C | COTRN02 | 23 |
| COBIL00C | COBIL00 | 3 |
| CORPT00C | CORPT00 | 17 |
| COUSR00C | COUSR00 | 1 |
| COUSR01C | COUSR01 | 5 |
| COUSR02C | COUSR02 | 6 |
| COUSR03C | COUSR03 | 2 |

See `validation-dependencies.svg` for a diagram of cross-field/conditional
dependencies (e.g. FICO range check gated by numeric-required check; state+zip
cross-check gated by individually-valid state and zip; date leap-year/DOB checks
gated by year/month/day format checks) and shared-editor reuse across screens.
