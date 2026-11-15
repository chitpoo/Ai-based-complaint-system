package com.grievance.repository;

import com.grievance.entity.StatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {

    /** Timeline of one grievance, oldest change first. */
    List<StatusHistory> findByGrievanceIdOrderByCreatedAtAsc(Long grievanceId);
}
