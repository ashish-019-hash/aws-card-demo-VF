# E2E Defects Log

This file records genuine application defects discovered while writing and running the
Playwright suite under `e2e/`. Per the task's constraints, the test suite does **not**
weaken assertions to force a pass and does **not** patch production code from a test file.
Instead, each defect below is captured as a `test.fail()` (expected-to-fail) test that
asserts the *correct* (legacy-accurate) behavior, so the test will start passing on its own
the day the defect is fixed.

If a defect below is intentional/accepted (e.g. an explicitly documented modernization
choice), it should be moved into the frontend `README.md` "Backend deviations / known gaps"
section instead of staying here.

---

## DEFECT-001: Optimistic-concurrency conflict message doesn't match the legacy wording

- **Where**: Account Update (`COACTUPC`) and Card Update (`COCRDUPC`) save flows.
- **Stories affected**: STORY-018, STORY-026.
- **Business rules affected**: BR-007 (account), BR-009 (card).
- **Expected (legacy) text**: `"Record changed by some one else. Please review"`
  (`cbl/COACTUPC.cbl:520-521, 4143, 4189-4190`; `cbl/COCRDUPC.cbl:207-208`, per
  `01.phase-1-output/user-stories.md` STORY-018/STORY-026 acceptance criteria).
- **Actual text**: `"DATA_CHANGED: This record has been changed by another user since it
  was read. Please review the current values and try again."`, returned verbatim by the
  backend (`AccountService.java`/`CardService.java`, `ConflictException` message) and
  surfaced as-is by the frontend (`AccountUpdatePage.tsx`/`CardUpdatePage.tsx`, `e2.message`
  on a 409 response).
- **Impact**: Functionally the save is still correctly refused (BR-007/BR-009 behavior is
  intact — no data loss), but the on-screen wording is not the legacy text that
  `user-stories.md` calls out. Cosmetic/text-fidelity gap, not a business-rule
  correctness gap.
- **Evidence**: `e2e/tests/account.spec.ts` → `'STORY-018 (DEFECT-001): the conflict
  message text does not match the legacy wording'` (`test.fail`); `e2e/tests/card.spec.ts`
  → `'STORY-026 (DEFECT-001): the conflict message text does not match the legacy
  wording'` (`test.fail`). The functional (non-text) 409 behavior is separately covered by
  passing tests (`'STORY-018 / BR-007: saving with a stale snapshot is rejected as a 409
  conflict'`, `'STORY-026 / BR-009: saving with a stale card snapshot is rejected as a 409
  conflict'`), which only assert that an alert is shown, not its exact text.
- **Suggested fix**: change the `ConflictException` message thrown in
  `AccountService.updateAccount` and `CardService.updateCard` to the exact legacy string
  `"Record changed by some one else. Please review"` (not implemented here — out of scope
  for this test-only task).

---

## DEFECT-002: Report confirm-gate messages don't match the legacy wording

- **Where**: Transaction Report Request (`CORPT00C`) confirm step.
- **Stories affected**: STORY-042.
- **Validation rules affected**: VR-113, VR-114.
- **Expected (legacy) text**:
  - VR-113 (blank confirm): `"Please confirm to print the <report> report..."` (report
    type name interpolated), `cbl/CORPT00C.cbl:464-474`.
  - VR-114 (invalid confirm value): `""<value>" is not a valid value to confirm..."`
    (entered value interpolated), `cbl/CORPT00C.cbl:484-493`.
- **Actual text** (`src/pages/ReportPage.tsx`): the generic, non-interpolated
  `"Confirm to print the report..."` and `"Invalid value. Valid values are (Y/N)..."` —
  the same shared strings the app reuses for the bill-payment and transaction-add confirm
  gates.
