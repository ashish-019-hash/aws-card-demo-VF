package com.aws.carddemo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aws.carddemo.dto.AccountDto;
import com.aws.carddemo.dto.CreditCardDto;
import com.aws.carddemo.dto.CustomerDto;
import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.UserDto;
import com.aws.carddemo.entity.Account;
import com.aws.carddemo.exception.GlobalExceptionHandler;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.service.AccountDataService;
import com.aws.carddemo.service.CardDataService;
import com.aws.carddemo.service.CustomerDataService;
import com.aws.carddemo.service.TransactionDataService;
import com.aws.carddemo.service.UserDataService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.data.util.TypeInformation;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({AccountController.class, CustomerController.class, CardController.class,
        TransactionController.class, UserController.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class ApiContractTest {
    @Autowired MockMvc mvc;
    @MockitoBean AccountDataService accounts;
    @MockitoBean CustomerDataService customers;
    @MockitoBean CardDataService cards;
    @MockitoBean TransactionDataService transactions;
    @MockitoBean UserDataService users;

    @Test
    void accountOperationsReturnDocumentedStatuses() throws Exception {
        AccountDto dto = new AccountDto(1L, 0L, "Y", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ONE,
                "2020-01-01", "2030-01-01", "2029-01-01", BigDecimal.ZERO, BigDecimal.ONE, "10001", "G1");
        when(accounts.findAll(any())).thenReturn(Page.empty());
        when(accounts.find(1L)).thenReturn(dto);
        when(accounts.update(anyLong(), any())).thenReturn(dto);
        mvc.perform(get("/api/accounts")).andExpect(status().isOk());
        mvc.perform(get("/api/accounts/1")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(put("/api/accounts/1").contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"activeStatus\":\"Y\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void customerOperationsReturnDocumentedStatuses() throws Exception {
        CustomerDto dto = new CustomerDto(1L, 0L, "A", "", "User", "1 Main", "", "City", "NY", "USA", "10001", "2125550100", "", 1L, "ID", "2000-01-01", "EFT", "Y", 700);
        when(customers.findAll(any())).thenReturn(Page.empty());
        when(customers.find(1L)).thenReturn(dto);
        when(customers.update(anyLong(), any())).thenReturn(dto);
        mvc.perform(get("/api/customers")).andExpect(status().isOk());
        mvc.perform(get("/api/customers/1")).andExpect(status().isOk());
        mvc.perform(put("/api/customers/1").contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isOk());
    }

    @Test
    void cardOperationsReturnDocumentedStatuses() throws Exception {
        CreditCardDto dto = new CreditCardDto("1111222233334444", 0L, 1L, 123, "A USER", "2030-01-01", "Y");
        when(cards.findAll(any())).thenReturn(Page.empty());
        when(cards.findByAccount(1L)).thenReturn(List.of(dto));
        when(cards.find(anyString())).thenReturn(dto);
        when(cards.update(anyString(), any())).thenReturn(dto);
        mvc.perform(get("/api/cards")).andExpect(status().isOk());
        mvc.perform(get("/api/cards").param("accountId", "1")).andExpect(status().isOk());
        mvc.perform(get("/api/cards/1111222233334444")).andExpect(status().isOk());
        mvc.perform(put("/api/cards/1111222233334444").contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0,\"accountId\":1}"))
                .andExpect(status().isOk());
    }

    @Test
    void transactionOperationsReturnDocumentedStatuses() throws Exception {
        TransactionDto dto = transactionDto();
        when(transactions.findAll(any())).thenReturn(Page.empty());
        when(transactions.find("1")).thenReturn(dto);
        when(transactions.create(any())).thenReturn(dto);
        mvc.perform(get("/api/transactions")).andExpect(status().isOk());
        mvc.perform(get("/api/transactions/1")).andExpect(status().isOk());
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content(validTransactionJson()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value("0000000000000001"));
    }

    @Test
    void userOperationsReturnDocumentedStatuses() throws Exception {
        UserDto dto = new UserDto("USER0001", "A", "User", "U");
        when(users.findAll(any())).thenReturn(Page.empty());
        when(users.find(anyString())).thenReturn(dto);
        when(users.create(anyString(), any())).thenReturn(dto);
        when(users.update(anyString(), any())).thenReturn(dto);
        doNothing().when(users).delete(anyString());
        String body = "{\"firstName\":\"A\",\"lastName\":\"User\",\"password\":\"password\",\"userType\":\"U\"}";
        mvc.perform(get("/api/users")).andExpect(status().isOk());
        mvc.perform(get("/api/users/USER0001")).andExpect(status().isOk());
        mvc.perform(post("/api/users/USER0001").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mvc.perform(put("/api/users/USER0001").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(delete("/api/users/USER0001")).andExpect(status().isNoContent());
    }

    @Test
    void missingResourcesAndInvalidRequestsUseProblemDetails() throws Exception {
        when(accounts.find(99L)).thenThrow(new ResourceNotFoundException("Account", 99));
        mvc.perform(get("/api/accounts/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource not found"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"));
    }

    @Test
    void concurrencyAndInvalidSortFailuresUseProblemDetails() throws Exception {
        when(accounts.update(anyLong(), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(Account.class, 1L));
        mvc.perform(put("/api/accounts/1").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"activeStatus\":\"Y\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Resource conflict"))
                .andExpect(jsonPath("$.detail").value("The record changed during this operation. Reload and try again."));

        when(accounts.findAll(any())).thenThrow(new PropertyReferenceException(
                "unknownField", TypeInformation.of(Account.class), List.of()));
        mvc.perform(get("/api/accounts").param("sort", "unknownField,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid request"))
                .andExpect(jsonPath("$.detail").value("Unknown sort field: unknownField"));
    }

    private TransactionDto transactionDto() {
        return new TransactionDto("0000000000000001", "01", 1, "POS", "Purchase", BigDecimal.ONE, 1L,
                "Merchant", "City", "10001", "1111222233334444", "2024-01-01-00.00.00.000000", "2024-01-01-00.00.00.000000");
    }

    private String validTransactionJson() {
        return "{\"id\":\"0000000000000001\",\"transactionTypeCode\":\"01\",\"transactionCategoryCode\":1,"
                + "\"source\":\"POS\",\"description\":\"Purchase\",\"amount\":\"+00000001.00\","
                + "\"merchantId\":\"000000001\",\"merchantName\":\"Merchant\",\"merchantCity\":\"City\","
                + "\"merchantZip\":\"10001\",\"cardNumber\":\"1111222233334444\","
                + "\"originationTimestamp\":\"2024-01-01\",\"processingTimestamp\":\"2024-01-01\",\"confirmation\":\"Y\"}";
    }
}
