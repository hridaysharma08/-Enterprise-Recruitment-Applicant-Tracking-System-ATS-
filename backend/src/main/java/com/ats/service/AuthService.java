package com.ats.service;

import com.ats.dto.AuthDtos.AuthResponse;
import com.ats.dto.AuthDtos.LoginRequest;
import com.ats.dto.AuthDtos.RegisterRequest;
import com.ats.dto.UserDtos.UserDto;
import com.ats.exception.ApiException;
import com.ats.model.Role;
import com.ats.model.User;
import com.ats.repository.UserRepository;
import com.ats.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final ActivityService activity;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, ActivityService activity) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.activity = activity;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        Role role = req.role() == null ? Role.CANDIDATE : req.role();
        if (role == Role.ADMIN) throw ApiException.badRequest("Admin accounts cannot be self-registered");
        if (role == Role.RECRUITER && (req.company() == null || req.company().isBlank())) {
            throw ApiException.badRequest("Company name is required for recruiters");
        }
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("An account with this email already exists");

        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(req.password()));
        u.setRole(role);
        u.setCompany(blankToNull(req.company()));
        u.setPhone(blankToNull(req.phone()));
        users.save(u);
        activity.log(email, "Registered as " + role);
        return new AuthResponse(jwt.generateToken(u), UserDto.from(u));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .filter(x -> encoder.matches(req.password(), x.getPassword()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!u.isActive()) throw ApiException.forbidden("Your account has been deactivated. Contact the administrator.");
        activity.log(u.getEmail(), "Logged in");
        return new AuthResponse(jwt.generateToken(u), UserDto.from(u));
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
