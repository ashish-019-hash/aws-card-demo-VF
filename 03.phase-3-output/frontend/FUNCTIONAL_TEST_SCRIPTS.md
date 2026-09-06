# CardDemo Frontend Functional Test Scripts

## Purpose and execution model

These are modular manual functional scripts for the React frontend in this directory. They use the phase-1 artifacts as the behavioral oracle:

- `01.phase-1-output/user-stories.md`
- `01.phase-1-output/business-entities.md`
- `01.phase-1-output/business-rules-catalog.md`
- `01.phase-1-output/validation-rules.md`
- `01.phase-1-output/screen-flow.md`

Run every script against a resettable, non-production environment. Execute API/error simulations through the environment's approved test controls (for example, fixture reset, network stubs, or service fault injection); do not alter production data. Record actual message text, screen/route, request ID, and created IDs in the test run.

## Common prerequisites

1. Start the frontend and its configured backend, and open the application at `/sign-in`.
2. Reset test data, then load the data pack in [FUNCTIONAL_TEST_DATA.md](FUNCTIONAL_TEST_DATA.md).
3. Ensure these accounts exist:
   - **STDUSER / PASS1234** — a valid standard user (`USER`).
   - **ADMIN01 / ADMIN123** — a valid administrator (`ADMINISTRATOR`).
   - **11111111111 / 4111111111111111** — positive-balance account/card with linked customer; balance `+125.50`.
   - **22222222222 / 4222222222222222** — zero-balance account/card.
   - **33333333333 / 4333333333333333** — negative-balance account/card.
   - At least 11 cards, 11 transactions, and 11 users, so both page directions can be tested.
4. Capture original account/card/customer values and versions before any update. Use unique values prefixed `FT-` for created transactions/users.
5. Where a script says **fault inject**, arrange the stated backend response only for that step, then remove the fault before cleanup.

### Common expected-result conventions

- **Stay:** no unintended navigation occurs and entered values remain available for correction unless a story specifies clearing.
- **No persistence:** re-open/re-query the record and prove no create/update/delete occurred.
- **Error:** an error/validation message identifies the failed request or field. Where the source specifies wording, verify that wording (or its explicitly equivalent modern UI message).
- **Pagination boundary:** the current page remains valid and the top/bottom condition is explained.

## Reusable procedures

### RP-01 — Sign in and navigation setup

1. Open `/sign-in`; enter credentials; submit.
2. For a standard user, verify the dashboard/main menu offers Account lookup/maintenance, Card list/lookup/maintenance, Transaction list/lookup/add, Reports, and Bill payment.
3. For an administrator, verify the administrator navigation exposes User list/add/update/delete.
4. Use navigation links or the browser route only after a successful sign-in. For legacy PF-key acceptance criteria, use the deployed terminal-compatible control if present; otherwise record it as a platform-navigation verification against the route described by `screen-flow.md`.

### RP-02 — Re-query persistence

1. Navigate away and return to the applicable lookup/list.
2. Search for the affected account/card/user/transaction identifier.
3. Verify only the intended fields changed, and related records remain consistent.

### RP-03 — Reset modified data

1. Restore captured account/card/customer values and versions using the approved fixture-reset mechanism.
2. Delete each created `FT-` application user.
3. Record each created transaction ID; remove it only through approved reset tooling (there is no end-user transaction-delete flow).
4. Re-query the primary records and confirm the baseline is restored.

---

## Module A — Authentication and menus

### FT-FE-001 — Authenticate, normalize credentials, and route by role

**Covers:** STORY-001, ENTITY-010, RULE-VAL-025

**Prerequisites:** Common prerequisites; `STDUSER` and `ADMIN01` exist. Configure one stored password with mixed case if the fixture supports it.

