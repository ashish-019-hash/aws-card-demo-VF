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

1. Start the frontend and configured backend, then open `/sign-in`.
2. Reset the backend with `--carddemo.database.reset=true` (or an equivalent approved local reset). Load the data pack in [FUNCTIONAL_TEST_DATA.md](FUNCTIONAL_TEST_DATA.md).
3. Use actual default seed credentials: **USER0001 / USER123** (standard) and **ADMIN001 / ADMIN123** (administrator). Account **`1`** / card **`0500024453765740`** is a linked positive-balance seed (`194.00`); transaction **`0000000000000000`** is known. The seed supplies 50 cards/accounts and 300 transactions, but only two users.
4. Capture original account/card/customer values and versions before updating. Create test users only during their create scripts, with a unique 8-character-or-shorter `FT...` ID; these are not seed fixtures.
5. The default seed has positive balances only. Use account `1` for the positive payment path. For zero/negative paths, set a separate linked account to `0.00`/`-1.00` through Account maintenance, test, then restore it. If policy forbids that, record **Blocked—no zero/negative balance fixture**; do not invent account IDs.
6. Where a script says **fault inject**, use an approved test control for that one step. If none exists, mark that scenario Blocked and remove the fault afterwards.

### Common expected-result conventions

- **Stay:** no unintended navigation occurs and entered values remain available for correction unless a story specifies clearing.
- **No persistence:** re-open/re-query the record and prove no create/update/delete occurred.
- **Error:** an error/validation message identifies the failed request or field. Where the source specifies wording, verify that wording (or its explicitly equivalent modern UI message).
- **Pagination boundary:** the current page remains valid and the top/bottom condition is explained.

## Result recording

For every executable numbered step, record one run-log result as `<test ID>-S<step number>` (for example, `FT-FE-012-S03`) with **Pass / Fail / Blocked / N/A**, tester/date, route, actual message, and created/request ID where relevant. The signed-in scenario table uses explicit IDs. A stated modern-stack gap must be logged **N/A** with evidence; it is never a pass.

## Reusable procedures

### RP-01 — Sign in and navigation setup

1. Open `/sign-in`; enter credentials; submit.
2. For a standard user, verify the dashboard/main menu offers Account lookup/maintenance, Card list/lookup/maintenance, Transaction list/lookup/add, Reports, and Bill payment.
3. For an administrator, verify the administrator navigation exposes User list/add/update/delete.
4. Use visible navigation links and routes only after sign-in. Legacy PF-key/menu-entry behavior is not implemented in this React UI; record it as a gap, not as an executed equivalent.

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

**Prerequisites:** Common prerequisites; use `USER0001` and `ADMIN001`. Exercise normalization with lowercase entry of these uppercase seeded credentials.

| Scenario | Steps | Expected result |
|---|---|---|
| FT-FE-001-S01 Positive standard user | Enter `user0001` / `user123`; submit. | User ID/password are uppercased before verification; sign-in succeeds and opens standard dashboard. |
| FT-FE-001-S02 Positive administrator | Sign out. Enter `admin001` / `admin123`; submit. | Sign-in succeeds and opens administration dashboard. |
| FT-FE-001-S03 Negative missing user ID | Clear User ID, enter a password, submit. | Missing User ID is identified; remain on sign-in; no authentication request succeeds. |
| FT-FE-001-S04 Negative missing password | Enter User ID, clear Password, submit. | Missing Password is identified; remain on sign-in. |
| FT-FE-001-S05 Negative unknown user | Enter an unprovisioned ID with any password; submit. | `User not found. Try again ...` outcome; remain on sign-in. |
| FT-FE-001-S06 Negative bad password | Enter a known user with a wrong password; submit. | `Wrong Password. Try again ...` outcome; remain on sign-in. |
| FT-FE-001-S07 Error path | Fault inject verification/read failure; submit valid credentials. | `Unable to verify the User ...` outcome; remain on sign-in; no session is established. |
| FT-FE-001-S08 Navigation gap | Use visible Sign out. | Sign out is executable; unsupported sign-on action/PF3 is N/A—unimplemented modern-stack control. |

**Cleanup:** Sign out and clear the injected failure.

### FT-FE-002 — Select main-menu capability

