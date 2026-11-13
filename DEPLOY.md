# Deploying HireTrack ATS (free tier)

The app ships as **one Docker image**: Spring Boot serves the REST API under `/api` and the built React app on all other paths. You need two things:

| Piece | Service | Cost |
|---|---|---|
| App (React + Spring Boot) | [Render](https://render.com) web service | Free. Sleeps after 15 min idle; the first visit after that takes about 1 minute |
| MySQL database | [Aiven for MySQL](https://aiven.io/mysql) | Free plan |

Total time: about 15 minutes.

---

## Step 1 — Push the code to GitHub

1. Create a **new empty repository** on GitHub, e.g. `hiretrack-ats`. Don't add a README or a .gitignore.
2. In this project folder, run:

```bash
git remote add origin https://github.com/<your-username>/hiretrack-ats.git
git push -u origin main
```

---

## Step 2 — Create the free MySQL database (Aiven)

1. Sign up at **https://console.aiven.io** and click **Create service** → **MySQL** → choose the **Free** plan and any region near you.
2. Wait until the service shows **Running** (about 2–5 minutes).
3. On the service **Overview** page, note the **Host**, **Port**, **User** (`avnadmin`) and **Password**. The database name is `defaultdb`.
4. Build your JDBC URL from those values:

```
jdbc:mysql://<HOST>:<PORT>/defaultdb?sslMode=REQUIRED
```

Example: `jdbc:mysql://mysql-1a2b3c-you.aivencloud.com:12345/defaultdb?sslMode=REQUIRED`

You don't need to create any tables. The app creates them on first start.

---

## Step 3 — Deploy the app on Render

1. Sign up at **https://render.com** with your GitHub account.
2. Click **New** → **Blueprint** and select your `hiretrack-ats` repository. Render reads `render.yaml` from the repo.
3. Render asks for the environment variables marked as secret. Enter:

| Key | Value |
|---|---|
| `DB_URL` | the JDBC URL from Step 2 |
| `DB_USERNAME` | `avnadmin` |
| `DB_PASSWORD` | your Aiven password |

`JWT_SECRET` is generated automatically.

4. Click **Apply**. The first build takes about 5–8 minutes (it compiles the React app and Spring Boot inside Docker).
5. When the status shows **Live**, open the URL Render gives you, e.g. `https://hiretrack-ats.onrender.com`.

Log in with the demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@ats.com | admin123 |
| Recruiter | recruiter@ats.com | recruiter123 |
| Candidate | candidate@ats.com | candidate123 |

> **After demoing, change the admin password** (Profile → Change password). Alternatively, set `SEED_DEMO_DATA=false` before the first deploy for a clean database. In that case, create your admin account directly in MySQL.

---

## Updating the live site

Every `git push` to `main` triggers an automatic redeploy on Render.

---

## Alternative: Railway (all-in-one, paid after trial credit)

1. At https://railway.app create a **New Project** → **Deploy from GitHub repo**. The Dockerfile is detected automatically.
2. In the same project click **New** → **Database** → **MySQL**.
3. In the app service, open **Variables** and add:
   - `DB_URL` = `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}`
   - `DB_USERNAME` = `${{MySQL.MYSQLUSER}}`
   - `DB_PASSWORD` = `${{MySQL.MYSQLPASSWORD}}`
   - `JWT_SECRET` = any random string of 32+ characters
4. Under **Settings → Networking**, click **Generate Domain**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Render build fails at `npm ci` | Make sure `frontend/package-lock.json` is committed |
| App crashes with `Communications link failure` | Check `DB_URL` host and port, and that it ends with `?sslMode=REQUIRED` for Aiven |
| `Access denied for user` | Wrong `DB_USERNAME` or `DB_PASSWORD` |
| Site takes ~1 min to load | Normal on Render's free plan after idling. To keep it awake, ping `/api/jobs` every 10 min with a free monitor such as UptimeRobot |
| Out of memory on Render | The image already limits Java heap to 75% of RAM; redeploy, or upgrade to the Starter plan |

Logs: Render dashboard → your service → **Logs**.
