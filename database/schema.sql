-- =====================================================================
-- HireTrack ATS - MySQL schema (reference)
--
-- You do NOT need to run this manually: Spring Boot / Hibernate creates
-- and updates these tables automatically (spring.jpa.hibernate.ddl-auto=update).
-- It is provided for documentation, ER diagrams and project reports.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS ats_db;
USE ats_db;

CREATE TABLE users (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                  VARCHAR(100)  NOT NULL,
    email                 VARCHAR(150)  NOT NULL UNIQUE,
    password              VARCHAR(255)  NOT NULL,              -- BCrypt hash
    role                  VARCHAR(20)   NOT NULL,              -- ADMIN | RECRUITER | CANDIDATE
    active                BIT           NOT NULL DEFAULT 1,
    phone                 VARCHAR(30),
    company               VARCHAR(150),                        -- recruiters
    headline              VARCHAR(200),                        -- candidates
    skills                VARCHAR(1000),
    experience_years      INT,
    location              VARCHAR(150),
    resume_file_name      VARCHAR(255),                        -- key into resume_files
    resume_original_name  VARCHAR(255),
    created_at            DATETIME(6)   NOT NULL
);

CREATE TABLE jobs (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(150)  NOT NULL,
    description      TEXT          NOT NULL,
    location         VARCHAR(150),
    employment_type  VARCHAR(30),                              -- FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP | REMOTE
    salary_range     VARCHAR(100),
    skills           VARCHAR(1000),
    min_experience   INT,
    status           VARCHAR(20)   NOT NULL,                   -- OPEN | CLOSED
    deadline         DATE,
    recruiter_id     BIGINT        NOT NULL,
    created_at       DATETIME(6)   NOT NULL,
    CONSTRAINT fk_job_recruiter FOREIGN KEY (recruiter_id) REFERENCES users (id)
);

CREATE TABLE applications (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id           BIGINT        NOT NULL,
    candidate_id     BIGINT        NOT NULL,
    status           VARCHAR(20)   NOT NULL,                   -- APPLIED | SHORTLISTED | REJECTED | SELECTED
    cover_letter     TEXT,
    recruiter_notes  TEXT,
    applied_at       DATETIME(6)   NOT NULL,
    updated_at       DATETIME(6)   NOT NULL,
    CONSTRAINT uk_application_job_candidate UNIQUE (job_id, candidate_id),
    CONSTRAINT fk_app_job       FOREIGN KEY (job_id)       REFERENCES jobs (id),
    CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_id) REFERENCES users (id)
);

CREATE TABLE interviews (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id    BIGINT        NOT NULL,
    scheduled_at      DATETIME(6)   NOT NULL,
    duration_minutes  INT           NOT NULL,
    mode              VARCHAR(20)   NOT NULL,                  -- ONLINE | IN_PERSON | PHONE
    location_or_link  VARCHAR(500),
    interviewer       VARCHAR(150),
    notes             TEXT,
    status            VARCHAR(20)   NOT NULL,                  -- SCHEDULED | COMPLETED | CANCELLED
    feedback          TEXT,
    created_at        DATETIME(6)   NOT NULL,
    CONSTRAINT fk_interview_application FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE notifications (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id  BIGINT        NOT NULL,
    message       VARCHAR(500)  NOT NULL,
    link          VARCHAR(200),
    is_read       BIT           NOT NULL DEFAULT 0,
    created_at    DATETIME(6)   NOT NULL,
    CONSTRAINT fk_notification_user FOREIGN KEY (recipient_id) REFERENCES users (id)
);

CREATE TABLE resume_files (
    id            VARCHAR(36)   PRIMARY KEY,                -- UUID
    content_type  VARCHAR(100),
    size          BIGINT        NOT NULL,
    data          LONGBLOB      NOT NULL,
    created_at    DATETIME(6)   NOT NULL
);

CREATE TABLE activity_logs (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_email  VARCHAR(150)  NOT NULL,
    action       VARCHAR(500)  NOT NULL,
    created_at   DATETIME(6)   NOT NULL
);

-- Useful reporting queries ------------------------------------------------

-- Applications per status
-- SELECT status, COUNT(*) FROM applications GROUP BY status;

-- Applicants per job
-- SELECT j.title, COUNT(a.id) AS applicants
-- FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
-- GROUP BY j.id, j.title ORDER BY applicants DESC;
