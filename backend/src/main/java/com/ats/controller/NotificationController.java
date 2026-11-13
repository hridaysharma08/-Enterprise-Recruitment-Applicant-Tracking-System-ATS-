package com.ats.controller;

import com.ats.model.User;
import com.ats.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal User me) {
        return service.forUser(me);
    }

    @PatchMapping("/{id}/read")
    public void markRead(@AuthenticationPrincipal User me, @PathVariable Long id) {
        service.markRead(me, id);
    }

    @PatchMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal User me) {
        service.markAllRead(me);
    }
}
