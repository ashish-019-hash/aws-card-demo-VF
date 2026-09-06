# Frontend Functional Test Traceability Matrix

Primary scripts are in [FUNCTIONAL_TEST_SCRIPTS.md](FUNCTIONAL_TEST_SCRIPTS.md); exact data vectors are in [FUNCTIONAL_TEST_DATA.md](FUNCTIONAL_TEST_DATA.md). `P/N/B` means observed positive, negative, and boundary/edge coverage in the current React UI. `N/A` is an auditable unimplemented modern-stack gap; `Blocked` requires stated environment evidence. Run-log result IDs use `<test ID>-S<step>` as defined in the scripts.

## User-story coverage

| User story | Functional scripts | Coverage |
|---|---|---|
| STORY-001 Authenticate and reach appropriate menu | FT-FE-001 | P/N/B: required fields, uppercasing, standard/admin route, wrong/unknown/verification error, unsupported action. |
| STORY-002 Select main-menu capability | FT-FE-002 | Visible-route coverage only. Numeric menu entry/RULE-VAL-021 and admin-only menu branch/RULE-VAL-022 are N/A—unimplemented. |
| STORY-003 Select security-administration capability | FT-FE-003 | Visible-route coverage only; numeric menu entry/RULE-VAL-021 is N/A—unimplemented. |
| STORY-004 View credit-card account | FT-FE-004 | P/N/B: valid relationship, invalid/not-found/missing-link/data failures, return. |
| STORY-005 Update credit-card account | FT-FE-005, FT-FE-006 | P/N/B: retrieve, save, no-op, concurrency, rollback, every maintenance validation. |
| STORY-006 Browse credit-card list | FT-FE-007 | P/N/B for filters/native pagination; S/U action selection/RULE-VAL-016 is N/A—unimplemented. |
| STORY-007 View card details | FT-FE-008 | P/N/B: list/direct lookup, malformed/not-found/mismatch, return. |
| STORY-008 Update credit card | FT-FE-009 | P/N/B: retrieve/save/no-op/stale update and all card attributes/boundaries. |
| STORY-009 Browse/select transactions | FT-FE-010 | P/N/B for filter/native pagination; S/s selection-code half of RULE-VAL-027 is N/A—unimplemented. |
| STORY-010 View transaction details | FT-FE-010 | P/N/B: complete displayed fields, blank/not-found, clear/return. |
| STORY-011 Add transaction | FT-FE-011 | P/N/B: account/card resolution, all input validation, confirmation, PF5 add path, unique ID. |
| STORY-012 Pay outstanding balance | FT-FE-012 | Positive full-payment P/N/B where seeded/setup data exists; legacy confirmation tri-state and payment-page pre-balance display are gaps; zero/negative are Blocked without documented setup. |
| STORY-013 Browse/select security users | FT-FE-013 | P/N/B: filter, U/D selection, paging/boundaries, invalid action. |
| STORY-014 Add security user | FT-FE-014 | P/N/B: all required fields, create, duplicate/failure, sign-in verification. |
| STORY-015 Update security user | FT-FE-015 | P/N/B: retrieve/missing/not-found/no-op/required fields/update/navigation. |
| STORY-016 Delete security user | FT-FE-016 | P/N/B: retrieve-before-delete, explicit deletion, missing/not-found/failure/cancel. |
| STORY-017 Request transaction report | FT-FE-017 | Observable month/year/custom REST coverage; legacy confirmation tri-state, controlled clock, and TDQ/job queue paths are gaps/N/A. |
| STORY-018 Produce formatted transaction report | FT-FE-018 | **N/A—unimplemented modern-stack gap.** JSON report response does not produce batch backup, `TRANREPT`, sorting/output dataset, or fixed 133-byte records. |

## Entity CRUD and observable relationship coverage

Entities with no end-user create/update/delete flow are explicitly marked read-only/non-UI; no tests invent operations absent from source requirements.

