package com.ats.service;

import com.ats.dto.InterviewDtos.InterviewDto;
import com.ats.dto.InterviewDtos.InterviewRequest;
import com.ats.dto.InterviewDtos.InterviewUpdateRequest;
import com.ats.exception.ApiException;
import com.ats.model.*;
import com.ats.repository.InterviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.ats.service.AuthService.blankToNull;

@Service
public class InterviewService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final InterviewRepository interviews;
    private final ApplicationService applicationService;
    private final NotificationService notifications;
    private final ActivityService activity;

    public InterviewService(InterviewRepository interviews, ApplicationService applicationService,
                            NotificationService notifications, ActivityService activity) {
        this.interviews = interviews;
        this.applicationService = applicationService;
        this.notifications = notifications;
        this.activity = activity;
    }

    @Transactional
    public InterviewDto schedule(User me, InterviewRequest req) {
        JobApplication app = applicationService.loadManaged(me, req.applicationId());
        if (app.getStatus() == ApplicationStatus.REJECTED) {
            throw ApiException.badRequest("Cannot schedule an interview for a rejected application");
        }
        if (req.scheduledAt().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("Interview time must be in the future");
        }
        Interview i = new Interview();
        i.setApplication(app);
        i.setScheduledAt(req.scheduledAt());
        if (req.durationMinutes() != null) i.setDurationMinutes(req.durationMinutes());
        if (req.mode() != null) i.setMode(req.mode());
        i.setLocationOrLink(blankToNull(req.locationOrLink()));
        i.setInterviewer(blankToNull(req.interviewer()));
        i.setNotes(blankToNull(req.notes()));
        interviews.save(i);
        app.getInterviews().add(i);

        if (app.getStatus() == ApplicationStatus.APPLIED) {
            app.setStatus(ApplicationStatus.SHORTLISTED);
            app.setUpdatedAt(Instant.now());
        }
        notifications.notify(app.getCandidate(), "Interview scheduled for " + app.getJob().getTitle()
                + " on " + FMT.format(i.getScheduledAt()), "/interviews");
        activity.log(me.getEmail(), "Scheduled interview with " + app.getCandidate().getEmail()
                + " for \"" + app.getJob().getTitle() + "\"");
        return InterviewDto.from(i, true);
    }

    @Transactional
    public InterviewDto update(User me, Long id, InterviewUpdateRequest req) {
        Interview i = interviews.findById(id).orElseThrow(() -> ApiException.notFound("Interview"));
        JobApplication app = applicationService.loadManaged(me, i.getApplication().getId());

        boolean rescheduled = req.scheduledAt() != null && !req.scheduledAt().equals(i.getScheduledAt());
        boolean statusChanged = req.status() != null && req.status() != i.getStatus();
        if (rescheduled && req.scheduledAt().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("Interview time must be in the future");
        }

        if (req.scheduledAt() != null) i.setScheduledAt(req.scheduledAt());
        if (req.durationMinutes() != null) i.setDurationMinutes(req.durationMinutes());
        if (req.mode() != null) i.setMode(req.mode());
        if (req.locationOrLink() != null) i.setLocationOrLink(blankToNull(req.locationOrLink()));
        if (req.interviewer() != null) i.setInterviewer(blankToNull(req.interviewer()));
        if (req.notes() != null) i.setNotes(blankToNull(req.notes()));
        if (req.feedback() != null) i.setFeedback(blankToNull(req.feedback()));
        if (req.status() != null) i.setStatus(req.status());

        String title = app.getJob().getTitle();
        if (statusChanged && i.getStatus() == InterviewStatus.CANCELLED) {
            notifications.notify(app.getCandidate(), "Your interview for " + title + " has been cancelled", "/interviews");
        } else if (rescheduled) {
            notifications.notify(app.getCandidate(), "Your interview for " + title + " was rescheduled to "
                    + FMT.format(i.getScheduledAt()), "/interviews");
        }
        activity.log(me.getEmail(), "Updated interview #" + i.getId() + " for \"" + title + "\"");
        return InterviewDto.from(i, true);
    }

    @Transactional
    public void delete(User me, Long id) {
        Interview i = interviews.findById(id).orElseThrow(() -> ApiException.notFound("Interview"));
        JobApplication app = applicationService.loadManaged(me, i.getApplication().getId());
        app.getInterviews().remove(i);
        activity.log(me.getEmail(), "Deleted interview #" + id);
    }

    @Transactional(readOnly = true)
    public List<InterviewDto> mine(User me) {
        return switch (me.getRole()) {
            case ADMIN -> interviews.findAllByOrderByScheduledAtAsc().stream().map(i -> InterviewDto.from(i, true)).toList();
            case RECRUITER -> interviews.findByApplicationJobRecruiterIdOrderByScheduledAtAsc(me.getId())
                    .stream().map(i -> InterviewDto.from(i, true)).toList();
            case CANDIDATE -> interviews.findByApplicationCandidateIdOrderByScheduledAtAsc(me.getId())
                    .stream().map(i -> InterviewDto.from(i, false)).toList();
        };
    }
}
