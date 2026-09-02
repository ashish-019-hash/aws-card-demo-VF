package com.carddemo.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "CCXREF")
public class CardAccountAssignment {

    @Id
    @NotNull
    @Column(name = "XREF_CARD_NUM", length = 16, nullable = false)
    private String cardNumber;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "XREF_CARD_NUM", referencedColumnName = "CARD_NUM")
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "XREF_CUST_ID", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "XREF_ACCT_ID", nullable = false)
    private Account account;

    public CardAccountAssignment() { }
    public CardAccountAssignment(Card card, Customer customer, Account account) { this.cardNumber = card.getCardNumber(); this.card = card; this.customer = customer; this.account = account; }
    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }
    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }
}
