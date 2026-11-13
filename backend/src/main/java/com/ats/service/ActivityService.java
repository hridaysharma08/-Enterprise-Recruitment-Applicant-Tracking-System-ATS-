package com.ats.service;

import com.ats.model.ActivityLog;
import com.ats.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/** Audit trail of important system actions, visible to admins. */
@Service
public class ActivityService {

    private final ActivityLogRepository repo;

    public ActivityService(ActivityLogRepository repo) {
        this.repo = repo;
    }

    public void log(String actorEmail, String action) {
        repo.save(new ActivityLog(actorEmail, action));
    }

    public List<ActivityLog> recent() {
        return repo.findTop200ByOrderByCreatedAtDesc();
    }
}