**Covers:** STORY-002; visible route coverage. RULE-VAL-021 and RULE-VAL-022 are N/A gaps.

**Prerequisites:** Sign in as `USER0001` using RP-01.

1. Verify all ten configured main navigation links reach their intended routes/screens.
2. Return to the dashboard after each and verify the destination header/primary fields.
3. Sign out using the visible control.

**Expected result:** Visible routes are executable. Numeric menu entry/range validation (RULE-VAL-021), configuration-dependent admin-only selection (RULE-VAL-022), and PF3 are **N/A—unimplemented modern-stack controls**; do not mark them P/N/B.

**Cleanup:** Sign out.

### FT-FE-003 — Select administration capability

**Covers:** STORY-003; visible route coverage. RULE-VAL-021 is N/A.

**Prerequisites:** Sign in as `ADMIN001`.

1. Verify User List, User Add, User Update, and User Delete links route to their corresponding pages.
2. Return after each and verify the screen header.
3. Sign out using the visible control.

**Expected result:** Four visible routes are executable. Numeric menu validation, unsupported key behavior, and PF3 are **N/A—unimplemented modern-stack controls**.

**Cleanup:** Sign out.

---

## Module B — Account and customer inquiry/maintenance

### FT-FE-004 — View account, linked card, and customer data

**Covers:** STORY-004, ENTITY-001 through ENTITY-004, RULE-VAL-014

**Prerequisites:** Sign in as `USER0001`; use account `1` with a linked card/customer.

1. Navigate to **Account lookup**, enter `1`, and submit.
2. Verify account ID, status, current balance, limits, lifecycle dates, linked-card list, customer name/address/phone/FICO values agree with the prepared fixture.
3. Follow a linked-card detail link and verify it is the card assigned to that account.
4. Retry with blank, `0`, alphabetic, and a numeric nonexistent account ID.
5. Fault inject, separately, missing account, assignment, account data, and customer data responses.
6. Use visible navigation to return. PF3 is N/A—unimplemented.

**Expected result:** The valid consolidated relationship displays. Blank/invalid input stays on inquiry; missing relationship/data reports a lookup failure and never displays stale or unrelated records. Return reaches the calling menu.

**Cleanup:** Remove faults; no data change expected.

### FT-FE-005 — Update account/customer with valid changes, no-op protection, and concurrency protection

**Covers:** STORY-005, ENTITY-001, ENTITY-002, RULE-VAL-001 through RULE-VAL-013, RULE-VAL-039

**Prerequisites:** `1`; capture baseline values/versions; use valid data from DATA-ACCT-VALID.

1. Open **Account maintenance**; submit blank and then `00000000000`/nonnumeric ID. Verify lookup is blocked (RULE-VAL-001/002).
2. Retrieve `1`; verify original account/customer values are populated before editing.
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

**Prerequisites:** Retrieve `1` and alter one otherwise valid field so validation runs. Execute the exact vectors in `FUNCTIONAL_TEST_DATA.md` section **Account/customer vectors**, resetting the form to valid baseline between vectors.

1. Apply each invalid/boundary vector to the named field(s); submit.
2. Verify a field-specific/corrective error, retained input, and no persistence using RP-02.
3. Apply the paired valid or boundary-accepted vector; submit/save and verify persistence.
4. Include calendar dates: 1900-01-01 valid where date of birth is in the past, 2024-02-29 valid, 2023-02-29 invalid, 2024-04-31 invalid, date of birth today/future invalid.

**Expected result:** All required, format, cross-field state/ZIP, phone, SSN, indicator, FICO, monetary, and date rules enforce exactly as listed; no undocumented normalization or constraint is assumed.

**Cleanup:** RP-03.

---

## Module C — Cards

### FT-FE-007 — Browse/filter cards and page boundaries

**Covers:** STORY-006, ENTITY-003/004, RULE-VAL-014/015. RULE-VAL-016 is N/A.

**Prerequisites:** Sign in as `USER0001`; default seed supplies multiple card pages.

1. Open **Credit cards** without filters and verify a multi-row page/current page indicator.
2. Search valid account-only, card-only, and account-plus-card seeded values; verify matches only.
3. Search alphabetic account/card; test blank/zero optional filters as omitted filters.
4. Use visible Next/Previous until each disabled boundary; verify no move past the boundary.
5. Open a displayed card using its number link and use **Maintain this card** from detail.

