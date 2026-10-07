package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "credit_cards", indexes = @Index(name = "idx_credit_cards_account", columnList = "account_id"))
@Getter
@Setter
@NoArgsConstructor
public class CreditCard {
    @Id
    @Size(max = 16)
    @Column(name = "card_number", length = 16, nullable = false)
    private String cardNumber;

    @Version
    @Column(name = "record_version", nullable = false)
    private Long version;

    @Column(name = "account_id", precision = 11, nullable = false)
    private Long accountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", insertable = false, updatable = false)
    private Account account;

    @Column(name = "cvv_code", precision = 3) private Integer cvvCode;
    @Size(max = 50) @Column(name = "embossed_name", length = 50) private String embossedName;
    @Size(max = 10) @Column(name = "expiration_date", length = 10) private String expirationDate;
    @Size(max = 1) @Column(name = "active_status", length = 1) private String activeStatus;
}
