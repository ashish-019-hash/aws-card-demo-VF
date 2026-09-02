package com.carddemo.backend.service;

import com.carddemo.backend.domain.PaymentSettlement;
import com.carddemo.backend.domain.ReportPeriod;
import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CardAccountAssignment;
import com.carddemo.backend.entity.CreditCardTransaction;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.entity.ReportRequest;
import com.carddemo.backend.entity.TransactionCategory;
import com.carddemo.backend.entity.TransactionCategoryId;
import com.carddemo.backend.entity.TransactionIdAllocation;
import com.carddemo.backend.entity.TransactionType;
import com.carddemo.backend.exception.ApiException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.ApplicationUserRepository;
import com.carddemo.backend.repository.CardAccountAssignmentRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CreditCardTransactionRepository;
import com.carddemo.backend.repository.CustomerRepository;
import com.carddemo.backend.repository.ReportRequestRepository;
import com.carddemo.backend.repository.TransactionCategoryRepository;
import com.carddemo.backend.repository.TransactionIdAllocationRepository;
import com.carddemo.backend.repository.TransactionTypeRepository;
import com.carddemo.backend.validation.LegacyValidationService;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class CardDemoApplicationService {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private final AccountRepository accounts;
    private final CustomerRepository customers;
    private final CardRepository cards;
    private final CardAccountAssignmentRepository assignments;
    private final CreditCardTransactionRepository transactions;
    private final ApplicationUserRepository users;
    private final TransactionTypeRepository transactionTypes;
    private final TransactionCategoryRepository transactionCategories;
    private final TransactionIdAllocationRepository transactionIds;
    private final ReportRequestRepository reportRequests;
    private final PaymentRulesService paymentRules;
    private final ReportingPeriodRulesService reportingPeriods;
    private final LegacyValidationService validation;
    private final EntityManager entityManager;

    public CardDemoApplicationService(AccountRepository accounts, CustomerRepository customers, CardRepository cards,
                                      CardAccountAssignmentRepository assignments, CreditCardTransactionRepository transactions,
                                      ApplicationUserRepository users, TransactionTypeRepository transactionTypes,
                                      TransactionCategoryRepository transactionCategories,
                                      TransactionIdAllocationRepository transactionIds, ReportRequestRepository reportRequests,
                                      PaymentRulesService paymentRules, ReportingPeriodRulesService reportingPeriods,
                                      LegacyValidationService validation, EntityManager entityManager) {
        this.accounts = accounts;
        this.customers = customers;
        this.cards = cards;
        this.assignments = assignments;
        this.transactions = transactions;
        this.users = users;
        this.transactionTypes = transactionTypes;
        this.transactionCategories = transactionCategories;
        this.transactionIds = transactionIds;
        this.reportRequests = reportRequests;
        this.paymentRules = paymentRules;
        this.reportingPeriods = reportingPeriods;
        this.validation = validation;
        this.entityManager = entityManager;
    }

    public ApiDtos.SessionResponse signOn(ApiDtos.SessionRequest request) {
        validation.signOn(request.userId(), request.password());
        String userId = uppercase(request.userId());
        ApplicationUser user = users.findById(userId)
                .orElseThrow(() -> badRequest("USER_NOT_FOUND", "User not found. Try again ..."));
        if (!Objects.equals(normalizeCredential(request.password()), user.getPassword())) {
            throw badRequest("WRONG_PASSWORD", "Wrong Password. Try again ...");
        }
        boolean administrator = "A".equalsIgnoreCase(user.getUserType());
        return new ApiDtos.SessionResponse(user.getUserId(), administrator ? "ADMINISTRATOR" : "USER",
                administrator ? "/api/admin/menu" : "/api/menu");
    }

    public ApiDtos.AccountResponse account(Long accountId) {
        validation.accountLookup(accountId);
        return toAccount(accountEntity(accountId));
    }

    /**
     * Implements the account/customer update write unit: version snapshots are checked before either
     * managed record is changed, and JPA commits both rewrites or neither rewrite.
     */
    @Transactional
    public ApiDtos.UpdateResponse updateAccount(Long accountId, ApiDtos.AccountUpdateRequest request) {
        validation.accountLookup(accountId);
        validation.accountUpdate(request);
        if (request.customer() != null) validation.customerUpdate(request.customer());

        Account account = accountEntity(accountId);
        requireExpectedVersion(request.expectedAccountVersion(), account.getVersion(), "account");
        Customer customer = null;
        if (request.customer() != null) {
            customer = customerEntity(firstAssignment(accountId).getCustomer().getCustomerId());
            requireExpectedVersion(request.expectedCustomerVersion(), customer.getVersion(), "customer");
        }

        boolean changed = copyAccount(request, account);
        if (customer != null) changed |= copyCustomer(request.customer(), customer);
        if (!changed) throw badRequest("NO_CHANGES", "Please modify to update ...");

        // Force both SQL updates while this transaction is active so an optimistic-lock failure cannot report success.
        entityManager.flush();
        return new ApiDtos.UpdateResponse(true);
    }

    public Page<ApiDtos.CardSummary> cards(Long accountId, String cardNumber, Pageable pageable) {
        pageable = defaultSort(pageable, "cardNumber");
        if (accountId != null && accountId == 0) accountId = null;
        validation.optionalAccountFilter(accountId);
        validation.cardFilter(cardNumber, false);
        if (cardNumber != null && !cardNumber.isBlank()) {
            Card card = card(cardNumber);
            if (accountId != null && !Objects.equals(accountId, card.getAccount().getAccountId())) {
                throw notFound("CARD_NOT_FOUND", "Card not found.");
            }
            return new org.springframework.data.domain.PageImpl<>(List.of(toCardSummary(card)), pageable, 1);
        }
        return (accountId == null ? cards.findAll(pageable) : cards.findByAccountAccountId(accountId, pageable))
                .map(this::toCardSummary);
    }

    public ApiDtos.CardResponse cardDetail(String cardNumber) {
        validation.cardFilter(cardNumber, true);
        return toCard(card(cardNumber));
    }

    @Transactional
    public ApiDtos.UpdateResponse updateCard(String cardNumber, ApiDtos.CardUpdateRequest request) {
        validation.cardFilter(cardNumber, true);
        validation.cardUpdate(request);
        Card card = card(cardNumber);
        requireExpectedVersion(request.expectedVersion(), card.getVersion(), "card");
        boolean changed = false;
        if (request.embossedName() != null && !Objects.equals(card.getEmbossedName(), request.embossedName())) { card.setEmbossedName(request.embossedName()); changed = true; }
        if (request.expirationDate() != null && !Objects.equals(card.getExpirationDate(), request.expirationDate())) { card.setExpirationDate(request.expirationDate()); changed = true; }
        if (request.activeStatus() != null && !Objects.equals(card.getActiveStatus(), request.activeStatus())) { card.setActiveStatus(request.activeStatus()); changed = true; }
        if (!changed) throw badRequest("NO_CHANGES", "Please modify to update ...");
        return new ApiDtos.UpdateResponse(true);
    }

    public Page<ApiDtos.TransactionResponse> transactions(String fromTransactionId, Pageable pageable) {
        validation.transactionFilter(fromTransactionId);
        pageable = defaultSort(pageable, "transactionId");
        String normalized = blank(fromTransactionId) ? null : normalizeTransactionId(fromTransactionId);
        return (normalized == null ? transactions.findAll(pageable) :
                transactions.findByTransactionIdGreaterThanEqual(normalized, pageable)).map(this::toTransaction);
    }

    public ApiDtos.TransactionResponse transaction(String transactionId) {
        validation.transactionLookup(transactionId);
        return toTransaction(transactionEntity(normalizeTransactionId(transactionId)));
    }

    @Transactional
    public ApiDtos.TransactionCreateResponse addTransaction(ApiDtos.TransactionCreateRequest request) {
        validation.transaction(request);
        Card card = resolveCard(request.accountId(), request.cardNumber());
        TransactionType type = transactionTypes.findById(request.transactionTypeCode())
                .orElseThrow(() -> badRequest("TYPE_NOT_FOUND", "Transaction type not found."));
        TransactionCategory category = transactionCategories.findById(new TransactionCategoryId(type.getTransactionTypeCode(), request.transactionCategoryCode()))
                .orElseThrow(() -> badRequest("CATEGORY_NOT_FOUND", "Transaction category not found."));

        CreditCardTransaction transaction = transactionFrom(request, card, type, category, allocateTransactionId());
        try {
            CreditCardTransaction saved = transactions.saveAndFlush(transaction);
            return new ApiDtos.TransactionCreateResponse("ADDED", toTransaction(saved));
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_TRANSACTION", "Transaction ID already exists.");
        }
    }

    /** Account balance update and payment transaction insert are one transaction. */
    @Transactional
    public ApiDtos.PaymentResponse payBalance(Long accountId, ApiDtos.PaymentRequest request) {
        validation.billPayment(accountId, request.confirmation());
        Account account = accountEntity(accountId);
        BigDecimal balance = account.getCurrentBalance() == null ? BigDecimal.ZERO : account.getCurrentBalance();
        if (!paymentRules.isPaymentEligible(balance)) throw badRequest("NOTHING_TO_PAY", "You have nothing to pay...");

        Card card = resolveCard(accountId, null);
        TransactionType type = transactionTypes.findById("02")
                .orElseThrow(() -> badRequest("PAYMENT_TYPE_NOT_FOUND", "Bill-payment transaction type is not configured."));
        TransactionCategory category = transactionCategories.findById(new TransactionCategoryId("02", 2))
                .orElseThrow(() -> badRequest("PAYMENT_CATEGORY_NOT_FOUND", "Bill-payment transaction category is not configured."));
        PaymentSettlement settlement = paymentRules.settleFullBalance(balance);
        CreditCardTransaction transaction = new CreditCardTransaction(allocateTransactionId());
        transaction.setCard(card);
        transaction.setTransactionType(type);
        transaction.setTransactionCategory(category);
        transaction.setSource("POS TERM");
        transaction.setDescription("BILL PAYMENT - ONLINE");
        transaction.setAmount(settlement.paymentAmount());
        transaction.setMerchantName("BILL PAYMENT");
        transaction.setMerchantId(999_999_999L);
        transaction.setMerchantCity("N/A");
        transaction.setMerchantZip("N/A");
        String timestamp = LocalDateTime.now().withNano(0).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS"));
        transaction.setOriginalTimestamp(timestamp);
        transaction.setProcessingTimestamp(timestamp);
        account.setCurrentBalance(settlement.newCurrentBalance());

        CreditCardTransaction saved = transactions.save(transaction);
        entityManager.flush();
        return new ApiDtos.PaymentResponse("PAID", settlement.paymentAmount(), settlement.newCurrentBalance(), toTransaction(saved));
    }

    public Page<ApiDtos.UserResponse> users(String startsWith, Pageable pageable) {
        pageable = defaultSort(pageable, "userId");
        String normalized = blank(startsWith) ? null : uppercase(startsWith);
        return (normalized == null ? users.findAll(pageable) :
                users.findByUserIdStartingWithIgnoreCase(normalized, pageable)).map(this::toUser);
    }

    public ApiDtos.UserResponse user(String userId) {
        validation.userLookup(userId);
        return toUser(userEntity(userId));
    }

    @Transactional
    public ApiDtos.UserResponse addUser(ApiDtos.UserCreateRequest request) {
        validation.userFields(request.userId(), request.firstName(), request.lastName(), request.password(), request.userType());
        String userId = uppercase(request.userId());
        if (users.existsById(userId)) throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_USER", "User ID already exists.");
        ApplicationUser user = new ApplicationUser(userId);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPassword(normalizeCredential(request.password()));
        user.setUserType(uppercase(request.userType()));
        try {
            return toUser(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_USER", "User ID already exists.");
        }
    }

    @Transactional
    public ApiDtos.UpdateResponse updateUser(String userId, ApiDtos.UserUpdateRequest request) {
        validation.userFields(userId, request.firstName(), request.lastName(), request.password(), request.userType());
        ApplicationUser user = userEntity(userId);
        boolean changed = !Objects.equals(user.getFirstName(), request.firstName()) || !Objects.equals(user.getLastName(), request.lastName()) ||
                !Objects.equals(user.getPassword(), normalizeCredential(request.password())) || !Objects.equals(user.getUserType(), uppercase(request.userType()));
        if (!changed) throw badRequest("NO_CHANGES", "Please modify to update ...");
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPassword(normalizeCredential(request.password()));
        user.setUserType(uppercase(request.userType()));
        return new ApiDtos.UpdateResponse(true);
    }

    @Transactional
    public void deleteUser(String userId) {
        validation.userLookup(userId);
        users.delete(userEntity(userId));
    }

    @Transactional
    public ApiDtos.ReportResponse requestReport(ApiDtos.ReportRequest request) {
        validation.report(request);
        ReportPeriod period = periodFor(request);
        ReportRequest saved = reportRequests.saveAndFlush(new ReportRequest(null, request.type(), period.startDate(), period.endDate(),
                "SUBMITTED", LocalDateTime.now()));
        return reportResponse(saved, reportRows(period));
    }

    public ApiDtos.ReportResponse report(Long reportRequestId) {
        ReportRequest request = reportRequests.findById(reportRequestId)
                .orElseThrow(() -> notFound("REPORT_REQUEST_NOT_FOUND", "Report request not found."));
        return reportResponse(request, reportRows(new ReportPeriod(request.getStartDate(), request.getEndDate())));
    }

    /** Retained as a direct, ad-hoc formatted output view for the existing endpoint. */
    public ApiDtos.ReportResponse report(LocalDate startDate, LocalDate endDate) {
        ReportPeriod period = customPeriod(startDate, endDate);
        return new ApiDtos.ReportResponse(null, "OUTPUT", ApiDtos.ReportType.CUSTOM, period.startDate(), period.endDate(), reportRows(period));
    }

    private ReportPeriod periodFor(ApiDtos.ReportRequest request) {
        return switch (request.type()) {
            case MONTHLY -> reportingPeriods.currentMonth(LocalDate.now());
            case YEARLY -> reportingPeriods.currentYear(LocalDate.now());
            case CUSTOM -> customPeriod(request.startDate(), request.endDate());
        };
    }

    private ApiDtos.ReportResponse reportResponse(ReportRequest request, List<ApiDtos.TransactionResponse> rows) {
        return new ApiDtos.ReportResponse(request.getReportRequestId(), request.getStatus(), request.getType(),
                request.getStartDate(), request.getEndDate(), rows);
    }

    private List<ApiDtos.TransactionResponse> reportRows(ReportPeriod period) {
        String start = DATE.format(period.startDate());
        String end = DATE.format(period.endDate());
        return transactions.findForReportPeriod(start, end).stream()
                .limit(500)
                .map(this::toTransaction)
                .toList();
    }

    private ReportPeriod customPeriod(LocalDate start, LocalDate end) {
        if (start == null || end == null) throw badRequest("REPORT_DATES_REQUIRED", "Custom reports require start and end dates.");
        return new ReportPeriod(start, end);
    }

    private CreditCardTransaction transactionFrom(ApiDtos.TransactionCreateRequest request, Card card, TransactionType type,
                                                   TransactionCategory category, String transactionId) {
        CreditCardTransaction transaction = new CreditCardTransaction(transactionId);
        transaction.setCard(card);
        transaction.setTransactionType(type);
        transaction.setTransactionCategory(category);
        transaction.setSource(request.source());
        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        transaction.setMerchantId(request.merchantId());
        transaction.setMerchantName(request.merchantName());
        transaction.setMerchantCity(request.merchantCity());
        transaction.setMerchantZip(request.merchantZip());
        transaction.setOriginalTimestamp(DATE.format(request.originDate()));
        transaction.setProcessingTimestamp(DATE.format(request.processingDate()));
        return transaction;
    }

    /**
     * A singleton allocation row is locked before incrementing. It preserves numeric, zero-padded,
     * monotonic legacy ordering without allowing two workflow transactions to select the same maximum.
     */
    private String allocateTransactionId() {
        TransactionIdAllocation allocation = transactionIds.findLockedByAllocationKey(TransactionIdAllocation.ALLOCATION_KEY)
                .orElseGet(this::createAllocation);
        long next = Math.max(allocation.getLastAllocatedId(), currentTransactionId()) + 1;
        allocation.setLastAllocatedId(next);
        return String.format("%016d", next);
    }

    private TransactionIdAllocation createAllocation() {
        return transactionIds.saveAndFlush(new TransactionIdAllocation(TransactionIdAllocation.ALLOCATION_KEY, currentTransactionId()));
    }

    private long currentTransactionId() {
        return transactions.findTopByOrderByTransactionIdDesc()
                .map(CreditCardTransaction::getTransactionId)
                .map(Long::parseLong)
                .orElse(0L);
    }

    private Card resolveCard(Long accountId, String cardNumber) {
        if (accountId == null && (cardNumber == null || cardNumber.isBlank())) {
            throw badRequest("ACCOUNT_OR_CARD_REQUIRED", "Account ID or card number is required.");
        }
        if (cardNumber != null && !cardNumber.isBlank()) {
            Card card = card(cardNumber);
            if (accountId != null && !accountId.equals(card.getAccount().getAccountId())) {
                throw badRequest("ACCOUNT_CARD_MISMATCH", "Account and card do not match.");
            }
            return card;
        }
        return firstAssignment(accountId).getCard();
    }

    private void requireExpectedVersion(Long expected, Long actual, String record) {
        if (expected == null || !Objects.equals(expected, actual)) {
            if (expected == null) {
                throw badRequest("EXPECTED_VERSION_REQUIRED", "An expected " + record + " version is required.");
            }
            throw new ApiException(HttpStatus.CONFLICT, "STALE_WRITE",
                    "The " + record + " was changed before this update could be saved.");
        }
    }

    private Account accountEntity(Long accountId) {
        return accounts.findById(accountId).orElseThrow(() -> notFound("ACCOUNT_NOT_FOUND", "Account not found."));
    }

    private Customer customerEntity(Long customerId) {
        return customers.findById(customerId).orElseThrow(() -> notFound("CUSTOMER_NOT_FOUND", "Customer not found."));
    }

    private Card card(String cardNumber) {
        return cards.findById(cardNumber).orElseThrow(() -> notFound("CARD_NOT_FOUND", "Card not found."));
    }

    private CreditCardTransaction transactionEntity(String transactionId) {
        return transactions.findById(transactionId).orElseThrow(() -> notFound("TRANSACTION_NOT_FOUND", "Transaction not found."));
    }

    private ApplicationUser userEntity(String userId) {
        return users.findById(uppercase(userId)).orElseThrow(() -> notFound("USER_NOT_FOUND", "User ID NOT found..."));
    }

    private CardAccountAssignment firstAssignment(Long accountId) {
        return assignments.findByAccountAccountId(accountId).stream().findFirst()
                .orElseThrow(() -> notFound("ACCOUNT_ASSIGNMENT_NOT_FOUND", "Account card assignment not found."));
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
    private ApiException badRequest(String code, String message) { return new ApiException(HttpStatus.BAD_REQUEST, code, message); }
    private String uppercase(String value) { return value.toUpperCase(Locale.ROOT); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String normalizeTransactionId(String value) { return String.format("%016d", Long.parseLong(value)); }
    private Pageable defaultSort(Pageable pageable, String property) {
        return pageable.getSort().isSorted() ? pageable : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(property));
    }
    private String normalizeCredential(String value) { return uppercase(value); }

    private boolean copyAccount(ApiDtos.AccountUpdateRequest r, Account a) {
        boolean changed = false;
        if (r.activeStatus() != null && !Objects.equals(a.getActiveStatus(), r.activeStatus())) { a.setActiveStatus(r.activeStatus()); changed = true; }
        if (r.currentBalance() != null && !Objects.equals(a.getCurrentBalance(), r.currentBalance())) { a.setCurrentBalance(r.currentBalance()); changed = true; }
        if (r.creditLimit() != null && !Objects.equals(a.getCreditLimit(), r.creditLimit())) { a.setCreditLimit(r.creditLimit()); changed = true; }
        if (r.cashCreditLimit() != null && !Objects.equals(a.getCashCreditLimit(), r.cashCreditLimit())) { a.setCashCreditLimit(r.cashCreditLimit()); changed = true; }
        if (r.openDate() != null && !Objects.equals(a.getOpenDate(), r.openDate())) { a.setOpenDate(r.openDate()); changed = true; }
        if (r.expirationDate() != null && !Objects.equals(a.getExpirationDate(), r.expirationDate())) { a.setExpirationDate(r.expirationDate()); changed = true; }
        if (r.reissueDate() != null && !Objects.equals(a.getReissueDate(), r.reissueDate())) { a.setReissueDate(r.reissueDate()); changed = true; }
        if (r.currentCycleCredit() != null && !Objects.equals(a.getCurrentCycleCredit(), r.currentCycleCredit())) { a.setCurrentCycleCredit(r.currentCycleCredit()); changed = true; }
        if (r.currentCycleDebit() != null && !Objects.equals(a.getCurrentCycleDebit(), r.currentCycleDebit())) { a.setCurrentCycleDebit(r.currentCycleDebit()); changed = true; }
        if (r.addressZip() != null && !Objects.equals(a.getAddressZip(), r.addressZip())) { a.setAddressZip(r.addressZip()); changed = true; }
        if (r.accountGroupId() != null && !Objects.equals(a.getAccountGroupId(), r.accountGroupId())) { a.setAccountGroupId(r.accountGroupId()); changed = true; }
        return changed;
    }

    private boolean copyCustomer(ApiDtos.CustomerUpdateRequest r, Customer c) {
        boolean changed = false;
        if (r.firstName() != null && !Objects.equals(c.getFirstName(), r.firstName())) { c.setFirstName(r.firstName()); changed = true; }
        if (r.middleName() != null && !Objects.equals(c.getMiddleName(), r.middleName())) { c.setMiddleName(r.middleName()); changed = true; }
        if (r.lastName() != null && !Objects.equals(c.getLastName(), r.lastName())) { c.setLastName(r.lastName()); changed = true; }
        if (r.addressLine1() != null && !Objects.equals(c.getAddressLine1(), r.addressLine1())) { c.setAddressLine1(r.addressLine1()); changed = true; }
        if (r.addressLine2() != null && !Objects.equals(c.getAddressLine2(), r.addressLine2())) { c.setAddressLine2(r.addressLine2()); changed = true; }
        if (r.city() != null && !Objects.equals(c.getCity(), r.city())) { c.setCity(r.city()); changed = true; }
        if (r.addressStateCode() != null && !Objects.equals(c.getAddressStateCode(), r.addressStateCode())) { c.setAddressStateCode(r.addressStateCode()); changed = true; }
        if (r.addressCountryCode() != null && !Objects.equals(c.getAddressCountryCode(), r.addressCountryCode())) { c.setAddressCountryCode(r.addressCountryCode()); changed = true; }
        if (r.addressZip() != null && !Objects.equals(c.getAddressZip(), r.addressZip())) { c.setAddressZip(r.addressZip()); changed = true; }
        if (r.primaryPhoneNumber() != null && !Objects.equals(c.getPrimaryPhoneNumber(), r.primaryPhoneNumber())) { c.setPrimaryPhoneNumber(r.primaryPhoneNumber()); changed = true; }
        if (r.secondaryPhoneNumber() != null && !Objects.equals(c.getSecondaryPhoneNumber(), r.secondaryPhoneNumber())) { c.setSecondaryPhoneNumber(r.secondaryPhoneNumber()); changed = true; }
        if (r.ssn() != null && !Objects.equals(c.getSsn(), r.ssn())) { c.setSsn(r.ssn()); changed = true; }
        if (r.governmentIssuedId() != null && !Objects.equals(c.getGovernmentIssuedId(), r.governmentIssuedId())) { c.setGovernmentIssuedId(r.governmentIssuedId()); changed = true; }
        if (r.dateOfBirth() != null && !Objects.equals(c.getDateOfBirth(), r.dateOfBirth())) { c.setDateOfBirth(r.dateOfBirth()); changed = true; }
        if (r.eftAccountId() != null && !Objects.equals(c.getEftAccountId(), r.eftAccountId())) { c.setEftAccountId(r.eftAccountId()); changed = true; }
        if (r.primaryCardHolderIndicator() != null && !Objects.equals(c.getPrimaryCardHolderIndicator(), r.primaryCardHolderIndicator())) { c.setPrimaryCardHolderIndicator(r.primaryCardHolderIndicator()); changed = true; }
        if (r.ficoCreditScore() != null && !Objects.equals(c.getFicoCreditScore(), r.ficoCreditScore())) { c.setFicoCreditScore(r.ficoCreditScore()); changed = true; }
        return changed;
    }

    private ApiDtos.AccountResponse toAccount(Account a) {
        List<ApiDtos.CardSummary> summaries = cards.findByAccountAccountId(a.getAccountId(), PageRequest.of(0, 100, Sort.by("cardNumber")))
                .map(this::toCardSummary).getContent();
        Customer c = assignments.findByAccountAccountId(a.getAccountId()).stream().findFirst().map(CardAccountAssignment::getCustomer).orElse(null);
        return new ApiDtos.AccountResponse(a.getAccountId(), a.getVersion(), a.getActiveStatus(), a.getCurrentBalance(),
                a.getCreditLimit(), a.getCashCreditLimit(), a.getOpenDate(), a.getExpirationDate(), a.getReissueDate(),
                a.getCurrentCycleCredit(), a.getCurrentCycleDebit(), a.getAddressZip(), a.getAccountGroupId(), summaries,
                c == null ? null : toCustomer(c));
    }

    private ApiDtos.CustomerResponse toCustomer(Customer c) {
        return new ApiDtos.CustomerResponse(c.getCustomerId(), c.getVersion(), c.getFirstName(), c.getMiddleName(), c.getLastName(),
                c.getAddressLine1(), c.getAddressLine2(), c.getCity(), c.getAddressStateCode(), c.getAddressCountryCode(),
                c.getAddressZip(), c.getPrimaryPhoneNumber(), c.getSecondaryPhoneNumber(), c.getSsn(), c.getGovernmentIssuedId(),
                c.getDateOfBirth(), c.getEftAccountId(), c.getPrimaryCardHolderIndicator(), c.getFicoCreditScore());
    }

    private ApiDtos.CardSummary toCardSummary(Card c) { return new ApiDtos.CardSummary(c.getCardNumber(), c.getAccount().getAccountId(), c.getEmbossedName(), c.getActiveStatus(), c.getExpirationDate()); }
    private ApiDtos.CardResponse toCard(Card c) { return new ApiDtos.CardResponse(c.getCardNumber(), c.getAccount().getAccountId(), c.getCvvCode(), c.getEmbossedName(), c.getExpirationDate(), c.getActiveStatus(), c.getVersion()); }
    private ApiDtos.TransactionResponse toTransaction(CreditCardTransaction t) { return new ApiDtos.TransactionResponse(t.getTransactionId(), t.getCard().getCardNumber(), t.getTransactionType().getTransactionTypeCode(), t.getTransactionCategoryCode(), t.getSource(), t.getDescription(), t.getAmount(), t.getMerchantId(), t.getMerchantName(), t.getMerchantCity(), t.getMerchantZip(), t.getOriginalTimestamp(), t.getProcessingTimestamp()); }
    private ApiDtos.UserResponse toUser(ApplicationUser u) { return new ApiDtos.UserResponse(u.getUserId(), u.getFirstName(), u.getLastName(), u.getUserType()); }
}
