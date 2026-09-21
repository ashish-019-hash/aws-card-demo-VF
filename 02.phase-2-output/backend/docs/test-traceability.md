# Test Traceability

This maps each business rule (BR-\*, see `01.phase-1-output/business-rules-catalog.md`) and
each validation-rule group (VR-\*, see `01.phase-1-output/validation-rules.md`) to the class
that implements it and the test class(es) that exercise it.

## Business rules

| Rule | Description | Implementation | Tests |
|---|---|---|---|
| BR-001 | Sign-on password compare uppercases the typed value only (legacy quirk, preserved) | `SignOnService` | `SignOnServiceTest.signOnRejectsLowercaseStoredPasswordEvenIfTypedExactly` |
| BR-002 | Admin (`A`) vs regular (`U`) user routing | `SignOnService`, `AppUserPrincipal` | `SignOnServiceTest`, `ApplicationIntegrationTest.loginAsAdminSucceeds` |
| BR-003 | Admin-menu dead-code gate (preserved, not removed) | `MenuService` | `MenuServiceTest.unknownUserTypeFallsBackToRegularMenu` |
| BR-005 | No account-ownership scoping (any authenticated role can view/update any account) | `AccountService` | documented, not separately tested (deliberate no-op) |
| BR-006 | No-op account update short-circuits without writing | `AccountService.updateAccount` | `AccountServiceTest.noOpUpdateReturnsUnchangedWithoutWriting` |
| BR-007 | Stale-snapshot conflict on account update → 409 `DATA_CHANGED`, including state/country-only changes and a genuine concurrent-write race | `AccountService.updateAccount` | `AccountServiceTest.staleSnapshotIsRejectedAsDataChangedConflict`, `AccountFieldsComparatorTest.differentStateCodeIsNotEqual`/`differentCountryCodeIsNotEqual`, `ApplicationIntegrationTest.updateAccount_concurrentUpdatesOnlyOneSucceedsOtherGetsDataChangedConflict` |
| BR-008 | Account+customer saved as one unit of work (Spring `@Transactional`); `saveAndFlush` so a downstream write failure is caught by the same try/catch instead of surfacing after it has exited | `AccountService.updateAccount` | `AccountServiceTest.writeFailureIsReportedAsUpdateFailedConflict` |
| BR-009 | Card update lock → conflict-check → rewrite; `saveAndFlush` for the same reason as BR-008 | `CardService.updateCard` | `CardServiceTest` (no-op / stale / success / write-failure) |
| BR-010 | Atomic transaction-id allocation (`tran_id_allocator`, `SELECT ... FOR UPDATE`), race-safe under genuine concurrency | `TransactionService.nextTranId` | `TransactionServiceTest.nextTranIdIncrementsAllocatorUnderLockAndZeroPads`, `ApplicationIntegrationTest.addTransaction_allocatesDistinctSequentialIds`, `ApplicationIntegrationTest.addTransaction_concurrentRequestsAllocateDistinctIds` |
| BR-011 | Bill payment requires positive balance | `BillPaymentService.pay` | `BillPaymentServiceTest.confirmedPaymentWithZeroBalanceHasNothingToPay`, `ApplicationIntegrationTest.billPayment_nothingToPayWhenBalanceIsZero` |
| BR-012 | Bill payment always pays the full balance, zeroing the account | `BillPaymentService.pay` | `BillPaymentServiceTest.confirmedPaymentPaysFullBalanceAndZeroesAccount`, `ApplicationIntegrationTest.billPayment_paysFullBalanceAndZeroesAccount` |
| BR-013 | Report period derivation (monthly/yearly/custom) + confirm gate | `ReportService` | `ReportServiceTest`, `ApplicationIntegrationTest.reportSubmit_monthlyDerivesCurrentMonth` |
| BR-014 | Card list optional additive account/card filters | `CardService.search` | covered via `CardController`/`CardValidationService` VR-055 filter check |
| BR-015 | Page sizes (cards 7, transactions 10, users 10) | `PageSizes`, `CardService`, `TransactionService`, `UserAdminService` | exercised indirectly by list-response shape assertions |
| BR-016 | User CRUD: Add uniqueness (including a genuine concurrent-create race caught by `saveAndFlush`/`DataIntegrityViolationException`), Update no-op guard, Delete is explicit | `UserAdminService` | `UserAdminServiceTest` (create/duplicate/concurrent-race/no-op-update/delete-not-found), `ApplicationIntegrationTest.userAdmin_adminCanCreateAndDuplicateIsRejected`, `ApplicationIntegrationTest.userAdmin_concurrentDuplicateCreateOnlyOneSucceeds` |
| — | Add-transaction persists the caller's own `origDate`/`procDate` (left-justified, space-padded to the legacy 26-char timestamp) rather than server time; account id is resolved before a supplied card number (COTRN02C.cbl:194-224), and an unknown account/card each get a distinct 404 message | `TransactionService.addTransaction`/`resolveCardNum` | `TransactionServiceTest.addTransactionPersistsRequestDatesNotServerTimeAsTimestamps`, `TransactionServiceTest.addTransactionPrefersAccountIdOverSuppliedCardNumWhenBothGiven`, `TransactionServiceTest.addTransactionThrowsNotFoundForUnknownCardNumWhenNoAccountSupplied`, `TransactionServiceTest.addTransactionThrowsNotFoundForUnknownAccount` |
| — | `transactions` FK-references `transaction_types`/`transaction_categories` (`V2__transaction_reference_fks.sql`) | `db/migration/V2__transaction_reference_fks.sql` | exercised by every `ApplicationIntegrationTest` transaction/bill-payment test (the "test" profile does not run `SeedDataLoader`, so the fixture seeds the one type/category row those tests need via `ensureTransactionReferenceData()`) |

