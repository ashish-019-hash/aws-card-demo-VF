# Defects found while writing unit tests

Documented per the frontend-unit-test skill: production code is not modified for these;
the corresponding test is written to the intended/spec behavior and marked `it.fails`
(fails today, will start passing once the production bug is fixed) or `it.todo` when the
scenario can't yet be exercised at all.

## 1. `CardUpdatePage` "no change detected" comparison is field-order sensitive

- **File:** `src/pages/CardUpdatePage.tsx`, `buildDraft()` / `handleValidate()`
- **Expected (spec):** Per screen-flow.md (COCRDUPC) and BR-009, if the user submits the
  edit form without changing any value, the page must show
  `"No change detected with respect to values fetched."` and stay on the edit step (no
  confirm/save).
- **Actual:** `buildDraft()` returns an object literal with keys in the order
  `{cvvCd, embossedName, activeStatus, expirationDate}`. The fetched snapshot (`expected`,
  taken directly from the backend's `CardFields` DTO —
  `02.phase-2-output/backend/src/main/java/com/carddemo/backend/dto/CardFields.java`, key
  order `{cvvCd, embossedName, expirationDate, activeStatus}`) has a different key order.
  The no-change check is `JSON.stringify(draft) === JSON.stringify(expected)`, which is
  key-order sensitive, so two objects with identical field values in different key order
  are treated as "changed." An untouched form therefore incorrectly proceeds to the
  confirm/save step and issues an unnecessary `PUT /api/cards/:cardNum` instead of showing
  the "no change" message.
- **Suggested fix:** Compare individual fields (e.g.
  `draft.cvvCd === expected.cvvCd && draft.embossedName === expected.embossedName && ...`)
  or normalize both objects' key order before `JSON.stringify`.
- **Test:** `src/test/pages/CardUpdatePage.extra.test.tsx` →
  `it.fails('shows "No change detected" when validated values equal the fetched snapshot')`.

## `AccountUpdatePage` — checked, no defect found

`AccountUpdatePage.tsx`'s `handleValidate()` uses the same
`JSON.stringify(draft) === JSON.stringify(expected)` no-change check as `CardUpdatePage`,
but here it is not affected: both `draft` and `expected` are produced by `cloneFields`,
which spreads the *same* fetched `account.fields` object (see `handleSearch`), so their
key order always matches and the comparison is reliable. Confirmed via
`src/test/pages/AccountUpdatePage.test.tsx` → `'shows "No change detected" when
validated values equal the fetched snapshot'` (passes, no `it.fails` needed).
