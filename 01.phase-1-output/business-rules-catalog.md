# CardDemo — Business Rules Catalog

**Scope:** Business calculations, decisions, thresholds, authorization/routing decisions,
and concurrency/persistence contracts extracted from the COBOL/CICS source under
`00.phase-1-input/`. Pure field-level validation (required fields, format/range checks) is
out of scope for this catalog — see the separate validation-rules catalog produced by the
validation-extraction pass. Technical housekeeping (screen positioning, message formatting,
generic file-I/O error handling) is excluded unless it has a direct, user-visible business
consequence (e.g. sequential ID generation is normally housekeeping, but is documented here
because it determines the visible Transaction ID and can produce a user-facing "already
exists" outcome under concurrent use).

Each rule is tagged:
- **Type**: CALC / DECISION / THRESHOLD / AGGREGATION / CONTRACT (concurrency, persistence,
  or authorization contracts that a business user would still care about even though they
  aren't a formula)
- **Status**: `Observed` (what the code actually does, including quirks) or a `Recommended
  correction` note where the observed behavior looks like a defect. Observed behavior is
  never silently "fixed" in this catalog — corrections are called out explicitly and kept
  separate from the observed rule.

Source citations use `[FILE:line-range]` and every range below has been verified against the
current checked-out source.

---

## 1. Sign-On & Authorization

### BR-001: Sign-on credential match is case-forced on input, case-sensitive on the stored password

**Type:** DECISION / CONTRACT

**Description:** To sign on, a user supplies a User ID and Password. The program looks up
`USRSEC` by User ID and grants access only if the stored password matches exactly.

**Source:** [FILE:cbl/COSGN00C.cbl:132-136] (input capture), [FILE:cbl/COSGN00C.cbl:209-257]
(lookup and compare), [FILE:cpy/CSUSR01Y.cpy:17-23] (USRSEC record layout).

**Logic (Observed):**
- Both the User ID and Password typed by the user are converted to upper case
  (`FUNCTION UPPER-CASE`) before being used, at [FILE:cbl/COSGN00C.cbl:132-136].
- The User ID (now upper-cased) is used as the VSAM key to read `USRSEC`
  [FILE:cbl/COSGN00C.cbl:209-219] — so User IDs are effectively case-insensitive at logon
  (lookup always succeeds/fails as if the ID were stored upper-case).
- The password comparison at [FILE:cbl/COSGN00C.cbl:223] is `SEC-USR-PWD = WS-USER-PWD`,
  i.e. the **stored** password (`SEC-USR-PWD`, read verbatim from the file) is compared
  byte-for-byte against the **upper-cased** value the user typed.
- **Observed consequence:** if a password is stored in `USRSEC` with any lower-case
  character, sign-on can never succeed for that account, because the typed password is
  always forced to upper case before the comparison but the stored value is not. This is a
  quirk in the legacy code, not a documented business rule — flagged here rather than
  silently corrected.
- On a `NOTFND` response the message is "User not found. Try again ..."; on a password
  mismatch it is "Wrong Password. Try again ..."; any other response gives "Unable to verify
  the User ...". [FILE:cbl/COSGN00C.cbl:241-256]

**Recommended correction (not applied):** compare passwords using a single, deliberate case
policy (either store/compare case-sensitively without forcing input to upper case, or
normalize both sides consistently) so stored passwords are not inadvertently unusable.

**Variables:**
- Input: typed User ID, typed Password, stored `SEC-USR-ID`/`SEC-USR-PWD` in USRSEC.
- Output: Y/N sign-on success.

**Impact:** Determines whether a user can enter the system at all; a case-handling defect
here can permanently lock out any account whose stored password isn't all upper case.

---

### BR-002: Admin vs. regular-user routing after successful sign-on

**Type:** DECISION

**Description:** Once credentials match, the application routes the user to one of two
completely different menu systems based on the account's stored user type.

**Source:** [FILE:cbl/COSGN00C.cbl:224-240], [FILE:cpy/COCOM01Y.cpy:25-28] (`CDEMO-USER-TYPE`
88-levels: `A`=Admin, `U`=User).

**Logic (Observed):**
- `SEC-USR-TYPE` (from the matched USRSEC record) is copied into the session/COMMAREA field
  `CDEMO-USER-TYPE`.
- `IF CDEMO-USRTYP-ADMIN` (i.e. type = `A`) → `XCTL` to `COADM01C` (Admin menu, 4 options:
  user list/add/update/delete).
- `ELSE` (type = `U`, or in practice any non-`A` value since the 88-level `CDEMO-USRTYP-USER`
  only tests for `U` but the ELSE branch fires for any non-`A` value) → `XCTL` to `COMEN01C`
  (regular main menu, 10 options: accounts, cards, transactions, bill pay, reports).

**Variables:**
- Input: `SEC-USR-TYPE` (`A` or `U`).
- Output: destination program (`COADM01C` or `COMEN01C`) and the persisted
  `CDEMO-USER-TYPE` for the rest of the session.

**Impact:** This single flag is the entire access-control model of the application — it
decides whether a signed-on user gets the administrative user-management screens or the
day-to-day account/card/transaction screens. There is no finer-grained per-screen permission
model beyond it (see BR-003).

---

### BR-003: Main-menu "Admin Only" option gate — defined but currently unreachable

**Type:** DECISION

**Description:** The regular main menu is designed to hide/reject options flagged as
admin-only from regular users.

**Source:** [FILE:cbl/COMEN01C.cbl:136-143] (gate logic), [FILE:cpy/COMEN02Y.cpy:19-92]
(all 10 menu-option definitions).

**Logic (Observed):**
- After a regular user picks a numbered option, the program checks
  `IF CDEMO-USRTYP-USER AND CDEMO-MENU-OPT-USRTYPE(WS-OPTION) = 'A'` and, if true, rejects
  with "No access - Admin Only option...".
- **Observed consequence:** every one of the 10 entries in `COMEN02Y` has
  `CDEMO-MENU-OPT-USRTYPE` hard-coded to `'U'`
  [FILE:cpy/COMEN02Y.cpy:29,35,41,47,53,59,65,72,78,84] (option 8, Transaction Add, has a
  commented-out label "(Admin Only)" at [FILE:cpy/COMEN02Y.cpy:69] but the live `FILLER`
  value at [FILE:cpy/COMEN02Y.cpy:72] is still `'U'`). No option can currently trigger the
  admin-only rejection — the gate is dead code today.

**Recommended correction (not applied):** if Transaction Add (or any other option) is meant
to be admin-restricted, its `CDEMO-MENU-OPT-USRTYPE` entry in `COMEN02Y` should be set to
`'A'`.

**Impact:** Any signed-on regular user can reach every option on the main menu, including
Transaction Add, even though the copybook comment suggests that was once intended to be
Admin Only.

---

### BR-004: Card List program resets session user-type to "Regular User" on entry and on exit

**Type:** CONTRACT (authorization state)

**Description:** `COCRDLIC` (credit-card list/browse) unconditionally stamps the session's
user-type as `USER` at two points, regardless of the type recorded at sign-on.

**Source:** [FILE:cbl/COCRDLIC.cbl:315-343] (program entry / re-init), [FILE:cbl/COCRDLIC.cbl:
384-406] (PF3 exit back to menu), [FILE:cbl/COCRDLIC.cbl:187-192] (`LIT-MENUPGM` =
`COMEN01C`, the *regular* menu, not the admin menu).

**Logic (Observed):**
- On a fresh call with no COMMAREA (`EIBCALEN = 0`) the program initializes a new COMMAREA
  and executes `SET CDEMO-USRTYP-USER TO TRUE` [FILE:cbl/COCRDLIC.cbl:320].
- When the user presses PF3 to leave the card list, the program again executes
  `SET CDEMO-USRTYP-USER TO TRUE` before `XCTL`-ing to `COMEN01C` (the regular menu)
  [FILE:cbl/COCRDLIC.cbl:388-405], never to `COADM01C`.
- **Observed consequence:** if this screen were ever reached by (or the COMMAREA constructed
  for) an Admin-typed session, exiting it would silently downgrade the session's recorded
  user type to `U` and route back to the regular menu rather than the Admin menu. Under the
  normal sign-on-driven navigation path (Admin never reaches `COCRDLIC` because it is not on
  the Admin menu, [FILE:cpy/COADM02Y.cpy:22-42]) this defect has no visible effect today, but
  it is a latent authorization-state hazard if `COCRDLIC` is ever invoked directly (e.g. by
  transaction ID) or added to the Admin menu later.

**Impact:** Documents a real state-mutation hazard in the authorization model that a
modernized implementation must not reproduce (the destination/user-type should be preserved
from the session, not hard-coded).

---

### BR-005: No account-ownership scoping — any signed-on user can browse any account's cards, view any account, or view any card by ID

**Type:** CONTRACT (authorization)

**Description:** The `USRSEC` user-security record has no link to a Customer ID or Account
ID [FILE:cpy/CSUSR01Y.cpy:17-23] (fields are only User ID, first/last name, password, user
type). Account view, card list, and card search accept any account number/card number typed
by the user and do not check it against anything belonging to the signed-on user.

**Source:** [FILE:cpy/CSUSR01Y.cpy:17-23], [FILE:cbl/COCRDLIC.cbl:1382-1407] (`9500-FILTER-
RECORDS` — filters only by the optional account/card number the user typed, never by
identity).

**Logic (Observed):** Access control in CardDemo is binary (Admin vs. Regular user, BR-002)
and has no per-customer/per-account ownership dimension. Any authenticated regular user who
knows or guesses an account number or card number can view or (via `COACTUPC`/`COCRDUPC`)
update that account/card. This is a system-wide observation rather than a single program
defect — flagged here as a business/authorization rule gap, not silently assumed away.

**Impact:** Important for the target architecture: if the modernized system is meant to
enforce "customers can only see their own account," that constraint does not exist in the
legacy system today and must be a deliberate new design decision, not an assumed carry-over.

---

## 2. Account Update — Concurrency & Persistence Contract (COACTUPC)

### BR-006: Change detection before allowing a save confirmation ("did the user actually change anything?")

**Type:** DECISION

**Description:** Before the account-update screen will ask the user to confirm a save, it
first checks whether the edited (new) values actually differ from the values that were
originally displayed (old/snapshot values). If nothing changed, no confirmation prompt is
offered and no write is attempted.

**Source:** [FILE:cbl/COACTUPC.cbl:1681-1775] (`1205-COMPARE-OLD-NEW`), consumed at
[FILE:cbl/COACTUPC.cbl:2585-2591] (`ACUP-SHOW-DETAILS` branch of `2000-DECIDE-ACTION`).

**Logic (Observed):**
- Account-level fields (status, balances, limits, open/expiry/reissue dates, group ID) are
  compared value-for-value, with the active-status and group-ID comparisons case-insensitive
  (`FUNCTION UPPER-CASE`) [FILE:cbl/COACTUPC.cbl:1684-1705].
- Customer-level fields (name, address, phone, SSN, government ID, DOB, EFT account, primary
  holder flag, FICO score) are compared similarly, with most text fields compared
  case-insensitively and trimmed, but SSN, phone, DOB and FICO compared as exact values
  [FILE:cbl/COACTUPC.cbl:1708-1773].
- If every compared field matches, `NO-CHANGES-DETECTED` is set; the screen shows the details
  again but neither offers a save confirmation nor attempts a write
  [FILE:cbl/COACTUPC.cbl:2585-2591].
- If any field differs, `CHANGE-HAS-OCCURRED` is set and the routine exits immediately
  (short-circuits the rest of the comparison) [FILE:cbl/COACTUPC.cbl:1702-1705,1770-1772].

**Impact:** Prevents no-op "updates" from ever reaching the file-update logic and avoids
unnecessary record locking for a save that would change nothing.

---

### BR-007: Optimistic-concurrency re-check at save time — "did someone else change this record since it was displayed?"

**Type:** CONTRACT (concurrency)

**Description:** Immediately before writing the account/customer changes, the program
re-reads the live records under lock and compares them against the values that were on
screen when the user started editing (not the user's new values). If the live record no
longer matches what the user was shown, the save is rejected and the screen is refreshed
instead of overwriting someone else's change.

**Source:** [FILE:cbl/COACTUPC.cbl:4109-4195] (`9700-CHECK-CHANGE-IN-REC`), invoked from
[FILE:cbl/COACTUPC.cbl:3944-3952] inside `9600-WRITE-PROCESSING`.

**Logic (Observed):**
- After acquiring update locks on both `ACCTDAT` and `CUSTDAT` (BR-008), the just-read
  `ACCOUNT-RECORD`/`CUSTOMER-RECORD` fields are compared against the `ACUP-OLD-*` snapshot
  fields captured when the screen was first populated
  [FILE:cbl/COACTUPC.cbl:4115-4191].
- Account-side comparisons are exact-value (status, balances, limits, dates decomposed by
  substring, group ID lower-cased) [FILE:cbl/COACTUPC.cbl:4115-4141].
- Customer-side comparisons are mostly case-insensitive/trimmed for text, exact for zip,
  phone, SSN, DOB, EFT account, primary-holder flag, and FICO score
  [FILE:cbl/COACTUPC.cbl:4152-4191].
- Any mismatch → `DATA-WAS-CHANGED-BEFORE-UPDATE` is set and the write is abandoned
  [FILE:cbl/COACTUPC.cbl:4142-4145,4188-4191]; the caller (`2000-DECIDE-ACTION`) responds by
  re-showing the details screen [FILE:cbl/COACTUPC.cbl:2611-2612] rather than an explicit
  "someone else changed this record" message text in this routine.
- **Observed nuance:** on a mismatch, the routine does **not** refresh `ACUP-OLD-*` with the
  freshly read (current) values; it exits with the stale snapshot still in place. The
  re-shown "Details" state relies on the account/customer having been re-read to repopulate
  the screen, but the specific comparison baseline used for the next attempt is not
  automatically synchronized inside this routine — worth confirming end-to-end during
  screen-flow verification, since a modernized implementation should refresh the baseline
  whenever a conflict is detected.

**Impact:** This is the account-update concurrency contract: last-writer-does-not-always-win;
a conflicting concurrent edit blocks the save rather than silently overwriting it.

---

### BR-008: Two-file locked update with implicit unit-of-work rollback (ACCTDAT + CUSTDAT)

**Type:** CONTRACT (persistence / transactionality)

**Description:** Saving an account update requires successfully locking and rewriting two
VSAM files (the account master and the customer master) as one all-or-nothing change.

**Source:** [FILE:cbl/COACTUPC.cbl:3888-4107] (`9600-WRITE-PROCESSING`).

**Logic (Observed):**
1. `EXEC CICS READ ... UPDATE` on `ACCTDAT` keyed by account ID
   [FILE:cbl/COACTUPC.cbl:3894-3903]. Failure → `COULD-NOT-LOCK-ACCT-FOR-UPDATE`, abort
   [FILE:cbl/COACTUPC.cbl:3907-3915].
2. `EXEC CICS READ ... UPDATE` on `CUSTDAT` keyed by customer ID
   [FILE:cbl/COACTUPC.cbl:3921-3930]. Failure → `COULD-NOT-LOCK-CUST-FOR-UPDATE`, abort
   [FILE:cbl/COACTUPC.cbl:3934-3942].
3. Optimistic-concurrency re-check (BR-007) — abort on conflict
   [FILE:cbl/COACTUPC.cbl:3944-3952].
4. `EXEC CICS REWRITE` the account record [FILE:cbl/COACTUPC.cbl:4065-4071]. Failure →
   `LOCKED-BUT-UPDATE-FAILED`, abort without an explicit rollback call
   [FILE:cbl/COACTUPC.cbl:4076-4081].
5. `EXEC CICS REWRITE` the customer record [FILE:cbl/COACTUPC.cbl:4085-4091]. Failure →
   `LOCKED-BUT-UPDATE-FAILED` **and an explicit `EXEC CICS SYNCPOINT ROLLBACK`**
   [FILE:cbl/COACTUPC.cbl:4095-4103] — this undoes both the (already-applied) account
   rewrite and the failed customer rewrite together, because both occur within the same CICS
   unit of work.
- **Observed asymmetry:** step 4's failure path does not call `SYNCPOINT ROLLBACK`
  explicitly (there is nothing to roll back yet at that point since the account REWRITE
  itself failed), while step 5's failure path does (to undo the account REWRITE that already
  succeeded). This is consistent, not a bug — the rollback is only needed, and only present,
  where a prior REWRITE in the same unit of work must be undone.

**Impact:** Guarantees the account and customer records are updated together or not at all;
a failure partway through never leaves the two files inconsistent with each other.

---

## 3. Card Update — Concurrency & Persistence Contract (COCRDUPC)

### BR-009: Card update follows the same lock → conflict-check → rewrite pattern as account update, single file

**Type:** CONTRACT (concurrency / persistence)

**Description:** Updating a credit card's CVV, embossed name, expiry date, or active status
uses the identical optimistic-concurrency shape as account update (BR-006/BR-007/BR-008),
scoped to the single `CARDDAT` file.

**Source:** [FILE:cbl/COCRDUPC.cbl:948-1028] (`2000-DECIDE-ACTION` state machine —
`CCUP-SHOW-DETAILS` → `CCUP-CHANGES-OK-NOT-CONFIRMED` → PF5 commits), [FILE:cbl/COCRDUPC.cbl:
1420-1494] (`9200-WRITE-PROCESSING`: `READ ... UPDATE`, lock-failure branch, conflict-check,
`REWRITE`), [FILE:cbl/COCRDUPC.cbl:1498-1521] (`9300-CHECK-CHANGE-IN-REC`).

**Logic (Observed):**
- Fields compared for conflict detection: CVV code, embossed name, expiry
  year/month/day (decomposed by substring), and active status
  [FILE:cbl/COCRDUPC.cbl:1503-1508].
- **Difference from account update:** on a conflict, `9300-CHECK-CHANGE-IN-REC` *does*
  refresh the `CCUP-OLD-*` baseline fields with the freshly read current values before
  exiting [FILE:cbl/COCRDUPC.cbl:1511-1517] — so the next comparison attempt uses the
  up-to-date baseline, unlike the account-update path noted in BR-007.
- Because only one file (`CARDDAT`) is rewritten, there is no multi-file rollback need; a
  rewrite failure simply sets `LOCKED-BUT-UPDATE-FAILED` [FILE:cbl/COCRDUPC.cbl:1488-1492].
- The confirm gate: entering "Show Details" state only offers `CCUP-CHANGES-OK-NOT-
  CONFIRMED` when there is no input error and a change was actually detected
  [FILE:cbl/COCRDUPC.cbl:971-977]; the write is only executed when the user is in that
  confirmed state **and** presses PF5 [FILE:cbl/COCRDUPC.cbl:988-991] — Enter alone never
  commits the change.

**Impact:** Same business guarantee as account update: a card can't be silently overwritten
by a stale edit, and nothing is written until the user explicitly confirms with PF5.

---

## 4. Transaction ID Generation & Duplicate Handling (COTRN02C, COBIL00C)

### BR-010: New Transaction ID = current maximum Transaction ID + 1, derived by reverse browse; write-time duplicate is surfaced to the user, not silently retried

**Type:** CONTRACT (ID generation / concurrency)

**Description:** New transactions (manual "Add Transaction" and bill-payment transactions)
are not assigned an ID by any counter or key generator — the program finds the current
highest existing Transaction ID on the file and uses the next integer.

**Source:** [FILE:cbl/COTRN02C.cbl:442-466] (`ADD-TRANSACTION`), [FILE:cbl/COTRN02C.cbl:
642-668] (`STARTBR-TRANSACT-FILE`), [FILE:cbl/COTRN02C.cbl:673-697] (`READPREV-TRANSACT-
FILE`), [FILE:cbl/COTRN02C.cbl:711-749] (`WRITE-TRANSACT-FILE`); mirrored for bill payment at
[FILE:cbl/COBIL00C.cbl:208-235].

**Logic (Observed):**
1. `MOVE HIGH-VALUES TO TRAN-ID` then `STARTBR` positioned at/after the highest possible key,
   `READPREV` once to land on the actual highest existing `TRAN-ID`, then `ENDBR`
   [FILE:cbl/COTRN02C.cbl:444-447] and equivalently [FILE:cbl/COBIL00C.cbl:212-215].
2. `ADD 1 TO WS-TRAN-ID-N` to compute the new ID [FILE:cbl/COTRN02C.cbl:448-449] and
   equivalently [FILE:cbl/COBIL00C.cbl:216-217].
3. `EXEC CICS WRITE` with that ID as the record key [FILE:cbl/COTRN02C.cbl:711-721] and,
   for bill payment, via the same `WRITE-TRANSACT-FILE` paragraph pattern
   [FILE:cbl/COBIL00C.cbl:510-538].
4. On `DFHRESP(DUPKEY)`/`DFHRESP(DUPREC)` (i.e. another transaction was written with that ID
   between step 1 and step 3), the write is rejected and the user is shown "Tran ID already
   exist..." — there is no automatic retry with a re-computed ID
   [FILE:cbl/COTRN02C.cbl:735-741].
- **Observed concurrency exposure:** because the "find max" browse and the "write" are two
  separate, unlocked operations, two concurrent Add-Transaction (or bill-payment) requests
  can compute the same "next" ID and race to write it; the loser gets a user-facing
  duplicate-key error rather than an automatically-assigned different ID. This is documented
  as an observed contract, not corrected here, because the extraction task explicitly calls
  out this ID-generation and duplicate-handling behavior as needing to be preserved/ported
  knowingly.

**Variables:**
- Input: current maximum `TRAN-ID` on `TRANSACT`.
- Output: new `TRAN-ID` = max + 1, or a rejected write with a duplicate-key message.

**Impact:** Determines the exact Transaction ID a user is told after adding a transaction or
paying a bill, and defines what a modernized system must reproduce or deliberately improve
(e.g. an atomic sequence generator) when replacing MAX+1 ID assignment.

---

## 5. Bill Payment (COBIL00C)

### BR-011: A bill payment is only allowed when the account has a positive balance to pay

**Type:** THRESHOLD

**Description:** The Bill Payment screen refuses to proceed if the account's current
balance is zero or negative.

**Source:** [FILE:cbl/COBIL00C.cbl:197-206].

**Logic (Observed):** `IF ACCT-CURR-BAL <= ZEROS AND ACTIDINI OF COBIL0AI NOT = SPACES AND
LOW-VALUES` → error "You have nothing to pay..." and the screen is re-shown without
proceeding to payment. This check runs after the account is read (only when the user's
`CONFIRM` field was `Y`/blank, [FILE:cbl/COBIL00C.cbl:173-191]) — if the user answered `N` to
confirm, `ERR-FLG-ON` is already true from that branch and this positive-balance check is
skipped for that pass [FILE:cbl/COBIL00C.cbl:178-181]. Noted as an observed control-flow
nuance, not corrected here.

**Impact:** Prevents a $0/negative-balance account from generating a spurious payment
transaction.

---

### BR-012: A bill payment always pays the full current balance in one transaction and zeroes the account balance

**Type:** CALC

**Description:** There is no partial-payment amount entry — paying a bill means paying the
entire outstanding balance, in full, in a single step.

**Source:** [FILE:cbl/COBIL00C.cbl:208-235].

**Logic (Observed):**
- On confirmed payment (`CONFIRMI = 'Y'/'y'`), the program:
  1. Computes the next `TRAN-ID` (BR-010).
  2. Builds a fixed-content transaction record: type code `'02'`, category `2`, source
     `'POS TERM'`, description `'BILL PAYMENT - ONLINE'`, amount = `ACCT-CURR-BAL` (the
     entire balance), card number from the account's card cross-reference, merchant ID
     `999999999`, merchant name `'BILL PAYMENT'`, merchant city/zip `'N/A'`
     [FILE:cbl/COBIL00C.cbl:216-232].
  3. Writes that transaction to `TRANSACT` [FILE:cbl/COBIL00C.cbl:233].
  4. `COMPUTE ACCT-CURR-BAL = ACCT-CURR-BAL - TRAN-AMT` — since `TRAN-AMT` was just set equal
     to the current balance, the account balance is driven to exactly zero
     [FILE:cbl/COBIL00C.cbl:234].
  5. Rewrites the account record with the new (zero) balance
     [FILE:cbl/COBIL00C.cbl:235,377-403].

**Variables:**
- Input: `ACCT-CURR-BAL` at the time of confirmation.
- Output: one `TRANSACT` record for the full balance; `ACCT-CURR-BAL` = 0 after the update.

**Impact:** This is the core bill-payment business rule: it is always a full-balance payoff,
never a partial payment, and it always produces exactly one offsetting transaction record.

---

## 6. Transaction Report Request (CORPT00C)

### BR-013: Report date range derivation by report type, and mandatory confirmation before job submission

**Type:** DECISION / CALC

**Description:** The transaction report can be requested for one of three period types, each
with its own rule for deriving the start/end dates, and the report job is never submitted
without an explicit "Y" confirmation.

**Source:** [FILE:cbl/CORPT00C.cbl:212-456] (`PROCESS-ENTER-KEY`), confirmation gate at
[FILE:cbl/CORPT00C.cbl:462-510] (`SUBMIT-JOB-TO-INTRDR`).

**Logic (Observed):**
- **Monthly** [FILE:cbl/CORPT00C.cbl:213-238]: start date = first day of the current month
  (today's year/month, day forced to `01`). End date = the last day of the current month,
  computed by advancing to day 1 of next month (rolling year forward if month > 12) and then
  subtracting one day via `FUNCTION DATE-OF-INTEGER(FUNCTION INTEGER-OF-DATE(...) - 1)`
  [FILE:cbl/CORPT00C.cbl:223-234].
- **Yearly** [FILE:cbl/CORPT00C.cbl:239-255]: start date = current year, `01/01`; end date =
  current year, `12/31`. No calculation beyond fixing month/day constants.
- **Custom** [FILE:cbl/CORPT00C.cbl:256-436]: start/end month, day, and year are taken
  directly from user input (each part individually required — validation, out of scope here)
  and each composed date is validated by calling the shared date-utility program `CSUTLDTC`
  [FILE:cbl/CORPT00C.cbl:388-426]; a `CSUTLDTC-RESULT-MSG-NUM` of `'2513'` is treated as
  acceptable even when the severity code isn't `'0000'` (an allowed exception code within
  the date-check utility) [FILE:cbl/CORPT00C.cbl:396-406,416-426].
- **Confirmation gate (all three types funnel into `SUBMIT-JOB-TO-INTRDR`):**
  - If `CONFIRM` is blank, the user is prompted "Please confirm to print the &lt;type&gt;
    report..." and nothing is submitted [FILE:cbl/CORPT00C.cbl:464-474].
  - `'Y'`/`'y'` → proceeds to submit the job to the CICS internal reader (writes the JCL to
    the `JOBS` transient-data queue) [FILE:cbl/CORPT00C.cbl:476-509,515-538].
  - `'N'`/`'n'` → the screen is cleared and re-shown; the job is **not** submitted
    [FILE:cbl/CORPT00C.cbl:480-483].
  - Any other value → rejected with `"<value>" is not a valid value to confirm...`
    [FILE:cbl/CORPT00C.cbl:484-493].

**Variables:**
- Input: report type selection (Monthly/Yearly/Custom), custom start/end date parts,
  confirmation flag.
- Output: `PARM-START-DATE-*` / `PARM-END-DATE-*` passed to the `TRANREPT` batch job, and a
  Y/N/other-gated decision on whether the job is actually queued.

**Impact:** Defines exactly what date window each report type covers and guarantees no
report-generation job is queued to run against the (potentially large) `TRANSACT` file
without an explicit user confirmation.

---

## 7. Card List — Filtering & Pagination (COCRDLIC)

### BR-014: Card list filtering by account number and/or card number is optional and additive

**Type:** DECISION

**Description:** The card-list/browse screen lets the user narrow the browse to one account,
one card, or leave both blank to browse every card in the system (subject to BR-005 — there
is no ownership restriction).

**Source:** [FILE:cbl/COCRDLIC.cbl:1382-1407] (`9500-FILTER-RECORDS`), filter validity flags
set in [FILE:cbl/COCRDLIC.cbl:1003-1034] (`2210-EDIT-ACCOUNT`) and
[FILE:cbl/COCRDLIC.cbl:1036-1071] (`2220-EDIT-CARD`).

**Logic (Observed):**
- If an account-number filter was supplied and is valid, a browsed record is excluded unless
  its `CARD-ACCT-ID` equals the filter value [FILE:cbl/COCRDLIC.cbl:1385-1391].
- If a card-number filter was supplied and is valid, a browsed record is excluded unless its
  `CARD-NUM` equals the filter value [FILE:cbl/COCRDLIC.cbl:1396-1402].
- Both filters can be applied together (a record must pass both to be included); if neither
  filter is supplied, every record is included [FILE:cbl/COCRDLIC.cbl:1385-1405].

**Impact:** Defines the exact browse scope the user sees — critical for a modernized card
search/filter API to replicate (AND semantics between the two optional filters).

---

### BR-015: Fixed page size per list screen, determined by a look-ahead read

**Type:** DECISION

**Description:** Each browsable list screen shows a fixed number of rows per page and
determines whether a "next page" exists by reading one record past the page before
displaying it (that extra record is not shown, only used to set the "more records exist"
flag).

**Source:**
- Card list: page size 7 [FILE:cbl/COCRDLIC.cbl:177-178]; look-ahead read after filling the
  page [FILE:cbl/COCRDLIC.cbl:1191-1213] (`9000-READ-FORWARD`).
- Transaction list: page size 10 [FILE:cbl/COTRN00C.cbl:288-297] (loop bound
  `WS-IDX >= 11`); look-ahead read for next-page detection at
  [FILE:cbl/COTRN00C.cbl:302-310].
- User list: page size 10 [FILE:cbl/COUSR00C.cbl:57] (`USER-REC OCCURS 10 TIMES`).

**Logic (Observed):** Records are read sequentially (`STARTBR`/`READNEXT` or
`READPREV`/backwards for the previous-page action) into a fixed-size in-memory table of 7 or
10 entries; once the table is full, one additional `READNEXT` (or equivalent) is issued
purely to test whether another record exists beyond the current page, without adding it to
the displayed rows.

**Impact:** Determines the pagination contract (page size and next/previous-page
availability) that a modernized paged API/UI must reproduce for each of these three list
screens.

---

## 8. User Administration (COUSR00C–COUSR03C)

### BR-016: User ID uniqueness on Add; no-op guard on Update; two-step confirm-then-commit on Delete

**Type:** DECISION / CONTRACT

**Description:** The three user-maintenance transactions each enforce a distinct
persistence-level business rule beyond simple field validation.

**Source:**
- Add: [FILE:cbl/COUSR01C.cbl:238-274] (`WRITE-USER-SEC-FILE`).
- Update: [FILE:cbl/COUSR02C.cbl:177-245] (`UPDATE-USER-INFO`).
- Delete: [FILE:cbl/COUSR03C.cbl:82-193] (`MAIN-PARA`/`DELETE-USER-INFO`).

**Logic (Observed):**
- **Add** [FILE:cbl/COUSR01C.cbl:240-274]: `EXEC CICS WRITE` to `USRSEC` keyed by
  `SEC-USR-ID`; on `DFHRESP(DUPKEY)`/`DFHRESP(DUPREC)` the add is rejected with "User ID
  already exist..." — User ID is therefore a hard uniqueness constraint enforced by the VSAM
  key, surfaced as a business rule (a new user can never reuse an existing user's ID).
- **Update** [FILE:cbl/COUSR02C.cbl:215-245]: after reading the existing `USRSEC` record, the
  program compares each of First Name, Last Name, Password, and User Type against the
  current stored value field-by-field; `USR-MODIFIED-YES` is only set if at least one differs
  [FILE:cbl/COUSR02C.cbl:219-234]. If nothing changed, the update is rejected with "Please
  modify to update ..." and no `REWRITE` is attempted [FILE:cbl/COUSR02C.cbl:236-243] — the
  same "don't write a no-op change" pattern seen in account/card update (BR-006).
- **Delete** [FILE:cbl/COUSR03C.cbl:90-192]: pressing Enter with a User ID only fetches and
  displays the target user's details (read-only) [FILE:cbl/COUSR03C.cbl:156-169]; the actual
  delete only happens when the user then presses **PF5** [FILE:cbl/COUSR03C.cbl:121-122,
  174-192], which re-reads the record and issues the delete. There is no additional Y/N
  confirmation field on this screen — PF5 itself is the confirmation gesture (contrast with
  COBIL00C/CORPT00C which use an explicit Y/N `CONFIRM` field).

**Impact:** Defines the exact CRUD-uniqueness and confirmation contracts a modernized User
Administration API must reproduce: reject duplicate IDs on create, reject no-op updates, and
require an explicit second action (not just Enter) to actually delete a user.

---

## Rule Index

| ID | Type | Area | Title |
|----|------|------|-------|
| BR-001 | DECISION/CONTRACT | Sign-on | Credential match, case handling quirk |
| BR-002 | DECISION | Sign-on | Admin vs. regular-user routing |
| BR-003 | DECISION | Main menu | Admin-only option gate (currently unreachable) |
| BR-004 | CONTRACT | Card list | Session user-type reset hazard on entry/exit |
| BR-005 | CONTRACT | Authorization | No account-ownership scoping |
| BR-006 | DECISION | Account update | Change detection before confirm |
| BR-007 | CONTRACT | Account update | Optimistic-concurrency re-check at save |
| BR-008 | CONTRACT | Account update | Two-file locked update with rollback |
| BR-009 | CONTRACT | Card update | Same concurrency pattern, single file |
| BR-010 | CONTRACT | Transactions | Next Transaction ID = MAX+1; duplicate surfaced |
| BR-011 | THRESHOLD | Bill payment | Must have positive balance to pay |
| BR-012 | CALC | Bill payment | Always pays full balance, zeroes account |
| BR-013 | DECISION/CALC | Reports | Period derivation + mandatory Y/N confirm |
| BR-014 | DECISION | Card list | Optional account/card filters, AND semantics |
| BR-015 | DECISION | Lists | Fixed page size per screen, look-ahead read |
| BR-016 | DECISION/CONTRACT | User admin | Uniqueness on add, no-op guard, 2-step delete |

**Rule count: 16**
