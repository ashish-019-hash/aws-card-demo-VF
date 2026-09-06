# Frontend Functional Test Traceability Matrix

Primary scripts are in [FUNCTIONAL_TEST_SCRIPTS.md](FUNCTIONAL_TEST_SCRIPTS.md); exact data vectors are in [FUNCTIONAL_TEST_DATA.md](FUNCTIONAL_TEST_DATA.md). `P/N/B` means the referenced script includes positive, negative, and boundary/edge coverage. Rule coverage includes correction/no-persistence verification for every negative vector.

## User-story coverage

| User story | Functional scripts | Coverage |
|---|---|---|
| STORY-001 Authenticate and reach appropriate menu | FT-FE-001 | P/N/B: required fields, uppercasing, standard/admin route, wrong/unknown/verification error, unsupported action. |
| STORY-002 Select main-menu capability | FT-FE-002 | P/N/B: all 10 routes, invalid selections, dormant admin-only configuration branch, exit. |
| STORY-003 Select security-administration capability | FT-FE-003 | P/N/B: four routes, invalid selection boundary, exit. |
| STORY-004 View credit-card account | FT-FE-004 | P/N/B: valid relationship, invalid/not-found/missing-link/data failures, return. |
| STORY-005 Update credit-card account | FT-FE-005, FT-FE-006 | P/N/B: retrieve, save, no-op, concurrency, rollback, every maintenance validation. |
| STORY-006 Browse credit-card list | FT-FE-007 | P/N/B: filters, page moves/boundaries, S/U selection constraints. |
| STORY-007 View card details | FT-FE-008 | P/N/B: list/direct lookup, malformed/not-found/mismatch, return. |
| STORY-008 Update credit card | FT-FE-009 | P/N/B: retrieve/save/no-op/stale update and all card attributes/boundaries. |
| STORY-009 Browse/select transactions | FT-FE-010 | P/N/B: numeric filter, selection, pagination and boundaries. |
| STORY-010 View transaction details | FT-FE-010 | P/N/B: complete displayed fields, blank/not-found, clear/return. |
| STORY-011 Add transaction | FT-FE-011 | P/N/B: account/card resolution, all input validation, confirmation, PF5 add path, unique ID. |
| STORY-012 Pay outstanding balance | FT-FE-012 | P/N/B: blank/invalid/cancel/invalid confirmation, positive/zero/negative balance, full payment math. |
| STORY-013 Browse/select security users | FT-FE-013 | P/N/B: filter, U/D selection, paging/boundaries, invalid action. |
| STORY-014 Add security user | FT-FE-014 | P/N/B: all required fields, create, duplicate/failure, sign-in verification. |
| STORY-015 Update security user | FT-FE-015 | P/N/B: retrieve/missing/not-found/no-op/required fields/update/navigation. |
| STORY-016 Delete security user | FT-FE-016 | P/N/B: retrieve-before-delete, explicit deletion, missing/not-found/failure/cancel. |
| STORY-017 Request transaction report | FT-FE-017 | P/N/B: monthly/yearly/custom, all custom and confirmation paths, Dec boundary, queue failure. |
| STORY-018 Produce formatted transaction report | FT-FE-018 | P/N/B: backup, inclusive filter, card sort, inputs, fixed record format, empty range. |

## Entity CRUD and observable relationship coverage

Entities with no end-user create/update/delete flow are explicitly marked read-only/non-UI; no tests invent operations absent from source requirements.

| Entity | Create | Read | Update | Delete | Scripts / note |
|---|---|---|---|---|---|
| ENTITY-001 Customer | — | Yes | Yes through account maintenance | — | FT-FE-004–006. Maintained with Account; no standalone create/delete. |
| ENTITY-002 Account | — | Yes | Yes | — | FT-FE-004–006, FT-FE-012. No standalone account create/delete. |
| ENTITY-003 Card | — | Yes | Yes | — | FT-FE-004, FT-FE-007–009. No create/delete screen. |
| ENTITY-004 Card Account Assignment | — | Yes / resolve | — | — | FT-FE-004, FT-FE-007–008, FT-FE-011–012. Read-only relationship in supplied UI. |
| ENTITY-005 Transaction | Yes | Yes | — | — | FT-FE-010–012, FT-FE-017–018. No update/delete flow. |
| ENTITY-006 Transaction Type | — | Referenced/read in transaction/report | — | — | FT-FE-011, FT-FE-018. Configuration no CRUD UI. |
| ENTITY-007 Transaction Category | — | Referenced/read in transaction/report | — | — | FT-FE-011, FT-FE-018. Configuration no CRUD UI. |
| ENTITY-008 Transaction Category Balance | — | — | — | — | Persisted entity but no supplied COBOL/frontend business function references it; no UI CRUD inferred. |
| ENTITY-009 Disclosure Group Rate | — | — | — | — | Persisted configuration but no supplied COBOL/frontend business function references it; no UI CRUD inferred. |
| ENTITY-010 Application User | Yes | Yes | Yes | Yes | FT-FE-001, FT-FE-013–016. |

## Business-rule coverage

| Rule | Test IDs | Scenario coverage |
|---|---|---|
| RULE-DECISION-001 Positive balance required for payment | FT-FE-012 | Positive `+125.50`; boundaries `0.00` and `-1.00`; no payment when non-positive. |
| RULE-CALC-002 Full-current-balance payment | FT-FE-012 | Verifies payment transaction amount equals original balance and new balance equals zero. |
| RULE-DECISION-003 Monthly report period | FT-FE-017, FT-FE-018 | First-to-last controlled current month, including December transition; report contents. |
| RULE-DECISION-004 Yearly report period | FT-FE-017 | Controlled current year Jan 1–Dec 31. |

