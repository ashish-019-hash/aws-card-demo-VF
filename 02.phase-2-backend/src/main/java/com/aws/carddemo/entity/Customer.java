package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {
    @Id
    @Column(name = "customer_id", precision = 9, nullable = false)
    private Long id;

    @Version
    @Column(name = "record_version", nullable = false)
    private Long version;

    @Size(max = 25) @Column(name = "first_name", length = 25) private String firstName;
    @Size(max = 25) @Column(name = "middle_name", length = 25) private String middleName;
    @Size(max = 25) @Column(name = "last_name", length = 25) private String lastName;
    @Size(max = 50) @Column(name = "address_line_1", length = 50) private String addressLine1;
    @Size(max = 50) @Column(name = "address_line_2", length = 50) private String addressLine2;
    @Size(max = 50) @Column(name = "address_line_3", length = 50) private String addressLine3;
    @Size(max = 2) @Column(name = "address_state_code", length = 2) private String addressStateCode;
    @Size(max = 3) @Column(name = "address_country_code", length = 3) private String addressCountryCode;
    @Size(max = 10) @Column(name = "address_zip", length = 10) private String addressZip;
    @Size(max = 15) @Column(name = "phone_number_1", length = 15) private String phoneNumber1;
    @Size(max = 15) @Column(name = "phone_number_2", length = 15) private String phoneNumber2;
    @Column(name = "ssn", precision = 9) private Long ssn;
    @Size(max = 20) @Column(name = "government_issued_id", length = 20) private String governmentIssuedId;
    @Size(max = 10) @Column(name = "date_of_birth", length = 10) private String dateOfBirth;
    @Size(max = 10) @Column(name = "eft_account_id", length = 10) private String eftAccountId;
    @Size(max = 1) @Column(name = "primary_cardholder_indicator", length = 1) private String primaryCardholderIndicator;
    @Column(name = "fico_credit_score", precision = 3) private Integer ficoCreditScore;
}
