package com.grievance.config;

import com.grievance.entity.Department;
import com.grievance.entity.User;
import com.grievance.enums.Category;
import com.grievance.enums.Role;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seeds the 5 departments and the first admin (plan Step 2).
 * Runs on every boot and only inserts what is missing, so it is safe to repeat.
 * The admin password is never logged.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    /** One department per AI category. UNCLASSIFIED has none: it goes to the admin queue. */
    private static final Map<Category, String> DEPARTMENTS = new LinkedHashMap<>();

    static {
        DEPARTMENTS.put(Category.ACADEMIC, "Academic Cell");
        DEPARTMENTS.put(Category.HOSTEL, "Hostel Office");
        DEPARTMENTS.put(Category.INFRASTRUCTURE, "Infrastructure and Maintenance");
        DEPARTMENTS.put(Category.FINANCE, "Accounts and Finance");
        DEPARTMENTS.put(Category.HARASSMENT, "Anti-Harassment Committee");
    }

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        seedDepartments();
        seedAdmin();
    }

    private void seedDepartments() {
        DEPARTMENTS.forEach((category, name) -> {
            if (departmentRepository.findByCategory(category).isEmpty()) {
                Department department = new Department();
                department.setName(name);
                department.setCategory(category);
                departmentRepository.save(department);
                log.info("Seeded department '{}' for category {}", name, category);
            }
        });
    }

    private void seedAdmin() {
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User admin = new User();
        admin.setName("Administrator");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        log.info("Seeded admin account {}", email);
    }
}
