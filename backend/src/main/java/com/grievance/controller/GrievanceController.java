package com.grievance.controller;

import com.grievance.dto.AssignRequest;
import com.grievance.dto.AssignResponse;
import com.grievance.dto.GrievanceCreateRequest;
import com.grievance.dto.GrievanceCreatedResponse;
import com.grievance.dto.GrievanceDetailResponse;
import com.grievance.dto.GrievanceSummaryResponse;
import com.grievance.dto.PageResponse;
import com.grievance.dto.PublicTrackResponse;
import com.grievance.dto.StatusUpdateRequest;
import com.grievance.dto.StatusUpdateResponse;
import com.grievance.enums.Category;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.Priority;
import com.grievance.security.CurrentUser;
import com.grievance.service.GrievanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/grievances")
@RequiredArgsConstructor
public class GrievanceController {

    private final GrievanceService grievanceService;
    private final CurrentUser currentUser;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('USER')")
    public GrievanceCreatedResponse create(@Valid @RequestBody GrievanceCreateRequest request) {
        return grievanceService.submit(request, currentUser.get());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public List<GrievanceSummaryResponse> mine() {
        return grievanceService.listMine(currentUser.get());
    }

    /** Public: no login needed (see SecurityConfig). */
    @GetMapping("/track/{trackingId}")
    public PublicTrackResponse track(@PathVariable String trackingId) {
        return grievanceService.track(trackingId);
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('OFFICER')")
    public List<GrievanceSummaryResponse> assigned(@RequestParam(required = false) GrievanceStatus status) {
        return grievanceService.listAssigned(currentUser.get(), status);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<GrievanceSummaryResponse> all(@RequestParam(required = false) GrievanceStatus status,
                                                      @RequestParam(required = false) Category category,
                                                      @RequestParam(required = false) Priority priority,
                                                      @RequestParam(defaultValue = "false") boolean overdue,
                                                      @RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "20") int size) {
        return grievanceService.listAll(status, category, priority, overdue, page, size);
    }

    /** Owner, an officer of the grievance's department, or an admin; the service decides. */
    @GetMapping("/{id}")
    public GrievanceDetailResponse detail(@PathVariable Long id) {
        return grievanceService.getDetail(id, currentUser.get());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OFFICER', 'ADMIN')")
    public StatusUpdateResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return grievanceService.updateStatus(id, request, currentUser.get());
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public AssignResponse assign(@PathVariable Long id, @RequestBody AssignRequest request) {
        return grievanceService.assign(id, request, currentUser.get());
    }
}
