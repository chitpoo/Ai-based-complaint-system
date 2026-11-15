package com.grievance.repository;

import com.grievance.entity.Grievance;
import com.grievance.enums.GrievanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GrievanceRepository extends JpaRepository<Grievance, Long>, JpaSpecificationExecutor<Grievance> {

    boolean existsByTrackingId(String trackingId);

    Optional<Grievance> findByTrackingId(String trackingId);

    /** Detail view: loads the three relations in the same query. */
    @EntityGraph(attributePaths = {"user", "department", "officer"})
    Optional<Grievance> findWithRelationsById(Long id);

    // The list queries fetch the department together with each row, so listing N grievances is one query, not N+1.

    @EntityGraph(attributePaths = "department")
    List<Grievance> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Override
    @EntityGraph(attributePaths = "department")
    List<Grievance> findAll(Specification<Grievance> spec, Sort sort);

    @Override
    @EntityGraph(attributePaths = "department")
    Page<Grievance> findAll(Specification<Grievance> spec, Pageable pageable);

    // --- Escalation scheduler ---

    @Query("select g.id from Grievance g where g.department.id = :departmentId "
            + "and g.status in :statuses and g.createdAt < :cutoff")
    List<Long> findOverdueIdsInDepartment(@Param("departmentId") Long departmentId,
                                          @Param("statuses") Collection<GrievanceStatus> statuses,
                                          @Param("cutoff") LocalDateTime cutoff);

    @Query("select g.id from Grievance g where g.department is null "
            + "and g.status in :statuses and g.createdAt < :cutoff")
    List<Long> findOverdueIdsUnrouted(@Param("statuses") Collection<GrievanceStatus> statuses,
                                      @Param("cutoff") LocalDateTime cutoff);

    // --- Dashboard stats: counted in SQL ---

    @Query("select g.status, count(g) from Grievance g group by g.status")
    List<Object[]> countByStatus();

    @Query("select g.category, count(g) from Grievance g group by g.category")
    List<Object[]> countByCategory();

    @Query("select g.priority, count(g) from Grievance g group by g.priority")
    List<Object[]> countByPriority();

    @Query(value = "select avg(timestampdiff(second, created_at, resolved_at)) / 3600 "
            + "from grievances where resolved_at is not null", nativeQuery = true)
    Double averageResolutionHours();
}
