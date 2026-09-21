# Frontend Unit Test Matrix

Maps every Vitest test file/group to the phase-1 specs it exercises:
`STORY-###` (`01.phase-1-output/user-stories.md`), `VR-###` (`validation-rules.md`),
screen id + program/transaction (`screen-flow.md`), and the relevant entity
(`business-entities.md`). Run with `npx vitest run` from
`03.phase-3-output/frontend`.

Legend: **file** = test file path relative to `03.phase-3-output/frontend/`. Files
under `src/test/` were added/extended by this task; files listed under "Pre-existing
(outside `src/test/`)" existed before this task and are included here for completeness
of coverage, unmodified.

## Sign-On — COSGN00C (`CC00`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/pages/SignOnPage.test.tsx` (pre-existing) | render, blank userId/password block, wrong-password/unknown-user backend messages, successful sign-in navigates by role | STORY-001..006 | VR-001, VR-002 |

## Main Menu / Admin Menu — COMEN01C / COADM01C (`CM00`/`CA00`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/MenuPage.test.tsx` | renders screen id/title + backend-driven option list (regular + admin), load-error message, navigates via `menuRoutes.ts` `SCREEN_ROUTES` mapping, sign-out button | STORY-007, STORY-010, STORY-011 | VR-003, VR-004 |
| `src/test/App.test.tsx` | full route wiring: unauthenticated → `/signon` redirect (STORY-006/011 exit), authenticated regular user reaches every non-admin screen, `AdminGate` blocks a regular user from all 4 `/users*` routes (STORY-009) with legacy 403 message, admin passes through to all 4 `/users*` screens (STORY-010), unknown/root path → `/signon` | STORY-006, 007, 009, 010, 011 | — |
| `src/auth/AdminGate.test.tsx` (pre-existing, outside `src/test/`) | blocks non-admin / allows admin, in isolation | STORY-009 | — |
| `src/test/auth/RequireAuth.test.tsx` | redirect when no session, pass-through when authenticated, no flash while loading | STORY-006, 011 | — |
| `src/test/auth/AuthContext.test.tsx` | session bootstrap, sign-in/sign-out, 401→sign-out-and-redirect on `onUnauthorized` | STORY-001..006 | — |

## Account View — COACTVWC (`CAVW`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/AccountViewPage.test.tsx` | initial render, blank/zero/non-numeric account-id block (exact legacy double-space message pinned via `textContent`), successful lookup renders full detail grid, backend not-found message, Back link to `/menu` | STORY-012, 013 | VR-005, VR-006 |

## Account Update — COACTUPC (`CAUP`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/AccountUpdatePage.test.tsx` (34 tests) | search-step render, blank/non-numeric account-id block, backend not-found on lookup, successful lookup pre-fills edit form, no-change-detected (confirmed **not** affected by the key-order defect seen in `CardUpdatePage` — see `DEFECTS.md`), real change → confirm step → F5=Save success, F12=Cancel reverts draft, 409 conflict shows message + re-fetches snapshot + stays on edit, 400 field-error mapping, parameterized exact-message checks for activeStatus/creditLimit/zip/eftAccountId/priCardHolderInd/state-code/city, FICO boundary 299/300/850/851, DOB-in-future (today) block, invalid calendar date, SSN area 000/666/950 + short-SSN, Phone Number 1 malformed/zero-area/zero-prefix/zero-line, Back link | STORY-015..019 | VR-010, VR-014, VR-035, VR-037, VR-040, VR-041 |

## Card List — COCRDLIC (`CCLI`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/CardListPage.test.tsx` | initial load, empty-list message, account-filter/card-filter validation errors, F7/F8 pagination + disabled-state boundaries, View/Update row links, Back link, backend 500 error | STORY-020, 021, 022 | account/card filter format checks |

## Card View — COCRDSLC (`CCDL`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/CardViewPage.test.tsx` | initial render (no detail grid), auto-lookup via URL `cardNum` param, both-blank block message, account-filter validation, manual lookup, 404 not-found, Back link | STORY-023 | account/card filter format checks |

