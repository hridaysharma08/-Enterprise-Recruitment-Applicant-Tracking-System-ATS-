package com.ats.service;

import com.ats.dto.ApplicationDtos.ApplicationDto;
import com.ats.dto.ApplicationDtos.ApplyRequest;
import com.ats.dto.ApplicationDtos.StatusUpdateRequest;
import com.ats.exception.ApiException;
import com.ats.model.*;
import com.ats.repository.JobApplicationRepository;
import com.ats.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static com.ats.service.AuthService.blankToNull;

@Service
public class ApplicationService {

    private final JobApplicationRepository applications;
    private final UserRepository users;
    private final JobService jobService;
    private final NotificationService notifications;
    private final ActivityService activity;

    public ApplicationService(JobApplicationRepository applications, UserRepository users, JobService jobService,
                              NotificationService notifications, ActivityService activity) {
        this.applications = applications;
        this.users = users;
        this.jobService = jobService;
        this.notifications = notifications;
        this.activity = activity;
    }

    JobApplication load(Long id) {
        return applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
    }

    /** Recruiter who owns the job, or an admin. */
    JobApplication loadManaged(User me, Long id) {
        JobApplication a = load(id);
        if (me.getRole() != Role.ADMIN && !a.getJob().getRecruiter().getId().equals(me.getId())) {
            throw ApiException.forbidden("This application belongs to another recruiter's job");
        }
        return a;
    }

    @Transactional
    public ApplicationDto apply(User me, ApplyRequest req) {
        User candidate = users.findById(me.getId()).orElseThrow();
        Job job = jobService.load(req.jobId());
        if (job.getStatus() != JobStatus.OPEN) throw ApiException.badRequest("This job is no longer accepting applications");
        if (job.getDeadline() != null && job.getDeadline().isBefore(LocalDate.now())) {
            throw ApiException.badRequest("The application deadline for this job has passed");
        }
        if (candidate.getResumeFileName() == null) {
            throw ApiException.badRequest("Please upload your resume in your profile before applying");
        }
        if (applications.existsByJobIdAndCandidateId(job.getId(), candidate.getId())) {
            throw ApiException.conflict("You have already applied to this job");
        }
        JobApplication a = new JobApplication();
        a.setJob(job);
        a.setCandidate(candidate);
        a.setCoverLetter(blankToNull(req.coverLetter()));
        applications.save(a);

        notifications.notify(job.getRecruiter(),
                candidate.getName() + " applied for " + job.getTitle(), "/recruiter/applications?job=" + job.getId());
        activity.log(candidate.getEmail(), "Applied for \"" + job.getTitle() + "\"");
        return ApplicationDto.from(a, false);
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> mine(User me) {
        return applications.findByCandidateIdOrderByAppliedAtDesc(me.getId())
                .stream().map(a -> ApplicationDto.from(a, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> forRecruiter(User me, Long jobId) {
        List<JobApplication> list;
        if (jobId != null) {
            Job job = jobService.load(jobId);
            if (me.getRole() != Role.ADMIN && !job.getRecruiter().getId().equals(me.getId())) {
                throw ApiException.forbidden("You can only view applicants for your own jobs");
            }
            list = applications.findByJobIdOrderByAppliedAtDesc(jobId);
        } else if (me.getRole() == Role.ADMIN) {
            list = applications.findAllByOrderByAppliedAtDesc();
        } else {
            list = applications.findByJobRecruiterIdOrderByAppliedAtDesc(me.getId());
        }
        return list.stream().map(a -> ApplicationDto.from(a, true)).toList();
    }

    @Transactional(readOnly = true)
    public ApplicationDto get(User me, Long id) {
        JobApplication a = load(id);
        if (me.getRole() == Role.CANDIDATE) {
            if (!a.getCandidate().getId().equals(me.getId())) throw ApiException.forbidden("Not your application");
            return ApplicationDto.from(a, false);
        }
        return ApplicationDto.from(loadManaged(me, id), true);
    }

    @Transactional
    public ApplicationDto updateStatus(User me, Long id, StatusUpdateRequest req) {
        JobApplication a = loadManaged(me, id);
        ApplicationStatus previous = a.getStatus();
        a.setStatus(req.status());
        if (req.recruiterNotes() != null) a.setRecruiterNotes(blankToNull(req.recruiterNotes()));
        a.setUpdatedAt(Instant.now());

        if (previous != req.status()) {
            notifications.notify(a.getCandidate(), statusMessage(req.status(), a.getJob().getTitle()), "/applications");
            activity.log(me.getEmail(), "Moved " + a.getCandidate().getEmail() + " to " + req.status()
                    + " for \"" + a.getJob().getTitle() + "\"");
        }
        return ApplicationDto.from(a, true);
    }

    @Transactional
    public void withdraw(User me, Long id) {
        JobApplication a = load(id);
        if (!a.getCandidate().getId().equals(me.getId())) throw ApiException.forbidden("Not your application");
        if (a.getStatus() == ApplicationStatus.SELECTED) {
            throw ApiException.badRequest("You cannot withdraw an application that has been selected");
        }
        String title = a.getJob().getTitle();
        notifications.notify(a.getJob().getRecruiter(), a.getCandidate().getName() + " withdrew their application for " + title,
                "/recruiter/applications?job=" + a.getJob().getId());
        applications.delete(a);
        activity.log(me.getEmail(), "Withdrew application for \"" + title + "\"");
    }

    private static String statusMessage(ApplicationStatus s, String jobTitle) {
        return switch (s) {
            case APPLIED -> "Your application for " + jobTitle + " is back under review";
            case SHORTLISTED -> "Good news! You have been shortlisted for " + jobTitle;
            case REJECTED -> "Your application for " + jobTitle + " was not taken forward";
            case SELECTED -> "Congratulations! You have been selected for " + jobTitle;
        };
    }
}
