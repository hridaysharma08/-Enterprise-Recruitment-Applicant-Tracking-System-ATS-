package com.ats.repository;

import com.ats.model.Interview;
import com.ats.model.InterviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findAllByOrderByScheduledAtAsc();
    List<Interview> findByApplicationJobRecruiterIdOrderByScheduledAtAsc(Long recruiterId);
    List<Interview> findByApplicationCandidateIdOrderByScheduledAtAsc(Long candidateId);

    long countByStatusAndScheduledAtAfter(InterviewStatus status, LocalDateTime after);
    long countByApplicationJobRecruiterIdAndStatusAndScheduledAtAfter(Long recruiterId, InterviewStatus status, LocalDateTime after);
    long countByApplicationCandidateIdAndStatusAndScheduledAtAfter(Long candidateId, InterviewStatus status, LocalDateTime after);
}
