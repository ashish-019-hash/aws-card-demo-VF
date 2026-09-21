package com.carddemo.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI cardDemoOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CardDemo Backend API")
                        .description("Spring Boot migration of the CardDemo CICS/COBOL credit-card demo application. "
                                + "Session-based auth: POST /api/session to sign on, then send the X-XSRF-TOKEN header "
                                + "(value from the XSRF-TOKEN cookie) on every mutating request.")
                        .version("v1"))
                .components(new Components()
                        .addSecuritySchemes("cookieAuth",
                                new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.COOKIE).name("JSESSIONID"))
                        .addSecuritySchemes("csrfHeader",
                                new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.HEADER).name("X-XSRF-TOKEN")));
    }
}