**Expected result:** Filters, native page boundaries, and links work. `S`/`U` row-action code, multiple selection, and invalid action handling in RULE-VAL-016 are **N/A—unimplemented row-action UI**; do not report P/N/B coverage.

**Cleanup:** Return to card list; no data changes.

### FT-FE-008 — Look up card details and handle not found

**Covers:** STORY-007, ENTITY-003, RULE-VAL-014, RULE-VAL-015

**Prerequisites:** Valid account/card fixture.

1. From the card list, open a displayed card; verify number, linked account, name, status, expiry, and CVV are for the selected card.
2. Use **Card lookup** with `0500024453765740`; verify the same detail.
3. Test malformed account/card values, blank/zero optional search values, account-plus-card mismatch, unknown account, and unknown card.
4. Use visible Back/navigation controls. Unsupported action/PF3 is N/A—unimplemented.

**Expected result:** A found record displays only matching detail; invalid/not-found searches stay recoverable and never retain another card's data.

**Cleanup:** No data change expected.

### FT-FE-009 — Update card and validate maintained attributes

**Covers:** STORY-008, ENTITY-003, RULE-VAL-015, RULE-VAL-017 through RULE-VAL-020

**Prerequisites:** Capture card `0500024453765740` baseline/version.

1. Open **Card maintenance**; retrieve the card. Test blank/non-numeric/non-16-digit identifier before retrieval.
2. Submit unchanged data and verify no update/no-change response.
3. Update embossed name to a valid alphabetic name, status to `N`, expiry to `2099-12-31`; save and run RP-02.
4. Test blank/nonalphabetic name and blank/`X` status. Test native-date values the browser permits.
5. Mark typed malformed native date/month/year vectors as **API-level/UI-unreachable** in normal `input[type=date]`; do not report them as manual UI execution.
6. In a concurrent second session, update the card first, then submit a stale update in the first session.

**Expected result:** Only valid changed data persists. Invalid data remains correctable with an explanatory error. Unchanged data is not written. Stale update does not overwrite the current card; current details are reloaded/returned.

**Cleanup:** RP-03.

---

## Module D — Transactions

### FT-FE-010 — Browse transactions and view details

**Covers:** STORY-009, STORY-010, ENTITY-005, filter half of RULE-VAL-027, RULE-VAL-028. Selection-code half of RULE-VAL-027 is N/A.

**Prerequisites:** Default seed supplies multiple pages; known transaction `0000000000000000`.

1. Open **Transactions**; search a numeric transaction ID and verify matching/list behavior.
2. Test a nonnumeric filter.
3. Use visible Previous/Next controls to both disabled page boundaries.
4. Open a row with its transaction-ID link and verify all displayed financial, source, date, and merchant fields.
5. In **Transaction lookup**, submit blank, unknown, and known ID; return using visible navigation.

**Expected result:** Filter validation and visible detail links are executable. `S`/`s` selection-code validation is **N/A—unimplemented modern-stack control**, so no selection-code P/N/B claim is made. PF4/PF5 are also N/A.

**Cleanup:** No data changes.

### FT-FE-011 — Add transaction, derive identifiers, confirm, and enforce uniqueness

**Covers:** STORY-011, ENTITY-005, ENTITY-004, ENTITY-006, ENTITY-007, RULE-VAL-029 through RULE-VAL-036

**Prerequisites:** Valid DATA-TRAN-VALID input; capture highest transaction ID; the local environment permits re-querying the created transaction and count.

1. Create a valid transaction using account ID only, confirmation `Y`; verify a new ID follows the prior highest ID, card is resolved from the assignment, and all submitted data persists.
2. Create a valid transaction using card number only; verify account resolution and persistence.
3. Submit both identifiers and verify account precedence/resolved relationship behavior according to the deployed backend.
4. Submit valid data with blank, `N`, and `X` confirmation. Verify blank/N do not create and `X` is rejected.
5. Execute each vector in **Transaction-add vectors** in the data pack: absent/non-numeric identifiers, each required field blank, nonnumeric type/category/merchant ID, amount format boundaries, invalid and leap-date cases.
6. PF5/copy-latest is **N/A—unimplemented**; do not use an imaginary equivalent/harness.
7. Fault inject duplicate-key allocation/write response during a valid add.

