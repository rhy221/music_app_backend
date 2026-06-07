package com.musicapp.common.web;

import org.springframework.data.domain.Page;

import java.util.function.Function;

/**
 * Helper for converting a Spring Data {@link Page} into a {@link PaginatedResponse}.
 */
public final class PaginationMapper {

    private PaginationMapper() {}

    /**
     * Maps each element of {@code page} using {@code mapper} and wraps the result in a
     * {@link PaginatedResponse} with pagination metadata.
     */
    public static <T, R> PaginatedResponse<R> toResponse(Page<T> page, Function<T, R> mapper) {
        return new PaginatedResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
