# E2E Defects Log

This file records defects discovered while writing and running the Playwright suite under
`e2e/`. All four defects originally logged here have since been fixed in production code;
each entry below now documents the original defect, the fix, and the test that proves it.

---

## DEFECT-001 (RESOLVED): Optimistic-concurrency conflict message didn't match the legacy wording

- **Where**: Account Update (`COACTUPC`) and Card Update (`COCRDUPC`) save flows.
- **Stories affected**: STORY-018, STORY-026.
- **Business rules affected**: BR-007 (account), BR-009 (card).
- **Expected (legacy) text**: `"Record changed by some one else. Please review"`
  (`cbl/COACTUPC.cbl:520-521, 4143, 4189-4190`; `cbl/COCRDUPC.cbl:207-208`, per
  `01.phase-1-output/user-stories.md` STORY-018/STORY-026 acceptance criteria).
- **Was**: the backend returned a modernized message
  (`"DATA_CHANGED: This record has been changed by another user since it was read. ..."`),
  surfaced as-is by the frontend.
- **Fix**: `AccountService.updateAccount`/`CardService.updateCard` now throw
  `new ConflictException("DATA_CHANGED", "Record changed by some one else. Please review")`
  (and `"Update of record failed"` for the update-failure path), matching the legacy text
  exactly. The frontend already surfaced `e2.message` verbatim, so no frontend change was
  needed.
- **Test**: `e2e/tests/account.spec.ts` → `'STORY-018: the conflict alert shows the exact
  legacy conflict message'`; `e2e/tests/card.spec.ts` → `'STORY-026: the conflict alert
  shows the exact legacy conflict message'` (both plain passing tests).

---

## DEFECT-002 (RESOLVED): Report confirm-gate messages didn't match the legacy wording

- **Where**: Transaction Report Request (`CORPT00C`) confirm step.
- **Stories affected**: STORY-042.
- **Validation rules affected**: VR-113, VR-114.
- **Expected (legacy) text**:
  - VR-113 (blank confirm): `"Please confirm to print the <report> report..."` (report
    type name interpolated), `cbl/CORPT00C.cbl:464-474`.
  - VR-114 (invalid confirm value): `""<value>" is not a valid value to confirm..."`
    (entered value interpolated), `cbl/CORPT00C.cbl:484-493`.
- **Was**: `src/pages/ReportPage.tsx` used the generic, non-interpolated
  `"Confirm to print the report..."` and `"Invalid value. Valid values are (Y/N)..."`.
- **Fix**: `ReportPage.tsx`'s `handleSubmit()` confirm-gate now interpolates the selected
  report type into the blank-confirm message and the entered value into the invalid-confirm
  message, and an explicit `'N'` clears the whole screen (`INITIALIZE-ALL-FIELDS`) instead of
  showing a message, matching `CORPT00C.cbl`'s `SUBMIT-JOB-TO-INTRDR`/`INITIALIZE-ALL-FIELDS`.
- **Test**: `e2e/tests/report.spec.ts` → `'STORY-042 / VR-113: user must confirm before the
  report job is submitted'` and `'VR-114: an invalid confirm value is rejected'` (both assert
  the interpolated legacy text).

---

## DEFECT-003 (RESOLVED): Account Status invalid-value message was indistinguishable from the blank-value message

- **Where**: Account Update (`COACTUPC`) → Account Status field.
- **Validation rules affected**: VR-010 (blank), VR-015 (non-blank invalid).
- **Expected (legacy) text**: a blank value is rejected with `"Account Status must be
  supplied."`; a non-blank value that isn't `Y`/`N` is rejected with a distinct message,
  `"Account Status must be Y or N."` (`validation-rules.md` VR-010/VR-015).
- **Was**: `src/validation/rules.ts`'s `yesNo(value, message)` helper took a single
  `message` parameter and returned it for both the blank case and the non-blank-invalid
  case, so `AccountUpdatePage.tsx` showed `"Account Status must be supplied."` even for a
  non-blank invalid value like `'Z'`.
- **Fix**: `yesNo()` now takes an optional second parameter,
  `yesNo(value, blankMessage, invalidMessage = blankMessage)`, and `AccountUpdatePage.tsx`
  passes a distinct invalid-value message for both Account Status
  (`'Account Status must be Y or N.'`) and Primary Card Holder Indicator
  (`'Primary Card Holder must be Y or N.'`).
- **Test**: `e2e/tests/account.spec.ts` → `'VR-010/VR-015: a non-blank invalid Account
  Status shows its own distinct message'` (plain passing test); the blank-value case
  remains covered by `'VR-010: a blank Account Status is rejected with the exact legacy
  message'`.

---

## DEFECT-004 (RESOLVED): A 401 mid-session redirect lost its "session expired" message to a route-guard race

- **Where**: Any authenticated screen, when a request returns 401 mid-session (e.g. the
  session cookie expires while the user is on `/accounts/view`).
- **Expected behavior**: the user is redirected to `/signon` and shown `"Your session has
  expired. Please sign on again."` so they understand *why* they were bounced back.
- **Was**: `AuthContext.tsx`'s `onUnauthorized` listener called both `setSession(null)` and
  `navigate('/signon', { state: { message: '...' }, replace: true })` in the same tick.
  React batched the `setSession(null)` update and re-rendered `RequireAuth` with
  `session === null` before the router had fully committed the explicit `navigate()`
  call's location. `RequireAuth` then rendered its own state-less `<Navigate to="/signon"
  replace />`, whose `history.replaceState()` landed after the explicit one and won the
  race, wiping out the `message`.
- **Fix**: centralized the redirect entirely inside `RequireAuth`, per the suggested fix.
  `AuthContext.tsx`'s `onUnauthorized` listener no longer calls `navigate()` itself — it
  only records the reason via a new `unauthorizedMessage` context value (cleared on the
  next successful `signIn()`). `RequireAuth.tsx` is now the single place that redirects to
  `/signon`, passing `state={{ message: unauthorizedMessage }}` when set. There is only one
  navigation to `/signon` now, so there's nothing left to race.
- **Test**: `e2e/tests/network-failure.spec.ts` → `'a 401 response mid-session redirects
  back to Sign On with an expiry message'` (plain passing test); unit coverage in
  `src/test/auth/AuthContext.test.tsx` → `'redirects to /signon with the session-expired
  message on any 401 response (DEFECT-004, resolved)'`.

---

No other defects were found while writing or running this suite. Every other mismatch
between the app's observed behavior and the phase-1 catalogs turned out to be either (a) a
documented, intentional frontend deviation already called out in `README.md`
(VR-042/VR-047 deferred lookup-table checks), or (b) a rule/story that has no corresponding
UI path to exercise at all (see `e2e/TRACEABILITY.md` for the full N/A list) — neither of
which is a defect.
