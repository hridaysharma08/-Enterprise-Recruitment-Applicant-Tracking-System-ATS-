package com.ats.service;

import com.ats.dto.JobDtos.JobDto;
import com.ats.dto.JobDtos.JobRequest;
import com.ats.exception.ApiException;
import com.ats.model.Job;
import com.ats.model.JobStatus;
import com.ats.model.Role;
import com.ats.model.User;
import com.ats.repository.JobRepository;
import com.ats.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.ats.service.AuthService.blankToNull;

@Service
public class JobService {

    private final JobRepository jobs;
    private final UserRepository users;
    private final ActivityService activity;

    public JobService(JobRepository jobs, UserRepository users, ActivityService activity) {
        this.jobs = jobs;
        this.users = users;
        this.activity = activity;
    }

    Job load(Long id) {
        return jobs.findById(id).orElseThrow(() -> ApiException.notFound("Job"));
    }

    private Job loadOwned(User me, Long id) {
        Job job = load(id);
        if (me.getRole() != Role.ADMIN && !job.getRecruiter().getId().equals(me.getId())) {
            throw ApiException.forbidden("You can only manage your own job postings");
        }
        return job;
    }

    @Transactional(readOnly = true)
    public List<JobDto> searchOpen(String q, String location, String type) {
        return jobs.searchOpen(blankToNull(q), blankToNull(location), blankToNull(type))
                .stream().map(JobDto::from).toList();
    }

    @Transactional(readOnly = true)
    public JobDto get(Long id) {
        return JobDto.from(load(id));
    }

    @Transactional(readOnly = true)
    public List<JobDto> mine(User me) {
        return jobs.findByRecruiterIdOrderByCreatedAtDesc(me.getId()).stream().map(JobDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<JobDto> all() {
        return jobs.findAllByOrderByCreatedAtDesc().stream().map(JobDto::from).toList();
    }

    @Transactional
    public JobDto create(User me, JobRequest req) {
        Job job = new Job();
        job.setRecruiter(users.getReferenceById(me.getId()));
        apply(job, req);
        jobs.save(job);
        activity.log(me.getEmail(), "Posted job \"" + job.getTitle() + "\"");
        return JobDto.from(jobs.findById(job.getId()).orElseThrow());
    }

    @Transactional
    public JobDto update(User me, Long id, JobRequest req) {
        Job job = loadOwned(me, id);
        apply(job, req);
        activity.log(me.getEmail(), "Updated job \"" + job.getTitle() + "\"");
        return JobDto.from(job);
    }

    @Transactional
    public JobDto setStatus(User me, Long id, JobStatus status) {
        Job job = loadOwned(me, id);
        job.setStatus(status);
        activity.log(me.getEmail(), (status == JobStatus.OPEN ? "Reopened" : "Closed") + " job \"" + job.getTitle() + "\"");
        return JobDto.from(job);
    }

    @Transactional
    public void delete(User me, Long id) {
        Job job = loadOwned(me, id);
        jobs.delete(job);
        activity.log(me.getEmail(), "Deleted job \"" + job.getTitle() + "\"");
    }

    private void apply(Job job, JobRequest req) {
        job.setTitle(req.title().trim());
        job.setDescription(req.description().trim());
        job.setLocation(blankToNull(req.location()));
        job.setEmploymentType(blankToNull(req.employmentType()));
        job.setSalaryRange(blankToNull(req.salaryRange()));
        job.setSkills(blankToNull(req.skills()));
        job.setMinExperience(req.minExperience());
        job.setDeadline(req.deadline());
        if (req.status() != null) job.setStatus(req.status());
    }
}
