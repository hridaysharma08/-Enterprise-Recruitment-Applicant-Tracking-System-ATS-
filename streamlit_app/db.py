"""Database layer for the Streamlit edition of HireTrack ATS.

Uses SQLAlchemy, so the same code runs on SQLite (default, zero setup) or MySQL
(set DATABASE_URL, e.g. mysql+pymysql://user:pass@host:3306/ats_db).
"""
from __future__ import annotations

import datetime as dt
import os
from typing import Optional

import bcrypt
from sqlalchemy import (Boolean, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text,
                        UniqueConstraint, create_engine, select)
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

ROLES = ["ADMIN", "RECRUITER", "CANDIDATE"]
STATUSES = ["APPLIED", "SHORTLISTED", "REJECTED", "SELECTED"]
JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"]
INTERVIEW_MODES = ["ONLINE", "IN_PERSON", "PHONE"]
INTERVIEW_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"]


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()


def check_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    company: Mapped[Optional[str]] = mapped_column(String(150))       # recruiters
    headline: Mapped[Optional[str]] = mapped_column(String(200))      # candidates
    skills: Mapped[Optional[str]] = mapped_column(String(1000))
    experience_years: Mapped[Optional[int]] = mapped_column(Integer)
    location: Mapped[Optional[str]] = mapped_column(String(150))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    jobs: Mapped[list["Job"]] = relationship(back_populates="recruiter", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(cascade="all, delete-orphan")
    resume: Mapped[Optional["Resume"]] = relationship(cascade="all, delete-orphan")


class Resume(Base):
    """Resume bytes live in the database so they survive app restarts on cloud hosts."""
    __tablename__ = "resumes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    mime: Mapped[str] = mapped_column(String(100))
    data: Mapped[bytes] = mapped_column(LargeBinary().with_variant(LONGBLOB, "mysql"))
    uploaded_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(String(150))
    employment_type: Mapped[Optional[str]] = mapped_column(String(30))
    salary_range: Mapped[Optional[str]] = mapped_column(String(100))
    skills: Mapped[Optional[str]] = mapped_column(String(1000))
    min_experience: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    deadline: Mapped[Optional[dt.date]] = mapped_column(Date)
    recruiter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    recruiter: Mapped[User] = relationship(back_populates="jobs")
    applications: Mapped[list["Application"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uk_application_job_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="APPLIED")
    cover_letter: Mapped[Optional[str]] = mapped_column(Text)
    recruiter_notes: Mapped[Optional[str]] = mapped_column(Text)
    applied_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    job: Mapped[Job] = relationship(back_populates="applications")
    candidate: Mapped[User] = relationship(back_populates="applications")
    interviews: Mapped[list["Interview"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), index=True)
    scheduled_at: Mapped[dt.datetime] = mapped_column(DateTime)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    mode: Mapped[str] = mapped_column(String(20), default="ONLINE")
    location_or_link: Mapped[Optional[str]] = mapped_column(String(500))
    interviewer: Mapped[Optional[str]] = mapped_column(String(150))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED")
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship(back_populates="interviews")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(String(500))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)


class Activity(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(150))
    action: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def make_engine(url: Optional[str] = None):
    url = url or os.environ.get("DATABASE_URL") or "sqlite:///hiretrack.db"
    kwargs: dict = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update(pool_size=3, max_overflow=2, pool_recycle=280)
        # Hosted MySQL (Aiven, Railway, TiDB...) requires TLS
        if url.startswith("mysql") and not any(h in url for h in ("localhost", "127.0.0.1")):
            kwargs["connect_args"] = {"ssl": {"check_hostname": False}}
    return create_engine(url, **kwargs)


def init(url: Optional[str] = None, seed_demo: bool = True) -> sessionmaker:
    """Create tables (if missing), seed demo data into an empty DB, return a session factory."""
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    if seed_demo:
        with factory() as s:
            if s.scalar(select(User.id).limit(1)) is None:
                seed(s)
                s.commit()
    return factory


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

def sample_pdf(name: str, headline: str, skills: str) -> bytes:
    """Builds a tiny valid one-page PDF used as a demo resume."""
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    text = (f"BT /F1 20 Tf 72 740 Td ({esc(name)}) Tj /F1 13 Tf 0 -28 Td ({esc(headline)}) Tj "
            f"0 -22 Td (Skills: {esc(skills)}) Tj 0 -22 Td (Demo resume generated by HireTrack) Tj ET")
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(text)} >>\nstream\n{text}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{off:010d} 00000 n \n" for off in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")


