# Defects found while writing unit tests

Documented per the frontend-unit-test skill: production code is not modified for these;
the corresponding test is written to the intended/spec behavior and marked `it.fails`
(fails today, will start passing once the production bug is fixed) or `it.todo` when the
scenario can't yet be exercised at all.

## 1. `CardUpdatePage` "no change detected" comparison is field-order sensitive — RESOLVED

- **File:** `src/pages/CardUpdatePage.tsx`, `buildDraft()` / `handleValidate()`
- **Was:** `buildDraft()` returns an object literal with keys in the order
  `{cvvCd, embossedName, activeStatus, expirationDate}`. The fetched snapshot (`expected`,
  taken directly from the backend's `CardFields` DTO —
  `02.phase-2-output/backend/src/main/java/com/carddemo/backend/dto/CardFields.java`, key
  order `{cvvCd, embossedName, expirationDate, activeStatus}`) has a different key order.
  The no-change check was `JSON.stringify(draft) === JSON.stringify(expected)`, which is
  key-order sensitive, so two objects with identical field values in different key order
  were treated as "changed."
- **Fix:** Added a shared `fieldsEqual()` helper to `src/validation/rules.ts` that compares
  fields by key rather than by serialized string, and switched both `CardUpdatePage` and
  `AccountUpdatePage` to use it (removing `AccountUpdatePage`'s own `JSON.stringify`-based
  `fieldsEqual`, which happened to not manifest the bug but was equally fragile in
  principle).
- **Test:** `src/test/pages/CardUpdatePage.extra.test.tsx` →
  `'shows "No change detected" when validated values equal the fetched snapshot'` (now a
  normal passing test, no longer `it.fails`).

## `AccountUpdatePage` — checked, no defect found

`AccountUpdatePage.tsx`'s `handleValidate()` used the same
`JSON.stringify(draft) === JSON.stringify(expected)` no-change check as `CardUpdatePage`,
but here it was not affected: both `draft` and `expected` are produced by `cloneFields`,
which spreads the *same* fetched `account.fields` object (see `handleSearch`), so their
key order always matched and the comparison was reliable. It now uses the shared
`fieldsEqual()` helper as well (see #1 above), which is order-independent regardless.