| Scenario | Steps | Expected result |
|---|---|---|
| Positive standard user | Enter `stduser` / `pass1234`; submit. | User ID and password are uppercased before verification; sign-in succeeds and opens the standard dashboard/menu. |
| Positive administrator | Sign out. Enter `admin01` / `admin123`; submit. | Sign-in succeeds and opens the administration menu. |
| Negative missing user ID | Clear User ID, enter a password, submit. | Missing User ID is identified; remain on sign-in; no authentication request succeeds. |
| Negative missing password | Enter User ID, clear Password, submit. | Missing Password is identified; remain on sign-in. |
| Negative unknown user | Enter an unprovisioned ID with any password; submit. | `User not found. Try again ...` outcome; remain on sign-in. |
| Negative bad password | Enter a known user with a wrong password; submit. | `Wrong Password. Try again ...` outcome; remain on sign-in. |
| Error path | Fault inject verification/read failure; submit valid credentials. | `Unable to verify the User ...` outcome; remain on sign-in; no session is established. |
| Navigation boundary | Trigger an unsupported sign-on action/key, then use sign-out/PF3-equivalent. | Invalid-key response for unsupported action; exit returns to unauthenticated/sign-on state. |

**Cleanup:** Sign out and clear the injected failure.

### FT-FE-002 — Select main-menu capability and reject invalid/unauthorized selection

**Covers:** STORY-002, RULE-VAL-021, RULE-VAL-022

**Prerequisites:** Sign in as `STDUSER` using RP-01.

1. Verify all ten configured main capabilities are present and route to the screens in the following order: account view, account update, card list, card view, card update, transaction list, transaction view, transaction add, reports, and bill payment.
2. For every option/route, return to the dashboard and verify the destination screen header and intended fields.
3. In a terminal-compatible menu, submit blank, `0`, `ABC`, and `11`; otherwise invoke the application's equivalent invalid navigation test route/control.
4. Verify each invalid selection reports `Please enter a valid option number...` and stays on the main menu.
5. Validate the configuration-dependent admin-only branch with a fixture where a main-menu option has required type `A`; select it as `STDUSER`.
6. Use PF3/sign-out navigation.

**Expected result:** Valid options navigate correctly. Invalid option values do not navigate. The configuration-dependent selection returns `No access - Admin Only option...`. The supplied ten-option configuration does not expose an admin-only option, so record this as a fixture/configuration test, not a normally reachable path.

**Cleanup:** Restore the supplied menu configuration and sign out.

### FT-FE-003 — Select administration capability

**Covers:** STORY-003, RULE-VAL-021

**Prerequisites:** Sign in as `ADMIN01`.

1. Verify the administration menu offers User List, User Add, User Update, and User Delete.
2. Open each capability and verify the corresponding page is reached; return after each.
3. Submit blank, `0`, `X`, and `5` through a terminal-compatible menu control/equivalent invalid-selection harness.
4. Verify `Please enter a valid option number...` and that the administration menu stays available.
5. Test unsupported action and PF3/sign-out navigation.

**Expected result:** Options `1`–`4` route correctly; invalid or unsupported input stays on the menu; PF3 returns to sign-on.

**Cleanup:** Sign out.

---

## Module B — Account and customer inquiry/maintenance

### FT-FE-004 — View account, linked card, and customer data

**Covers:** STORY-004, ENTITY-001 through ENTITY-004, RULE-VAL-014

**Prerequisites:** Sign in as `STDUSER`; use account `11111111111` with a linked card/customer.

1. Navigate to **Account lookup**, enter `11111111111`, and submit.
2. Verify account ID, status, current balance, limits, lifecycle dates, linked-card list, customer name/address/phone/FICO values agree with the prepared fixture.
3. Follow a linked-card detail link and verify it is the card assigned to that account.
4. Retry with blank, `0`, alphabetic, and a numeric nonexistent account ID.
5. Fault inject, separately, missing account, assignment, account data, and customer data responses.
6. Test return/PF3-equivalent navigation.

**Expected result:** The valid consolidated relationship displays. Blank/invalid input stays on inquiry; missing relationship/data reports a lookup failure and never displays stale or unrelated records. Return reaches the calling menu.

**Cleanup:** Remove faults; no data change expected.

### FT-FE-005 — Update account/customer with valid changes, no-op protection, and concurrency protection

**Covers:** STORY-005, ENTITY-001, ENTITY-002, RULE-VAL-001 through RULE-VAL-013, RULE-VAL-039

