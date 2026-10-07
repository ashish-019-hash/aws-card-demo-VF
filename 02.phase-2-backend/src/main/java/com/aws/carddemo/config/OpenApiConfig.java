package com.aws.carddemo.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI cardDemoOpenApi() {
        return new OpenAPI().info(new Info()
                .title("CardDemo API")
                .version("1.0.0")
                .description("Source-backed APIs for the CardDemo migration."));
    }
}
