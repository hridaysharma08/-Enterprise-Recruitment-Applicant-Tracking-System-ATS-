package com.ats.config;

import com.ats.model.*;
import com.ats.repository.InterviewRepository;
import com.ats.repository.JobApplicationRepository;
import com.ats.repository.JobRepository;
import com.ats.repository.UserRepository;
import com.ats.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Creates demo accounts and sample data the first time the app starts against an empty database.
 * Disable with SEED_DEMO_DATA=false.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final JobRepository jobs;
    private final JobApplicationRepository applications;
    private final InterviewRepository interviews;
    private final PasswordEncoder encoder;
    private final FileStorageService storage;
    private final boolean enabled;

    public DataSeeder(UserRepository users, JobRepository jobs, JobApplicationRepository applications,
                      InterviewRepository interviews, PasswordEncoder encoder, FileStorageService storage,
                      @Value("${app.seed-demo-data}") boolean enabled) {
        this.users = users;
        this.jobs = jobs;
        this.applications = applications;
        this.interviews = interviews;
        this.encoder = encoder;
        this.storage = storage;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!enabled || users.count() > 0) return;
        log.info("Empty database detected - seeding demo data");

        user("System Admin", "admin@ats.com", "admin123", Role.ADMIN, null);
        User r1 = user("Priya Mehta", "recruiter@ats.com", "recruiter123", Role.RECRUITER, "TechNova Solutions");
        User r2 = user("Arjun Rao", "hr@cloudpeak.com", "recruiter123", Role.RECRUITER, "CloudPeak Systems");

        User c1 = candidate("Rahul Verma", "candidate@ats.com", "Full Stack Developer",
                "Java, Spring Boot, React, MySQL, REST APIs", 2, "Bengaluru");
        User c2 = candidate("Sneha Iyer", "sneha@example.com", "Frontend Engineer",
                "React, JavaScript, Tailwind CSS, TypeScript", 3, "Pune");
        User c3 = candidate("Karan Singh", "karan@example.com", "Data Analyst",
                "Python, SQL, Power BI, Excel", 1, "Delhi");

        Job j1 = job(r1, "Java Backend Developer", "Bengaluru", "FULL_TIME", "8 - 14 LPA",
                "Java, Spring Boot, MySQL, Microservices", 2,
                "Design and build scalable REST APIs with Spring Boot.\n\nResponsibilities:\n- Develop microservices\n- Write unit and integration tests\n- Collaborate with frontend and QA teams");
        Job j2 = job(r1, "React Frontend Developer", "Remote", "REMOTE", "6 - 12 LPA",
                "React, JavaScript, Tailwind CSS, REST", 1,
                "Build responsive, accessible user interfaces in React for our SaaS products.");
        Job j3 = job(r1, "Software Engineering Intern", "Bengaluru", "INTERNSHIP", "25,000 / month",
                "Java or Python, DSA, Git", 0,
                "Six-month internship working alongside senior engineers on production features.");
        Job j4 = job(r2, "DevOps Engineer", "Hyderabad", "FULL_TIME", "12 - 20 LPA",
                "AWS, Docker, Kubernetes, CI/CD, Linux", 3,
                "Own our cloud infrastructure, CI/CD pipelines and observability stack.");
        Job j5 = job(r2, "Data Analyst", "Pune", "CONTRACT", "5 - 9 LPA",
                "SQL, Python, Power BI", 1,
                "Turn business data into dashboards and insights for leadership.");

        Instant now = Instant.now();
        JobApplication a1 = app(j1, c1, ApplicationStatus.SHORTLISTED, now.minus(40, ChronoUnit.DAYS));
        app(j2, c1, ApplicationStatus.APPLIED, now.minus(5, ChronoUnit.DAYS));
        app(j2, c2, ApplicationStatus.SELECTED, now.minus(75, ChronoUnit.DAYS));
        JobApplication a4 = app(j3, c3, ApplicationStatus.SHORTLISTED, now.minus(20, ChronoUnit.DAYS));
        app(j4, c1, ApplicationStatus.REJECTED, now.minus(110, ChronoUnit.DAYS));
        app(j5, c3, ApplicationStatus.APPLIED, now.minus(2, ChronoUnit.DAYS));
        app(j1, c2, ApplicationStatus.APPLIED, now.minus(140, ChronoUnit.DAYS));

        interview(a1, LocalDateTime.now().plusDays(2).withHour(11).withMinute(0).withSecond(0).withNano(0),
                InterviewMode.ONLINE, "https://meet.google.com/abc-defg-hij", "Priya Mehta");
        interview(a4, LocalDateTime.now().plusDays(4).withHour(15).withMinute(30).withSecond(0).withNano(0),
                InterviewMode.IN_PERSON, "TechNova Solutions, MG Road, Bengaluru", "Vikram (Engineering Manager)");

        log.info("Demo data ready. Logins: admin@ats.com/admin123, recruiter@ats.com/recruiter123, candidate@ats.com/candidate123");
    }

    private User user(String name, String email, String password, Role role, String company) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword(encoder.encode(password));
        u.setRole(role);
        u.setCompany(company);
        return users.save(u);
    }

    private User candidate(String name, String email, String headline, String skills, int exp, String location) {
        User u = user(name, email, "candidate123", Role.CANDIDATE, null);
        u.setHeadline(headline);
        u.setSkills(skills);
        u.setExperienceYears(exp);
        u.setLocation(location);
        u.setResumeFileName(storage.store(samplePdf(name, headline, skills), "pdf"));
        u.setResumeOriginalName(name.replace(' ', '_') + "_Resume.pdf");
        return u;
    }

    private Job job(User recruiter, String title, String location, String type, String salary, String skills,
                    int minExp, String description) {
        Job j = new Job();
        j.setRecruiter(recruiter);
        j.setTitle(title);
        j.setLocation(location);
        j.setEmploymentType(type);
        j.setSalaryRange(salary);
        j.setSkills(skills);
        j.setMinExperience(minExp);
        j.setDescription(description);
        j.setDeadline(LocalDate.now().plusDays(30));
        return jobs.save(j);
    }

    private JobApplication app(Job job, User candidate, ApplicationStatus status, Instant appliedAt) {
        JobApplication a = new JobApplication();
        a.setJob(job);
        a.setCandidate(candidate);
        a.setStatus(status);
        a.setAppliedAt(appliedAt);
        a.setUpdatedAt(appliedAt);
        a.setCoverLetter("I am excited to apply for the " + job.getTitle() + " role and believe my skills are a strong match.");
        return applications.save(a);
    }

    private void interview(JobApplication a, LocalDateTime at, InterviewMode mode, String where, String interviewer) {
        Interview i = new Interview();
        i.setApplication(a);
        i.setScheduledAt(at);
        i.setMode(mode);
        i.setLocationOrLink(where);
        i.setInterviewer(interviewer);
        i.setNotes("Technical round. Please keep your resume and ID handy.");
        interviews.save(i);
    }

    /** Builds a tiny valid one-page PDF so demo resumes can be opened from the UI. */
    static byte[] samplePdf(String name, String headline, String skills) {
        String text = "BT /F1 20 Tf 72 740 Td (" + esc(name) + ") Tj /F1 13 Tf 0 -28 Td (" + esc(headline)
                + ") Tj 0 -22 Td (Skills: " + esc(skills) + ") Tj 0 -22 Td (Demo resume generated by the ATS seeder) Tj ET";
        List<String> objs = List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
                "<< /Length " + text.length() + " >>\nstream\n" + text + "\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        StringBuilder sb = new StringBuilder("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objs.size(); i++) {
            offsets.add(sb.length());
            sb.append(i + 1).append(" 0 obj\n").append(objs.get(i)).append("\nendobj\n");
        }
        int xref = sb.length();
        sb.append("xref\n0 ").append(objs.size() + 1).append("\n0000000000 65535 f \n");
        for (int off : offsets) sb.append(String.format("%010d 00000 n \n", off));
        sb.append("trailer\n<< /Size ").append(objs.size() + 1).append(" /Root 1 0 R >>\nstartxref\n")
                .append(xref).append("\n%%EOF\n");
        return sb.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private static String esc(String s) {
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
