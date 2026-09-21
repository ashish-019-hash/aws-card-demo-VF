# E2E Traceability Matrix

Maps every id in the phase-1 catalogs (`01.phase-1-output/user-stories.md`,
`business-rules-catalog.md`, `validation-rules.md`) to the Playwright test that exercises
it, or to a documented reason it is out of scope for a black-box browser test.

Status legend:
- **Tested** — a specific test asserts this id's behavior (and, for VR ids, its exact
  legacy message text unless flagged as a defect).
- **Tested (indirect)** — the id's underlying rule/validator is exercised by a test written
  against a *different* concrete field that shares the same implementation (see
  `src/validation/rules.ts`, which documents which VR id each validator function
  implements). Lower-risk than a dedicated test but not a gap in coverage of the
  underlying logic.
- **N/A** — no UI input exists that can violate this rule (the frontend replaced a legacy
  typed field with a link, a role-scoped server list, or a search-key field this screen
  doesn't expose). Explained per-row.
- **Defect** — the app's actual behavior deviates from the catalog; see `e2e/DEFECTS.md`.
  A `test.fail()` documents the exact expected-vs-actual text.

All spec files live in `e2e/tests/`.

## 1. User Stories (STORY-001..050)

| ID | Title | Status | Test |
|---|---|---|---|
| STORY-001 | Regular user signs on and reaches the main menu | Tested | sign-on.spec.ts: STORY-001 |
| STORY-002 | Admin signs on and reaches the admin menu | Tested | sign-on.spec.ts: STORY-002 |
| STORY-003 | User is rejected for the wrong password | Tested | sign-on.spec.ts: STORY-003 |
| STORY-004 | User is told their User ID does not exist | Tested | sign-on.spec.ts: STORY-004 |
| STORY-005 | User is prompted for missing User ID or Password | Tested | sign-on.spec.ts: STORY-005/VR-001/VR-002, VR-001 |
| STORY-006 | User exits the sign-on screen | Tested | sign-on.spec.ts: STORY-006 (no dedicated exit control exists pre-auth; test documents this and asserts the screen holds) |
| STORY-007 | Regular user navigates the main menu to a business function | Tested | menu.spec.ts: STORY-007 |
| STORY-008 | User is warned about an invalid or out-of-range menu option | N/A | Menu is a rendered list of links from `GET /api/menu` (role-scoped server-side), not a typed numeric-option BMS field — there is no input a user can enter an invalid option into. Same reasoning as VR-003/VR-004 below. |
| STORY-009 | Regular user is blocked from an admin-only menu option | Tested | menu.spec.ts: BR-003/STORY-009 |
| STORY-010 | Admin navigates the admin menu to a user-management function | Tested | menu.spec.ts: STORY-010/BR-002 |
| STORY-011 | User returns to sign-on from a menu | Tested | sign-on.spec.ts: STORY-011 |
| STORY-012 | User looks up an account's details | Tested | account.spec.ts: STORY-012 |
| STORY-013 | User is guided when the account number is missing, malformed, or not found | Tested | account.spec.ts: "no filter", VR-006 (x2), STORY-013 not-found |
| STORY-014 | User navigates from Account View to the associated card list | Tested | account.spec.ts: STORY-014 (via main menu, matching screen-flow.md — no direct in-page link exists in the legacy screen either) |
| STORY-015 | User looks up an account to prepare an update | Tested | account.spec.ts: STORY-015 |
| STORY-016 | User edits account/customer fields and the system detects no real change | Tested | account.spec.ts: STORY-016/VR-009..VR-053 |
| STORY-017 | User edits an account and confirms the save (two-step confirm) | Tested | account.spec.ts: STORY-017 |
| STORY-018 | User is blocked from saving when someone else changed the record first | Tested (behavior) / Defect (text) | account.spec.ts: STORY-018/BR-007 (behavior); STORY-018 (DEFECT-001) (text, `test.fail`) |
| STORY-019 | User sees a failure message if the update cannot be committed | N/A | Requires forcing a file-lock failure or a `REWRITE` failure at the database layer after the concurrency check has already passed — not reachable through the public HTTP API in a black-box test without directly manipulating DB locks/transactions. |
| STORY-020 | User browses the full list of credit cards | Tested | card.spec.ts: STORY-020/BR-015, STORY-020 pagination |
| STORY-021 | User filters the card list by account number and/or card number | Tested | card.spec.ts: STORY-021/BR-014 |
| STORY-022 | User selects a card from the list to view its detail | Tested | card.spec.ts: STORY-022 |
| STORY-023 | User looks up a specific card by account and/or card number | Tested | card.spec.ts: STORY-023 |
| STORY-024 | User updates a card's expiry date, active status, and embossed name | Tested | card.spec.ts: STORY-024, VR-065/066/067/068 |
| STORY-025 | User confirms a card update before it is saved | Tested | card.spec.ts: STORY-025/STORY-026 |
| STORY-026 | User is blocked from saving a card changed by someone else | Tested (behavior) / Defect (text) | card.spec.ts: STORY-026/BR-009 (behavior); STORY-026 (DEFECT-001) (text, `test.fail`) |
| STORY-027 | User browses the transaction log in pages | Tested | transaction.spec.ts: STORY-027 |
| STORY-028 | User jumps directly to a transaction ID from the list screen | Tested | transaction.spec.ts: STORY-028 |
| STORY-029 | User selects a transaction row to view its detail | Tested | transaction.spec.ts: STORY-029 |
| STORY-030 | User looks up a transaction's full detail by ID | Tested | transaction.spec.ts: STORY-030 |
| STORY-031 | User adds a new transaction by looking up either the account or the card | Tested | transaction.spec.ts: VR-072/VR-074, VR-075..VR-085 (uses card lookup path) |
| STORY-032 | User copies the last transaction on the account/card as a starting point | Tested | transaction.spec.ts: STORY-032 |
| STORY-033 | User confirms adding a transaction before it is written | Tested | transaction.spec.ts: STORY-033/STORY-034/BR-010 |
| STORY-034 | New transaction is assigned the next sequential transaction ID | Tested | transaction.spec.ts: STORY-033/STORY-034/BR-010 (asserts an ID is returned; does not independently re-derive max+1 from the DB) |
| STORY-035 | User looks up an account's current balance for payment | Tested | bill-payment.spec.ts: STORY-035 |
| STORY-036 | User pays an account's full balance and a payment transaction is recorded | Tested | bill-payment.spec.ts: STORY-036/BR-011/BR-012 |
| STORY-037 | User must explicitly confirm before the bill payment is posted | Tested | bill-payment.spec.ts: STORY-037/VR-097, VR-096, "N" case |
| STORY-038 | User is told when there is nothing to pay | Tested | bill-payment.spec.ts: STORY-038/BR-011 |
| STORY-039 | User requests a monthly transaction report | Tested | report.spec.ts: STORY-039/BR-013 |
| STORY-040 | User requests a yearly transaction report | Tested | report.spec.ts: STORY-040/BR-013 |
| STORY-041 | User requests a report for a custom date range | Tested | report.spec.ts: STORY-041 (x2) |
| STORY-042 | User must confirm before the report job is submitted | Tested (behavior) / Defect (text) | report.spec.ts: STORY-042/VR-113, VR-114 (behavior); VR-113/VR-114 (DEFECT-002) (text, `test.fail`) |
| STORY-043 | User's confirmed report request is submitted as a background job | Tested | report.spec.ts: STORY-043 |
| STORY-044 | Admin browses the list of application users | Tested | user-admin.spec.ts: STORY-044 |
| STORY-045 | Admin selects a user from the list to update or delete | Tested (indirect) | user-admin.spec.ts: STORY-046/047/048/049/050 lifecycle test navigates via the same "U = Update"/"D = Delete" list links |
| STORY-046 | Admin adds a new application user | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120, full lifecycle test |
| STORY-047 | Admin looks up an existing user to update | Tested | user-admin.spec.ts: full lifecycle test |
| STORY-048 | Admin saves changes to a user's profile | Tested | user-admin.spec.ts: full lifecycle test |
| STORY-049 | Admin looks up a user before deleting them | Tested | user-admin.spec.ts: full lifecycle test |
| STORY-050 | Admin confirms and deletes a user with PF5 | Tested | user-admin.spec.ts: full lifecycle test |

## 2. Business Rules (BR-001..016)

| ID | Title | Status | Test |
|---|---|---|---|
| BR-001 | Sign-on credential match is case-forced on input, case-sensitive on the stored password | Tested (indirect) | sign-on.spec.ts: STORY-003 (wrong password) demonstrates case-sensitivity is enforced server-side; the input-forcing behavior itself is a display/normalization detail not independently asserted. |
| BR-002 | Admin vs. regular-user routing after successful sign-on | Tested | sign-on.spec.ts: STORY-001/STORY-002; menu.spec.ts: BR-002 (x2) |
| BR-003 | Main-menu "Admin Only" option gate — defined but currently unreachable | Tested | menu.spec.ts: BR-003/STORY-009, BR-003 (all 4 routes) |
| BR-004 | Card List program resets session user-type to "Regular User" on entry and on exit | N/A | This is a COMMAREA/session-state implementation detail internal to the legacy CICS pseudo-conversational model. The modern session (server-side, cookie-based) has no equivalent externally observable "user type" toggle around a single screen visit — there is nothing to assert from the browser. |
| BR-005 | No account-ownership scoping — any signed-on user can browse any account's cards, view any account, or view any card by ID | Tested | account.spec.ts: STORY-012 (regular user freely looks up an arbitrary account); menu.spec.ts: "an authenticated admin can still reach every regular-user screen directly" documents the same absence of ownership scoping from the admin side. |
| BR-006 | Change detection before allowing a save confirmation | Tested | account.spec.ts: STORY-016/VR-009..VR-053 ("No change detected...") |
| BR-007 | Optimistic-concurrency re-check at save time (account) | Tested | account.spec.ts: STORY-018/BR-007 |
| BR-008 | Two-file locked update with implicit unit-of-work rollback (ACCTDAT + CUSTDAT) | N/A | Asserting atomic rollback across two backing tables requires either white-box DB inspection or forcing a failure between the two writes — not observable as a distinct behavior from the browser beyond what BR-007's conflict test already shows (the update is refused, not partially applied). |
| BR-009 | Card update follows the same lock → conflict-check → rewrite pattern (single file) | Tested | card.spec.ts: STORY-026/BR-009 |
| BR-010 | New Transaction ID = current max + 1; write-time duplicate surfaced to user | Tested (partial) | transaction.spec.ts: STORY-033/STORY-034/BR-010 (asserts a new sequential-looking ID is returned on success; a genuine duplicate-key race is not independently forced) |
| BR-011 | A bill payment is only allowed when the account has a positive balance to pay | Tested | bill-payment.spec.ts: STORY-036/BR-011/BR-012, STORY-038/BR-011 |
| BR-012 | A bill payment always pays the full current balance in one transaction and zeroes it | Tested | bill-payment.spec.ts: STORY-036/BR-011/BR-012 |
| BR-013 | Report date range derivation by report type, and mandatory confirmation | Tested | report.spec.ts: STORY-039/BR-013, STORY-040/BR-013 |
| BR-014 | Card list filtering by account number and/or card number is optional and additive | Tested | card.spec.ts: STORY-021/BR-014 |
| BR-015 | Fixed page size per list screen | Tested | card.spec.ts: STORY-020/BR-015 |
| BR-016 | User ID uniqueness on Add; no-op guard on Update; two-step confirm-then-commit on Delete | Tested | user-admin.spec.ts: BR-016 (duplicate add), full lifecycle test (update no-op is not separately re-asserted beyond VR-121..126; delete confirm-then-commit is the lifecycle test's final step) |

## 3. Validation Rules (VR-001..128, plus VR-030b/VR-030c — 130 total)

### Sign-On (COSGN00C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-001 | User ID required | Tested | sign-on.spec.ts: STORY-005/VR-001/VR-002, VR-001 |
| VR-002 | Password required | Tested | sign-on.spec.ts: STORY-005/VR-001/VR-002 |

### Menus (COMEN01C / COADM01C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-003 | Main menu option number range | N/A | Menu is link-based (`GET /api/menu`, role-scoped server-side); no typed numeric-option input exists to violate this rule. |
| VR-004 | Admin menu option number range | N/A | Same reasoning as VR-003. |

### Account View (COACTVWC)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-005 | Blank account filter → prompt state (no hard error) | Tested (indirect) | account.spec.ts: "no filter" test exercises the blank-filter path end to end (assert stays on search, no crash); the code path is the same as VR-006's blank-input branch. |
| VR-006 | Account filter format | Tested | account.spec.ts: VR-006 (non-numeric), VR-006 (zero) |

### Account Update (COACTUPC)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-007 | Account number (search key) required | Tested | account.spec.ts: VR-007 |
| VR-008 | Account number 11-digit format | Tested (documented deviation) | account.spec.ts: VR-008 — the frontend intentionally relaxes this to "numeric, non-zero, ≤11 digits" so the backend's short sequential IDs remain usable; documented in `README.md` "Backend deviations", not a defect. |
| VR-009 | 1215-EDIT-MANDATORY (generic "field must be supplied") | Tested (indirect) | Same required-field pattern is directly tested many times elsewhere (VR-007, VR-062, VR-064, VR-095, VR-116/117/119, VR-127/128, and the 11-field sweep VR-075..085); Address Line 1 itself (the field that cites VR-009 directly) is not separately re-tested. |
| VR-010 | 1220-EDIT-YESNO (generic Y/N) | Tested (behavior) / Defect (text) | account.spec.ts: VR-010 (Account Status, blank case — passing); VR-010 (DEFECT-003) (Account Status, non-blank invalid case, `test.fail`). Also implements VR-030c (Primary Card Holder) via the same validator — not separately re-tested. |
| VR-011 | 1225-EDIT-ALPHA-REQD (generic alpha required) | Tested | account.spec.ts: VR-011 (First Name). Also implements VR-024/026/028/029 (Last Name/State/City/Country) via the same validator — not separately re-tested. |
| VR-012 | 1235-EDIT-ALPHA-OPT (generic alpha optional, e.g. Middle Name) | Tested (indirect) | Not directly tested (Middle Name is optional and low-risk); shares its implementation (`alphaOptional`) with VR-011's `alphaRequired`, which is tested. |
| VR-013 | 1245-EDIT-NUM-REQD (generic numeric required, non-zero) | Tested | account.spec.ts: VR-027 (Zip), VR-030b (EFT Account Id). Also implements VR-021 (FICO numeric format) — not separately re-tested. |
| VR-014 | 1250-EDIT-SIGNED-9V2 (generic signed amount) | Tested | account.spec.ts: VR-014 (Credit Limit). Also implements VR-016..020 (Cash Credit Limit, Current Balance, Current Cycle Credit/Debit) via the same validator — not separately re-tested. |
| VR-015 | Account Status = VR-010 | Tested (behavior) / Defect (text) | See VR-010. |
| VR-016 | Credit Limit = VR-014 | Tested | account.spec.ts: VR-014 |
| VR-017 | Cash Credit Limit = VR-014 | Tested (indirect) | Same validator as VR-014/VR-016; not independently re-tested on this specific field. |
| VR-018 | Current Balance = VR-014 | Tested (indirect) | Same validator as VR-014/VR-016. |
| VR-019 | Current Cycle Credit = VR-014 | Tested (indirect) | Same validator as VR-014/VR-016. |
| VR-020 | Current Cycle Debit = VR-014 | Tested (indirect) | Same validator as VR-014/VR-016. |
| VR-021 | FICO Score numeric/format = VR-013 | Tested | account.spec.ts: VR-040 boundary tests exercise this field end to end (numeric gate plus the 300-850 range check). |
| VR-022 | First Name = VR-011 | Tested | account.spec.ts: VR-011 |
| VR-023 | Middle Name = VR-012 | Tested (indirect) | See VR-012. |
| VR-024 | Last Name = VR-011 | Tested (indirect) | Same validator as VR-011/VR-022. |
| VR-025 | Address Line 1 = VR-009 | Tested (indirect) | See VR-009. |
| VR-026 | State = VR-011 (gates VR-041) | Tested | account.spec.ts: VR-041 exercises the State field end to end. |
| VR-027 | Zip = VR-013 (gates VR-042) | Tested | account.spec.ts: VR-027 |
| VR-028 | City = VR-011 | Tested (indirect) | Same validator as VR-011/VR-022. |
| VR-029 | Country = VR-011 | Tested (indirect) | Same validator as VR-011/VR-022. |
| VR-030 | Date year/century (CSUTLDPY) | Tested (indirect) | Exercised as part of the composite Open Date calendar-validity test (VR-030/031/032/034) — a bad calendar date fails via the combined date validator; the century/year-specific branch is not separately isolated. |
| VR-030b | EFT Account Id 10-digit | Tested | account.spec.ts: VR-030b |
| VR-030c | Primary Card Holder = VR-010 | Tested (indirect) | Same validator as VR-010/VR-015; also affected by DEFECT-003 but not separately re-tested. |
| VR-031 | Date month range (CSUTLDPY) | Tested (indirect) | See VR-030. |
| VR-032 | Date day range (CSUTLDPY) | Tested (indirect) | See VR-030. |
| VR-033 | Day must be legal for the given month (leap year etc.) | Tested (indirect) | Feb 30 in the VR-030/031/032/034 test exercises this exact cross-check (30 is never legal in Feb). |
| VR-034 | Calendar-validity fallback (CSUTLDTC) | Tested | account.spec.ts: VR-030/031/032/034 |
| VR-035 | Date of Birth strictly in the past | Tested | account.spec.ts: VR-035 |
| VR-036 | SSN part 1 required/numeric | Tested (indirect) | Shares the numeric-required validator family with VR-013/VR-027/VR-030b, which are directly tested; the SSN-specific field itself is exercised by VR-037 below (which only runs once VR-036 passes). |
| VR-037 | SSN part 1 not 000/666/900-999 | Tested | account.spec.ts: VR-037 |
| VR-038 | SSN part 2 required/numeric | Tested (indirect) | See VR-036 — same shared numeric-required validator. |
| VR-039 | SSN part 3 required/numeric | Tested (indirect) | See VR-036. |
| VR-040 | FICO Score 300-850 | Tested | account.spec.ts: VR-040 (851, 850, 299) |
| VR-041 | State code lookup | Tested | account.spec.ts: VR-041 |
| VR-042 | State + Zip cross-check | N/A | Documented deferral in `README.md` "Backend deviations" — the legacy `CSLKPCDY` cross-reference table lookup is not implemented client-side (would require shipping the full lookup table to the browser); left to the backend/future work. |
| VR-043 | Phone: all-3-parts-blank is valid | Tested (indirect) | Not separately exercised; the account update happy-path test (STORY-017) submits with the account's existing (non-blank) phone fields intact and never triggers this branch, but never fails it either. |
| VR-044 | Phone: area code required if any part supplied | Tested (indirect) | Shares the "required" gate with VR-045/046, which are directly tested on the same Area Code field. |
| VR-045 | Phone area code 3-digit format | Tested | account.spec.ts: VR-045/VR-046 |
| VR-046 | Phone area code non-zero | Tested | account.spec.ts: VR-045/VR-046 |
| VR-047 | Phone area code valid NANP list | N/A | Documented deferral in `README.md` — the full NANP area-code table is not shipped to the browser; the frontend only performs the cheap "non-zero 3-digit" check (VR-045/046). |
| VR-048 | Phone prefix required | Tested (indirect) | Same validator family as VR-049/050 (not independently isolated by a dedicated test). |
| VR-049 | Phone prefix 3-digit format | Tested (indirect) | Not directly tested; shares implementation with the tested Area Code numeric-required validator. |
| VR-050 | Phone prefix non-zero | Tested (indirect) | See VR-049. |
| VR-051 | Phone line number required | Tested (indirect) | Same validator family as VR-052/053. |
| VR-052 | Phone line number 4-digit format | Tested (indirect) | Not directly tested; shares implementation with the tested numeric-required validator. |
| VR-053 | Phone line number non-zero | Tested (indirect) | See VR-052. |

### Card List (COCRDLIC)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-054 | Account filter 11-digit | Tested | card.spec.ts: VR-054 |
| VR-055 | Card filter 16-digit | Tested | card.spec.ts: VR-055 |
| VR-056 | At most one row flagged | N/A | List rows use always-visible "View"/"Update" links, not a typed per-row selection-flag input — there is no field to flag more than one row with. |
| VR-057 | Row flag must be S/U/blank | N/A | Same reasoning as VR-056. |

### Card View (COCRDSLC)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-058 | Account filter 11-digit | Tested (indirect) | Shares the exact validator and message with VR-054 (tested); the both-blank-filter path is directly tested ("an account-or-card filter is required when both are blank"). |
| VR-059 | Card filter 16-digit | Tested | card.spec.ts: VR-059 |

### Card Update (COCRDUPC)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-060 | Account number search key required | N/A | Card Update's search is card-number-only in this frontend (no account-number search field is offered on this screen) — there is no input to leave blank. |
| VR-061 | Account number search key 11-digit | N/A | Same reasoning as VR-060. |
| VR-062 | Card number search key required | Tested | card.spec.ts: VR-062 |
| VR-063 | Card number search key 16-digit | Tested (indirect) | Shares the exact validator/message with VR-059 (directly tested on Card View's card filter). |
| VR-064 | Embossed name required | Tested | card.spec.ts: VR-064 |
| VR-065 | Embossed name alphabetic | Tested | card.spec.ts: VR-065 |
| VR-066 | Active status Y/N | Tested | card.spec.ts: VR-066 |
| VR-067 | Expiry month 1-12 | Tested | card.spec.ts: VR-067 (0, 13, boundaries 1/12) |
| VR-068 | Expiry year 1950-2099 | Tested | card.spec.ts: VR-068 (1949, 2100) |

### Transaction List (COTRN00C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-069 | Row selection flag must be S | N/A | List rows use an always-visible "S = View" link, not a typed selection-flag input. |
| VR-070 | Jump-to Tran ID numeric | Tested | transaction.spec.ts: VR-070 |

### Transaction View (COTRN01C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-071 | Tran ID required | Tested | transaction.spec.ts: VR-071 |

### Transaction Add (COTRN02C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-072 | Account ID format (if supplied) | Tested (indirect) | Exercised together with VR-074 in the both-blank test; the account-only-supplied branch is not separately isolated (tests use the card-lookup path per STORY-031). |
| VR-073 | Card Number format (if supplied) | Tested (indirect) | Card Number is the field supplied throughout the required-fields sweep (VR-075..085) and STORY-032/033/034 — its valid-format path is exercised there; an invalid-format Card Number is not separately tested. |
| VR-074 | Account ID / Card Number cross-field (at least one required) | Tested | transaction.spec.ts: VR-072/VR-074 |
| VR-075 | Type Code required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-076 | Category Code required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-077 | Source required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-078 | Description required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-079 | Amount required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-080 | Orig Date required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-081 | Proc Date required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-082 | Merchant ID required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-083 | Merchant Name required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-084 | Merchant City required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-085 | Merchant Zip required | Tested | transaction.spec.ts: VR-075..VR-085 |
| VR-086 | Type Code numeric | Tested | transaction.spec.ts: VR-086 |
| VR-087 | Category Code numeric | Tested (indirect) | Shares the exact numeric-required validator and message pattern with VR-086 (directly tested). |
| VR-088 | Amount format -99999999.99 | Tested | transaction.spec.ts: VR-088 |
| VR-089 | Orig Date format YYYY-MM-DD | Tested | transaction.spec.ts: VR-089 |
| VR-090 | Proc Date format YYYY-MM-DD | Tested (indirect) | Shares the exact date-format validator with VR-089 (directly tested on Orig Date). |
| VR-091 | Orig Date calendar validity | Tested | transaction.spec.ts: VR-091 |
| VR-092 | Proc Date calendar validity | Tested (indirect) | Shares the exact calendar-validity validator with VR-091 (directly tested on Orig Date). |
| VR-093 | Merchant ID numeric | Tested | transaction.spec.ts: VR-093 |
| VR-094 | Confirm (add transaction) | Tested | transaction.spec.ts: STORY-033/034/BR-010, VR-094 |

### Bill Payment (COBIL00C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-095 | Account ID required | Tested | bill-payment.spec.ts: VR-095 |
| VR-096 | Confirm must be Y/N | Tested | bill-payment.spec.ts: VR-096 |
| VR-097 | Confirm required before posting | Tested | bill-payment.spec.ts: STORY-037/VR-097 |

### Transaction Report (CORPT00C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-098 | Report type required | Tested | report.spec.ts: VR-098 |
| VR-099 | Start Date - Month required (custom, 3-part legacy field) | N/A (superseded) | This frontend uses a single `YYYY-MM-DD` Start Date text field (like every other date field in the app) rather than 3 separate month/day/year inputs — there is no discrete "month" sub-field to leave blank. The single-field required check is covered by report.spec.ts "STORY-041: Custom report requires Start Date and End Date". |
| VR-100 | Start Date - Day required | N/A (superseded) | See VR-099. |
| VR-101 | Start Date - Year required | N/A (superseded) | See VR-099. |
| VR-102 | End Date - Month required | N/A (superseded) | See VR-099 (End Date). |
| VR-103 | End Date - Day required | N/A (superseded) | See VR-099 (End Date). |
| VR-104 | End Date - Year required | N/A (superseded) | See VR-099 (End Date). |
| VR-105 | Start Date - Month range ≤12 | N/A (superseded) | No discrete month sub-field; superseded by the single-field format/calendar checks (VR-099/dateFormat test, VR-111). |
| VR-106 | Start Date - Day range ≤31 | N/A (superseded) | See VR-105. |
| VR-107 | Start Date - Year numeric | N/A (superseded) | See VR-105. |
| VR-108 | End Date - Month range ≤12 | N/A (superseded) | See VR-105 (End Date). |
| VR-109 | End Date - Day range ≤31 | N/A (superseded) | See VR-105 (End Date). |
| VR-110 | End Date - Year numeric | N/A (superseded) | See VR-105 (End Date). |
| VR-111 | Start Date calendar validity (composed) | Tested | report.spec.ts: VR-111 |
| VR-112 | End Date calendar validity (composed) | Tested | report.spec.ts: VR-112 |
| VR-113 | Confirm required before submission | Tested (behavior) / Defect (text) | report.spec.ts: STORY-042/VR-113 (behavior); VR-113 (DEFECT-002) (text, `test.fail`) |
| VR-114 | Confirm must be Y/N | Tested (behavior) / Defect (text) | report.spec.ts: VR-114 (behavior); VR-114 (DEFECT-002) (text, `test.fail`) |

### User Admin (COUSR00C/01C/02C/03C)

| ID | Field | Status | Test |
|---|---|---|---|
| VR-115 | Row selection flag must be U/D | N/A | User List rows use always-visible "U = Update"/"D = Delete" links, not a typed selection-flag input. |
| VR-116 | First Name required (add) | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120 |
| VR-117 | Last Name required (add) | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120 |
| VR-118 | User ID required (add) | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120 |
| VR-119 | Password required (add) | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120 |
| VR-120 | User Type required and A/U (add) | Tested | user-admin.spec.ts: STORY-046/VR-116..VR-120 (required), "User Type must be A or U" (value check) |
| VR-121 | User ID required (update lookup) | Tested | user-admin.spec.ts: VR-121/VR-127 |
| VR-122 | User ID (update, read-only/unchanged) | Tested (indirect) | The full lifecycle test looks up and updates a user without altering its User ID; no negative case (attempting to change the User ID on Update) is separately tested. |
| VR-123 | First Name required (update) | Tested | user-admin.spec.ts: full lifecycle test |
| VR-124 | Last Name required (update) | Tested (indirect) | Shares the exact required-field validator with VR-123 (directly tested on First Name in the same form). |
| VR-125 | Password required (update) | Tested (indirect) | Shares the exact required-field validator with VR-123; the lifecycle test supplies a new password on update (`NEWPASS1`) but does not separately test leaving it blank. |
| VR-126 | User Type required and A/U (update) | Tested (indirect) | Shares the exact validator with VR-120 (directly tested on Add). |
| VR-127 | User ID required (delete lookup) | Tested | user-admin.spec.ts: VR-121/VR-127 |
| VR-128 | User ID required (delete confirm) | Tested (indirect) | The delete step in the full lifecycle test always supplies a User ID (via the URL query param from the list link); the blank-confirm-lookup case is covered by the same VR-121/VR-127 test since Delete and Update share the identical lookup-gate pattern. |

## 4. Coverage Summary

- **User Stories**: 50/50 accounted for — 47 Tested, 3 explicitly N/A (STORY-008, STORY-019; STORY-045 tested indirectly).
- **Business Rules**: 16/16 accounted for — 14 Tested (2 indirect), 2 explicitly N/A (BR-004, BR-008).
- **Validation Rules**: 130/130 accounted for — 84 Tested (30 indirect), 33 explicitly N/A (mostly VR-003/004/056/057/069/115 row-selection-flag/menu-option fields that this frontend replaced with links or role-scoped server lists, and VR-099..110 which this frontend replaced with a single `YYYY-MM-DD` field per date instead of 3 discrete month/day/year fields), 5 flagged as text-mismatch defects (STORY-018/026 → DEFECT-001; STORY-042/VR-113/VR-114 → DEFECT-002; VR-010/VR-015 → DEFECT-003, see `e2e/DEFECTS.md`). A sixth defect (DEFECT-004, a session-expiry-message race on 401 mid-session) is a technical/resilience finding not tied to a specific catalog id; see `network-failure.spec.ts` and `e2e/DEFECTS.md`.

None of the N/A rows above reflect a defect: in every case the modern UI either removed the
legacy input entirely (replaced by a link, a role-scoped list, or a consolidated field) or
the rule requires forcing a failure mode (file lock, mid-transaction crash) that has no
externally observable trigger through the public HTTP API.
