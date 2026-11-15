package com.grievance.repository;

import com.grievance.entity.Department;
import com.grievance.enums.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByCategory(Category category);
}
