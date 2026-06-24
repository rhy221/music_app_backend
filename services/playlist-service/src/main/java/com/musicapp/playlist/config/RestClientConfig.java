package com.musicapp.playlist.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

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
                .requestFactory(createRequestFactory())
                .build();
    }

    @Bean("userRestClient")
    public RestClient userRestClient() {
        return RestClient.builder()
                .baseUrl(userServiceUrl)
                .requestFactory(createRequestFactory())
                .build();
    }

    private JdkClientHttpRequestFactory createRequestFactory() {
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        return requestFactory;
    }
}
