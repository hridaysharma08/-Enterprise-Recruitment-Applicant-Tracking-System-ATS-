package com.ats.service;

import com.ats.model.ApplicationStatus;
import com.ats.model.InterviewStatus;
import com.ats.model.JobStatus;
import com.ats.model.Role;
import com.ats.model.User;
import com.ats.repository.InterviewRepository;
import com.ats.repository.JobApplicationRepository;
import com.ats.repository.JobRepository;
import com.ats.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Role-aware recruitment statistics for the dashboard. */
@Service
public class DashboardService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy");

    private final UserRepository users;
    private final JobRepository jobs;
    private final JobApplicationRepository applications;
    private final InterviewRepository interviews;
    private final ApplicationService applicationService;

    public DashboardService(UserRepository users, JobRepository jobs, JobApplicationRepository applications,
                            InterviewRepository interviews, ApplicationService applicationService) {
        this.users = users;
        this.jobs = jobs;
        this.applications = applications;
        this.interviews = interviews;
        this.applicationService = applicationService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> stats(User me) {
        Map<String, Object> out = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        Instant since = YearMonth.now().minusMonths(5).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        switch (me.getRole()) {
            case ADMIN -> {
                out.put("totalUsers", users.count());
                out.put("recruiters", users.countByRole(Role.RECRUITER));
                out.put("candidates", users.countByRole(Role.CANDIDATE));
                out.put("totalJobs", jobs.count());
                out.put("openJobs", jobs.countByStatus(JobStatus.OPEN));
                out.put("totalApplications", applications.count());
                out.put("upcomingInterviews", interviews.countByStatusAndScheduledAtAfter(InterviewStatus.SCHEDULED, now));
                out.put("byStatus", statusMap(applications.countAllByStatus()));
                out.put("perJob", topJobs(applications.countPerJob()));
                out.put("monthly", monthly(applications.appliedSince(since)));
            }
            case RECRUITER -> {
                Long id = me.getId();
                Map<String, Long> byStatus = statusMap(applications.countByStatusForRecruiter(id));
                out.put("totalJobs", jobs.countByRecruiterId(id));
                out.put("openJobs", jobs.countByRecruiterIdAndStatus(id, JobStatus.OPEN));
                out.put("totalApplications", byStatus.values().stream().mapToLong(Long::longValue).sum());
                out.put("upcomingInterviews", interviews
                        .countByApplicationJobRecruiterIdAndStatusAndScheduledAtAfter(id, InterviewStatus.SCHEDULED, now));
                out.put("byStatus", byStatus);
                out.put("perJob", topJobs(applications.countPerJobForRecruiter(id)));
                out.put("monthly", monthly(applications.appliedSinceForRecruiter(since, id)));
                out.put("recent", applicationService.forRecruiter(me, null).stream().limit(5).toList());
            }
            case CANDIDATE -> {
                Map<String, Long> byStatus = statusMap(applications.countByStatusForCandidate(me.getId()));
                out.put("totalApplications", byStatus.values().stream().mapToLong(Long::longValue).sum());
                out.put("upcomingInterviews", interviews
                        .countByApplicationCandidateIdAndStatusAndScheduledAtAfter(me.getId(), InterviewStatus.SCHEDULED, now));
                out.put("openJobs", jobs.countByStatus(JobStatus.OPEN));
                out.put("byStatus", byStatus);
                out.put("recent", applicationService.mine(me).stream().limit(5).toList());
            }
        }
        return out;
    }

    /** Always returns all four statuses (zero-filled) in pipeline order. */
    private static Map<String, Long> statusMap(List<Object[]> rows) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (ApplicationStatus s : ApplicationStatus.values()) m.put(s.name(), 0L);
        for (Object[] r : rows) m.put(((ApplicationStatus) r[0]).name(), (Long) r[1]);
        return m;
    }

    private static List<Map<String, Object>> topJobs(List<Object[]> rows) {
        return rows.stream().limit(8)
                .map(r -> Map.<String, Object>of("job", r[0], "applications", r[1]))
                .toList();
    }

    /** Applications per month for the last 6 months (UTC). */
    private static List<Map<String, Object>> monthly(List<Instant> dates) {
        Map<YearMonth, Long> counts = new TreeMap<>();
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        for (int i = 5; i >= 0; i--) counts.put(current.minusMonths(i), 0L);
        for (Instant d : dates) counts.computeIfPresent(YearMonth.from(d.atZone(ZoneOffset.UTC)), (k, v) -> v + 1);
        List<Map<String, Object>> out = new ArrayList<>();
        counts.forEach((ym, c) -> out.add(Map.of("month", MONTH.format(ym), "applications", c)));
        return out;
    }
}
