package com.musicapp.common.persistence;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables JPA auditing so that {@code @CreatedDate} and {@code @LastModifiedDate}
 * on {@link BaseEntity} are populated automatically.
 */
@Configuration
@EnableJpaAuditing
public class AuditConfig {}
