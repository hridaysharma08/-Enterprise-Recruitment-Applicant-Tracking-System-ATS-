package com.ats.controller;

import com.ats.dto.JobDtos.JobDto;
import com.ats.dto.UserDtos.CreateUserRequest;
import com.ats.dto.UserDtos.UserDto;
import com.ats.model.ActivityLog;
import com.ats.model.Role;
import com.ats.model.User;
import com.ats.service.ActivityService;
import com.ats.service.JobService;
import com.ats.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** All routes under /api/admin require ROLE_ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final JobService jobService;
    private final ActivityService activityService;

    public AdminController(UserService userService, JobService jobService, ActivityService activityService) {
        this.userService = userService;
        this.jobService = jobService;
        this.activityService = activityService;
    }

    @GetMapping("/users")
    public List<UserDto> users(@RequestParam(required = false) Role role) {
        return userService.list(role);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@AuthenticationPrincipal User me, @Valid @RequestBody CreateUserRequest req) {
        return userService.create(me, req);
    }

    @PatchMapping("/users/{id}/active")
    public UserDto setActive(@AuthenticationPrincipal User me, @PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return userService.setActive(me, id, Boolean.TRUE.equals(body.get("active")));
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User me, @PathVariable Long id) {
        userService.delete(me, id);
    }

    @GetMapping("/jobs")
    public List<JobDto> jobs() {
        return jobService.all();
    }

    @GetMapping("/activity")
    public List<ActivityLog> activity() {
        return activityService.recent();
    }
}
