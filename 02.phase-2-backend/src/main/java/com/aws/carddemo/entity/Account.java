package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
public class Account {
    @Id
    @Column(name = "account_id", precision = 11, nullable = false)
    private Long id;

    @Version
    @Column(name = "record_version", nullable = false)
    private Long version;

    @Size(max = 1) @Column(name = "active_status", length = 1) private String activeStatus;
    @Column(name = "current_balance", precision = 12, scale = 2) private BigDecimal currentBalance;
    @Column(name = "credit_limit", precision = 12, scale = 2) private BigDecimal creditLimit;
    @Column(name = "cash_credit_limit", precision = 12, scale = 2) private BigDecimal cashCreditLimit;
    @Size(max = 10) @Column(name = "open_date", length = 10) private String openDate;
    @Size(max = 10) @Column(name = "expiration_date", length = 10) private String expirationDate;
    @Size(max = 10) @Column(name = "reissue_date", length = 10) private String reissueDate;
    @Column(name = "current_cycle_credit", precision = 12, scale = 2) private BigDecimal currentCycleCredit;
    @Column(name = "current_cycle_debit", precision = 12, scale = 2) private BigDecimal currentCycleDebit;
    @Size(max = 10) @Column(name = "address_zip", length = 10) private String addressZip;
    @Size(max = 10) @Column(name = "group_id", length = 10) private String groupId;
}
