package com.ats.repository;

import com.ats.model.ApplicationStatus;
import com.ats.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    boolean existsByJobIdAndCandidateId(Long jobId, Long candidateId);
    boolean existsByCandidateIdAndJobRecruiterId(Long candidateId, Long recruiterId);
    long countByJobId(Long jobId);
    long countByStatus(ApplicationStatus status);

    List<JobApplication> findAllByOrderByAppliedAtDesc();
    List<JobApplication> findByCandidateIdOrderByAppliedAtDesc(Long candidateId);
    List<JobApplication> findByJobIdOrderByAppliedAtDesc(Long jobId);
    List<JobApplication> findByJobRecruiterIdOrderByAppliedAtDesc(Long recruiterId);

    @Query("select a.status, count(a) from JobApplication a group by a.status")
    List<Object[]> countAllByStatus();

    @Query("select a.status, count(a) from JobApplication a where a.job.recruiter.id = :rid group by a.status")
    List<Object[]> countByStatusForRecruiter(@Param("rid") Long recruiterId);

    @Query("select a.status, count(a) from JobApplication a where a.candidate.id = :cid group by a.status")
    List<Object[]> countByStatusForCandidate(@Param("cid") Long candidateId);

    @Query("select a.job.title, count(a) from JobApplication a group by a.job.id, a.job.title order by count(a) desc")
    List<Object[]> countPerJob();

    @Query("select a.job.title, count(a) from JobApplication a where a.job.recruiter.id = :rid group by a.job.id, a.job.title order by count(a) desc")
    List<Object[]> countPerJobForRecruiter(@Param("rid") Long recruiterId);

    @Query("select a.appliedAt from JobApplication a where a.appliedAt >= :since")
    List<Instant> appliedSince(@Param("since") Instant since);

    @Query("select a.appliedAt from JobApplication a where a.appliedAt >= :since and a.job.recruiter.id = :rid")
    List<Instant> appliedSinceForRecruiter(@Param("since") Instant since, @Param("rid") Long recruiterId);
}
