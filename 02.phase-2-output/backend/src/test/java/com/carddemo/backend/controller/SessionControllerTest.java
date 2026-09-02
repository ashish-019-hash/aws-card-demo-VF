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

@WebMvcTest(controllers = SessionController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(ApiExceptionHandler.class)
class SessionControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private CardDemoApplicationService service;

    @Test
    void signsOnAndReturnsTheAdministratorDestination() throws Exception {
        given(service.signOn(any())).willReturn(new ApiDtos.SessionResponse("ADMIN001", "ADMINISTRATOR", "/api/admin/menu"));
        mockMvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"admin001\",\"password\":\"password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("ADMIN001"))
                .andExpect(jsonPath("$.destination").value("/api/admin/menu"));
    }

    @Test
    void exposesAConsistentCredentialError() throws Exception {
        given(service.signOn(any())).willThrow(new ApiException(HttpStatus.BAD_REQUEST, "WRONG_PASSWORD", "Wrong Password. Try again ..."));
        mockMvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"admin001\",\"password\":\"wrong\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WRONG_PASSWORD"));
    }
}
