package com.musicapp.common.web;

import java.util.List;

/**
 * Generic paginated response envelope.
 */
public record PaginatedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
