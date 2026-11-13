package com.ats.controller;

import com.ats.dto.ApplicationDtos.*;
import com.ats.model.User;
import com.ats.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService service;

    public ApplicationController(ApplicationService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CANDIDATE')")
    public ApplicationDto apply(@AuthenticationPrincipal User me, @Valid @RequestBody ApplyRequest req) {
        return service.apply(me, req);
    }

    /** Candidate: their own applications. */
    @GetMapping("/mine")
    @PreAuthorize("hasRole('CANDIDATE')")
    public List<ApplicationDto> mine(@AuthenticationPrincipal User me) {
        return service.mine(me);
    }

    /** Recruiter: applicants for their jobs (optionally one job). Admin: all applications. */
    @GetMapping
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public List<ApplicationDto> list(@AuthenticationPrincipal User me, @RequestParam(required = false) Long jobId) {
        return service.forRecruiter(me, jobId);
    }

    @GetMapping("/{id}")
    public ApplicationDto get(@AuthenticationPrincipal User me, @PathVariable Long id) {
        return service.get(me, id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public ApplicationDto updateStatus(@AuthenticationPrincipal User me, @PathVariable Long id,
                                       @Valid @RequestBody StatusUpdateRequest req) {
        return service.updateStatus(me, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('CANDIDATE')")
    public void withdraw(@AuthenticationPrincipal User me, @PathVariable Long id) {
        service.withdraw(me, id);
    }
}
