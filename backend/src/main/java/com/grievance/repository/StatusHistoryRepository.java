package com.grievance.repository;

import com.grievance.entity.StatusHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {

    /**
     * Timeline of one grievance, oldest change first. The id breaks ties between
     * rows written in the same instant (submit writes two).
     */
    @EntityGraph(attributePaths = "changedBy")
    List<StatusHistory> findByGrievanceIdOrderByCreatedAtAscIdAsc(Long grievanceId);
}