| Entity | Create | Read | Update | Delete | Scripts / note |
|---|---|---|---|---|---|
| ENTITY-001 Customer | — | Yes | Yes through account maintenance | — | FT-FE-004–006. Maintained with Account; no standalone create/delete. |
| ENTITY-002 Account | — | Yes | Yes | — | FT-FE-004–006, FT-FE-012. No standalone account create/delete. |
| ENTITY-003 Card | — | Yes | Yes | — | FT-FE-004, FT-FE-007–009. No create/delete screen. |
| ENTITY-004 Card Account Assignment | — | Yes / resolve | — | — | FT-FE-004, FT-FE-007–008, FT-FE-011–012. Read-only relationship in supplied UI. |
| ENTITY-005 Transaction | Yes | Yes | — | — | FT-FE-010–012, FT-FE-017. FT-FE-018 batch output is N/A. No update/delete flow. |
| ENTITY-006 Transaction Type | — | Referenced during transaction add | — | — | FT-FE-011. No configuration CRUD UI; FT-FE-018 report process is N/A. |
| ENTITY-007 Transaction Category | — | Referenced during transaction add | — | — | FT-FE-011. No configuration CRUD UI; FT-FE-018 report process is N/A. |
| ENTITY-008 Transaction Category Balance | — | — | — | — | Persisted entity but no supplied COBOL/frontend business function references it; no UI CRUD inferred. |
| ENTITY-009 Disclosure Group Rate | — | — | — | — | Persisted configuration but no supplied COBOL/frontend business function references it; no UI CRUD inferred. |
| ENTITY-010 Application User | Yes | Yes | Yes | Yes | FT-FE-001, FT-FE-013–016. |

## Business-rule coverage

| Rule | Test IDs | Scenario coverage |
|---|---|---|
| RULE-DECISION-001 Positive balance required for payment | FT-FE-012 | Positive seed account `1` (`194.00`) executable; zero/negative require documented temporary setup or are Blocked. |
| RULE-CALC-002 Full-current-balance payment | FT-FE-012 | Verifies amount equals pre-balance recorded in Account lookup and new balance is zero; payment UI itself lacks pre-balance display. |
| RULE-DECISION-003 Monthly report period | FT-FE-017 | Running-clock first-to-last month via REST response; controlled December/batch output is N/A. |
| RULE-DECISION-004 Yearly report period | FT-FE-017 | Controlled current year Jan 1–Dec 31. |

## Validation-rule coverage

