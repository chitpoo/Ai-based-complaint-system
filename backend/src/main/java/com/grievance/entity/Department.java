package com.grievance.entity;

import com.grievance.enums.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Department that owns grievances of one AI category (plan.md §2: departments).
 * Seeded with 5 rows, one per category (UNCLASSIFIED has no department and
 * falls back to the admin queue). slaHours drives the escalation scheduler.
 */
@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private Category category;

    @Email
    @Size(max = 150)
    @Column(length = 150)
    private String email;

    @NotNull
    @Column(name = "sla_hours", nullable = false)
    private Integer slaHours = 72;
}
