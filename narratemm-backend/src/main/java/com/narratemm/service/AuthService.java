package com.narratemm.service;

import com.narratemm.dto.AuthDTOs.*;
import com.narratemm.entity.User;
import com.narratemm.repository.UserRepository;
import com.narratemm.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .provider(User.AuthProvider.EMAIL)
                .avatar("https://ui-avatars.com/api/?name=" +
                        request.getName().replace(" ", "+") +
                        "&background=8b5cf6&color=fff")
                .build();

        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .user(toUserDTO(user))
                .token(token)
                .expiresIn(jwtUtil.getExpirationSeconds())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .user(toUserDTO(user))
                .token(token)
                .expiresIn(jwtUtil.getExpirationSeconds())
                .build();
    }

    public AuthResponse loginWithOAuth(OAuthRequest request) {
        // TODO: Verify idToken with Google/Facebook SDK
        // For now, create or find user by extracted email
        // In production, verify the token with:
        //   Google: GoogleIdTokenVerifier
        //   Facebook: FacebookClient

        String email = "oauth-user@example.com"; // Extract from token
        String name = "OAuth User"; // Extract from token

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User.AuthProvider provider = request.getProvider().equalsIgnoreCase("google")
                    ? User.AuthProvider.GOOGLE
                    : User.AuthProvider.FACEBOOK;

            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .password(passwordEncoder.encode("oauth-no-password"))
                    .provider(provider)
                    .avatar("https://ui-avatars.com/api/?name=" +
                            name.replace(" ", "+") + "&background=8b5cf6&color=fff")
                    .build();
            return userRepository.save(newUser);
        });

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .user(toUserDTO(user))
                .token(token)
                .expiresIn(jwtUtil.getExpirationSeconds())
                .build();
    }

    public UserDTO getCurrentUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toUserDTO(user);
    }

    private UserDTO toUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .avatar(user.getAvatar())
                .provider(user.getProvider().name().toLowerCase())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }
}
