package com.ats.controller;

import com.ats.model.User;
import com.ats.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/api/dashboard")
    public Map<String, Object> stats(@AuthenticationPrincipal User me) {
        return service.stats(me);
    }
}