## Card Update — COCRDUPC (`CCUP`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/pages/CardUpdatePage.test.tsx` (pre-existing) | search→edit→validate→confirm→save happy path | STORY-024, 025 | VR-067, VR-068 |
| `src/test/pages/CardUpdatePage.extra.test.tsx` (13 tests) | blank card-number search block, backend lookup error, expiry-month boundary (0/13 blocked, 1/12 accepted), expiry-year boundary (1949/2100 blocked), invalid active-status block, no-change-detected (Defect #1, resolved — see `DEFECTS.md`), F12=Cancel reverts, 400 field-error mapping | STORY-024, 025, 026 | VR-067, VR-068 |

## Transaction List — COTRN00C (`CT00`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/TransactionListPage.test.tsx` | initial load, empty-list message, non-numeric jump-id block, numeric jump-id reload, F7/F8 pagination, "S = View" + Back link, backend 500 error | STORY-027, 028, 029 | VR-070 |

## Transaction View — COTRN01C (`CT01`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/TransactionViewPage.test.tsx` | initial render (no detail grid), auto-lookup via URL `tranId`, blank-tranId block, manual lookup renders all fields, 404 not-found, Back link | STORY-030 | VR-071 |

## Transaction Add — COTRN02C (`CT02`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/pages/TransactionAddPage.test.tsx` (pre-existing) | confirm gate (blocks without Y, submits with Y) | STORY-033 | VR-094 |
| `src/test/pages/TransactionAddPage.extra.test.tsx` (29 tests) | initial render, both-blank account/card block, non-numeric account-id block, parameterized exact-message coverage for typeCd/catCd/source/description/merchantId/merchantName/merchantCity/merchantZip (blank + non-numeric variants), amount-format regex rejections (`abc`, `1.234`, `123456789`) and boundary acceptances (`-99999999.99`, `0`, `99999999.99`), invalid orig-date format, invalid calendar proc-date, invalid Y/N confirm, confirm=N info-message-no-submit, F5=Copy-Last-Transaction (blank-card block, populates from `/api/transactions/last`, generic error on failure — STORY-032), backend 400 field-error mapping, Back link | STORY-031, 032, 033, 034 | VR-072..088ish (format/required checks), VR-094 |

## Bill Payment — COBIL00C (`CB00`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/pages/BillPaymentPage.test.tsx` (pre-existing) | lookup + confirm + post happy path | STORY-035, 036, 037 | VR-095, VR-096 |
| `src/test/pages/BillPaymentPage.extra.test.tsx` | blank account-id block, backend not-found on lookup, invalid Y/N confirm block, confirm=N info-message-no-post, backend error (409) on post failure, clearing account-id hides pay form, Back link | STORY-035, 037, 038 | VR-095, VR-096 |

## Transaction Report Request — CORPT00C (`CR00`)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/ReportPage.test.tsx` (12 tests) | initial render, blank report-type block, Custom reveals + requires date fields, malformed date format/validity messages, Monthly validate→confirm-mode toggle, re-validation resets to validate mode, blank-confirm block, invalid Y/N confirm block, confirm=N info-message-no-submit, confirm=Y submits + success, backend 400 field-error mapping, Back link | STORY-039..043 | VR-098, VR-099, VR-111..114 |

## User List — COUSR00C (`CU00`, admin only)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/UserListPage.test.tsx` | initial load, empty-list message, F7/F8 pagination, Add/Update/Delete links + Back-to-`/admin` link, backend 500 error | STORY-044, 045 | pagination |

## User Add — COUSR01C (`CU01`, admin only)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/UserAddPage.test.tsx` | initial render, parameterized blank-field legacy messages (userId/firstName/lastName/password/userType), invalid userType block, successful create + success message + delayed navigate to `/users`, backend 400 field-error mapping (dual MessageBar+FieldError match), Back link | STORY-046 | VR-115..120 |

## User Update — COUSR02C (`CU02`, admin only)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/UserUpdatePage.test.tsx` | initial render (no edit form), blank-userId lookup block, successful lookup pre-fills form with blank password, backend not-found on lookup, parameterized blank-field legacy messages on save, invalid userType block, successful save + success message, backend 400 field-error mapping, Back link | STORY-045, 047, 048 | VR-115..120 |

## User Delete — COUSR03C (`CU03`, admin only)

| File | Coverage | STORY | VR |
|---|---|---|---|
| `src/test/pages/UserDeletePage.test.tsx` | initial render, blank-userId block, successful lookup shows delete-confirmation detail grid, backend not-found error, F5=Delete success + clears grid, backend error on delete failure, Back link | STORY-045, 049, 050 | VR-127 |

## Shared components / API boundary

| File | Coverage |
|---|---|
| `src/test/components/FieldError.test.tsx` | renders message / renders nothing when undefined |
| `src/test/components/MessageBar.test.tsx` | error/info/success `kind` styling, renders nothing when message is null |
| `src/test/components/BackLink.test.tsx` | renders link with given `to` + label |
| `src/test/components/ScreenHeader.test.tsx` | renders screen id + title + live clock |
| `src/api/client.test.ts` (pre-existing, outside `src/test/`) | request helper, XSRF header injection, 401 → `onUnauthorized` callback |
| `src/validation/rules.test.ts` (pre-existing, outside `src/test/`) | pure validation-rule unit coverage (`rules.ts`) |

Every page test file above exercises the API boundary via MSW (`http.get/post/put/delete`
handlers returning success bodies, `HttpResponse.json(..., {status: 4xx/5xx})` error
envelopes, and 204/empty-body deletes) rather than hitting a real backend, and every
`*Page.test.tsx` file includes at least one accessibility-relevant assertion via
`getByLabelText`/`getByRole` (form fields and buttons are queried by their accessible
label/role rather than by CSS selector or test id, which also verifies every input has an
associated `<label>`).

## Totals

- Test files: 29 (22 under `src/test/`, 7 pre-existing outside `src/test/`)
- Tests: 261 (all passing; Defect #1 in `DEFECTS.md` is resolved and its test now passes normally)
- Baseline before this task: 7 files / 42 tests (all pre-existing, outside `src/test/`)
