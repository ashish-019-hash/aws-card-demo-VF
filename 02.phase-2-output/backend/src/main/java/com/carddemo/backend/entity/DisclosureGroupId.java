package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** Composite key (DIS-ACCT-GROUP-ID, DIS-TRAN-TYPE-CD, DIS-TRAN-CAT-CD) for DisclosureGroup. */
@Embeddable
public class DisclosureGroupId implements Serializable {

    @Column(name = "dis_acct_group_id", length = 10, nullable = false)
    private String acctGroupId;
    @Column(name = "dis_tran_type_cd", length = 2, nullable = false)
    private String tranTypeCd;
    @Column(name = "dis_tran_cat_cd", nullable = false)
    private Integer tranCatCd;

    public DisclosureGroupId() { }

    public DisclosureGroupId(String acctGroupId, String tranTypeCd, Integer tranCatCd) {
        this.acctGroupId = acctGroupId;
        this.tranTypeCd = tranTypeCd;
        this.tranCatCd = tranCatCd;
    }

    public String getAcctGroupId() { return acctGroupId; }
    public void setAcctGroupId(String acctGroupId) { this.acctGroupId = acctGroupId; }
    public String getTranTypeCd() { return tranTypeCd; }
    public void setTranTypeCd(String tranTypeCd) { this.tranTypeCd = tranTypeCd; }
    public Integer getTranCatCd() { return tranCatCd; }
    public void setTranCatCd(Integer tranCatCd) { this.tranCatCd = tranCatCd; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DisclosureGroupId that)) return false;
        return Objects.equals(acctGroupId, that.acctGroupId) && Objects.equals(tranTypeCd, that.tranTypeCd)
                && Objects.equals(tranCatCd, that.tranCatCd);
    }

    @Override
    public int hashCode() { return Objects.hash(acctGroupId, tranTypeCd, tranCatCd); }
}
