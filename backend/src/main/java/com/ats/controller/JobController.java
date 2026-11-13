package com.ats.controller;

import com.ats.dto.JobDtos.JobDto;
import com.ats.dto.JobDtos.JobRequest;
import com.ats.model.JobStatus;
import com.ats.model.User;
import com.ats.service.JobService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    /** Public job board: open jobs only, with optional search filters. */
    @GetMapping("/api/jobs")
    public List<JobDto> search(@RequestParam(required = false) String q,
                               @RequestParam(required = false) String location,
                               @RequestParam(required = false) String type) {
        return jobService.searchOpen(q, location, type);
    }

    @GetMapping("/api/jobs/{id}")
    public JobDto get(@PathVariable Long id) {
        return jobService.get(id);
    }

    @PostMapping("/api/jobs")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUITER')")
    public JobDto create(@AuthenticationPrincipal User me, @Valid @RequestBody JobRequest req) {
        return jobService.create(me, req);
    }

    @PutMapping("/api/jobs/{id}")
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public JobDto update(@AuthenticationPrincipal User me, @PathVariable Long id, @Valid @RequestBody JobRequest req) {
        return jobService.update(me, id, req);
    }

    @PatchMapping("/api/jobs/{id}/status")
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public JobDto setStatus(@AuthenticationPrincipal User me, @PathVariable Long id, @RequestBody Map<String, JobStatus> body) {
        JobStatus status = body.get("status");
        if (status == null) throw com.ats.exception.ApiException.badRequest("status is required");
        return jobService.setStatus(me, id, status);
    }

    @DeleteMapping("/api/jobs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public void delete(@AuthenticationPrincipal User me, @PathVariable Long id) {
        jobService.delete(me, id);
    }

    /** Jobs posted by the logged-in recruiter (all statuses). */
    @GetMapping("/api/recruiter/jobs")
    @PreAuthorize("hasRole('RECRUITER')")
    public List<JobDto> mine(@AuthenticationPrincipal User me) {
        return jobService.mine(me);
    }
}
