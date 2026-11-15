package com.grievance.service;

import com.grievance.dto.AuthResponse;
import com.grievance.dto.LoginRequest;
import com.grievance.dto.LoginResponse;
import com.grievance.dto.RegisterRequest;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.exception.DuplicateResourceException;
import com.grievance.repository.UserRepository;
import com.grievance.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalise(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An account with this email already exists");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user = userRepository.save(user);
        return new AuthResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                jwtUtil.generateToken(user));
    }

    public LoginResponse login(LoginRequest request) {
        String email = normalise(request.email());
        // Throws BadCredentialsException for an unknown email and for a wrong password alike.
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return new LoginResponse(jwtUtil.generateToken(user), user.getRole(), user.getName());
    }

    static String normalise(String email) {
        return email.trim().toLowerCase();
    }
}
