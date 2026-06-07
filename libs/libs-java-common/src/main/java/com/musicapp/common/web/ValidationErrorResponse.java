package com.musicapp.common.web;

import java.time.Instant;
import java.util.List;

/**
 * Error response body used for validation failures (HTTP 400).
 */
public record ValidationErrorResponse(int status, String error, List<FieldError> errors, Instant timestamp) {

    /** A single field-level validation error. */
    public record FieldError(String field, String message) {}

    public static ValidationErrorResponse of(List<FieldError> errors) {
        return new ValidationErrorResponse(400, "Bad Request", errors, Instant.now());
    }
}