## Validation-rule coverage

| Rule | Test IDs | P/N/B evidence |
|---|---|---|
| RULE-VAL-001 Account update requires account number | FT-FE-005 | Blank rejected before retrieve. |
| RULE-VAL-002 Account ID numeric/non-zero 11-digit | FT-FE-005 | Alpha/zero rejected; valid max-length account retrieves. |
| RULE-VAL-003 Account active Y/N | FT-FE-006 | Blank/X reject; Y/N accept. |
| RULE-VAL-004 Signed monetary fields | FT-FE-006 | Blank/non-numeric/over-decimal reject; signed decimals/bounds accept. |
| RULE-VAL-005 Account/customer calendar dates | FT-FE-006 | Required, leap/year/month/day/calendar and DOB-past cases. |
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
| RULE-VAL-016 Card-list row selection | FT-FE-007 | One S/U accepts; two actions/bad code reject. |
| RULE-VAL-017 Card embossed name | FT-FE-009 | Blank/non-alpha reject; alphabetic/spaces accept. |
| RULE-VAL-018 Card status Y/N | FT-FE-009 | Blank/X reject; Y/N accept. |
| RULE-VAL-019 Card expiry month 1–12 | FT-FE-009 | Blank/00/13 reject; 01/12 accept. |
| RULE-VAL-020 Card expiry year 1950–2099 | FT-FE-009 | Blank/1949/2100 reject; endpoints accept. |
| RULE-VAL-021 Menu numeric/in-range | FT-FE-002–003 | Blank/nonnumeric/zero/out-of-range reject; all valid choices route. |
| RULE-VAL-022 Config-dependent admin-only main option | FT-FE-002 | Fixture configuration rejection; documented dormant state in supplied menu. |
| RULE-VAL-023 Security-user required fields | FT-FE-014–016 | Create/update all fields; update/delete lookup user ID; no persistence on failure. |
| RULE-VAL-024 Unique new user ID | FT-FE-014 | First create succeeds; duplicate rejected. |
| RULE-VAL-025 Sign-on user ID/password | FT-FE-001 | Each missing field and valid credentials. |
| RULE-VAL-026 Bill-payment account/confirmation | FT-FE-012 | Blank/malformed account; blank/Y/N/X confirmation paths. |
| RULE-VAL-027 Transaction-list selection/filter | FT-FE-010 | Blank/numeric filter, nonnumeric reject, S/s only. |
| RULE-VAL-028 Transaction detail ID | FT-FE-010 | Blank rejected; known ID displays. |
| RULE-VAL-029 Transaction-add confirmation | FT-FE-011 | Y/y creates; blank/N non-add; X reject. |
| RULE-VAL-030 New transaction account or card | FT-FE-011 | Both absent/non-numeric reject; account/card valid resolution. |
| RULE-VAL-031 New transaction mandatory fields | FT-FE-011 | One blank field at a time; all completed accepts. |
| RULE-VAL-032 Transaction type/category numeric | FT-FE-011 | Alpha/mixed reject; numeric accepts. |
| RULE-VAL-033 Signed fixed-decimal amount | FT-FE-011 | Sign/width/decimal failures; zero and maximum formatted bounds. |
| RULE-VAL-034 Transaction dates | FT-FE-011 | Hyphen/numeric/calendar/leap cases. |
| RULE-VAL-035 Merchant ID numeric | FT-FE-011 | Nonnumeric reject; numeric accept. |
| RULE-VAL-036 Unique transaction ID | FT-FE-011, FT-FE-012 | Sequential unique ID and duplicate-key fault for both creation paths. |
| RULE-VAL-037 Custom report date components | FT-FE-017 | Complete/numeric/upper-bound plus screen-flow calendar validation; no inferred chronology rule. |
| RULE-VAL-038 Report confirmation | FT-FE-017 | Blank prompt, N cancel, X reject, Y/y submits. |
| RULE-VAL-039 Reusable account calendar/date-of-birth utility | FT-FE-006 | Century/month/day/leap/calendar and strict past DOB cases. |

## Reportable frontend/specification gaps

| Gap | Effect on execution | Handling in scripts |
|---|---|---|
| Current React UI is route/action based rather than BMS PF-key based. | PF3/PF4/PF5/PF7/PF8/PF12 behavior cannot always be pressed literally. | Scripts require the equivalent deployed control or a terminal-compatible harness and mark unsupported literal-key behavior as a traceability gap. |
| Current report UI uses ISO date controls and performs a chronological-order check for Custom reports, while RULE-VAL-037 explicitly does not infer chronological order. | A reversed but individually valid range may be rejected by current UI beyond source rule. | FT-FE-017 does not claim source-rule acceptance; record any added client constraint as a deviation. |
| Current UI may place validations client-side while legacy source expects named BMS error/focus messages. | Exact legacy error text/focus may differ. | Verify source wording where specified; otherwise capture modern equivalent/error field and report difference. |
| No UI flow exists for CRUD on Entity-008/009 or create/delete of account/card/customer. | CRUD cannot be tested without inventing requirements. | Matrix marks these operations non-UI/not inferred rather than adding fabricated tests. |
