package com.musicapp.playlist.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${catalog.service.url}")
    private String catalogServiceUrl;

    @Value("${user.service.url}")
    private String userServiceUrl;

    @Bean("catalogRestClient")
    public RestClient catalogRestClient() {
        return RestClient.builder()
                .baseUrl(catalogServiceUrl)
                .build();
    }

    @Bean("userRestClient")
    public RestClient userRestClient() {
        return RestClient.builder()
                .baseUrl(userServiceUrl)
                .build();
    }
}
