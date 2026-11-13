package com.ats.service;

import com.ats.dto.UserDtos.*;
import com.ats.exception.ApiException;
import com.ats.model.Role;
import com.ats.model.User;
import com.ats.repository.JobApplicationRepository;
import com.ats.repository.JobRepository;
import com.ats.repository.NotificationRepository;
import com.ats.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;

import static com.ats.service.AuthService.blankToNull;

@Service
public class UserService {

    private final UserRepository users;
    private final JobRepository jobs;
    private final JobApplicationRepository applications;
    private final NotificationRepository notifications;
    private final FileStorageService files;
    private final PasswordEncoder encoder;
    private final ActivityService activity;

    public UserService(UserRepository users, JobRepository jobs, JobApplicationRepository applications,
                       NotificationRepository notifications, FileStorageService files,
                       PasswordEncoder encoder, ActivityService activity) {
        this.users = users;
        this.jobs = jobs;
        this.applications = applications;
        this.notifications = notifications;
        this.files = files;
        this.encoder = encoder;
        this.activity = activity;
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    @Transactional(readOnly = true)
    public UserDto me(User me) {
        return UserDto.from(load(me.getId()));
    }

    @Transactional
    public UserDto updateProfile(User me, ProfileUpdateRequest req) {
        User u = load(me.getId());
        u.setName(req.name().trim());
        u.setPhone(blankToNull(req.phone()));
        u.setLocation(blankToNull(req.location()));
        if (u.getRole() == Role.RECRUITER) {
            if (req.company() == null || req.company().isBlank()) throw ApiException.badRequest("Company is required");
            u.setCompany(req.company().trim());
        }
        if (u.getRole() == Role.CANDIDATE) {
            u.setHeadline(blankToNull(req.headline()));
            u.setSkills(blankToNull(req.skills()));
            u.setExperienceYears(req.experienceYears());
        }
        return UserDto.from(u);
    }

    @Transactional
    public void changePassword(User me, ChangePasswordRequest req) {
        User u = load(me.getId());
        if (!encoder.matches(req.currentPassword(), u.getPassword())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        u.setPassword(encoder.encode(req.newPassword()));
        activity.log(u.getEmail(), "Changed password");
    }

    @Transactional
    public UserDto uploadResume(User me, MultipartFile file) {
        User u = load(me.getId());
        if (u.getRole() != Role.CANDIDATE) throw ApiException.forbidden("Only candidates can upload resumes");
        String old = u.getResumeFileName();
        u.setResumeFileName(files.storeResume(file));
        u.setResumeOriginalName(file.getOriginalFilename());
        files.deleteResume(old);
        activity.log(u.getEmail(), "Uploaded resume " + file.getOriginalFilename());
        return UserDto.from(u);
    }

    /** Candidates can see their own resume; recruiters only of candidates who applied to their jobs; admins all. */
    @Transactional(readOnly = true)
    public ResumeFile loadResume(User me, Long candidateId) {
        User candidate = load(candidateId);
        boolean allowed = switch (me.getRole()) {
            case ADMIN -> true;
            case CANDIDATE -> me.getId().equals(candidateId);
            case RECRUITER -> applications.existsByCandidateIdAndJobRecruiterId(candidateId, me.getId());
        };
        if (!allowed) throw ApiException.forbidden("You cannot view this resume");
        if (candidate.getResumeFileName() == null) throw ApiException.notFound("Resume");
        return new ResumeFile(files.loadResume(candidate.getResumeFileName()), candidate.getResumeOriginalName());
    }

    public record ResumeFile(Resource resource, String originalName) {}

    // ---------- Admin ----------

    @Transactional(readOnly = true)
    public List<UserDto> list(Role role) {
        List<User> list = role == null ? users.findAllByOrderByCreatedAtDesc() : users.findByRoleOrderByCreatedAtDesc(role);
        return list.stream().map(UserDto::from).toList();
    }

    @Transactional
    public UserDto create(User admin, CreateUserRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("An account with this email already exists");
        if (req.role() == Role.RECRUITER && blankToNull(req.company()) == null) {
            throw ApiException.badRequest("Company is required for recruiters");
        }
        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(req.password()));
        u.setRole(req.role());
        u.setCompany(blankToNull(req.company()));
        u.setPhone(blankToNull(req.phone()));
        users.save(u);
        activity.log(admin.getEmail(), "Created " + req.role() + " account " + email);
        return UserDto.from(u);
    }

    @Transactional
    public UserDto setActive(User admin, Long id, boolean active) {
        if (admin.getId().equals(id)) throw ApiException.badRequest("You cannot change your own status");
        User u = load(id);
        u.setActive(active);
        activity.log(admin.getEmail(), (active ? "Activated " : "Deactivated ") + u.getEmail());
        return UserDto.from(u);
    }

    @Transactional
    public void delete(User admin, Long id) {
        if (admin.getId().equals(id)) throw ApiException.badRequest("You cannot delete your own account");
        User u = load(id);
        // Removing jobs / applications cascades to their applications and interviews.
        applications.deleteAll(applications.findByCandidateIdOrderByAppliedAtDesc(id));
        jobs.deleteAll(jobs.findByRecruiterIdOrderByCreatedAtDesc(id));
        notifications.deleteByRecipientId(id);
        files.deleteResume(u.getResumeFileName());
        users.delete(u);
        activity.log(admin.getEmail(), "Deleted " + u.getRole() + " account " + u.getEmail());
    }
}