## Validation rules (VR-\*)

Full per-rule catalog: `01.phase-1-output/validation-rules.md`. Implementing classes:

| Screen / area | Rule range | Validator | Unit tests |
|---|---|---|---|
| Account update (COACTUPC) | VR-015, VR-021-030c (incl. new max-length checks and VR-025b/VR-030a — no matching legacy rule id existed for Address Line 2 / Government Issued Id length, both were previously unvalidated), VR-035-039 (SSN split into 3 independently-validated groups), VR-040-053 | `AccountValidationService` | `AccountValidationServiceTest` |
| Card update (COCRDUPC) | VR-064-069 (incl. embossed-name max length) | `CardValidationService` | `CardValidationServiceTest` |
| Transaction add (COTRN02C) | VR-075-093 (incl. new max-length checks on type/source/description/merchant fields; VR-072/073/074/094 handled in `TransactionService`) | `TransactionValidationService` | `TransactionValidationServiceTest`, `TransactionServiceTest` |
| User add/update (COUSR01C/02C) | VR-116-120 (create, incl. max-length), VR-123-126 (update, incl. max-length) | `UserValidationService` | `UserValidationServiceTest` |
| Shared primitives (mandatory/alpha/numeric/date/Y-N) | used across all of the above | `CommonValidators` | `CommonValidatorsTest` |
| Sign-on mandatory fields | VR-001/VR-002 | not implemented as distinct rules — see README "Known gaps" | — |
| Menu option validity | VR-003/VR-004 | N/A for this REST shape (menu is a role-scoped `GET`, not a typed selection) — see README | — |

## Integration coverage

`ApplicationIntegrationTest` (`@SpringBootTest` + Testcontainers Postgres) exercises the
full stack (Flyway migration → Hibernate → Spring Security → controllers) end-to-end for:
session sign-on (success/failure), account view (success/404), transaction add (BR-010,
VR-094 confirm gate), bill payment (BR-011/012), report submission (BR-013), and
admin-only user management (403 for regular users, create + duplicate 409). It also covers
three genuine-concurrency scenarios (real parallel threads via a `CyclicBarrier`, not just
sequential calls on one thread): concurrent transaction-add id allocation (BR-010,
`addTransaction_concurrentRequestsAllocateDistinctIds`), concurrent account update
(BR-007, `updateAccount_concurrentUpdatesOnlyOneSucceedsOtherGetsDataChangedConflict`), and
concurrent duplicate user creation (BR-016,
`userAdmin_concurrentDuplicateCreateOnlyOneSucceeds`).
