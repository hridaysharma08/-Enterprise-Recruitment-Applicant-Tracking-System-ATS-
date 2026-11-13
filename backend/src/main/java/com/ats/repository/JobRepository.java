package com.ats.repository;

import com.ats.model.Job;
import com.ats.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findAllByOrderByCreatedAtDesc();
    List<Job> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);
    long countByStatus(JobStatus status);
    long countByRecruiterId(Long recruiterId);
    long countByRecruiterIdAndStatus(Long recruiterId, JobStatus status);

    @Query("""
            select j from Job j join j.recruiter r
            where j.status = com.ats.model.JobStatus.OPEN
              and (:q is null
                   or lower(j.title) like lower(concat('%', :q, '%'))
                   or lower(j.skills) like lower(concat('%', :q, '%'))
                   or lower(r.company) like lower(concat('%', :q, '%')))
              and (:location is null or lower(j.location) like lower(concat('%', :location, '%')))
              and (:type is null or j.employmentType = :type)
            order by j.createdAt desc
            """)
    List<Job> searchOpen(@Param("q") String q, @Param("location") String location, @Param("type") String type);
}
