package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@EqualsAndHashCode
@NoArgsConstructor
public class DisclosureGroupId implements Serializable {
    @Column(name = "account_group_id", length = 10, nullable = false) private String accountGroupId;
    @Column(name = "transaction_type_code", length = 2, nullable = false) private String transactionTypeCode;
    @Column(name = "transaction_category_code", precision = 4, nullable = false) private Integer transactionCategoryCode;
}
