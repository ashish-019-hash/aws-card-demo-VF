package com.carddemo.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** API models intentionally separate persistence entities from HTTP contracts. */
public final class ApiDtos {
    private ApiDtos() { }

    public record SessionRequest(String userId, String password) { }
    public record SessionResponse(String userId, String role, String destination) { }
    public record MenuResponse(String menu, List<MenuOption> options) { }
    public record MenuOption(int number, String resource) { }

    public record AccountResponse(Long accountId, Long version, String activeStatus, BigDecimal currentBalance,
                                  BigDecimal creditLimit, BigDecimal cashCreditLimit, String openDate,
                                  String expirationDate, String reissueDate, BigDecimal currentCycleCredit,
                                  BigDecimal currentCycleDebit, String addressZip, String accountGroupId,
                                  List<CardSummary> cards, CustomerResponse customer) { }
    public record AccountUpdateRequest(String activeStatus, BigDecimal currentBalance, BigDecimal creditLimit,
                                       BigDecimal cashCreditLimit, String openDate, String expirationDate,
                                       String reissueDate, BigDecimal currentCycleCredit, BigDecimal currentCycleDebit,
                                       String addressZip, String accountGroupId, CustomerUpdateRequest customer,
                                       Long expectedAccountVersion, Long expectedCustomerVersion) {
        public AccountUpdateRequest(String activeStatus, BigDecimal currentBalance, BigDecimal creditLimit,
                                    BigDecimal cashCreditLimit, String openDate, String expirationDate,
                                    String reissueDate, BigDecimal currentCycleCredit, BigDecimal currentCycleDebit,
                                    String addressZip, String accountGroupId, CustomerUpdateRequest customer) {
            this(activeStatus, currentBalance, creditLimit, cashCreditLimit, openDate, expirationDate, reissueDate,
                    currentCycleCredit, currentCycleDebit, addressZip, accountGroupId, customer, null, null);
        }
    }
    public record CustomerResponse(Long customerId, Long version, String firstName, String middleName, String lastName,
                                   String addressLine1, String addressLine2, String city, String addressStateCode,
                                   String addressCountryCode, String addressZip, String primaryPhoneNumber,
                                   String secondaryPhoneNumber, String ssn, String governmentIssuedId,
                                   String dateOfBirth, String eftAccountId, String primaryCardHolderIndicator,
                                   Integer ficoCreditScore) { }
    public record CustomerUpdateRequest(String firstName, String middleName, String lastName, String addressLine1,
                                        String addressLine2, String city, String addressStateCode, String addressCountryCode,
                                        String addressZip, String primaryPhoneNumber, String secondaryPhoneNumber, String ssn,
                                        String governmentIssuedId, String dateOfBirth, String eftAccountId,
                                        String primaryCardHolderIndicator, Integer ficoCreditScore) { }
    public record UpdateResponse(boolean changed) { }

    public record CardSummary(String cardNumber, Long accountId, String embossedName, String activeStatus, String expirationDate) { }
    public record CardResponse(String cardNumber, Long accountId, Integer cvvCode, String embossedName,
                               String expirationDate, String activeStatus, Long version) { }
    public record CardUpdateRequest(String embossedName, String expirationDate, String activeStatus, Long expectedVersion) {
        public CardUpdateRequest(String embossedName, String expirationDate, String activeStatus) {
            this(embossedName, expirationDate, activeStatus, null);
        }
    }

    public record TransactionResponse(String transactionId, String cardNumber, String transactionTypeCode,
                                      Integer transactionCategoryCode, String source, String description,
                                      BigDecimal amount, Long merchantId, String merchantName, String merchantCity,
                                      String merchantZip, String originalTimestamp, String processingTimestamp) { }
    public record TransactionCreateRequest(Long accountId, String cardNumber, String transactionTypeCode,
                                           Integer transactionCategoryCode, String source, String description,
                                           BigDecimal amount, Long merchantId, String merchantName, String merchantCity,
                                           String merchantZip, LocalDate originDate, LocalDate processingDate,
                                           String confirmation) { }
    public record TransactionCreateResponse(String status, TransactionResponse transaction) { }
    public record PaymentRequest(String confirmation) { }
    public record PaymentResponse(String status, BigDecimal paidAmount, BigDecimal newBalance, TransactionResponse transaction) { }

    public record UserResponse(String userId, String firstName, String lastName, String userType) { }
    public record UserCreateRequest(String userId, String firstName, String lastName, String password, String userType) { }
    public record UserUpdateRequest(String firstName, String lastName, String password, String userType) { }

    public enum ReportType { MONTHLY, YEARLY, CUSTOM }
    public record ReportRequest(ReportType type, LocalDate startDate, LocalDate endDate, String confirmation) { }
    public record ReportResponse(Long requestId, String status, ReportType type, LocalDate startDate, LocalDate endDate,
                                 List<TransactionResponse> transactions) { }
}
