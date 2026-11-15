package com.grievance.service;

import com.grievance.dto.OfficerCreateRequest;
import com.grievance.dto.OfficerResponse;
import com.grievance.entity.Department;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.exception.DuplicateResourceException;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Officer accounts. Only an admin can create them; public registration always makes a USER. */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public OfficerResponse createOfficer(OfficerCreateRequest request) {
        String email = AuthService.normalise(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An account with this email already exists");
        }
        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        User officer = new User();
        officer.setName(request.name().trim());
        officer.setEmail(email);
        officer.setPasswordHash(passwordEncoder.encode(request.password()));
        officer.setRole(Role.OFFICER);
        officer.setDepartment(department);
        return OfficerResponse.from(userRepository.save(officer));
    }

    @Transactional(readOnly = true)
    public List<OfficerResponse> listOfficers() {
        return userRepository.findByRole(Role.OFFICER).stream().map(OfficerResponse::from).toList();
    }
}
