package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.persistence.Id;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "CARDDAT")
public class Card {

    @Id @NotNull @Size(max = 16)
    @Column(name = "CARD_NUM", length = 16, nullable = false)
    private String cardNumber;

    @Version @Column(name = "CARD_VERSION", nullable = false) private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CARD_ACCT_ID", nullable = false)
    private Account account;

    @Digits(integer = 3, fraction = 0) @Column(name = "CARD_CVV_CD", precision = 3, scale = 0) private Integer cvvCode;
    @Size(max = 50) @Column(name = "CARD_EMBOSSED_NAME", length = 50) private String embossedName;
    @Size(max = 10) @Column(name = "CARD_EXPIRAION_DATE", length = 10) private String expirationDate;
    @Size(max = 1) @Column(name = "CARD_ACTIVE_STATUS", length = 1) private String activeStatus;

    @OneToOne(mappedBy = "card") private CardAccountAssignment cardAccountAssignment;
    @OneToMany(mappedBy = "card") private List<CreditCardTransaction> transactions = new ArrayList<>();

    public Card() { }
    public Card(String cardNumber, Account account) { this.cardNumber = cardNumber; this.account = account; }
    public String getCardNumber() { return cardNumber; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }
    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }
    public Integer getCvvCode() { return cvvCode; }
    public void setCvvCode(Integer cvvCode) { this.cvvCode = cvvCode; }
    public String getEmbossedName() { return embossedName; }
    public void setEmbossedName(String embossedName) { this.embossedName = embossedName; }
    public String getExpirationDate() { return expirationDate; }
    public void setExpirationDate(String expirationDate) { this.expirationDate = expirationDate; }
    public String getActiveStatus() { return activeStatus; }
    public void setActiveStatus(String activeStatus) { this.activeStatus = activeStatus; }
    public CardAccountAssignment getCardAccountAssignment() { return cardAccountAssignment; }
    public List<CreditCardTransaction> getTransactions() { return transactions; }
}
