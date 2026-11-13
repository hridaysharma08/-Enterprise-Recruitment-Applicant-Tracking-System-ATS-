package com.ats.dto;

import com.ats.model.Job;
import com.ats.model.JobStatus;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.time.LocalDate;

public final class JobDtos {
    private JobDtos() {}

    public record JobRequest(
            @NotBlank @Size(max = 150) String title,
            @NotBlank @Size(max = 20000) String description,
            @Size(max = 150) String location,
            @Size(max = 30) String employmentType,
            @Size(max = 100) String salaryRange,
            @Size(max = 1000) String skills,
            @Min(0) @Max(50) Integer minExperience,
            LocalDate deadline,
            JobStatus status) {}

    public record JobDto(Long id, String title, String description, String location, String employmentType,
                         String salaryRange, String skills, Integer minExperience, JobStatus status,
                         LocalDate deadline, Instant createdAt, Long recruiterId, String recruiterName,
                         String company, int applicationCount) {
        public static JobDto from(Job j) {
            return new JobDto(j.getId(), j.getTitle(), j.getDescription(), j.getLocation(), j.getEmploymentType(),
                    j.getSalaryRange(), j.getSkills(), j.getMinExperience(), j.getStatus(), j.getDeadline(),
                    j.getCreatedAt(), j.getRecruiter().getId(), j.getRecruiter().getName(),
                    j.getRecruiter().getCompany(), j.getApplications().size());
        }
    }
}
