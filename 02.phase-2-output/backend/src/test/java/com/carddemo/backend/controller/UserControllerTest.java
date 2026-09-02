package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.exception.ApiException;
import com.carddemo.backend.exception.ApiExceptionHandler;
import com.carddemo.backend.service.CardDemoApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(ApiExceptionHandler.class)
class UserControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private CardDemoApplicationService service;

    @Test
    void createsSecurityUser() throws Exception {
        given(service.addUser(any())).willReturn(new ApiDtos.UserResponse("USER0001", "Ada", "Lovelace", "U"));
        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"USER0001\",\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"password\":\"PASS\",\"userType\":\"U\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value("USER0001"));
    }

    @Test
    void exposesDuplicateUserError() throws Exception {
        given(service.addUser(any())).willThrow(new ApiException(HttpStatus.CONFLICT, "DUPLICATE_USER", "User ID already exists."));
        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_USER"));
    }
}
