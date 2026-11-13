package com.ats.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Resume bytes stored in the database, so uploads survive restarts on hosts
 * with ephemeral disks (Render, Railway, etc.).
 */
@Entity
@Table(name = "resume_files")
public class ResumeFile {

    @Id
    @Column(length = 36)
    private String id;

    @Column(length = 100)
    private String contentType;

    @Column(nullable = false)
    private long size;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ResumeFile() {}

    public ResumeFile(String id, String contentType, byte[] data) {
        this.id = id;
        this.contentType = contentType;
        this.data = data;
        this.size = data.length;
    }

    public String getId() { return id; }
    public String getContentType() { return contentType; }
    public long getSize() { return size; }
    public byte[] getData() { return data; }
    public Instant getCreatedAt() { return createdAt; }
}