**Expected result:** Exactly one new, unique transaction is created only after valid input and `Y`/`y`. All failure/confirmation paths create none. An attempted duplicate key is rejected. Corrected valid data succeeds.

**Cleanup:** Record created IDs and use reset tooling to remove them; remove fault injection.

---

## Module E — Bill payment

### FT-FE-012 — Pay full positive balance; document confirmation and balance-display gaps

**Covers:** STORY-012, ENTITY-002/004/005, RULE-DECISION-001, RULE-CALC-002, executable account-ID/Y path of RULE-VAL-026, RULE-VAL-036.

**Prerequisites:** Account `1` has seed balance `194.00`. Prepare zero/negative separate-account cases as Common prerequisites step 5, or mark them Blocked. The payment screen does **not** show pre-payment balance; record it from Account lookup before opening payment.

1. Record account `1` balance in Account lookup. In **Bill payment**, submit blank/malformed ID and blank confirmation.
2. Submit `N` and `X` in separate attempts; re-query balance/transactions after each.
3. Submit `Y` for account `1`, then re-query account and transactions.
4. Verify one new `BILL PAYMENT - ONLINE` transaction references the assigned card; its amount equals the recorded balance, its ID is unique, and account balance is `0.00`.
5. Submit `Y` for prepared zero/negative accounts when available.

**Expected result:** Positive payment settles the recorded full balance. Blank/N/X receive the same modern client-side “Enter Y” error and do not reach the API: legacy tri-state `Y/N/invalid` behavior is a **gap**, not P/N/B confirmation coverage. Pre-payment display is a **gap** because it is verified through Account lookup, not payment UI. Zero/negative outcomes are executable only after documented setup; otherwise Blocked. PF3/PF4 are N/A.

**Cleanup:** Restore payment balances and reset created payment transactions by approved local reset.

---

## Module F — Security-user administration

### FT-FE-013 — Browse and select security users

**Covers:** STORY-013, ENTITY-010

**Prerequisites:** Administrator session; more than ten security users.

1. Open **Security users**, search by a starting ID, and verify matching results.
2. Create at least nine disposable users first if user-pagination is required; otherwise record pagination as Blocked because the seed has only two users.
3. Use visible Update and Delete links for a displayed user; verify the selected ID is carried to the correct form.
4. Return using visible navigation.

**Expected result:** Visible Update/Delete links are executable. Legacy U/D action-code entry, invalid action validation, and PF3 are **N/A—unimplemented modern-stack controls**. User pagination is executable only after documented disposable-user setup.

**Cleanup:** Return to user list; do not delete baseline users.

### FT-FE-014 — Create security user and prevent duplicates

**Covers:** STORY-014, ENTITY-010, RULE-VAL-023, RULE-VAL-024

**Prerequisites:** Administrator session; choose an unused unique 8-character-or-shorter ID such as `FTUSR01`.

1. Open **Add security user**. For each of User ID, first name, last name, password, user type, leave only that field blank while all others are valid; submit.
2. Submit valid DATA-USER-VALID values for `FTUSR01`; verify success status, cleared form, and that the user appears in list/search.
3. Re-submit the same User ID with any valid values.
4. Fault inject user-create failure with a distinct unused ID.
5. Attempt sign-in with the new user if user type/password fixture permits.

**Expected result:** Each required field is enforced. Valid create persists one user. A duplicate returns a duplicate/error outcome and does not create another record. Failure does not claim success and allows correction.

**Cleanup:** Delete `FTUSR01` using FT-FE-016; clear faults.

### FT-FE-015 — Retrieve and update security user only when changed

**Covers:** STORY-015, ENTITY-010, RULE-VAL-023

**Prerequisites:** Administrator session; create `FTUSR02` in FT-FE-014 (or another unique disposable user) with known password.

1. Open **Update security user**; submit blank/unknown User ID and verify retrieval is blocked/error remains recoverable.
2. Retrieve `FTUSR02`; verify first name, last name, password entry, and type are available.
3. Attempt save with no editable change.
4. For every required field (User ID, first name, last name, password, type), blank only that field and save.
5. Enter a valid changed last name/password/type; save using visible Save user action; re-query and verify persistence.
6. Test PF4/PF12/PF3 semantics as N/A legacy navigation gaps; use visible routes only.

