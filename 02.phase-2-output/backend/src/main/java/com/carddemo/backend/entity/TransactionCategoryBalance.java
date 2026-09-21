package com.carddemo.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * ENTITY-008 Transaction Category Balance (business-entities.md).
 * Mirrors TRAN-CAT-BAL-RECORD (CVTRA01Y.cpy).
 */
@Entity
@Table(name = "transaction_category_balances")
public class TransactionCategoryBalance {

    @EmbeddedId
    private TransactionCategoryBalanceId id;

    @Column(name = "tran_cat_bal", nullable = false, precision = 11, scale = 2)
    private BigDecimal catBal;

    public TransactionCategoryBalanceId getId() { return id; }
    public void setId(TransactionCategoryBalanceId id) { this.id = id; }
    public BigDecimal getCatBal() { return catBal; }
    public void setCatBal(BigDecimal catBal) { this.catBal = catBal; }
}
