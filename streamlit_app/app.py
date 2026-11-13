"""HireTrack ATS - Streamlit edition.

Run locally:   streamlit run streamlit_app/app.py
Deploy:        Streamlit Community Cloud, main file = streamlit_app/app.py
"""
from __future__ import annotations

import datetime as dt

import altair as alt
import pandas as pd
import streamlit as st
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager, joinedload, selectinload

import db
from db import (INTERVIEW_MODES, INTERVIEW_STATUSES, JOB_TYPES, STATUSES, Activity, Application, Interview,
                Job, Notification, Resume, User)

st.set_page_config(page_title="HireTrack ATS", page_icon="💼", layout="wide")

STATUS_ICON = {"APPLIED": "🔵", "SHORTLISTED": "🟡", "REJECTED": "🔴", "SELECTED": "🟢",
               "OPEN": "🟢", "CLOSED": "⚫", "SCHEDULED": "🔵", "COMPLETED": "🟢", "CANCELLED": "⚫"}
STATUS_COLOR = {"APPLIED": "#3b82f6", "SHORTLISTED": "#f59e0b", "REJECTED": "#ef4444", "SELECTED": "#10b981"}
MIME = {"pdf": "application/pdf", "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

PAGES = {
    "GUEST": ["Browse Jobs", "Log in", "Register"],
    "CANDIDATE": ["Dashboard", "Browse Jobs", "My Applications", "Interviews", "Profile & Resume", "Notifications"],
    "RECRUITER": ["Dashboard", "My Jobs", "Applicants", "Interviews", "Profile", "Notifications"],
    "ADMIN": ["Dashboard", "Users", "All Jobs", "Applicants", "Interviews", "Activity Log", "Notifications"],
}


# ---------------------------------------------------------------------------
# Setup & helpers
# ---------------------------------------------------------------------------

@st.cache_resource(show_spinner="Connecting to database…")
def get_sessionmaker():
    url = None
    try:
        url = st.secrets.get("DATABASE_URL")
    except Exception:  # no secrets file configured
        pass
    return db.init(url)


Session = get_sessionmaker()


def humanize(v):
    return v.replace("_", " ").title() if v else "—"


def badge(status):
    return f"{STATUS_ICON.get(status, '⚪')} {humanize(status)}"


def fmt_d(d):
    return d.strftime("%d %b %Y") if d else "—"


def fmt_dt(d):
    return d.strftime("%d %b %Y, %I:%M %p") if d else "—"


def blank_to_none(v):
    v = (v or "").strip()
    return v or None


def flash(msg, icon="✅"):
    st.session_state["_flash"] = (msg, icon)


def show_flash():
    f = st.session_state.pop("_flash", None)
    if f:
        st.toast(f[0], icon=f[1])


def goto(page):
    st.session_state["_goto"] = page
    st.rerun()


def log(s, actor, action):
    s.add(Activity(actor=actor, action=action))


def notify(s, user_id, message):
    s.add(Notification(user_id=user_id, message=message))


def skill_chips(skills):
    if not skills:
        return ""
    return " ".join(f"`{x.strip()}`" for x in skills.split(",") if x.strip())


def current_user():
    uid = st.session_state.get("uid")
    if not uid:
        return None
    with Session() as s:
        u = s.get(User, uid)
        if not u or not u.active:
            st.session_state.pop("uid", None)
            return None
        return u


def has_resume(user_id):
    with Session() as s:
        return s.scalar(select(func.count()).select_from(Resume).where(Resume.user_id == user_id)) > 0


def status_message(status, title):
    return {
        "APPLIED": f"Your application for {title} is back under review",
        "SHORTLISTED": f"Good news! You have been shortlisted for {title}",
        "REJECTED": f"Your application for {title} was not taken forward",
        "SELECTED": f"Congratulations! You have been selected for {title}",
    }[status]


# ---------------------------------------------------------------------------
# Auth pages
# ---------------------------------------------------------------------------

def page_login():
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        st.title("Welcome back")
        st.caption("Log in to your HireTrack account")
        with st.form("login"):
            email = st.text_input("Email")
            pw = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Log in", type="primary", width="stretch")
        if submitted:
            with Session() as s:
                u = s.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
                if not u or not db.check_password(pw, u.password_hash):
                    st.error("Invalid email or password")
                elif not u.active:
                    st.error("Your account has been deactivated. Contact the administrator.")
                else:
                    log(s, u.email, "Logged in")
                    s.commit()
                    st.session_state.uid = u.id
                    flash(f"Welcome, {u.name.split()[0]}!", "👋")
                    goto("Dashboard")
        with st.container(border=True):
            st.markdown("**Demo accounts**")
            st.markdown("| Role | Email | Password |\n|---|---|---|\n"
                        "| Admin | `admin@ats.com` | `admin123` |\n"
                        "| Recruiter | `recruiter@ats.com` | `recruiter123` |\n"
                        "| Candidate | `candidate@ats.com` | `candidate123` |")


def page_register():
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        st.title("Create your account")
        role = st.radio("I want to…", ["CANDIDATE", "RECRUITER"], horizontal=True,
                        format_func=lambda r: "Find a job" if r == "CANDIDATE" else "Hire talent")
        with st.form("register"):
            name = st.text_input("Full name")
            email = st.text_input("Email")
            company = st.text_input("Company") if role == "RECRUITER" else None
            phone = st.text_input("Phone (optional)")
            pw = st.text_input("Password (min 6 characters)", type="password")
            submitted = st.form_submit_button("Create account", type="primary", width="stretch")
        if submitted:
            email_n = email.strip().lower()
            if not name.strip() or "@" not in email_n or len(pw) < 6:
                st.error("Please enter your name, a valid email and a password of at least 6 characters.")
                return
            if role == "RECRUITER" and not (company or "").strip():
                st.error("Company name is required for recruiters.")
                return
            with Session() as s:
                if s.scalar(select(User.id).where(func.lower(User.email) == email_n)):
                    st.error("An account with this email already exists.")
                    return
                u = User(name=name.strip(), email=email_n, password_hash=db.hash_password(pw), role=role,
                         company=blank_to_none(company), phone=blank_to_none(phone))
                s.add(u)
                log(s, email_n, f"Registered as {role}")
                s.commit()
                st.session_state.uid = u.id
            flash("Account created!")
            goto("Profile & Resume" if role == "CANDIDATE" else "Dashboard")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def page_dashboard(me):
    st.title(f"Hello, {me.name.split()[0]} 👋")
    now = dt.datetime.now()
    with Session() as s:
        status_q = select(Application.status, func.count(Application.id)).group_by(Application.status)
        dates_q = select(Application.applied_at)
        perjob_q = (select(Job.title, func.count(Application.id)).select_from(Application).join(Application.job)
                    .group_by(Job.id, Job.title).order_by(func.count(Application.id).desc()).limit(8))
        iv_q = (select(func.count(Interview.id)).join(Interview.application)
                .where(Interview.status == "SCHEDULED", Interview.scheduled_at >= now))
        if me.role == "RECRUITER":
            status_q = status_q.join(Application.job).where(Job.recruiter_id == me.id)
            dates_q = dates_q.join(Application.job).where(Job.recruiter_id == me.id)
            perjob_q = perjob_q.where(Job.recruiter_id == me.id)
            iv_q = iv_q.join(Application.job).where(Job.recruiter_id == me.id)
        elif me.role == "CANDIDATE":
            status_q = status_q.where(Application.candidate_id == me.id)
            iv_q = iv_q.where(Application.candidate_id == me.id)

        by_status = {k: 0 for k in STATUSES}
        by_status.update({k: v for k, v in s.execute(status_q).all()})
        total_apps = sum(by_status.values())
        upcoming = s.scalar(iv_q) or 0
        open_jobs = s.scalar(select(func.count(Job.id)).where(Job.status == "OPEN"))

        if me.role == "ADMIN":
            n_users = s.scalar(select(func.count(User.id)))
            n_rec = s.scalar(select(func.count(User.id)).where(User.role == "RECRUITER"))
            n_cand = s.scalar(select(func.count(User.id)).where(User.role == "CANDIDATE"))
            n_jobs = s.scalar(select(func.count(Job.id)))
            tiles = [("Total users", n_users, f"{n_rec} recruiters · {n_cand} candidates"),
                     ("Job postings", n_jobs, f"{open_jobs} open"),
                     ("Applications", total_apps, f"{by_status['SELECTED']} selected"),
                     ("Upcoming interviews", upcoming, "scheduled")]
        elif me.role == "RECRUITER":
            my_jobs = s.scalar(select(func.count(Job.id)).where(Job.recruiter_id == me.id))
            my_open = s.scalar(select(func.count(Job.id)).where(Job.recruiter_id == me.id, Job.status == "OPEN"))
            tiles = [("My job postings", my_jobs, f"{my_open} open"),
                     ("Applications received", total_apps, f"{by_status['APPLIED']} awaiting review"),
                     ("Shortlisted", by_status["SHORTLISTED"], "candidates"),
                     ("Upcoming interviews", upcoming, "scheduled")]
        else:
            tiles = [("Applications", total_apps, "submitted"),
                     ("Shortlisted", by_status["SHORTLISTED"], "in progress"),
                     ("Upcoming interviews", upcoming, "scheduled"),
                     ("Open jobs", open_jobs, "available to apply")]

        dates = [d for (d,) in s.execute(dates_q).all()] if me.role != "CANDIDATE" else []
        per_job = s.execute(perjob_q).all() if me.role != "CANDIDATE" else []
        recent = []
        if me.role == "CANDIDATE":
            recent = s.scalars(select(Application).options(joinedload(Application.job).joinedload(Job.recruiter))
                               .where(Application.candidate_id == me.id)
                               .order_by(Application.applied_at.desc()).limit(5)).all()

    if me.role == "CANDIDATE" and not has_resume(me.id):
        st.warning("Upload your resume in **Profile & Resume** to start applying for jobs.")

    cols = st.columns(4)
    for col, (label, value, sub) in zip(cols, tiles):
        with col.container(border=True):
            st.metric(label, value or 0)
            st.caption(sub)

    left, right = st.columns(2)
    with left.container(border=True):
        st.subheader("Application pipeline")
        df = pd.DataFrame({"Status": [humanize(k) for k in by_status], "Count": list(by_status.values()),
                           "key": list(by_status.keys())})
        if total_apps == 0:
            st.info("No applications yet.")
        else:
            chart = alt.Chart(df[df.Count > 0]).mark_arc(innerRadius=60).encode(
                theta="Count:Q",
                color=alt.Color("Status:N", scale=alt.Scale(domain=[humanize(k) for k in STATUS_COLOR],
                                                            range=list(STATUS_COLOR.values()))),
                tooltip=["Status", "Count"])
            st.altair_chart(chart, width="stretch")

    with right.container(border=True):
        if me.role == "CANDIDATE":
            st.subheader("Recent applications")
            if not recent:
                st.info("You haven't applied to any jobs yet.")
            for a in recent:
                c1, c2 = st.columns([3, 1])
                c1.markdown(f"**{a.job.title}**  \n{a.job.recruiter.company} · {fmt_d(a.applied_at)}")
                c2.markdown(badge(a.status))
        else:
            st.subheader("Applications over the last 6 months")
            this_month = pd.Timestamp.now().to_period("M")
            months = pd.period_range(this_month - 5, this_month, freq="M")
            counts = pd.Series(0, index=months)
            for d in dates:
                p = pd.Timestamp(d).to_period("M")
                if p in counts.index:
                    counts[p] += 1
            mdf = pd.DataFrame({"Month": [m.strftime("%b %Y") for m in months], "Applications": counts.values,
                                "order": range(len(months))})
            chart = alt.Chart(mdf).mark_bar(color="#2550eb", cornerRadiusTopLeft=4, cornerRadiusTopRight=4).encode(
                x=alt.X("Month:N", sort=alt.EncodingSortField("order"), title=None),
                y=alt.Y("Applications:Q", axis=alt.Axis(tickMinStep=1)), tooltip=["Month", "Applications"])
            st.altair_chart(chart, width="stretch")

    if per_job:
        with st.container(border=True):
            st.subheader("Applications per job")
            pdf = pd.DataFrame(per_job, columns=["Job", "Applications"])
            chart = alt.Chart(pdf).mark_bar(color="#2550eb").encode(
                y=alt.Y("Job:N", sort="-x", title=None), x=alt.X("Applications:Q", axis=alt.Axis(tickMinStep=1)),
                tooltip=["Job", "Applications"])
            st.altair_chart(chart, width="stretch")


# ---------------------------------------------------------------------------
# Jobs (public board)
# ---------------------------------------------------------------------------

def page_jobs(me):
    st.title("Find your next role")
    c1, c2, c3 = st.columns([2, 1, 1])
    q = c1.text_input("Search", placeholder="Job title, skill or company")
    loc = c2.text_input("Location")
    typ = c3.selectbox("Job type", ["ALL"] + JOB_TYPES, format_func=lambda t: "All types" if t == "ALL" else humanize(t))

    with Session() as s:
        stmt = (select(Job).join(Job.recruiter).options(contains_eager(Job.recruiter))
                .where(Job.status == "OPEN").order_by(Job.created_at.desc()))
        if q.strip():
            like = f"%{q.strip().lower()}%"
            stmt = stmt.where(or_(func.lower(Job.title).like(like), func.lower(Job.skills).like(like),
                                  func.lower(User.company).like(like)))
        if loc.strip():
            stmt = stmt.where(func.lower(Job.location).like(f"%{loc.strip().lower()}%"))
        if typ != "ALL":
            stmt = stmt.where(Job.employment_type == typ)
        jobs = s.scalars(stmt).all()
        my_apps = {}
        if me and me.role == "CANDIDATE":
            my_apps = dict(s.execute(select(Application.job_id, Application.status)
                                     .where(Application.candidate_id == me.id)).all())
    resume_ok = bool(me and me.role == "CANDIDATE" and has_resume(me.id))

    st.caption(f"{len(jobs)} open position{'s' if len(jobs) != 1 else ''}")
    if not jobs:
        st.info("No jobs match your search. Try different keywords.")
    for j in jobs:
        with st.container(border=True):
            left, right = st.columns([5, 1])
            left.markdown(f"### {j.title}\n**{j.recruiter.company}** · 📍 {j.location or '—'} · "
                          f"{humanize(j.employment_type)} · 💰 {j.salary_range or '—'}"
                          + (f" · {j.min_experience}+ yrs" if j.min_experience is not None else ""))
            if j.skills:
                left.markdown(skill_chips(j.skills))
            right.caption(f"Posted {fmt_d(j.created_at)}")
            if j.deadline:
                right.caption(f"Apply by {fmt_d(j.deadline)}")
            with st.expander("View details & apply"):
                st.markdown(j.description)
                st.divider()
                apply_box(me, j, my_apps, resume_ok)


def apply_box(me, j, my_apps, resume_ok):
    if me is None:
        st.info("Log in or register as a candidate to apply.")
        return
    if me.role != "CANDIDATE":
        st.caption("Only candidates can apply to jobs.")
        return
    if j.id in my_apps:
        st.success(f"You applied to this job · status: {badge(my_apps[j.id])}")
        return
    if j.deadline and j.deadline < dt.date.today():
        st.warning("The application deadline for this job has passed.")
        return
    if not resume_ok:
        st.warning("Upload your resume in **Profile & Resume** before applying.")
        return
    with st.form(f"apply_{j.id}"):
        cover = st.text_area("Cover letter (optional)", max_chars=5000, placeholder="Why are you a great fit?")
        if st.form_submit_button("Submit application", type="primary"):
            with Session() as s:
                job = s.get(Job, j.id)
                if job is None or job.status != "OPEN":
                    st.error("This job is no longer accepting applications.")
                    return
                s.add(Application(job_id=job.id, candidate_id=me.id, cover_letter=blank_to_none(cover)))
                notify(s, job.recruiter_id, f"{me.name} applied for {job.title}")
                log(s, me.email, f'Applied for "{job.title}"')
                try:
                    s.commit()
                except IntegrityError:
                    st.error("You have already applied to this job.")
                    return
            flash("Application submitted!")
            st.rerun()


# ---------------------------------------------------------------------------
# Candidate
# ---------------------------------------------------------------------------

def page_my_applications(me):
    st.title("My applications")
    with Session() as s:
        apps = s.scalars(select(Application)
                         .options(joinedload(Application.job).joinedload(Job.recruiter),
                                  selectinload(Application.interviews))
                         .where(Application.candidate_id == me.id)
                         .order_by(Application.applied_at.desc())).all()
    if not apps:
        st.info("You haven't applied yet. Head to **Browse Jobs** to find a role.")
        return
    filt = st.radio("Filter", ["ALL"] + STATUSES, horizontal=True, label_visibility="collapsed",
                    format_func=lambda x: f"All ({len(apps)})" if x == "ALL"
                    else f"{humanize(x)} ({sum(a.status == x for a in apps)})")
    for a in apps:
        if filt != "ALL" and a.status != filt:
            continue
        with st.container(border=True):
            c1, c2, c3 = st.columns([4, 1.3, 1])
            c1.markdown(f"**{a.job.title}**  \n{a.job.recruiter.company} · {a.job.location or ''}  \n"
                        f"<small>Applied {fmt_d(a.applied_at)} · Updated {fmt_d(a.updated_at)}</small>",
                        unsafe_allow_html=True)
            c2.markdown(f"### {badge(a.status)}")
            # Progress: Applied -> Shortlisted -> Selected (or Rejected)
            step = {"APPLIED": 1, "SHORTLISTED": 2, "SELECTED": 3, "REJECTED": 2}[a.status]
            c1.progress(step / 3, text="Applied → Shortlisted → " + ("❌ Rejected" if a.status == "REJECTED" else "Selected"))
            if a.interviews:
                c1.caption(f"📅 {len(a.interviews)} interview(s) — see **Interviews**")
            if a.status != "SELECTED":
                with c3.popover("Withdraw"):
                    st.write(f"Withdraw your application for **{a.job.title}**?")
                    if st.button("Yes, withdraw", key=f"wd_{a.id}", type="primary"):
                        with Session() as s:
                            obj = s.get(Application, a.id)
                            if obj and obj.candidate_id == me.id:
                                notify(s, obj.job.recruiter_id, f"{me.name} withdrew their application for {obj.job.title}")
                                log(s, me.email, f'Withdrew application for "{obj.job.title}"')
                                s.delete(obj)
                                s.commit()
                        flash("Application withdrawn")
                        st.rerun()


def page_profile(me):
    st.title("Profile & Resume" if me.role == "CANDIDATE" else "Profile")

    if me.role == "CANDIDATE":
        with st.container(border=True):
            st.subheader("📄 Resume")
            with Session() as s:
                res = s.get(Resume, me.id)
            if res:
                c1, c2 = st.columns([3, 1])
                c1.success(f"Current resume: **{res.filename}** (uploaded {fmt_d(res.uploaded_at)})")
                c2.download_button("Download", res.data, file_name=res.filename, mime=res.mime, width="stretch")
            else:
                st.warning("No resume uploaded yet. You need one to apply for jobs.")
            with st.form("resume_upload", clear_on_submit=True):
                f = st.file_uploader("Upload a new resume (PDF, DOC or DOCX, max 5 MB)", type=["pdf", "doc", "docx"])
                if st.form_submit_button("Save resume", type="primary"):
                    if f is None:
                        st.error("Please choose a file first.")
                    elif f.size > 5 * 1024 * 1024:
                        st.error("File is too large (max 5 MB).")
                    else:
                        ext = f.name.rsplit(".", 1)[-1].lower()
                        with Session() as s:
                            r = s.get(Resume, me.id)
                            if r is None:
                                r = Resume(user_id=me.id)
                                s.add(r)
                            r.filename, r.mime, r.data, r.uploaded_at = f.name, MIME.get(ext, "application/octet-stream"), f.getvalue(), db.utcnow()
                            log(s, me.email, f"Uploaded resume {f.name}")
                            s.commit()
                        flash("Resume uploaded")
                        st.rerun()

    with st.container(border=True):
        st.subheader("Personal details")
        with st.form("profile"):
            c1, c2 = st.columns(2)
            name = c1.text_input("Full name", me.name)
            c2.text_input("Email", me.email, disabled=True)
            phone = c1.text_input("Phone", me.phone or "")
            location = c2.text_input("Location", me.location or "")
            company = headline = skills = None
            exp = None
            if me.role == "RECRUITER":
                company = c1.text_input("Company", me.company or "")
            if me.role == "CANDIDATE":
                headline = c1.text_input("Headline", me.headline or "", placeholder="e.g. Java Developer")
                exp = c2.number_input("Years of experience", 0, 60, me.experience_years or 0)
                skills = st.text_area("Skills (comma separated)", me.skills or "")
            if st.form_submit_button("Save changes", type="primary"):
                if not name.strip():
                    st.error("Name is required.")
                elif me.role == "RECRUITER" and not (company or "").strip():
                    st.error("Company is required.")
                else:
                    with Session() as s:
                        u = s.get(User, me.id)
                        u.name, u.phone, u.location = name.strip(), blank_to_none(phone), blank_to_none(location)
                        if me.role == "RECRUITER":
                            u.company = company.strip()
                        if me.role == "CANDIDATE":
                            u.headline, u.skills, u.experience_years = blank_to_none(headline), blank_to_none(skills), int(exp)
                        s.commit()
                    flash("Profile saved")
                    st.rerun()

    with st.container(border=True):
        st.subheader("Change password")
        with st.form("password", clear_on_submit=True):
            cur = st.text_input("Current password", type="password")
            new = st.text_input("New password (min 6 characters)", type="password")
            if st.form_submit_button("Update password"):
                with Session() as s:
                    u = s.get(User, me.id)
                    if not db.check_password(cur, u.password_hash):
                        st.error("Current password is incorrect.")
                    elif len(new) < 6:
                        st.error("New password must be at least 6 characters.")
                    else:
                        u.password_hash = db.hash_password(new)
                        log(s, me.email, "Changed password")
                        s.commit()
                        st.success("Password updated.")


# ---------------------------------------------------------------------------
# Recruiter: jobs
# ---------------------------------------------------------------------------

def job_form(me, job=None):
    key = f"jobform_{job.id if job else 'new'}"
    with st.form(key, clear_on_submit=job is None):
        title = st.text_input("Job title *", job.title if job else "")
        c1, c2, c3 = st.columns(3)
        location = c1.text_input("Location", job.location or "" if job else "")
        types = JOB_TYPES
        etype = c2.selectbox("Job type", types, index=types.index(job.employment_type) if job and job.employment_type in types else 0,
                             format_func=humanize)
        salary = c3.text_input("Salary range", job.salary_range or "" if job else "", placeholder="e.g. 8 - 12 LPA")
        min_exp = c1.number_input("Min. experience (years)", 0, 50, job.min_experience or 0 if job else 0)
        has_deadline = c2.checkbox("Set deadline", value=bool(job and job.deadline) or job is None)
        deadline = c3.date_input("Application deadline", (job.deadline if job and job.deadline else dt.date.today() + dt.timedelta(days=30)))
        skills = st.text_input("Required skills (comma separated)", job.skills or "" if job else "")
        desc = st.text_area("Description *", job.description if job else "", height=180,
                            help="Markdown supported: **bold**, - bullet lists")
        status = st.selectbox("Status", ["OPEN", "CLOSED"], index=0 if not job or job.status == "OPEN" else 1)
        if st.form_submit_button("Save changes" if job else "Post job", type="primary"):
            if not title.strip() or not desc.strip():
                st.error("Title and description are required.")
                return
            with Session() as s:
                obj = s.get(Job, job.id) if job else Job(recruiter_id=me.id)
                if job and obj.recruiter_id != me.id and me.role != "ADMIN":
                    st.error("You can only edit your own jobs.")
                    return
                obj.title, obj.description = title.strip(), desc.strip()
                obj.location, obj.employment_type, obj.salary_range = blank_to_none(location), etype, blank_to_none(salary)
                obj.skills, obj.min_experience, obj.status = blank_to_none(skills), int(min_exp), status
                obj.deadline = deadline if has_deadline else None
                if not job:
                    s.add(obj)
                log(s, me.email, f'{"Updated" if job else "Posted"} job "{obj.title}"')
                s.commit()
            flash("Job updated" if job else "Job posted")
            st.rerun()


def job_actions(me, j, n_apps):
    """Close/reopen and delete buttons, shared by recruiter and admin views."""
    c1, c2 = st.columns(2)
    if c1.button("Close job" if j.status == "OPEN" else "Reopen job", key=f"tog_{j.id}", width="stretch"):
        with Session() as s:
            obj = s.get(Job, j.id)
            obj.status = "CLOSED" if obj.status == "OPEN" else "OPEN"
            log(s, me.email, f'{"Closed" if obj.status == "CLOSED" else "Reopened"} job "{obj.title}"')
            s.commit()
        flash("Job status updated")
        st.rerun()
    with c2.popover("Delete", width="stretch"):
        st.write(f"Delete **{j.title}** and its {n_apps} application(s)?")
        if st.button("Yes, delete", key=f"del_{j.id}", type="primary"):
            with Session() as s:
                obj = s.get(Job, j.id)
                log(s, me.email, f'Deleted job "{obj.title}"')
                s.delete(obj)
                s.commit()
            flash("Job deleted", "🗑️")
            st.rerun()


def page_my_jobs(me):
    st.title("My job postings")
    with st.expander("➕ Post a new job", expanded=False):
        job_form(me)
    with Session() as s:
        rows = s.execute(select(Job, func.count(Application.id)).outerjoin(Job.applications)
                         .where(Job.recruiter_id == me.id).group_by(Job.id)
                         .order_by(Job.created_at.desc())).all()
    if not rows:
        st.info("No job postings yet. Post your first opening above.")
    for j, n in rows:
        with st.container(border=True):
            c1, c2, c3 = st.columns([4, 1.2, 2])
            c1.markdown(f"**{j.title}**  \n📍 {j.location or '—'} · {humanize(j.employment_type)} · "
                        f"posted {fmt_d(j.created_at)} · deadline {fmt_d(j.deadline)}")
            c2.markdown(f"{badge(j.status)}  \n**{n}** applicant{'s' if n != 1 else ''}")
            with c3:
                if st.button("View applicants", key=f"va_{j.id}", width="stretch"):
                    st.session_state["applicants_job"] = j.id
                    goto("Applicants")
                job_actions(me, j, n)
            with st.expander("Edit"):
                job_form(me, j)


# ---------------------------------------------------------------------------
# Recruiter/Admin: applicants
# ---------------------------------------------------------------------------

def page_applicants(me):
    st.title("All applications" if me.role == "ADMIN" else "Applicants")
    with Session() as s:
        jq = select(Job).options(joinedload(Job.recruiter)).order_by(Job.created_at.desc())
        if me.role == "RECRUITER":
            jq = jq.where(Job.recruiter_id == me.id)
        jobs = s.scalars(jq).all()

    job_ids = [None] + [j.id for j in jobs]
    job_names = {j.id: j.title + (f" — {j.recruiter.company}" if me.role == "ADMIN" else "") for j in jobs}
    pre = st.session_state.pop("applicants_job", None)
    if pre in job_ids:
        st.session_state["app_job_filter"] = pre
    c1, c2, c3 = st.columns([2, 1, 2])
    job_id = c1.selectbox("Job", job_ids, key="app_job_filter",
                          format_func=lambda i: "All jobs" if i is None else job_names[i])
    status_f = c2.selectbox("Status", ["ALL"] + STATUSES, format_func=lambda x: "All" if x == "ALL" else humanize(x))
    search = c3.text_input("Search", placeholder="Name, email or skills")

    with Session() as s:
        q = (select(Application).join(Application.job).join(Application.candidate)
             .options(contains_eager(Application.job).joinedload(Job.recruiter), contains_eager(Application.candidate),
                      selectinload(Application.interviews))
             .order_by(Application.applied_at.desc()))
        if me.role == "RECRUITER":
            q = q.where(Job.recruiter_id == me.id)
        if job_id:
            q = q.where(Application.job_id == job_id)
        apps = s.scalars(q).unique().all()

    counts = {k: sum(a.status == k for a in apps) for k in STATUSES}
    st.caption(" · ".join(f"{badge(k)}: **{v}**" for k, v in counts.items()))
    term = search.strip().lower()
    apps = [a for a in apps if (status_f == "ALL" or a.status == status_f) and
            (not term or any(term in (v or "").lower() for v in
                             (a.candidate.name, a.candidate.email, a.candidate.skills, a.job.title)))]
    if not apps:
        st.info("No applicants match these filters.")
        return

    table = pd.DataFrame([{
        "ID": a.id, "Candidate": a.candidate.name, "Headline": a.candidate.headline or "",
        "Job": a.job.title, "Applied": fmt_d(a.applied_at), "Status": badge(a.status),
        "Interviews": len(a.interviews)} for a in apps])
    st.dataframe(table, hide_index=True, width="stretch")

    st.subheader("Review an applicant")
    by_id = {a.id: a for a in apps}
    sel = st.selectbox("Select applicant", list(by_id), format_func=lambda i: f"{by_id[i].candidate.name} — {by_id[i].job.title}")
    review_applicant(me, by_id[sel])


def review_applicant(me, a):
    c = a.candidate
    with st.container(border=True):
        top1, top2 = st.columns([3, 1])
        top1.markdown(f"### {c.name}\n{c.headline or ''}  \napplied for **{a.job.title}** on {fmt_d(a.applied_at)}")
        top2.markdown(f"### {badge(a.status)}")
        i1, i2, i3 = st.columns(3)
        i1.markdown(f"**Email**  \n{c.email}")
        i2.markdown(f"**Phone**  \n{c.phone or '—'}")
        i3.markdown(f"**Experience**  \n{c.experience_years if c.experience_years is not None else '—'} years")
        if c.skills:
            st.markdown(f"**Skills**  \n{skill_chips(c.skills)}")
        st.markdown("**Cover letter**")
        st.info(a.cover_letter or "No cover letter provided.")
        with Session() as s:
            res = s.get(Resume, c.id)
        if res:
            st.download_button(f"📄 Download resume ({res.filename})", res.data, file_name=res.filename,
                               mime=res.mime, key=f"res_{a.id}")
        else:
            st.caption("No resume on file.")

    left, right = st.columns(2)
    with left.container(border=True):
        st.markdown("#### Update status")
        with st.form(f"status_{a.id}"):
            new_status = st.selectbox("Status", STATUSES, index=STATUSES.index(a.status), format_func=humanize)
            notes = st.text_area("Internal notes (only visible to recruiters)", a.recruiter_notes or "")
            if st.form_submit_button("Save", type="primary"):
                with Session() as s:
                    obj = s.get(Application, a.id)
                    changed = obj.status != new_status
                    obj.status, obj.recruiter_notes, obj.updated_at = new_status, blank_to_none(notes), db.utcnow()
                    if changed:
                        notify(s, obj.candidate_id, status_message(new_status, a.job.title))
                        log(s, me.email, f'Moved {c.email} to {new_status} for "{a.job.title}"')
                    s.commit()
                flash(f"Moved to {humanize(new_status)}, candidate notified" if changed else "Notes saved")
                st.rerun()

    with right.container(border=True):
        st.markdown("#### Schedule interview")
        if a.status == "REJECTED":
            st.caption("Cannot schedule an interview for a rejected application.")
        else:
            interview_form(me, application=a)

    if a.interviews:
        st.markdown("**Interviews for this application**")
        for iv in sorted(a.interviews, key=lambda x: x.scheduled_at):
            st.markdown(f"- {badge(iv.status)} · {fmt_dt(iv.scheduled_at)} · {humanize(iv.mode)} · {iv.interviewer or ''}")


def interview_form(me, application=None, interview=None):
    editing = interview is not None
    key = f"iv_edit_{interview.id}" if editing else f"iv_new_{application.id}"
    default_at = interview.scheduled_at if editing else (dt.datetime.now() + dt.timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    with st.form(key, clear_on_submit=not editing):
        c1, c2 = st.columns(2)
        d = c1.date_input("Date", default_at.date(), key=f"{key}_d")
        t = c2.time_input("Time", default_at.time(), step=900, key=f"{key}_t")
        duration = c1.number_input("Duration (minutes)", 10, 480, interview.duration_minutes if editing else 60, step=5, key=f"{key}_dur")
        mode = c2.selectbox("Mode", INTERVIEW_MODES, index=INTERVIEW_MODES.index(interview.mode) if editing else 0,
                            format_func=humanize, key=f"{key}_m")
        where = st.text_input("Meeting link / address / phone", interview.location_or_link or "" if editing else "", key=f"{key}_w")
        interviewer = st.text_input("Interviewer", interview.interviewer or "" if editing else me.name, key=f"{key}_i")
        notes = st.text_area("Notes for the candidate", interview.notes or "" if editing else "", key=f"{key}_n")
        status = feedback = None
        if editing:
            status = st.selectbox("Status", INTERVIEW_STATUSES, index=INTERVIEW_STATUSES.index(interview.status),
                                  format_func=humanize, key=f"{key}_s")
            feedback = st.text_area("Feedback (internal)", interview.feedback or "", key=f"{key}_f")
        if st.form_submit_button("Save" if editing else "Schedule", type="primary"):
            when = dt.datetime.combine(d, t)
            rescheduled = not editing or when != interview.scheduled_at
            if rescheduled and when < dt.datetime.now():
                st.error("Interview time must be in the future.")
                return
            with Session() as s:
                if editing:
                    iv = s.get(Interview, interview.id)
                    app = iv.application
                else:
                    app = s.get(Application, application.id)
                    iv = Interview(status="SCHEDULED")
                if me.role != "ADMIN" and app.job.recruiter_id != me.id:
                    st.error("This application belongs to another recruiter's job.")
                    return
                old_status = iv.status
                iv.scheduled_at, iv.duration_minutes, iv.mode = when, int(duration), mode
                iv.location_or_link, iv.interviewer, iv.notes = blank_to_none(where), blank_to_none(interviewer), blank_to_none(notes)
                title = app.job.title
                if editing:
                    iv.status, iv.feedback = status, blank_to_none(feedback)
                    if status == "CANCELLED" and old_status != "CANCELLED":
                        notify(s, app.candidate_id, f"Your interview for {title} has been cancelled")
                    elif rescheduled:
                        notify(s, app.candidate_id, f"Your interview for {title} was rescheduled to {fmt_dt(when)}")
                    log(s, me.email, f'Updated interview for "{title}"')
                else:
                    iv.application = app  # attach only after all fields are set (avoids premature autoflush)
                    s.add(iv)
                    if app.status == "APPLIED":
                        app.status, app.updated_at = "SHORTLISTED", db.utcnow()
                    notify(s, app.candidate_id, f"Interview scheduled for {title} on {fmt_dt(when)}")
                    log(s, me.email, f'Scheduled interview with {app.candidate.email} for "{title}"')
                s.commit()
            flash("Interview updated" if editing else "Interview scheduled, candidate notified")
            st.rerun()


# ---------------------------------------------------------------------------
# Interviews (all roles)
# ---------------------------------------------------------------------------

def page_interviews(me):
    st.title("Interviews")
    with Session() as s:
        q = (select(Interview).join(Interview.application).join(Application.job)
             .options(contains_eager(Interview.application).contains_eager(Application.job).joinedload(Job.recruiter),
                      contains_eager(Interview.application).joinedload(Application.candidate))
             .order_by(Interview.scheduled_at))
        if me.role == "RECRUITER":
            q = q.where(Job.recruiter_id == me.id)
        elif me.role == "CANDIDATE":
            q = q.where(Application.candidate_id == me.id)
        items = s.scalars(q).unique().all()

    now = dt.datetime.now()
    upcoming = [i for i in items if i.status == "SCHEDULED" and i.scheduled_at >= now]
    past = [i for i in reversed(items) if i not in upcoming]
    manage = me.role != "CANDIDATE"
    if manage:
        st.caption("Schedule new interviews from the **Applicants** page.")
    tab1, tab2 = st.tabs([f"Upcoming ({len(upcoming)})", f"Past & other ({len(past)})"])
    for tab, lst in ((tab1, upcoming), (tab2, past)):
        with tab:
            if not lst:
                st.info("Nothing here.")
            for iv in lst:
                a = iv.application
                with st.container(border=True):
                    c1, c2 = st.columns([4, 1])
                    who = f"**{a.candidate.name}** · {a.job.title}" if manage else f"**{a.job.title}** · {a.job.recruiter.company}"
                    where = iv.location_or_link or ""
                    if where.startswith("http"):
                        where = f"[{where}]({where})"
                    c1.markdown(f"{who}  \n🕒 {fmt_dt(iv.scheduled_at)} · {iv.duration_minutes} min  \n"
                                f"📍 {humanize(iv.mode)}{': ' + where if where else ''}"
                                + (f"  \n👤 {iv.interviewer}" if iv.interviewer else "")
                                + (f"  \n📝 {iv.notes}" if iv.notes else ""))
                    c2.markdown(badge(iv.status))
                    if manage:
                        if iv.feedback:
                            c1.info(f"Feedback: {iv.feedback}")
                        with st.expander("Edit / add feedback"):
                            interview_form(me, interview=iv)
                        with c2.popover("Delete"):
                            if st.button("Confirm delete", key=f"ivdel_{iv.id}", type="primary"):
                                with Session() as s:
                                    obj = s.get(Interview, iv.id)
                                    s.delete(obj)
                                    log(s, me.email, f"Deleted interview #{iv.id}")
                                    s.commit()
                                flash("Interview deleted", "🗑️")
                                st.rerun()


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def unread_count(me):
    with Session() as s:
        return s.scalar(select(func.count(Notification.id))
                        .where(Notification.user_id == me.id, Notification.is_read.is_(False))) or 0


def page_notifications(me):
    st.title("Notifications")
    with Session() as s:
        items = s.scalars(select(Notification).where(Notification.user_id == me.id)
                          .order_by(Notification.created_at.desc()).limit(50)).all()
    if any(not n.is_read for n in items) and st.button("Mark all as read"):
        with Session() as s:
            for n in s.scalars(select(Notification).where(Notification.user_id == me.id, Notification.is_read.is_(False))):
                n.is_read = True
            s.commit()
        st.rerun()
    if not items:
        st.info("You're all caught up.")
    for n in items:
        icon = "🔔" if not n.is_read else "✓"
        text = f"**{n.message}**" if not n.is_read else n.message
        st.markdown(f"{icon} {text}  \n<small style='color:gray'>{fmt_dt(n.created_at)} UTC</small>", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

def page_users(me):
    st.title("Users")
    with st.expander("➕ Add user"):
        with st.form("create_user", clear_on_submit=True):
            c1, c2 = st.columns(2)
            role = c1.selectbox("Role", ["RECRUITER", "CANDIDATE", "ADMIN"], format_func=humanize)
            name = c2.text_input("Full name")
            email = c1.text_input("Email")
            company = c2.text_input("Company (recruiters)")
            pw = c1.text_input("Temporary password", type="password")
            if st.form_submit_button("Create user", type="primary"):
                email_n = email.strip().lower()
                if not name.strip() or "@" not in email_n or len(pw) < 6:
                    st.error("Name, valid email and a 6+ character password are required.")
                elif role == "RECRUITER" and not company.strip():
                    st.error("Company is required for recruiters.")
                else:
                    with Session() as s:
                        if s.scalar(select(User.id).where(func.lower(User.email) == email_n)):
                            st.error("An account with this email already exists.")
                        else:
                            s.add(User(name=name.strip(), email=email_n, role=role, company=blank_to_none(company),
                                       password_hash=db.hash_password(pw)))
                            log(s, me.email, f"Created {role} account {email_n}")
                            s.commit()
                            flash("User created")
                            st.rerun()

    role_f = st.radio("Role", ["ALL", "RECRUITER", "CANDIDATE", "ADMIN"], horizontal=True,
                      format_func=lambda r: "All" if r == "ALL" else humanize(r) + "s", label_visibility="collapsed")
    with Session() as s:
        q = select(User).order_by(User.created_at.desc())
        if role_f != "ALL":
            q = q.where(User.role == role_f)
        users = s.scalars(q).all()
    st.dataframe(pd.DataFrame([{
        "ID": u.id, "Name": u.name, "Email": u.email, "Role": humanize(u.role),
        "Company / Headline": u.company or u.headline or "", "Joined": fmt_d(u.created_at),
        "Active": "✅" if u.active else "⛔"} for u in users]), hide_index=True, width="stretch")

    others = [u for u in users if u.id != me.id]
    if not others:
        return
    st.subheader("Manage a user")
    by_id = {u.id: u for u in others}
    uid = st.selectbox("User", list(by_id), format_func=lambda i: f"{by_id[i].name} ({by_id[i].email})")
    u = by_id[uid]
    c1, c2, _ = st.columns([1, 1, 3])
    if c1.button("Deactivate" if u.active else "Activate", width="stretch"):
        with Session() as s:
            obj = s.get(User, u.id)
            obj.active = not obj.active
            log(s, me.email, f"{'Activated' if obj.active else 'Deactivated'} {obj.email}")
            s.commit()
        flash("User updated")
        st.rerun()
    with c2.popover("Delete", width="stretch"):
        st.write(f"Permanently delete **{u.name}** and all their jobs/applications?")
        if st.button("Yes, delete user", type="primary"):
            with Session() as s:
                obj = s.get(User, u.id)
                log(s, me.email, f"Deleted {obj.role} account {obj.email}")
                s.delete(obj)
                s.commit()
            flash("User deleted", "🗑️")
            st.rerun()


def page_all_jobs(me):
    st.title("All job postings")
    with Session() as s:
        rows = s.execute(select(Job, User, func.count(Application.id)).join(Job.recruiter)
                         .outerjoin(Job.applications).group_by(Job.id, User.id)
                         .order_by(Job.created_at.desc())).all()
    if not rows:
        st.info("No jobs posted yet.")
        return
    st.dataframe(pd.DataFrame([{
        "ID": j.id, "Title": j.title, "Company": r.company, "Recruiter": r.name, "Type": humanize(j.employment_type),
        "Location": j.location or "", "Applicants": n, "Status": badge(j.status), "Posted": fmt_d(j.created_at)}
        for j, r, n in rows]), hide_index=True, width="stretch")
    st.subheader("Moderate a job")
    by_id = {j.id: (j, n) for j, _, n in rows}
    jid = st.selectbox("Job", list(by_id), format_func=lambda i: by_id[i][0].title)
    job_actions(me, *by_id[jid])


def page_activity(me):
    st.title("Activity log")
    term = st.text_input("Filter", placeholder="User or action")
    with Session() as s:
        logs = s.scalars(select(Activity).order_by(Activity.created_at.desc()).limit(300)).all()
    df = pd.DataFrame([{"When (UTC)": fmt_dt(a.created_at), "User": a.actor, "Action": a.action} for a in logs])
    if term.strip() and not df.empty:
        t = term.strip().lower()
        df = df[df.User.str.lower().str.contains(t, regex=False) | df.Action.str.lower().str.contains(t, regex=False)]
    st.dataframe(df, hide_index=True, width="stretch", height=600)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def main():
    me = current_user()
    pages = PAGES[me.role if me else "GUEST"]
    if "_goto" in st.session_state:
        st.session_state["nav"] = st.session_state.pop("_goto")
    if st.session_state.get("nav") not in pages:
        st.session_state["nav"] = pages[0]

    with st.sidebar:
        st.markdown("## 💼 HireTrack ATS")
        st.caption("Enterprise Recruitment & Applicant Tracking")
        unread = unread_count(me) if me else 0
        page = st.radio("Navigate", pages, key="nav", label_visibility="collapsed",
                        format_func=lambda p: f"{p} 🔴 {unread}" if p == "Notifications" and unread else p)
        st.divider()
        if me:
            st.markdown(f"**{me.name}**  \n{me.email}  \n_{humanize(me.role)}_")
            if st.button("Log out", width="stretch"):
                with Session() as s:
                    log(s, me.email, "Logged out")
                    s.commit()
                st.session_state.clear()
                st.rerun()
        else:
            st.caption("Demo: `candidate@ats.com` / `candidate123`")

    show_flash()
    routes = {
        "Browse Jobs": lambda: page_jobs(me), "Log in": page_login, "Register": page_register,
        "Dashboard": lambda: page_dashboard(me), "My Applications": lambda: page_my_applications(me),
        "Interviews": lambda: page_interviews(me), "Profile & Resume": lambda: page_profile(me),
        "Profile": lambda: page_profile(me), "Notifications": lambda: page_notifications(me),
        "My Jobs": lambda: page_my_jobs(me), "Applicants": lambda: page_applicants(me),
        "Users": lambda: page_users(me), "All Jobs": lambda: page_all_jobs(me),
        "Activity Log": lambda: page_activity(me),
    }
    routes[page]()


main()
