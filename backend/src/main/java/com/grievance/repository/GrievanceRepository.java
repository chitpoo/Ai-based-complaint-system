package com.grievance.repository;

import com.grievance.entity.Grievance;
import org.springframework.data.jpa.repository.JpaRepository;

/** Query methods are added by the steps that need them (plan Step 2). */
public interface GrievanceRepository extends JpaRepository<Grievance, Long> {
}
