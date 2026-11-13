package com.ats.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String actorEmail;

    @Column(nullable = false, length = 500)
    private String action;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ActivityLog() {}

    public ActivityLog(String actorEmail, String action) {
        this.actorEmail = actorEmail;
        this.action = action;
    }

    public Long getId() { return id; }
    public String getActorEmail() { return actorEmail; }
    public String getAction() { return action; }
    public Instant getCreatedAt() { return createdAt; }
}
