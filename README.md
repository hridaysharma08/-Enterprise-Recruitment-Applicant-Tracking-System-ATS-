# HireTrack — Enterprise Recruitment & Applicant Tracking System

A full-stack web application that automates the hiring workflow. Recruiters post jobs, screen applicants, move them through a hiring pipeline and schedule interviews. Candidates register, upload resumes, search and apply for jobs, and track their status. Admins manage users and monitor the whole system.

**Stack:** React 18 (Vite) + Tailwind CSS · Java 17+ Spring Boot 3 (REST, Spring Security + JWT, Spring Data JPA) · MySQL 8

**Going live:** see [DEPLOY.md](DEPLOY.md) for free hosting on Render with Aiven MySQL. One Docker image serves both the React app and the API.

---

## Features by module

| Module | What it does |
|---|---|
| **Authentication** | Register as a candidate or recruiter, JWT login, BCrypt-hashed passwords, role-based access (ADMIN / RECRUITER / CANDIDATE), password change |
| **Admin** | Dashboard with system-wide statistics; add, activate, deactivate or delete users; moderate all job postings; view all applications and interviews; audit **activity log** |
| **Recruiter** | Create, edit, close, reopen and delete job postings; view applicants per job; search and filter candidates; view resumes; add internal notes; shortlist, reject or select candidates |
| **Candidate** | Profile with skills and experience; **resume upload** (PDF/DOC/DOCX, max 5 MB); job search by keyword, location and type; apply with a cover letter; withdraw an application |
| **Application tracking** | Pipeline statuses **Applied → Shortlisted → Selected / Rejected**, with a visual progress tracker for candidates. Duplicate applications are blocked, as are applications past the deadline or to closed jobs |
| **Interview management** | Schedule online, in-person or phone interviews; reschedule, cancel or complete them; record internal feedback. Scheduling an interview auto-shortlists the candidate |
| **Notifications** | In-app notification bell. Candidates are notified of status changes, interviews and reschedules; recruiters of new applications and withdrawals |
| **Dashboard** | Role-aware stat cards and charts (Recharts): pipeline breakdown, applications per month, applications per job, recent activity |

---

## Project structure

```
ATS recruiter/
├── backend/                     Spring Boot REST API
│   ├── pom.xml
│   └── src/main/java/com/ats/
│       ├── model/               JPA entities (User, Job, JobApplication, Interview, Notification, ActivityLog) + enums
│       ├── repository/          Spring Data JPA repositories
│       ├── dto/                 Request/response records
│       ├── service/             Business logic
│       ├── controller/          REST controllers
│       ├── security/            JWT service, auth filter, security config
│       ├── exception/           Error handling -> JSON { "message": ... }
│       └── config/DataSeeder    Demo data on first start
├── frontend/                    React + Vite + Tailwind
│   └── src/
│       ├── api/client.js        Axios instance with JWT interceptor
│       ├── context/             AuthContext
│       ├── components/          Layout, Modal, NotificationBell, InterviewForm, ...
│       └── pages/               Jobs, JobDetail, Dashboard, Interviews, Profile,
│                                candidate/, recruiter/, admin/
└── database/schema.sql          Reference MySQL schema (tables are auto-created)
```

---

## Prerequisites

