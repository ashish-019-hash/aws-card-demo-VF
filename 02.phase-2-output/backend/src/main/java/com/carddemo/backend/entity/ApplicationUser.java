package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * ENTITY-010 User / Security Profile (business-entities.md). Mirrors SEC-USER-DATA (CSUSR01Y.cpy).
 *
 * <p>Legacy note (BR-001/BR-002): the password is stored in clear text and role
 * ({@code A}=Admin / {@code U}=Regular) drives menu routing. This clear-text storage is a
 * documented legacy quirk being intentionally preserved for behavioral parity, not a
 * recommendation for production use — see README "Security notes".</p>
 */
@Entity
@Table(name = "users")
public class ApplicationUser {

    @Id
    @Column(name = "sec_usr_id", length = 8)
    private String userId;

    @Column(name = "sec_usr_fname", length = 20, nullable = false)
    private String firstName;

    @Column(name = "sec_usr_lname", length = 20, nullable = false)
    private String lastName;

    @Column(name = "sec_usr_pwd", length = 8, nullable = false)
    private String password;

    @Column(name = "sec_usr_type", length = 1, nullable = false)
    private String userType;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }

    public boolean isAdmin() { return "A".equals(userType); }
}