**Expected result:** No-change reports `Please modify to update ...` and does not update. Required fields are identified before save. Valid modifications persist. Navigation follows screen flow.

**Cleanup:** Restore `FTUSR02` original values or delete it through FT-FE-016.

### FT-FE-016 — Retrieve-before-delete and explicitly delete a security user

**Covers:** STORY-016, ENTITY-010, RULE-VAL-023

**Prerequisites:** Administrator session; create disposable `FTDEL01` in FT-FE-014 before this test. It is not a seed user.

1. Open **Delete security user**; submit blank and unknown IDs.
2. Retrieve `FTDEL01`; verify first name, last name, and type; verify the visible **Delete user** action appears; literal PF5 is not implemented.
3. Navigate/cancel without the explicit delete action; re-query and verify user still exists.
4. Retrieve it again; execute **Delete user**. Verify `User [ID] has been deleted ...` outcome and list/search no longer finds it.
5. Fault inject delete failure for a newly created disposable user.

**Expected result:** Retrieval alone never deletes. Explicit delete removes only the displayed selected user. Unknown/failure never claims deletion. Clear/return actions follow the documented flow.

**Cleanup:** Remove failure; reset the disposable user if the test environment requires the fixture restored.

---

## Module G — Reports and batch output

### FT-FE-017 — Request monthly, yearly, and custom reports

**Covers:** STORY-017, ENTITY-005, RULE-DECISION-003/004, observable portions of RULE-VAL-037/038.

**Prerequisites:** Use the application clock (the UI has no controllable clock) and seeded/created period records. The modern stack persists a report request and returns JSON rows synchronously; it has no TDQ/JOBS queue or batch submission.

1. Select **Monthly**, enter `Y`, submit, and verify returned start/end equal the running calendar month.
2. Repeat **Yearly** and verify running-year `YYYY-01-01` through `YYYY-12-31`.
3. For Custom, test missing date(s) and browser-selectable valid leap date `2024-02-29`. Native date inputs prevent malformed values such as `2023-02-29`, month `13`, day `32`, and nonnumeric parts; log those as **API-level/UI-unreachable**.
4. Submit valid Custom with `Y`; verify `SUBMITTED` and returned JSON rows. Record the UI’s extra chronological-order check as a deviation beyond RULE-VAL-037.
5. Submit blank, `N`, and `X` confirmations separately and capture the modern client error/no request.

**Expected result:** Month/year derivation and `Y` REST submission are executable. Blank/N/X all produce the same client error, therefore legacy tri-state confirmation is a **gap**, not P/N/B coverage. TDQ/JOBS write/failure, queue cancellation, and controlled December clock are **N/A—absent modern-stack features**.

**Cleanup:** Reset data created solely for report period setup; no queue job exists.

### FT-FE-018 — Legacy formatted transaction report gap assessment (not executable in modern stack)

**Covers:** STORY-018, ENTITY-003–007, RULE-DECISION-003/004 — **N/A gap, not P/N/B coverage.**

**Status:** React/API returns JSON rows for persisted report requests. It does not submit a batch job, create a backup generation, produce `TRANREPT`, expose output datasets, or generate fixed 133-byte records.

1. Execute FT-FE-017 with `Y` and retain its returned JSON response as evidence.
2. Verify no UI control/documented endpoint produces batch output, backup generation, `TRANREPT`, or fixed-width data.
3. Record `FT-FE-018-S03` as **N/A** with the UI route/API response and this gap statement; do not fabricate operational procedures, harnesses, or TDQ checks.

**Expected result:** The unimplemented legacy report requirement is auditable. Inclusive JSON row filtering remains observable only in FT-FE-017; batch formatting/sorting/backup requirements are not implemented.

**Cleanup:** None beyond FT-FE-017 cleanup.

---

## Completion criteria

A run passes only when every test ID has an observed result and every referenced rule in [FUNCTIONAL_TEST_TRACEABILITY.md](FUNCTIONAL_TEST_TRACEABILITY.md) is marked Pass, Fail, Blocked, or Not Applicable with evidence. A failed expected behavior is a product defect; a test that cannot be executed because the current frontend does not expose the required terminal behavior is a traceability gap, not a silent pass.
