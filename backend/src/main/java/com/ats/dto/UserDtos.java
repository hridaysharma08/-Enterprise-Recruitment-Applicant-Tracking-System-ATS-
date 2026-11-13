package com.ats.dto;

import com.ats.model.Role;
import com.ats.model.User;
import jakarta.validation.constraints.*;

import java.time.Instant;

public final class UserDtos {
    private UserDtos() {}

    public record UserDto(Long id, String name, String email, Role role, boolean active, String phone,
                          String company, String headline, String skills, Integer experienceYears,
                          String location, boolean hasResume, String resumeOriginalName, Instant createdAt) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(), u.getPhone(),
                    u.getCompany(), u.getHeadline(), u.getSkills(), u.getExperienceYears(), u.getLocation(),
                    u.getResumeFileName() != null, u.getResumeOriginalName(), u.getCreatedAt());
        }
    }

    public record ProfileUpdateRequest(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 30) String phone,
            @Size(max = 150) String company,
            @Size(max = 200) String headline,
            @Size(max = 1000) String skills,
            @Min(0) @Max(60) Integer experienceYears,
            @Size(max = 150) String location) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 6, max = 100) String newPassword) {}

    /** Used by admins to create recruiter (or admin) accounts directly. */
    public record CreateUserRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            @NotNull Role role,
            @Size(max = 150) String company,
            @Size(max = 30) String phone) {}
}
