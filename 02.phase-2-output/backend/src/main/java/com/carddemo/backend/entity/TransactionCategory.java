package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * ENTITY-007 Transaction Category (business-entities.md). Mirrors TRAN-CAT-RECORD (CVTRA04Y.cpy).
 */
@Entity
@Table(name = "transaction_categories")
public class TransactionCategory {

    @EmbeddedId
    private TransactionCategoryId id;

    @Column(name = "tran_cat_type_desc", length = 50, nullable = false)
    private String catTypeDesc;

    public TransactionCategoryId getId() { return id; }
    public void setId(TransactionCategoryId id) { this.id = id; }
    public String getCatTypeDesc() { return catTypeDesc; }
    public void setCatTypeDesc(String catTypeDesc) { this.catTypeDesc = catTypeDesc; }
}
