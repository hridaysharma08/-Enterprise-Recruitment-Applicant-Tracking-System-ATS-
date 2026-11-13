package com.ats.repository;

import com.ats.model.ResumeFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeFileRepository extends JpaRepository<ResumeFile, String> {
}
