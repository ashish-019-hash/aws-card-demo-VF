package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * ENTITY-006 Transaction Type (business-entities.md). Mirrors TRAN-TYPE-RECORD (CVTRA03Y.cpy).
 */
@Entity
@Table(name = "transaction_types")
public class TransactionType {

    @Id
    @Column(name = "tran_type", length = 2)
    private String typeCd;

    @Column(name = "tran_type_desc", length = 50, nullable = false)
    private String typeDesc;

    public String getTypeCd() { return typeCd; }
    public void setTypeCd(String typeCd) { this.typeCd = typeCd; }
    public String getTypeDesc() { return typeDesc; }
    public void setTypeDesc(String typeDesc) { this.typeDesc = typeDesc; }
}
