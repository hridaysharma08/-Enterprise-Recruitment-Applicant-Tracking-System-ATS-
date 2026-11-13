package com.ats.dto;

import com.ats.model.ApplicationStatus;
import com.ats.model.JobApplication;
import com.ats.model.User;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class ApplicationDtos {
    private ApplicationDtos() {}

    public record ApplyRequest(@NotNull Long jobId, @Size(max = 5000) String coverLetter) {}

    public record StatusUpdateRequest(@NotNull ApplicationStatus status, @Size(max = 5000) String recruiterNotes) {}

    public record ApplicationDto(Long id, Long jobId, String jobTitle, String company, String jobLocation,
                                 Long candidateId, String candidateName, String candidateEmail,
                                 String candidatePhone, String candidateHeadline, String candidateSkills,
                                 Integer candidateExperience, boolean hasResume, ApplicationStatus status,
                                 String coverLetter, String recruiterNotes, int interviewCount,
                                 Instant appliedAt, Instant updatedAt) {
        /** @param includeNotes recruiter notes are internal and hidden from candidates */
        public static ApplicationDto from(JobApplication a, boolean includeNotes) {
            User c = a.getCandidate();
            return new ApplicationDto(a.getId(), a.getJob().getId(), a.getJob().getTitle(),
                    a.getJob().getRecruiter().getCompany(), a.getJob().getLocation(),
                    c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getHeadline(), c.getSkills(),
                    c.getExperienceYears(), c.getResumeFileName() != null, a.getStatus(), a.getCoverLetter(),
                    includeNotes ? a.getRecruiterNotes() : null, a.getInterviews().size(),
                    a.getAppliedAt(), a.getUpdatedAt());
        }
    }
}