| Tool | Version | Install on macOS |
|---|---|---|
| Java JDK | **21** (17+ works) | `brew install openjdk@21` or download from [adoptium.net](https://adoptium.net) |
| Maven | 3.9+ | `brew install maven` (or open `backend/` in IntelliJ IDEA, which bundles Maven) |
| Node.js | 18+ (20 LTS recommended) | `brew install node@20` or download from [nodejs.org](https://nodejs.org) |
| MySQL | 8.x | `brew install mysql && brew services start mysql`, or [MySQL Installer](https://dev.mysql.com/downloads/mysql/) |

Homebrew itself: see [brew.sh](https://brew.sh).

---

## Running locally

### 1. MySQL

Start MySQL and know your `root` password. The database `ats_db` is **created automatically** on first start.

### 2. Backend (port 8080)

```bash
cd backend
# Set your MySQL credentials (defaults are root / root)
export DB_USERNAME=root
export DB_PASSWORD=your_mysql_password
mvn spring-boot:run
```

On first start with an empty database, demo data is seeded: 3 accounts, 5 jobs, sample applications and interviews.

### 3. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@ats.com | admin123 |
| Recruiter | recruiter@ats.com | recruiter123 |
| Candidate | candidate@ats.com | candidate123 |

The login page has one-click buttons that fill these in.

---

## Configuration

Backend settings live in `backend/src/main/resources/application.properties`. Each can be overridden with an environment variable:

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/ats_db?createDatabaseIfNotExist=true...` | JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / `root` | MySQL credentials |
| `JWT_SECRET` | dev value | **Change in production** (32+ characters) |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origin(s), comma separated |
| `DB_POOL_SIZE` | `5` | Max DB connections (keep low on free MySQL plans) |
| `SEED_DEMO_DATA` | `true` | Seed demo data into an empty DB |

Frontend: copy `frontend/.env.example` to `frontend/.env` to change `VITE_API_URL`.

---

## REST API overview

All endpoints are under `/api`. Authenticated requests send `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Register (candidate / recruiter) |
| POST | `/auth/login` | public | Login, returns JWT + user |
| GET | `/auth/me` | any | Current user |
| PUT | `/profile` | any | Update profile |
| PUT | `/profile/password` | any | Change password |
| POST | `/profile/resume` | candidate | Upload resume (multipart `file`) |
| GET | `/profile/resume/{candidateId}` | owner / recruiter of applied job / admin | Download resume |
| GET | `/jobs?q=&location=&type=` | public | Search open jobs |
| GET | `/jobs/{id}` | public | Job details |
| POST | `/jobs` | recruiter | Create job |
| PUT | `/jobs/{id}` | owner / admin | Update job |
| PATCH | `/jobs/{id}/status` | owner / admin | Open / close job |
| DELETE | `/jobs/{id}` | owner / admin | Delete job (cascades) |
| GET | `/recruiter/jobs` | recruiter | My job postings |
| POST | `/applications` | candidate | Apply `{ jobId, coverLetter }` |
| GET | `/applications/mine` | candidate | My applications |
| GET | `/applications?jobId=` | recruiter / admin | Applicants |
| GET | `/applications/{id}` | involved users | Application details |
| PATCH | `/applications/{id}/status` | job owner / admin | `{ status, recruiterNotes }` |
| DELETE | `/applications/{id}` | candidate | Withdraw |
| GET | `/interviews` | any (role-scoped) | Interviews |
| POST | `/interviews` | job owner / admin | Schedule |
| PUT | `/interviews/{id}` | job owner / admin | Reschedule / status / feedback |
| DELETE | `/interviews/{id}` | job owner / admin | Delete |
| GET | `/notifications` | any | Latest notifications + unread count |
| PATCH | `/notifications/{id}/read`, `/notifications/read-all` | any | Mark read |
| GET | `/dashboard` | any (role-scoped) | Statistics |
| GET/POST | `/admin/users` | admin | List (`?role=`) / create users |
| PATCH | `/admin/users/{id}/active` | admin | Activate / deactivate |
| DELETE | `/admin/users/{id}` | admin | Delete user and their data |
| GET | `/admin/jobs` | admin | All jobs |
| GET | `/admin/activity` | admin | Audit log |

Errors always return JSON: `{ "message": "..." }` with an appropriate HTTP status (400, 401, 403, 404, 409).

---

## Database design

```
users (1) ──< jobs (1) ──< applications >── (1) users[candidate]
                                │
                                └──< interviews
users (1) ──< notifications
activity_logs (standalone audit trail)
```

- `applications` has a unique constraint on `(job_id, candidate_id)`, so a candidate can apply to a job only once.
- Resumes are stored in MySQL (`resume_files`), so uploads survive restarts on cloud hosts.
- Deleting a job removes its applications and interviews. Deleting a user (admin) removes their jobs or applications.

See `database/schema.sql` for full DDL.

---

## Building for production

```bash
docker build -t hiretrack-ats .
docker run -p 8080:8080 -e DB_URL=... -e DB_USERNAME=... -e DB_PASSWORD=... -e JWT_SECRET=... hiretrack-ats
```

The Dockerfile builds the React app, bundles it into the Spring Boot jar, and serves everything on port 8080. Deployment steps are in [DEPLOY.md](DEPLOY.md).

---

## Streamlit edition (`streamlit_app/`)

A Python version of the same ATS (admin, recruiter and candidate modules, application tracking, interviews, notifications and dashboard), built with Streamlit + SQLAlchemy. It's handy for a quick live demo on **Streamlit Community Cloud**.

**Run locally**
```bash
pip install -r streamlit_app/requirements.txt
streamlit run streamlit_app/app.py
```
The same demo accounts work (`admin@ats.com / admin123`, and so on).

**Deploy on Streamlit Community Cloud**
1. Go to https://share.streamlit.io and sign in with GitHub.
2. Click **Create app** and choose this repository, branch `main`, main file `streamlit_app/app.py`.
3. Click **Deploy**.

**Database:** by default it uses a built-in SQLite file. On Streamlit Cloud that file is **reset whenever the app restarts or sleeps**, and the demo data is re-seeded. To keep data permanently, use MySQL. In the app's **Settings → Secrets**, add:
```toml
DATABASE_URL = "mysql+pymysql://USER:PASSWORD@HOST:PORT/DATABASE"
```
You can use a free hosted MySQL database (for example Aiven). Tables are created automatically.
