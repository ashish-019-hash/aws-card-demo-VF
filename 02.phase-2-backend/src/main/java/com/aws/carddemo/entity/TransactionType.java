package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "transaction_types")
@Getter
@Setter
@NoArgsConstructor
public class TransactionType {
    @Id
    @Size(max = 2)
    @Column(name = "transaction_type_code", length = 2, nullable = false)
    private String code;

    @Size(max = 50)
    @Column(name = "description", length = 50)
    private String description;
}