**Prerequisites:** `11111111111`; capture baseline values/versions; use valid data from DATA-ACCT-VALID.

1. Open **Account maintenance**; submit blank and then `00000000000`/nonnumeric ID. Verify lookup is blocked (RULE-VAL-001/002).
2. Retrieve `11111111111`; verify original account/customer values are populated before editing.
3. Submit without changing any maintained value.
4. Change only a safe field (for example address line 2), save, then execute RP-02.
5. Change a second valid account/customer field set from DATA-ACCT-VALID; save and re-query.
6. Retrieve the account in a second session. In session A, change and save a field. In session B, change another field based on stale versions and save.
7. Fault inject customer rewrite failure after account rewrite during a valid save.
8. Verify that card cross-reference/assigned card has not changed after all account/customer maintenance steps.

**Expected result:** Invalid lookup stays on page. No-op reports a no-change outcome and does not issue a redundant update. Valid changes persist. A stale concurrent write does not overwrite the newer record and reloads/returns current details. A customer-write failure rolls back the account change. Card assignment remains unchanged.

**Cleanup:** RP-03; remove fault injection.

### FT-FE-006 — Account/customer validation matrix execution

**Covers:** STORY-005, RULE-VAL-003 through RULE-VAL-013, RULE-VAL-039

**Prerequisites:** Retrieve `11111111111` and alter one otherwise valid field so validation runs. Execute the exact vectors in `FUNCTIONAL_TEST_DATA.md` section **Account/customer vectors**, resetting the form to valid baseline between vectors.

1. Apply each invalid/boundary vector to the named field(s); submit.
2. Verify a field-specific/corrective error, retained input, and no persistence using RP-02.
3. Apply the paired valid or boundary-accepted vector; submit/save and verify persistence.
4. Include calendar dates: 1900-01-01 valid where date of birth is in the past, 2024-02-29 valid, 2023-02-29 invalid, 2024-04-31 invalid, date of birth today/future invalid.

**Expected result:** All required, format, cross-field state/ZIP, phone, SSN, indicator, FICO, monetary, and date rules enforce exactly as listed; no undocumented normalization or constraint is assumed.

**Cleanup:** RP-03.

---

## Module C — Cards

### FT-FE-007 — Browse/filter/select cards and page boundaries

**Covers:** STORY-006, ENTITY-003, ENTITY-004, RULE-VAL-014 through RULE-VAL-016

**Prerequisites:** Sign in as `STDUSER`; card fixture has more than one page.

1. Open **Credit cards** without filters; verify a multi-row page and current page indicator.
2. Search using valid account-only, card-only, and account-plus-card fixture values. Verify only matching cards appear.
3. Search using alphabetic account/card values. Test blank/zero optional filters as omitted filters.
4. Move Next until final page and select Next again; move Previous until first page and select Previous again.
5. In a terminal-compatible list/equivalent action harness, select exactly one row with `S`, then with `U`; verify detail and update destinations.
6. Submit two row actions and separately an unsupported action code.

**Expected result:** Valid filters/page navigation work; invalid supplied identifiers produce an error without losing retry ability. Page boundary is explained. `S` opens card detail and `U` opens maintenance. Multiple actions or codes other than allowed action/blank are rejected.

**Cleanup:** Return to card list; no data changes expected.

### FT-FE-008 — Look up card details and handle not found

**Covers:** STORY-007, ENTITY-003, RULE-VAL-014, RULE-VAL-015

**Prerequisites:** Valid account/card fixture.

1. From the card list, open a displayed card; verify number, linked account, name, status, expiry, and CVV are for the selected card.
2. Use **Card lookup** with `4111111111111111`; verify the same detail.
3. Test malformed account/card values, blank/zero optional search values, account-plus-card mismatch, unknown account, and unknown card.
4. Trigger unsupported action and return/PF3-equivalent navigation.

**Expected result:** A found record displays only matching detail; invalid/not-found searches stay recoverable and never retain another card's data.

**Cleanup:** No data change expected.