| Rule | Test IDs | P/N/B evidence |
|---|---|---|
| RULE-VAL-001 Account update requires account number | FT-FE-005 | Blank rejected before retrieve. |
| RULE-VAL-002 Account ID numeric/non-zero 11-digit | FT-FE-005 | Alpha/zero rejected; valid max-length account retrieves. |
| RULE-VAL-003 Account active Y/N | FT-FE-006 | Blank/X reject; Y/N accept. |
| RULE-VAL-004 Signed monetary fields | FT-FE-006 | Blank/non-numeric/over-decimal reject; signed decimals/bounds accept. |
| RULE-VAL-005 Account/customer calendar dates | FT-FE-006 | Blank/leap/DOB-past UI cases; malformed textual dates are API-level/UI-unreachable in native date inputs. |
| RULE-VAL-006 FICO 300–850 | FT-FE-006 | Blank/zero/299/851/non-numeric reject; 300/850 accept. |
| RULE-VAL-007 Customer names | FT-FE-006 | Required first/last, optional middle, alpha-only cases. |
| RULE-VAL-008 Address/city/state/country/ZIP/EFT | FT-FE-006 | Required/domain checks plus optional address line 2. |
| RULE-VAL-009 Valid US state | FT-FE-006 | `ZZ` reject; `TX` accept. |
| RULE-VAL-010 State/ZIP prefix compatibility | FT-FE-006 | Incompatible fixture pair rejects; TX/78 accepts. |
| RULE-VAL-011 Optional US phones | FT-FE-006 | All blank accepts; partial/zero/bad code rejects; 3/3/4 accepts. |
| RULE-VAL-012 SSN components/prefixes | FT-FE-006 | Component required/numeric/non-zero; 000/666/900–999 reject. |
| RULE-VAL-013 Primary holder Y/N | FT-FE-006 | Blank/X reject; Y/N accept. |
| RULE-VAL-014 Account filter / lookup identifier | FT-FE-004, FT-FE-007–009 | Context-specific required vs optional blank/zero and numeric tests. |
| RULE-VAL-015 Card filter / lookup identifier | FT-FE-007–009 | Context-specific required vs optional blank/zero and 16-digit tests. |
| RULE-VAL-016 Card-list row selection | FT-FE-007 | **N/A—unimplemented.** React list exposes links, not S/U/multi-row action input. |
| RULE-VAL-017 Card embossed name | FT-FE-009 | Blank/non-alpha reject; alphabetic/spaces accept. |
| RULE-VAL-018 Card status Y/N | FT-FE-009 | Blank/X reject; Y/N accept. |
| RULE-VAL-019 Card expiry month 1–12 | FT-FE-009 | Blank/00/13 reject; 01/12 accept. |
| RULE-VAL-020 Card expiry year 1950–2099 | FT-FE-009 | Blank/1949/2100 reject; endpoints accept. |
| RULE-VAL-021 Menu numeric/in-range | FT-FE-002–003 | **N/A—unimplemented.** React navigation has links, no numeric menu-entry field. |
| RULE-VAL-022 Config-dependent admin-only main option | FT-FE-002 | **N/A—unimplemented.** No configurable option/type-A menu branch in React UI. |
| RULE-VAL-023 Security-user required fields | FT-FE-014–016 | Create/update all fields; update/delete lookup user ID; no persistence on failure. |
| RULE-VAL-024 Unique new user ID | FT-FE-014 | First create succeeds; duplicate rejected. |
| RULE-VAL-025 Sign-on user ID/password | FT-FE-001 | Each missing field and valid credentials. |
| RULE-VAL-026 Bill-payment account/confirmation | FT-FE-012 | Account ID and Y executable. Blank/N/X share a client-side error/no request; legacy tri-state is a gap. |
| RULE-VAL-027 Transaction-list selection/filter | FT-FE-010 | Filter P/N/B executable; S/s selection-code half is **N/A—unimplemented** (links replace action code). |
| RULE-VAL-028 Transaction detail ID | FT-FE-010 | Blank rejected; known ID displays. |
| RULE-VAL-029 Transaction-add confirmation | FT-FE-011 | Y/y creates; blank/N non-add; X reject. |
| RULE-VAL-030 New transaction account or card | FT-FE-011 | Both absent/non-numeric reject; account/card valid resolution. |
| RULE-VAL-031 New transaction mandatory fields | FT-FE-011 | One blank field at a time; all completed accepts. |
| RULE-VAL-032 Transaction type/category numeric | FT-FE-011 | Alpha/mixed reject; numeric accepts. |
| RULE-VAL-033 Signed fixed-decimal amount | FT-FE-011 | Sign/width/decimal failures; zero and maximum formatted bounds. |
| RULE-VAL-034 Transaction dates | FT-FE-011 | Valid/native blank UI cases; malformed textual dates are API-level/UI-unreachable. |
| RULE-VAL-035 Merchant ID numeric | FT-FE-011 | Nonnumeric reject; numeric accept. |
| RULE-VAL-036 Unique transaction ID | FT-FE-011, FT-FE-012 | Sequential unique ID and duplicate-key fault for both creation paths. |
| RULE-VAL-037 Custom report date components | FT-FE-017 | Missing/valid native-date cases executable; malformed component vectors are API-level/UI-unreachable. UI adds a chronology check beyond source rule. |
| RULE-VAL-038 Report confirmation | FT-FE-017 | Y submits. Blank/N/X share modern client error/no request; legacy tri-state is a gap. |
| RULE-VAL-039 Reusable account calendar/date-of-birth utility | FT-FE-006 | Native-date leap/DOB-past cases; malformed textual vectors are API-level/UI-unreachable. |

## Reportable frontend/specification gaps

| Gap | Effect on execution | Handling in scripts |
|---|---|---|
| React navigation uses links, not BMS numeric menus, PF keys, or card/transaction/user action-code fields. | RULE-VAL-016, RULE-VAL-021, RULE-VAL-022, and selection-code half of RULE-VAL-027 cannot be executed manually. | Log N/A with cited UI evidence; scripts do not use a harness/equivalent. |
| Native `input[type=date]` prevents malformed text/calendar component values. | Vectors such as `2023-02-29`, `2024-13-01`, and nonnumeric date parts cannot be entered in normal manual UI flow. | Log API-level/UI-unreachable; exercise only browser-reachable blank/valid values. |
| Payment screen has no displayed pre-payment balance and accepts only Y. | Full-payment baseline comes from Account lookup; legacy Y/N/invalid confirmation branching is not observable. | FT-FE-012 records the lookup baseline and logs confirmation branch as gap. |
| Report UI accepts only Y, uses running clock, adds chronology validation, and persists/returns REST JSON. | No legacy tri-state confirmation, controlled clock, TDQ/JOBS queue, queue failure, job cancellation, or batch output exists. | FT-FE-017 logs observable REST behavior; FT-FE-018 is N/A, not P/N/B. |
| Default seed has only positive balances and two users. | Zero/negative payment and user pagination need setup. | Use documented temporary account update/disposable users or mark Blocked. |
| No UI flow exists for CRUD on Entity-008/009 or create/delete of account/card/customer. | CRUD cannot be tested without inventing requirements. | Matrix marks non-UI/not inferred. |