- **Impact**: Cosmetic/text-fidelity only — the confirm gate still correctly blocks
  submission until `Y` is entered (VR-113/VR-114's actual *behavior* is intact).
- **Evidence**: `e2e/tests/report.spec.ts` → `'VR-113 (DEFECT-002): blank confirm message
  does not match the legacy wording'` and `'VR-114 (DEFECT-002): invalid confirm message
  does not match the legacy wording'` (both `test.fail`). The functional gate is
  separately covered by passing tests (`'STORY-042 / VR-113: user must confirm before the
  report job is submitted'`, `'VR-114: an invalid confirm value is rejected'`), which only
  assert the app's actual (generic) message text.
- **Suggested fix**: interpolate the selected report type name into the VR-113 message and
  the entered value into the VR-114 message in `ReportPage.tsx` (not implemented here —
  out of scope for this test-only task).

---

## DEFECT-003: Account Status invalid-value message is indistinguishable from the blank-value message

- **Where**: Account Update (`COACTUPC`) → Account Status field.
- **Validation rules affected**: VR-010 (blank), VR-015 (non-blank invalid).
- **Expected (legacy) text**: a blank value is rejected with `"Account Status must be
  supplied."`; a non-blank value that isn't `Y`/`N` is rejected with a distinct message,
  `"Account Status must be Y or N."` (`validation-rules.md` VR-010/VR-015).
- **Actual text**: `src/validation/rules.ts`'s `yesNo(value, message)` helper takes a single
  `message` parameter and returns it for both the blank case and the non-blank-invalid case:
  `if (isBlank(value)) return message; return /^[YyNn]$/.test(value) ? undefined : message`.
  `AccountUpdatePage.tsx` calls `yesNo(f.activeStatus, 'Account Status must be supplied.')`,
  so entering e.g. `'Z'` incorrectly shows `"Account Status must be supplied."` instead of a
  "must be Y or N" message. The same `yesNo()` call pattern is also used for Primary Card
  Holder Indicator (`yesNo(f.priCardHolderInd, 'Primary Card Holder must be supplied.')`),
  which has the identical defect but is not separately covered by a test here.
- **Impact**: Cosmetic/text-fidelity only — the field is still correctly rejected in both
  cases (the form cannot be saved with an invalid Account Status), only the on-screen wording
  fails to distinguish "blank" from "invalid value" the way the legacy screen did.
- **Evidence**: `e2e/tests/account.spec.ts` → `'VR-010 (DEFECT-003): a non-blank invalid
  Account Status shows the wrong message'` (`test.fail`). The blank-value case is separately
  covered by a passing test (`'VR-010: a blank Account Status is rejected with the exact
  legacy message'`).
- **Suggested fix**: give `yesNo()` two message parameters (one for blank, one for
  non-blank-invalid) and update both `AccountUpdatePage.tsx` call sites to pass a distinct
  "must be Y or N" message (not implemented here — out of scope for this test-only task).

---

## DEFECT-004: A 401 mid-session redirect loses its "session expired" message to a route-guard race

- **Where**: Any authenticated screen, when a request returns 401 mid-session (e.g. the
  session cookie expires while the user is on `/accounts/view`).
- **Expected behavior**: the user is redirected to `/signon` and shown `"Your session has
  expired. Please sign on again."` so they understand *why* they were bounced back.
- **Actual behavior**: the user is redirected to `/signon`, but with no message at all.
- **Root cause**: `AuthContext.tsx`'s `onUnauthorized` listener calls both `setSession(null)`
  and `navigate('/signon', { state: { message: '...' }, replace: true })` in the same tick.
  React batches the `setSession(null)` update and re-renders `RequireAuth` (the layout route
  guarding all authenticated routes) with `session === null` *before* the router has fully
  committed the new `/signon` location from the explicit `navigate()` call. `RequireAuth`
  then renders its own `<Navigate to="/signon" replace />` (with no `state`), which performs
  a second `history.replaceState()` that lands after the first and wins the race, wiping out
  the `message` in `location.state`. Confirmed via direct reproduction: instrumenting both
  `AuthContext.tsx`'s listener and `RequireAuth.tsx`'s render showed `RequireAuth`'s
  guard-redirect firing (twice, once per React render pass) after the state-carrying
  `navigate()` call, with the final `history.state.usr` ending up `null`.
- **Impact**: Cosmetic/UX only — the security behavior itself is correct (the user IS signed
  out and IS returned to the Sign On screen on any 401), only the explanatory message is
  lost, which is why the user is not told why. The other network-failure fallback messages
  ("Unable to look up account.", 500 "Internal error") are unaffected since they don't
  involve a route change/redirect.
- **Evidence**: `e2e/tests/network-failure.spec.ts` → `'a 401 response mid-session redirects
  back to Sign On with an expiry message (DEFECT-004)'` (`test.fail`).
- **Suggested fix**: have `RequireAuth` never issue its own redirect when the app is already
  in the middle of an explicit, state-carrying navigation (e.g. by centralizing the 401
  redirect entirely inside `RequireAuth`'s effect instead of duplicating it in
  `onUnauthorized`, or by storing the expiry message in a ref/context value read by
  `SignOnPage` instead of router `state`) — not implemented here — out of scope for this
  test-only task.

---

No other defects were found while writing or running this suite as of the date of the last
full run recorded in the final task report. Every other mismatch between the app's observed
behavior and the phase-1 catalogs turned out to be either (a) a documented, intentional
frontend deviation already called out in `README.md` (VR-008/VR-006 short-account-ID
relaxation, VR-042/VR-047 deferred lookup-table checks), or (b) a rule/story that has no
corresponding UI path to exercise at all (see `e2e/TRACEABILITY.md` for the full N/A list) —
neither of which is a defect.
