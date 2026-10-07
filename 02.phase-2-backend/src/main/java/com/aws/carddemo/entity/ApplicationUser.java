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
@Table(name = "application_users")
@Getter
@Setter
@NoArgsConstructor
public class ApplicationUser {
    @Id
    @Size(max = 8)
    @Column(name = "user_id", length = 8, nullable = false)
    private String id;

    @Size(max = 20) @Column(name = "first_name", length = 20) private String firstName;
    @Size(max = 20) @Column(name = "last_name", length = 20) private String lastName;

    // BCrypt replaces the legacy eight-character plaintext value by user decision.
    @Size(max = 100)
    @Column(name = "password_hash", length = 100, nullable = false)
    private String passwordHash;

    @Size(max = 1) @Column(name = "user_type", length = 1) private String userType;
}
