package com.narratemm.controller;

import com.narratemm.dto.AuthDTOs.*;
import com.narratemm.security.SecurityUtils;
import com.narratemm.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/oauth")
    public ResponseEntity<AuthResponse> oauthLogin(@Valid @RequestBody OAuthRequest request) {
        return ResponseEntity.ok(authService.loginWithOAuth(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        // TODO: Implement email sending
        return ResponseEntity.ok(new MessageResponse("Password reset email sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        // TODO: Implement password reset
        return ResponseEntity.ok(new MessageResponse("Password updated successfully"));
    }
}