def seed(s) -> None:
    def user(name, email, pw, role, **kw):
        u = User(name=name, email=email, password_hash=hash_password(pw), role=role, **kw)
        s.add(u)
        return u

    user("System Admin", "admin@ats.com", "admin123", "ADMIN")
    r1 = user("Priya Mehta", "recruiter@ats.com", "recruiter123", "RECRUITER", company="TechNova Solutions")
    r2 = user("Arjun Rao", "hr@cloudpeak.com", "recruiter123", "RECRUITER", company="CloudPeak Systems")

    def candidate(name, email, headline, skills, exp, location):
        c = user(name, email, "candidate123", "CANDIDATE", headline=headline, skills=skills,
                 experience_years=exp, location=location)
        c.resume = Resume(filename=name.replace(" ", "_") + "_Resume.pdf", mime="application/pdf",
                          data=sample_pdf(name, headline, skills))
        return c

    c1 = candidate("Rahul Verma", "candidate@ats.com", "Full Stack Developer",
                   "Java, Spring Boot, React, MySQL, REST APIs", 2, "Bengaluru")
    c2 = candidate("Sneha Iyer", "sneha@example.com", "Frontend Engineer",
                   "React, JavaScript, Tailwind CSS, TypeScript", 3, "Pune")
    c3 = candidate("Karan Singh", "karan@example.com", "Data Analyst", "Python, SQL, Power BI, Excel", 1, "Delhi")

    deadline = dt.date.today() + dt.timedelta(days=30)

    def job(rec, title, location, typ, salary, skills, exp, desc):
        j = Job(recruiter=rec, title=title, location=location, employment_type=typ, salary_range=salary,
                skills=skills, min_experience=exp, description=desc, deadline=deadline)
        s.add(j)
        return j

    j1 = job(r1, "Java Backend Developer", "Bengaluru", "FULL_TIME", "8 - 14 LPA",
             "Java, Spring Boot, MySQL, Microservices", 2,
             "Design and build scalable REST APIs with Spring Boot.\n\n**Responsibilities**\n"
             "- Develop microservices\n- Write unit and integration tests\n- Collaborate with frontend and QA teams")
    j2 = job(r1, "React Frontend Developer", "Remote", "REMOTE", "6 - 12 LPA",
             "React, JavaScript, Tailwind CSS, REST", 1,
             "Build responsive, accessible user interfaces in React for our SaaS products.")
    j3 = job(r1, "Software Engineering Intern", "Bengaluru", "INTERNSHIP", "25,000 / month",
             "Java or Python, DSA, Git", 0,
             "Six-month internship working alongside senior engineers on production features.")
    j4 = job(r2, "DevOps Engineer", "Hyderabad", "FULL_TIME", "12 - 20 LPA",
             "AWS, Docker, Kubernetes, CI/CD, Linux", 3,
             "Own our cloud infrastructure, CI/CD pipelines and observability stack.")
    j5 = job(r2, "Data Analyst", "Pune", "CONTRACT", "5 - 9 LPA", "SQL, Python, Power BI", 1,
             "Turn business data into dashboards and insights for leadership.")

    now = utcnow()

    def app(j, c, status, days_ago):
        when = now - dt.timedelta(days=days_ago)
        a = Application(job=j, candidate=c, status=status, applied_at=when, updated_at=when,
                        cover_letter=f"I am excited to apply for the {j.title} role and believe my skills are a strong match.")
        s.add(a)
        return a

    a1 = app(j1, c1, "SHORTLISTED", 40)
    app(j2, c1, "APPLIED", 5)
    app(j2, c2, "SELECTED", 75)
    a4 = app(j3, c3, "SHORTLISTED", 20)
    app(j4, c1, "REJECTED", 110)
    app(j5, c3, "APPLIED", 2)
    app(j1, c2, "APPLIED", 140)

    today = dt.datetime.now().replace(second=0, microsecond=0)
    s.add(Interview(application=a1, scheduled_at=(today + dt.timedelta(days=2)).replace(hour=11, minute=0),
                    mode="ONLINE", location_or_link="https://meet.google.com/abc-defg-hij",
                    interviewer="Priya Mehta", notes="Technical round. Please keep your resume and ID handy."))
    s.add(Interview(application=a4, scheduled_at=(today + dt.timedelta(days=4)).replace(hour=15, minute=30),
                    mode="IN_PERSON", location_or_link="TechNova Solutions, MG Road, Bengaluru",
                    interviewer="Vikram (Engineering Manager)", notes="Bring a printed copy of your resume."))
    s.add(Activity(actor="system", action="Seeded demo data"))
