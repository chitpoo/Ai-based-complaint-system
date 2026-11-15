package com.grievance.controller;

import com.grievance.dto.UserResponse;
import com.grievance.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUser currentUser;

    @GetMapping("/me")
    public UserResponse me() {
        return UserResponse.from(currentUser.get());
    }
}