### FT-FE-009 — Update card and validate maintained attributes

**Covers:** STORY-008, ENTITY-003, RULE-VAL-015, RULE-VAL-017 through RULE-VAL-020

**Prerequisites:** Capture card `4111111111111111` baseline/version.

1. Open **Card maintenance**; retrieve the card. Test blank/non-numeric/non-16-digit identifier before retrieval.
2. Submit unchanged data and verify no update/no-change response.
3. Update embossed name to a valid alphabetic name, status to `N`, expiry to `2099-12-31`; save and run RP-02.
4. Individually test blank/nonalphabetic name, blank/`X` status, expiry month `00`/`13`, and expiry year `1949`/`2100`; submit each.
5. Test valid boundaries: expiry month `01` and `12`; year `1950` and `2099`.
6. In a concurrent second session, update the card first, then submit a stale update in the first session.

**Expected result:** Only valid changed data persists. Invalid data remains correctable with an explanatory error. Unchanged data is not written. Stale update does not overwrite the current card; current details are reloaded/returned.

**Cleanup:** RP-03.

---

## Module D — Transactions

### FT-FE-010 — Browse/select transactions and view details

**Covers:** STORY-009, STORY-010, ENTITY-005, RULE-VAL-027, RULE-VAL-028

**Prerequisites:** More than one page of transactions; known transaction `9000000000000001`.

1. Open **Transactions** with no filter; verify page contents. Search using a numeric transaction ID and verify list begins/matches as configured.
2. Test nonnumeric filter and an invalid selection action via list action harness.
3. Navigate next/previous to both boundaries; verify top/bottom feedback and a valid page remains.
4. Select a row with `S`; verify transaction detail displays ID, card, type/category, source, amount, description, origin/processing dates, merchant ID/name/city/ZIP.
5. Open **Transaction lookup**; submit blank, unknown ID, and known ID. Use Clear/PF4-equivalent and Return to list/PF5-equivalent.

**Expected result:** Only `S`/`s` selection opens the selected detail. Invalid selection says `Invalid selection. Valid value is S`; nonnumeric filter stays recoverable. Blank direct lookup says `Tran ID can NOT be empty...`; unknown/read failure does not show unrelated data.

**Cleanup:** No data change expected.

### FT-FE-011 — Add transaction, derive identifiers, confirm, and enforce uniqueness

**Covers:** STORY-011, ENTITY-005, ENTITY-004, ENTITY-006, ENTITY-007, RULE-VAL-029 through RULE-VAL-036

**Prerequisites:** Valid DATA-TRAN-VALID input; capture highest transaction ID; fixture permits confirming created transaction and checking count.

1. Create a valid transaction using account ID only, confirmation `Y`; verify a new ID follows the prior highest ID, card is resolved from the assignment, and all submitted data persists.
2. Create a valid transaction using card number only; verify account resolution and persistence.
3. Submit both identifiers and verify account precedence/resolved relationship behavior according to the deployed backend.
4. Submit valid data with blank, `N`, and `X` confirmation. Verify blank/N do not create and `X` is rejected.
5. Execute each vector in **Transaction-add vectors** in the data pack: absent/non-numeric identifiers, each required field blank, nonnumeric type/category/merchant ID, amount format boundaries, invalid and leap-date cases.
6. Invoke PF5/copy-latest equivalent with valid copied values and `Y`; verify it follows the add path and creates a new transaction, not merely a preview. Re-run with blank confirmation; verify it prompts/no create.
7. Fault inject duplicate-key allocation/write response during a valid add.

**Expected result:** Exactly one new, unique transaction is created only after valid input and `Y`/`y`. All failure/confirmation paths create none. An attempted duplicate key is rejected. Corrected valid data succeeds.

**Cleanup:** Record created IDs and use reset tooling to remove them; remove fault injection.

---

## Module E — Bill payment

### FT-FE-012 — Pay full positive balance and reject non-payable/cancelled payment

**Covers:** STORY-012, ENTITY-002, ENTITY-005, ENTITY-004, RULE-DECISION-001, RULE-CALC-002, RULE-VAL-026, RULE-VAL-036

