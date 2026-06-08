package com.musicapp.common.web;

import java.time.Instant;

/**
 * Standard error response body returned by {@link GlobalExceptionHandler}.
 */
public record ErrorResponse(int status, String error, String message, Instant timestamp, String path) {

    /**
     * Creates an ErrorResponse, deriving the error label from the HTTP status code.
     */
    public static ErrorResponse of(int status, String message, String path) {
        return new ErrorResponse(status, httpStatusText(status), message, Instant.now(), path);
    }

    private static String httpStatusText(int status) {
        return switch (status) {
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 403 -> "Forbidden";
            case 404 -> "Not Found";
            case 409 -> "Conflict";
            case 500 -> "Internal Server Error";
            case 503 -> "Service Unavailable";
            default  -> "Error";
        };
    }
}
