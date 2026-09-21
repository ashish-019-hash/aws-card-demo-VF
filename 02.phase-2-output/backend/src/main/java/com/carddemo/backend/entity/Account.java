package com.carddemo.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * ENTITY-002 Account (business-entities.md). Mirrors ACCOUNT-RECORD (CVACT01Y.cpy).
 */
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @Column(name = "acct_id")
    private Long acctId;

    @Column(name = "acct_active_status", length = 1, nullable = false)
    private String activeStatus;

    @Column(name = "acct_curr_bal", nullable = false, precision = 12, scale = 2)
    private BigDecimal currBal;

    @Column(name = "acct_credit_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "acct_cash_credit_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal cashCreditLimit;

    /** Persisted format: {@code YYYY-MM-DD}. */
    @Column(name = "acct_open_date", length = 10, nullable = false)
    private String openDate;

    /** Note: field name preserves the legacy misspelling "ACCT-EXPIRAION-DATE". */
    @Column(name = "acct_expiraion_date", length = 10, nullable = false)
    private String expirationDate;

    @Column(name = "acct_reissue_date", length = 10, nullable = false)
    private String reissueDate;

    @Column(name = "acct_curr_cyc_credit", nullable = false, precision = 12, scale = 2)
    private BigDecimal currCycCredit;

    @Column(name = "acct_curr_cyc_debit", nullable = false, precision = 12, scale = 2)
    private BigDecimal currCycDebit;

    @Column(name = "acct_addr_zip", length = 10)
    private String addrZip;

    @Column(name = "acct_group_id", length = 10)
    private String groupId;

    public Long getAcctId() { return acctId; }
    public void setAcctId(Long acctId) { this.acctId = acctId; }
    public String getActiveStatus() { return activeStatus; }
    public void setActiveStatus(String activeStatus) { this.activeStatus = activeStatus; }
    public BigDecimal getCurrBal() { return currBal; }
    public void setCurrBal(BigDecimal currBal) { this.currBal = currBal; }
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
    public BigDecimal getCurrCycCredit() { return currCycCredit; }
    public void setCurrCycCredit(BigDecimal currCycCredit) { this.currCycCredit = currCycCredit; }
    public BigDecimal getCurrCycDebit() { return currCycDebit; }
    public void setCurrCycDebit(BigDecimal currCycDebit) { this.currCycDebit = currCycDebit; }
    public String getAddrZip() { return addrZip; }
    public void setAddrZip(String addrZip) { this.addrZip = addrZip; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
}