**Prerequisites:** Capture baseline for the three payment fixture accounts. `11111111111` has balance `+125.50`; `22222222222` has `0.00`; `33333333333` has `-1.00`.

1. Open **Bill payment**. Submit blank ID, malformed ID, and valid ID with blank confirmation. Verify account ID requirement and confirmation prompt/no payment.
2. For the positive account, verify displayed pre-payment balance is `125.50`. Submit `N`, then separately `X`; verify N clears/cancels with no transaction/balance change and X is rejected.
3. Submit `Y` for `11111111111`. Re-query account and transaction list.
4. Verify exactly one new transaction is `BILL PAYMENT - ONLINE`; its amount is `125.50`, it references the assigned card, its ID is unique, and new account balance is `0.00` (`125.50 - 125.50`).
5. Submit `Y` for zero and negative accounts.
6. Use Clear/PF4 and Return/PF3-equivalent navigation.

**Expected result:** Payment is available only when balance is greater than zero. A successful payment settles the *entire* current balance, not a partial amount; zero/negative returns `You have nothing to pay...` and creates no transaction. Confirmation accepts Y/y/N/n only.

**Cleanup:** Reset all payment fixtures and payment transactions with approved tooling.

---

## Module F — Security-user administration

### FT-FE-013 — Browse and select security users

**Covers:** STORY-013, ENTITY-010

**Prerequisites:** Administrator session; more than ten security users.

1. Open **Security users**, search by a starting ID, and verify matching paged results.
2. Page forward/backward to last/first boundaries.
3. Select/open Update and Delete actions for a displayed user; verify the chosen ID is carried to the correct form.
4. Through terminal-compatible list selection/equivalent harness, enter invalid nonblank selection code.
5. Use PF3/return navigation.

**Expected result:** `U`/`u` opens update, `D`/`d` opens delete; another nonblank action reports `Invalid selection. Valid values are U and D`. Page boundaries explain top/bottom and retain the list.

**Cleanup:** Return to user list; do not delete baseline users.

### FT-FE-014 — Create security user and prevent duplicates

**Covers:** STORY-014, ENTITY-010, RULE-VAL-023, RULE-VAL-024

**Prerequisites:** Administrator session; reserve `FTUSR01`.

1. Open **Add security user**. For each of User ID, first name, last name, password, user type, leave only that field blank while all others are valid; submit.
2. Submit valid DATA-USER-VALID values for `FTUSR01`; verify success status, cleared form, and that the user appears in list/search.
3. Re-submit the same User ID with any valid values.
4. Fault inject user-create failure with a distinct unused ID.
5. Attempt sign-in with the new user if user type/password fixture permits.

**Expected result:** Each required field is enforced. Valid create persists one user. A duplicate returns a duplicate/error outcome and does not create another record. Failure does not claim success and allows correction.

**Cleanup:** Delete `FTUSR01` using FT-FE-016; clear faults.

### FT-FE-015 — Retrieve and update security user only when changed

**Covers:** STORY-015, ENTITY-010, RULE-VAL-023

**Prerequisites:** Administrator session; create/reuse `FTUSR02` with known password.

1. Open **Update security user**; submit blank/unknown User ID and verify retrieval is blocked/error remains recoverable.
2. Retrieve `FTUSR02`; verify first name, last name, password entry, and type are available.
3. Attempt save with no editable change.
4. For every required field (User ID, first name, last name, password, type), blank only that field and save.
5. Enter a valid changed last name/password/type; save using Save/PF5 equivalent; re-query and verify persistence.
6. Test Clear/PF4, Return/PF12, and save-then-return/PF3 semantics where the deployed UI provides them.

**Expected result:** No-change reports `Please modify to update ...` and does not update. Required fields are identified before save. Valid modifications persist. Navigation follows screen flow.

**Cleanup:** Restore `FTUSR02` original values or delete it through FT-FE-016.

### FT-FE-016 — Retrieve-before-delete and explicitly delete a security user

**Covers:** STORY-016, ENTITY-010, RULE-VAL-023

