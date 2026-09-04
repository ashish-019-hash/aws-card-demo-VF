# Step 8 QA: Requirements-to-Test Traceability

## Scope and execution

This matrix traces the phase-1 requirements in `01.phase-1-output/` to automated JUnit, API, persistence, and workflow tests. Test classes use an isolated H2 database; `ApiContractIntegrationTest` resets the documented legacy seed before each test class. It also exercises the real MVC routes and OpenAPI endpoint.

Run the authoritative verification command from `02.phase-2-output/backend`:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace maven:3.9.9-eclipse-temurin-21 mvn clean verify
```

| Requirement | Automated test coverage | Outcome covered |
|---|---|---|
| STORY-001 Sign on | `ApiContractIntegrationTest.signOnAndMenusCoverStories001Through003AndRoleOutcomes`; `SessionControllerTest` | Case-normalized valid standard/admin sign-on, required values, wrong password, role destination. |
| STORY-002 Main menu | `ApiContractIntegrationTest.signOnAndMenusCoverStories001Through003AndRoleOutcomes`; `LegacyValidationServiceTest.menuAndRowSelections...` | Ten configured capabilities and menu range boundary validation. RULE-VAL-022 is intentionally dormant for the supplied all-`U` menu configuration. |
| STORY-003 Admin menu | `ApiContractIntegrationTest.signOnAndMenusCoverStories001Through003AndRoleOutcomes`; `LegacyValidationServiceTest.menuAndRowSelections...` | Four administration capabilities and menu validation. |
| STORY-004 Account view | `ApiContractIntegrationTest.accountAndCardEndpointsCoverStories004Through008` | Linked account/customer/card retrieval; invalid account input. |
| STORY-005 Account update | `WorkflowIntegrationTest.rejectsStaleAccountSnapshotWithoutWritingEitherRecord`; `ApiEdgeCaseIntegrationTest.accountUpdateOverHttpPersistsChangedValueAndRejectsNoOpAndMissingVersion`; `LegacyValidationServiceTest.accountAndCustomerMaintenance...` | HTTP persistence success plus no-op/missing/stale version protections; account/customer formats, DOB, FICO and state/ZIP boundaries. |
| STORY-006 Card list | `ApiContractIntegrationTest.accountAndCardEndpointsCoverStories004Through008`; `ApiEdgeCaseIntegrationTest.cardAndTransactionListsHonorOptionalAndLowerBoundFilters`; `LegacyValidationServiceTest.accountAndCardIdentifiers...` | Pagination boundaries, optional zero account filter, account/card mismatch, and invalid card/account filters. |
| STORY-007 Card detail | `ApiContractIntegrationTest.accountAndCardEndpointsCoverStories004Through008` | Detail retrieval and invalid-card rejection. |
| STORY-008 Card update | `ApiContractIntegrationTest.accountAndCardEndpointsCoverStories004Through008`; `ApiEdgeCaseIntegrationTest.cardUpdateRejectsNoOpMissingVersionAndFieldSpecificInvalidValues`; `LegacyValidationServiceTest.cardMaintenance...` | Valid update, HTTP no-change/missing-version failures, and name/status/month/year field boundaries. |
| STORY-009 Transaction browse | `ApiContractIntegrationTest.transactionEndpointsCoverStories009Through011IncludingNegativeValidation`; `ApiEdgeCaseIntegrationTest.cardAndTransactionListsHonorOptionalAndLowerBoundFilters`; `LegacyValidationServiceTest.menuAndRowSelections...` | Paging, lower-bound normalization, numeric filter validation, selection action validation. |
| STORY-010 Transaction view | `ApiContractIntegrationTest.transactionEndpointsCoverStories009Through011IncludingNegativeValidation`; `LegacyValidationServiceTest.menuAndRowSelections...` | Existing detail and unknown/blank lookup outcomes. |
| STORY-011 Add transaction | `ApiContractIntegrationTest.transactionEndpointsCoverStories009Through011IncludingNegativeValidation`; `ApiEdgeCaseIntegrationTest.transactionCaptureReturnsFieldSpecificFailuresAndRejectsMalformedDatesWithoutWriting`; `WorkflowIntegrationTest.createsRelatedTransactionAndAllocatesMonotonicUniqueIds`; `LegacyValidationServiceTest.confirmationsAndTransactionFields...` | Confirmed creation, no-create confirmation gate, field-specific decimal/merchant/required failures, malformed-date binding failures without writes, relationship failure, monotonically allocated unique IDs. |
| STORY-012 Bill payment | `ApiContractIntegrationTest.paymentAndUserAdministrationCoverStories012Through016`; `ApiEdgeCaseIntegrationTest.zeroAndNegativeBalancesDoNotCreatePayments`; `PaymentRulesServiceTest`; `WorkflowIntegrationTest.rollsBackPaymentWhenPaymentConfigurationIsMissing`; `WorkflowIntegrationTest.savesPaymentAndReportRequestAsRetrievableWorkflowState` | Positive/zero/negative balance boundaries, full settlement, payment transaction, confirmation error, and transaction rollback. |
| STORY-013 User browse | `ApiContractIntegrationTest.paymentAndUserAdministrationCoverStories012Through016` | Filtered/paged list and user retrieval. |
| STORY-014 Add user | `ApiContractIntegrationTest.paymentAndUserAdministrationCoverStories012Through016`; `ApiEdgeCaseIntegrationTest.userLifecycleRejectsInvalidNoOpAndUnknownDeletion`; `UserControllerTest`; `LegacyValidationServiceTest.userAndSignOnInputs...` | Create success, required-field rejection, and duplicate key conflict. |
| STORY-015 Update user | `ApiContractIntegrationTest.paymentAndUserAdministrationCoverStories012Through016`; `ApiEdgeCaseIntegrationTest.userLifecycleRejectsInvalidNoOpAndUnknownDeletion` | Persisted changes and explicit no-change rejection. |
| STORY-016 Delete user | `ApiContractIntegrationTest.paymentAndUserAdministrationCoverStories012Through016`; `ApiEdgeCaseIntegrationTest.userLifecycleRejectsInvalidNoOpAndUnknownDeletion` | Explicit delete then unknown-user not-found outcome. |
| STORY-017 Report request | `ApiContractIntegrationTest.reportLifecycleAndOpenApiCoverStories017And018`; `ReportingPeriodRulesServiceTest`; `LegacyValidationServiceTest.customReportsCoverRules037And038` | Submitted lifecycle, confirmation rejection, custom validation, current-month/year and December rollover boundaries. |
| STORY-018 Report output | `ApiContractIntegrationTest.reportLifecycleAndOpenApiCoverStories017And018`; `ApiEdgeCaseIntegrationTest.reportRangeIncludesOnlyItsInclusiveBoundary`; `WorkflowIntegrationTest.savesPaymentAndReportRequestAsRetrievableWorkflowState` | Inclusive date-filtered/card-sorted output, exact range boundary, and empty selected range. |
| RULE-DECISION-001 | `PaymentRulesServiceTest.permitsPaymentOnlyWhenBalanceIsPositive`, `rejectsPaymentAtTheZeroBalanceBoundary`, `rejectsPaymentForNegativeBalance` | Payment eligibility boundary is strictly greater than zero. |
| RULE-CALC-002 | `PaymentRulesServiceTest.settlesTheEntireCurrentBalanceAndReducesItToZero`; API payment flow test | Exact full-balance payment and zero resulting balance. |
| RULE-DECISION-003 | `ReportingPeriodRulesServiceTest` month tests | First/last day, January and December-to-January calculation boundaries. |
| RULE-DECISION-004 | `ReportingPeriodRulesServiceTest.usesTheCurrentCalendarYearRegardlessOfTheCurrentDay` | January 1 through December 31, including leap-year observation date. |
| RULE-VAL-001–013 | `LegacyValidationServiceTest.accountAndCardIdentifiers...`, `accountAndCustomerMaintenance...` | Account, financial/date, FICO, customer, state/ZIP, phone, SSN and Y/N positive/negative cases. |
| RULE-VAL-014–020 | `LegacyValidationServiceTest.accountAndCardIdentifiers...`, `cardMaintenance...`, `menuAndRowSelections...` | Card/account filters, row actions, and card update constraints. |
| RULE-VAL-021–025 | `LegacyValidationServiceTest.menuAndRowSelections...`, `userAndSignOnInputs...`; API session/user tests | Menu and user/sign-on required/duplicate conditions. |
| RULE-VAL-026–036 | `LegacyValidationServiceTest.confirmationsAndTransactionFields...`; `WorkflowIntegrationTest`; API transaction/payment tests | Confirmation, transaction identification/format/date, relationship, and uniqueness enforcement. |
| RULE-VAL-037–039 | `LegacyValidationServiceTest.customReportsCoverRules037And038`, account/customer maintenance tests; reporting service tests | Custom-report confirmation/date requirements and reusable calendar/DOB behavior. |
| Seeded data and schema | `LegacyDatabaseInitializationTests`; `EntityRepositoryMappingTests` | All ten catalog entities, relationship mappings, fixed-width values, exact seed counts, allocation baseline, and deterministic reseed. |
| OpenAPI | `ApiContractIntegrationTest.reportLifecycleAndOpenApiCoverStories017And018` | `/v3/api-docs` returns the published account route. |

## Test data notes

The app seeds the supplied immutable fixed-width legacy extracts: 50 accounts/customers/cards/assignments, 300 transactions, configuration data, and `ADMIN001` / `USER0001`. The API integration suites use account `1` and card `0500024453765740`, create isolated `QAUSER01` / `EDGE0001` users, and reset the seed baseline before use. Scenario-oriented manual access, reset, fixed-width format, exact request, and expected-outcome instructions are in [`manual-test-data.md`](manual-test-data.md).

## Defect fixed during QA

The report repository now filters against the leading date bytes of `TRAN_PROC_TS`, which matches the reporting procedure’s processing-date selection semantics. This correctly retains date-only payment/manual records, full processing timestamps, inclusive boundaries, and excludes blank processing timestamps.

## Review remediation coverage

`SecurityIntegrationTest` verifies unauthenticated 401 API errors, role-preserving session sign-on, standard-user business access, and administrator-only user/menu access. The test profile deliberately disables the production security filter for established controller/unit fixtures; the security suite explicitly enables it. Card mutations require an expected card version, report output is capped at 500 rows, and the test database uses a UUID-based H2 name to isolate Spring contexts.

Screen-only rules `RULE-VAL-016`, `RULE-VAL-021`, and `RULE-VAL-027` remain validation service rules because the REST API represents direct resource operations rather than BMS row-selection/menu submission; their service-level tests are the executable documentation for this intentional boundary.
