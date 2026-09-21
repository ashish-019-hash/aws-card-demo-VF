package com.carddemo.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * ENTITY-001 Customer (business-entities.md). Mirrors CUSTOMER-RECORD (CVCUS01Y.cpy).
 */
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @Column(name = "cust_id")
    private Long custId;

    @Column(name = "cust_first_name", length = 25, nullable = false)
    private String firstName;

    @Column(name = "cust_middle_name", length = 25)
    private String middleName;

    @Column(name = "cust_last_name", length = 25, nullable = false)
    private String lastName;

    @Column(name = "cust_addr_line_1", length = 50, nullable = false)
    private String addrLine1;

    @Column(name = "cust_addr_line_2", length = 50)
    private String addrLine2;

    @Column(name = "cust_addr_line_3", length = 50)
    private String addrLine3;

    @Column(name = "cust_addr_state_cd", length = 2, nullable = false)
    private String addrStateCd;

    @Column(name = "cust_addr_country_cd", length = 3, nullable = false)
    private String addrCountryCd;

    @Column(name = "cust_addr_zip", length = 10, nullable = false)
    private String addrZip;

    /** Persisted format: {@code (NNN)NNN-NNNN} left-justified in 15 chars. */
    @Column(name = "cust_phone_num_1", length = 15)
    private String phoneNum1;

    @Column(name = "cust_phone_num_2", length = 15)
    private String phoneNum2;

    /** Persisted format: 9 numeric characters, no dashes. */
    @Column(name = "cust_ssn", length = 9, nullable = false)
    private String ssn;

    @Column(name = "cust_govt_issued_id", length = 20)
    private String govtIssuedId;

    /** Persisted format: {@code YYYY-MM-DD}. */
    @Column(name = "cust_dob_yyyy_mm_dd", length = 10, nullable = false)
    private String dob;

    @Column(name = "cust_eft_account_id", length = 10)
    private String eftAccountId;

    @Column(name = "cust_pri_card_holder_ind", length = 1, nullable = false)
    private String priCardHolderInd;

    @Column(name = "cust_fico_credit_score", nullable = false)
    private Integer ficoCreditScore;

    public Long getCustId() { return custId; }
    public void setCustId(Long custId) { this.custId = custId; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getAddrLine1() { return addrLine1; }
    public void setAddrLine1(String addrLine1) { this.addrLine1 = addrLine1; }
    public String getAddrLine2() { return addrLine2; }
    public void setAddrLine2(String addrLine2) { this.addrLine2 = addrLine2; }
    public String getAddrLine3() { return addrLine3; }
    public void setAddrLine3(String addrLine3) { this.addrLine3 = addrLine3; }
    public String getAddrStateCd() { return addrStateCd; }
    public void setAddrStateCd(String addrStateCd) { this.addrStateCd = addrStateCd; }
    public String getAddrCountryCd() { return addrCountryCd; }
    public void setAddrCountryCd(String addrCountryCd) { this.addrCountryCd = addrCountryCd; }
    public String getAddrZip() { return addrZip; }
    public void setAddrZip(String addrZip) { this.addrZip = addrZip; }
    public String getPhoneNum1() { return phoneNum1; }
    public void setPhoneNum1(String phoneNum1) { this.phoneNum1 = phoneNum1; }
    public String getPhoneNum2() { return phoneNum2; }
    public void setPhoneNum2(String phoneNum2) { this.phoneNum2 = phoneNum2; }
    public String getSsn() { return ssn; }
    public void setSsn(String ssn) { this.ssn = ssn; }
    public String getGovtIssuedId() { return govtIssuedId; }
    public void setGovtIssuedId(String govtIssuedId) { this.govtIssuedId = govtIssuedId; }
    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }
    public String getEftAccountId() { return eftAccountId; }
    public void setEftAccountId(String eftAccountId) { this.eftAccountId = eftAccountId; }
    public String getPriCardHolderInd() { return priCardHolderInd; }
    public void setPriCardHolderInd(String priCardHolderInd) { this.priCardHolderInd = priCardHolderInd; }
    public Integer getFicoCreditScore() { return ficoCreditScore; }
    public void setFicoCreditScore(Integer ficoCreditScore) { this.ficoCreditScore = ficoCreditScore; }
}
