package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "USRSEC")
public class ApplicationUser {
    @Id @NotNull @Size(max = 8) @Column(name = "SEC_USR_ID", length = 8, nullable = false) private String userId;
    @Size(max = 20) @Column(name = "SEC_USR_FNAME", length = 20) private String firstName;
    @Size(max = 20) @Column(name = "SEC_USR_LNAME", length = 20) private String lastName;
    @Size(max = 8) @Column(name = "SEC_USR_PWD", length = 8) private String password;
    @Size(max = 1) @Column(name = "SEC_USR_TYPE", length = 1) private String userType;
    public ApplicationUser() { }
    public ApplicationUser(String userId) { this.userId = userId; }
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
}
