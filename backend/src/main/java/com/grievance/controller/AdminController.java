package com.grievance.controller;

import com.grievance.dto.OfficerCreateRequest;
import com.grievance.dto.OfficerResponse;
import com.grievance.dto.StatsResponse;
import com.grievance.ml.MlClient;
import com.grievance.service.AdminService;
import com.grievance.service.StatsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Guarded twice: SecurityConfig restricts /api/admin/** and the class repeats it. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final StatsService statsService;
    private final MlClient mlClient;

    @PostMapping("/officers")
    @ResponseStatus(HttpStatus.CREATED)
    public OfficerResponse createOfficer(@Valid @RequestBody OfficerCreateRequest request) {
        return adminService.createOfficer(request);
    }

    @GetMapping("/officers")
    public List<OfficerResponse> officers() {
        return adminService.listOfficers();
    }

    @GetMapping("/stats")
    public StatsResponse stats() {
        return statsService.stats();
    }

    /** Whether new grievances can be classified right now: {"available": true|false}. */
    @GetMapping("/ml-status")
    public Map<String, Boolean> mlStatus() {
        return Map.of("available", mlClient.isAvailable());
    }
}
