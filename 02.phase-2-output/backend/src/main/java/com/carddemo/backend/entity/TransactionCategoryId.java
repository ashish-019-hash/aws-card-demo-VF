package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** Composite key (TRAN-TYPE-CD, TRAN-CAT-CD) for TransactionCategory. */
@Embeddable
public class TransactionCategoryId implements Serializable {

    @Column(name = "tran_type_cd", length = 2, nullable = false)
    private String typeCd;
    @Column(name = "tran_cat_cd", nullable = false)
    private Integer catCd;

    public TransactionCategoryId() { }

    public TransactionCategoryId(String typeCd, Integer catCd) {
        this.typeCd = typeCd;
        this.catCd = catCd;
    }

    public String getTypeCd() { return typeCd; }
    public void setTypeCd(String typeCd) { this.typeCd = typeCd; }
    public Integer getCatCd() { return catCd; }
    public void setCatCd(Integer catCd) { this.catCd = catCd; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TransactionCategoryId that)) return false;
        return Objects.equals(typeCd, that.typeCd) && Objects.equals(catCd, that.catCd);
    }

    @Override
    public int hashCode() { return Objects.hash(typeCd, catCd); }
}
