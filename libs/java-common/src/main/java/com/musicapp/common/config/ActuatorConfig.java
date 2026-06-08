package com.musicapp.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Documents the recommended Actuator configuration for each service.
 *
 * <p>Add the following to each service's {@code application.yml}:
 * <pre>
 * management:
 *   endpoints:
 *     web:
 *       exposure:
 *         include: health,prometheus,info
 *   endpoint:
 *     health:
 *       show-details: always
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "management")
public class ActuatorConfig {}
