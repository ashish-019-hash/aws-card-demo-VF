package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "CUSTDAT")
public class Customer {

    @Id
    @NotNull
    @Digits(integer = 9, fraction = 0)
    @Column(name = "CUST_ID", precision = 9, scale = 0, nullable = false)
    private Long customerId;

    @Version
    @Column(name = "CUST_VERSION", nullable = false)
    private Long version;

    @Size(max = 25) @Column(name = "CUST_FIRST_NAME", length = 25) private String firstName;
    @Size(max = 25) @Column(name = "CUST_MIDDLE_NAME", length = 25) private String middleName;
    @Size(max = 25) @Column(name = "CUST_LAST_NAME", length = 25) private String lastName;
    @Size(max = 50) @Column(name = "CUST_ADDR_LINE_1", length = 50) private String addressLine1;
    @Size(max = 50) @Column(name = "CUST_ADDR_LINE_2", length = 50) private String addressLine2;
    @Size(max = 50) @Column(name = "CUST_ADDR_LINE_3", length = 50) private String city;
    @Size(max = 2) @Column(name = "CUST_ADDR_STATE_CD", length = 2) private String addressStateCode;
    @Size(max = 3) @Column(name = "CUST_ADDR_COUNTRY_CD", length = 3) private String addressCountryCode;
    @Size(max = 10) @Column(name = "CUST_ADDR_ZIP", length = 10) private String addressZip;
    @Pattern(regexp = "\\(\\d{3}\\)\\d{3}-\\d{4}") @Column(name = "CUST_PHONE_NUM_1", length = 15) private String primaryPhoneNumber;
    @Pattern(regexp = "\\(\\d{3}\\)\\d{3}-\\d{4}") @Column(name = "CUST_PHONE_NUM_2", length = 15) private String secondaryPhoneNumber;
    @Pattern(regexp = "\\d{9}") @Column(name = "CUST_SSN", length = 9) private String ssn;
    @Size(max = 20) @Column(name = "CUST_GOVT_ISSUED_ID", length = 20) private String governmentIssuedId;
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}") @Column(name = "CUST_DOB_YYYY_MM_DD", length = 10) private String dateOfBirth;
    @Size(max = 10) @Column(name = "CUST_EFT_ACCOUNT_ID", length = 10) private String eftAccountId;
    @Size(max = 1) @Column(name = "CUST_PRI_CARD_HOLDER_IND", length = 1) private String primaryCardHolderIndicator;
    @Digits(integer = 3, fraction = 0) @Column(name = "CUST_FICO_CREDIT_SCORE", precision = 3, scale = 0) private Integer ficoCreditScore;

    @OneToMany(mappedBy = "customer")
    private List<CardAccountAssignment> cardAccountAssignments = new ArrayList<>();

    public Customer() { }
    public Customer(Long customerId) { this.customerId = customerId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }
    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddressStateCode() { return addressStateCode; }
    public void setAddressStateCode(String addressStateCode) { this.addressStateCode = addressStateCode; }
    public String getAddressCountryCode() { return addressCountryCode; }
    public void setAddressCountryCode(String addressCountryCode) { this.addressCountryCode = addressCountryCode; }
    public String getAddressZip() { return addressZip; }
    public void setAddressZip(String addressZip) { this.addressZip = addressZip; }
    public String getPrimaryPhoneNumber() { return primaryPhoneNumber; }
    public void setPrimaryPhoneNumber(String primaryPhoneNumber) { this.primaryPhoneNumber = primaryPhoneNumber; }
    public String getSecondaryPhoneNumber() { return secondaryPhoneNumber; }
    public void setSecondaryPhoneNumber(String secondaryPhoneNumber) { this.secondaryPhoneNumber = secondaryPhoneNumber; }
    public String getSsn() { return ssn; }
    public void setSsn(String ssn) { this.ssn = ssn; }
    public String getGovernmentIssuedId() { return governmentIssuedId; }
    public void setGovernmentIssuedId(String governmentIssuedId) { this.governmentIssuedId = governmentIssuedId; }
    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getEftAccountId() { return eftAccountId; }
    public void setEftAccountId(String eftAccountId) { this.eftAccountId = eftAccountId; }
    public String getPrimaryCardHolderIndicator() { return primaryCardHolderIndicator; }
    public void setPrimaryCardHolderIndicator(String primaryCardHolderIndicator) { this.primaryCardHolderIndicator = primaryCardHolderIndicator; }
    public Integer getFicoCreditScore() { return ficoCreditScore; }
    public void setFicoCreditScore(Integer ficoCreditScore) { this.ficoCreditScore = ficoCreditScore; }
    public List<CardAccountAssignment> getCardAccountAssignments() { return cardAccountAssignments; }
}
