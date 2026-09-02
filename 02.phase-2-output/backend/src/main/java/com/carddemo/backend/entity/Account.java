package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ACCTDAT")
public class Account {

    @Id
    @NotNull
    @Digits(integer = 11, fraction = 0)
    @Column(name = "ACCT_ID", precision = 11, scale = 0, nullable = false)
    private Long accountId;

    @Version
    @Column(name = "ACCT_VERSION", nullable = false)
    private Long version;

    @Size(max = 1) @Column(name = "ACCT_ACTIVE_STATUS", length = 1) private String activeStatus;
    @Digits(integer = 10, fraction = 2) @Column(name = "ACCT_CURR_BAL", precision = 12, scale = 2) private BigDecimal currentBalance;
    @Digits(integer = 10, fraction = 2) @Column(name = "ACCT_CREDIT_LIMIT", precision = 12, scale = 2) private BigDecimal creditLimit;
    @Digits(integer = 10, fraction = 2) @Column(name = "ACCT_CASH_CREDIT_LIMIT", precision = 12, scale = 2) private BigDecimal cashCreditLimit;
    @Size(max = 10) @Column(name = "ACCT_OPEN_DATE", length = 10) private String openDate;
    @Size(max = 10) @Column(name = "ACCT_EXPIRAION_DATE", length = 10) private String expirationDate;
    @Size(max = 10) @Column(name = "ACCT_REISSUE_DATE", length = 10) private String reissueDate;
    @Digits(integer = 10, fraction = 2) @Column(name = "ACCT_CURR_CYC_CREDIT", precision = 12, scale = 2) private BigDecimal currentCycleCredit;
    @Digits(integer = 10, fraction = 2) @Column(name = "ACCT_CURR_CYC_DEBIT", precision = 12, scale = 2) private BigDecimal currentCycleDebit;
    @Size(max = 10) @Column(name = "ACCT_ADDR_ZIP", length = 10) private String addressZip;
    @Size(max = 10) @Column(name = "ACCT_GROUP_ID", length = 10) private String accountGroupId;

    @OneToMany(mappedBy = "account") private List<Card> cards = new ArrayList<>();
    @OneToMany(mappedBy = "account") private List<CardAccountAssignment> cardAccountAssignments = new ArrayList<>();
    @OneToMany(mappedBy = "account") private List<TransactionCategoryBalance> transactionCategoryBalances = new ArrayList<>();

    public Account() { }
    public Account(Long accountId) { this.accountId = accountId; }
    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public String getActiveStatus() { return activeStatus; }
    public void setActiveStatus(String activeStatus) { this.activeStatus = activeStatus; }
    public BigDecimal getCurrentBalance() { return currentBalance; }
    public void setCurrentBalance(BigDecimal currentBalance) { this.currentBalance = currentBalance; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getCashCreditLimit() { return cashCreditLimit; }
    public void setCashCreditLimit(BigDecimal cashCreditLimit) { this.cashCreditLimit = cashCreditLimit; }
    public String getOpenDate() { return openDate; }
    public void setOpenDate(String openDate) { this.openDate = openDate; }
    public String getExpirationDate() { return expirationDate; }
    public void setExpirationDate(String expirationDate) { this.expirationDate = expirationDate; }
    public String getReissueDate() { return reissueDate; }
    public void setReissueDate(String reissueDate) { this.reissueDate = reissueDate; }
    public BigDecimal getCurrentCycleCredit() { return currentCycleCredit; }
    public void setCurrentCycleCredit(BigDecimal currentCycleCredit) { this.currentCycleCredit = currentCycleCredit; }
    public BigDecimal getCurrentCycleDebit() { return currentCycleDebit; }
    public void setCurrentCycleDebit(BigDecimal currentCycleDebit) { this.currentCycleDebit = currentCycleDebit; }
    public String getAddressZip() { return addressZip; }
    public void setAddressZip(String addressZip) { this.addressZip = addressZip; }
    public String getAccountGroupId() { return accountGroupId; }
    public void setAccountGroupId(String accountGroupId) { this.accountGroupId = accountGroupId; }
    public List<Card> getCards() { return cards; }
    public List<CardAccountAssignment> getCardAccountAssignments() { return cardAccountAssignments; }
    public List<TransactionCategoryBalance> getTransactionCategoryBalances() { return transactionCategoryBalances; }
}
