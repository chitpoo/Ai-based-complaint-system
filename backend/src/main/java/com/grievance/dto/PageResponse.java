package com.grievance.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** A stable JSON shape for paged lists (Spring's own Page JSON is not guaranteed to stay the same). */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
