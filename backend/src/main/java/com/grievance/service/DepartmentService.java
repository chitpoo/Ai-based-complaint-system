package com.grievance.service;

import com.grievance.dto.DepartmentCreateRequest;
import com.grievance.dto.DepartmentResponse;
import com.grievance.dto.DepartmentUpdateRequest;
import com.grievance.entity.Department;
import com.grievance.enums.Category;
import com.grievance.exception.BadRequestException;
import com.grievance.exception.DuplicateResourceException;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list() {
        return departmentRepository.findAll(Sort.by("name")).stream().map(DepartmentResponse::from).toList();
    }

    @Transactional
    public DepartmentResponse create(DepartmentCreateRequest request) {
        if (request.category() == Category.UNCLASSIFIED) {
            throw new BadRequestException("UNCLASSIFIED grievances go to the admin queue and cannot have a department");
        }
        if (departmentRepository.existsByCategory(request.category())) {
            throw new DuplicateResourceException("A department already handles category " + request.category());
        }
        String name = request.name().trim();
        if (departmentRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("A department with this name already exists");
        }
        Department department = new Department();
        department.setName(name);
        department.setCategory(request.category());
        department.setEmail(blankToNull(request.email()));
        if (request.slaHours() != null) {
            department.setSlaHours(request.slaHours());
        }
        return DepartmentResponse.from(departmentRepository.save(department));
    }

    /** Category is not updatable, so two departments can never end up sharing one. */
    @Transactional
    public DepartmentResponse update(Long id, DepartmentUpdateRequest request) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw new BadRequestException("name: must not be blank");
            }
            if (!name.equalsIgnoreCase(department.getName()) && departmentRepository.existsByNameIgnoreCase(name)) {
                throw new DuplicateResourceException("A department with this name already exists");
            }
            department.setName(name);
        }
        if (request.email() != null) {
            department.setEmail(blankToNull(request.email()));
        }
        if (request.slaHours() != null) {
            department.setSlaHours(request.slaHours());
        }
        return DepartmentResponse.from(department);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase();
    }
}
