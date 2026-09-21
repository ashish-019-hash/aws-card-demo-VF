package com.carddemo.backend;

import com.carddemo.backend.config.CorsProperties;
import com.carddemo.backend.config.SecurityProperties;
import com.carddemo.backend.seed.SeedProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({SeedProperties.class, SecurityProperties.class, CorsProperties.class})
public class CardDemoBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CardDemoBackendApplication.class, args);
    }
}
