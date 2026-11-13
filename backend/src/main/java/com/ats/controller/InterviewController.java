package com.ats.controller;

import com.ats.dto.InterviewDtos.*;
import com.ats.model.User;
import com.ats.service.InterviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService service;

    public InterviewController(InterviewService service) {
        this.service = service;
    }

    /** Role-aware: candidate sees theirs, recruiter sees their jobs', admin sees all. */
    @GetMapping
    public List<InterviewDto> list(@AuthenticationPrincipal User me) {
        return service.mine(me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public InterviewDto schedule(@AuthenticationPrincipal User me, @Valid @RequestBody InterviewRequest req) {
        return service.schedule(me, req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public InterviewDto update(@AuthenticationPrincipal User me, @PathVariable Long id,
                               @Valid @RequestBody InterviewUpdateRequest req) {
        return service.update(me, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('RECRUITER','ADMIN')")
    public void delete(@AuthenticationPrincipal User me, @PathVariable Long id) {
        service.delete(me, id);
    }
}
