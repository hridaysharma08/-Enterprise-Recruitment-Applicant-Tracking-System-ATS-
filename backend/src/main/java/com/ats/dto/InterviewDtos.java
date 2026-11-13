package com.ats.dto;

import com.ats.model.Interview;
import com.ats.model.InterviewMode;
import com.ats.model.InterviewStatus;
import com.ats.model.JobApplication;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public final class InterviewDtos {
    private InterviewDtos() {}

    public record InterviewRequest(
            @NotNull Long applicationId,
            @NotNull LocalDateTime scheduledAt,
            @Min(10) @Max(480) Integer durationMinutes,
            InterviewMode mode,
            @Size(max = 500) String locationOrLink,
            @Size(max = 150) String interviewer,
            @Size(max = 5000) String notes) {}

    /** All fields optional: only non-null fields are applied. */
    public record InterviewUpdateRequest(
            LocalDateTime scheduledAt,
            @Min(10) @Max(480) Integer durationMinutes,
            InterviewMode mode,
            @Size(max = 500) String locationOrLink,
            @Size(max = 150) String interviewer,
            @Size(max = 5000) String notes,
            InterviewStatus status,
            @Size(max = 5000) String feedback) {}

    public record InterviewDto(Long id, Long applicationId, Long jobId, String jobTitle, String company,
                               Long candidateId, String candidateName, String candidateEmail,
                               LocalDateTime scheduledAt, int durationMinutes, InterviewMode mode,
                               String locationOrLink, String interviewer, String notes,
                               InterviewStatus status, String feedback) {
        /** @param internal feedback/notes are only shown to recruiters and admins */
        public static InterviewDto from(Interview i, boolean internal) {
            JobApplication a = i.getApplication();
            return new InterviewDto(i.getId(), a.getId(), a.getJob().getId(), a.getJob().getTitle(),
                    a.getJob().getRecruiter().getCompany(), a.getCandidate().getId(), a.getCandidate().getName(),
                    a.getCandidate().getEmail(), i.getScheduledAt(), i.getDurationMinutes(), i.getMode(),
                    i.getLocationOrLink(), i.getInterviewer(), i.getNotes(), i.getStatus(),
                    internal ? i.getFeedback() : null);
        }
    }
}