**Prerequisites:** Administrator session; existing `FTDEL01` user reserved solely for deletion.

1. Open **Delete security user**; submit blank and unknown IDs.
2. Retrieve `FTDEL01`; verify first name, last name, and type; verify the instruction `Press PF5 key to delete this user ...` (or equivalent explicit delete action) appears.
3. Navigate/cancel without the explicit delete action; re-query and verify user still exists.
4. Retrieve it again; execute Delete/PF5. Verify `User [ID] has been deleted ...` outcome and list/search no longer finds it.
5. Fault inject delete failure for a newly created disposable user.

**Expected result:** Retrieval alone never deletes. Explicit delete removes only the displayed selected user. Unknown/failure never claims deletion. Clear/return actions follow the documented flow.

**Cleanup:** Remove failure; reset the disposable user if the test environment requires the fixture restored.

---

## Module G — Reports and batch output

### FT-FE-017 — Request monthly, yearly, and custom reports

**Covers:** STORY-017, ENTITY-005, RULE-DECISION-003, RULE-DECISION-004, RULE-VAL-037, RULE-VAL-038

**Prerequisites:** Controlled system date; transaction fixture contains current-month, prior-month, current-year, prior-year, and custom-range records. Queue submission observation is available.

1. Select **Monthly**, leave confirmation blank, then enter `N`, `X`, and `Y` in independent attempts. On Y, inspect the queued request/API response and verify range is first day through final day of the controlled current calendar month.
2. Repeat for **Yearly** and verify `YYYY-01-01` through `YYYY-12-31` using the controlled current year.
3. For custom, test no report type; each missing start/end component; nonnumeric components; month `13`; day `32`; invalid calendar dates including `2023-02-29`; then valid `2024-02-29` to `2024-02-29`.
4. Submit custom valid dates with blank/N/X/Y confirmation. Verify blank prompts, N clears/cancels, X rejects, Y queues one job and reports submitted status.
5. Run Monthly with controlled date in December and verify end date is December 31, exercising the year-transition calculation.
6. Fault inject queue-write failure after a valid confirmed request.

**Expected result:** Monthly/yearly derive, rather than require entry of, their specified calendar periods. Custom validates complete numeric dates, stated upper bounds, and calendar validity. Only `Y` submits; queue failure says `Unable to Write TDQ (JOBS)...` rather than success. Do not assert a chronological-order rejection for custom dates because RULE-VAL-037 does not define one.

**Cleanup:** Cancel/remove queued test jobs and clear faults.

### FT-FE-018 — Produce and inspect formatted transaction report

**Covers:** STORY-018, ENTITY-005, ENTITY-003, ENTITY-004, ENTITY-006, ENTITY-007, RULE-DECISION-003, RULE-DECISION-004

**Prerequisites:** A successfully queued custom report for `2024-02-01` through `2024-02-29`; test transactions whose processing dates are immediately before, at start, mid-range, at end, and immediately after range; at least two card numbers out of order; operations access to output dataset/job log.

1. Run the submitted report job via approved operations procedure.
2. Verify a dated backup generation of processed transaction data is created before report generation.
3. Inspect `TRANREPT`. Verify every selected record has processing date inclusively within range; prior/after transactions are absent; selected entries are sorted ascending by card number.
4. Verify the reporting process received transaction, card cross-reference, type/category, and requested-date inputs.
5. Verify output records are fixed 133-byte formatted records.
6. Request/run an empty date range and verify no transaction-detail records appear.

**Expected result:** The report includes only inclusive date-range data, sorts selected data by card, and produces the required formatted output; an empty range has no selected transaction detail records.

**Cleanup:** Retain or purge generated non-production report output according to environment policy.

---

## Completion criteria

A run passes only when every test ID has an observed result and every referenced rule in [FUNCTIONAL_TEST_TRACEABILITY.md](FUNCTIONAL_TEST_TRACEABILITY.md) is marked Pass, Fail, Blocked, or Not Applicable with evidence. A failed expected behavior is a product defect; a test that cannot be executed because the current frontend does not expose the required terminal behavior is a traceability gap, not a silent pass.
