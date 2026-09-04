# 23 Portal Tender Intelligence Platform

Full-stack tender scraper and search dashboard for Indian government procurement portals. The app uses Next.js for the UI, Express/TypeScript for the API, Prisma for database access, and PostgreSQL for storage.

## Current Status

- Backend runs on `http://localhost:4001` in the local setup.
- Frontend runs on `http://localhost:3001`.
- PostgreSQL is connected through `backend/.env`.
- 22 portals are registered in the system, with 21 currently enabled in the local configuration.
- Admin users can run scrapers, trigger full sweeps, view sessions, and manage admin-only operations.
- Normal users can log in, search tenders, view portal status, and manage alerts, but cannot trigger scraper jobs.

## Project Structure

```text
backend/     Express API, Prisma schema, auth, scraper registry, portal adapters
frontend/    Next.js dashboard, login/signup, role-based UI, scraper controls
docs/        Portal feasibility notes and environment limitations
scripts/     Smoke-test helper scripts
```

## Local Setup

### Database

Create or use a local PostgreSQL database and configure `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:8010@localhost:5432/RRP?schema=public
PORT=4001
CORS_ALLOWED_ORIGINS=http://localhost:3001
PORTAL_SCRAPE_ENABLED=true
SCRAPE_ON_STARTUP=true
```

The local PostgreSQL password used on this machine is `8010`.

### Backend

```powershell
cd "C:\Users\rajpu\OneDrive\Desktop\23 portal\backend"
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed:auth
npm run dev
```

Health check:

```text
http://localhost:4001/health
```

Expected response:

```json
{ "status": "ok", "database": "connected" }
```

### Frontend

Configure `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Run:

```powershell
cd "C:\Users\rajpu\OneDrive\Desktop\23 portal\frontend"
npm install
npm run dev -- -p 3001
```

Open:

```text
http://localhost:3001
```

## Authentication And Roles

The app uses database-backed users, bcrypt password hashes, and HTTP-only session cookies.

Seed local accounts with:

```powershell
cd backend
npm run seed:auth
```

Set these ignored local environment variables before seeding when you need custom accounts:

```env
SEED_ADMIN_EMAIL=2317053@ritindia.edu
SEED_USER_EMAIL=user@rrpgroups.in
SEED_USER_PASSWORD=sandesh@8010
```

Role behavior:

- `admin`: can run portal scrapers, start full sweeps, use assisted scraping, view active sessions, and run backups.
- `user`: can search and view tender data, portal status, activity, and alerts.
- Login is role-aware. Selecting Admin Login rejects a normal user account, and selecting User Login rejects admin-only expectations.
- Signup creates normal user accounts. Admin access should be assigned by the system owner through trusted configuration or database administration.
- The login screen does not display seeded credentials. Keep real passwords in ignored `.env` files or deployment secrets only.

Do not print real account credentials in the UI or commit them to Git.

## Scraper Behavior

The scraper system is built around one registry and multiple portal adapters:

- GeM uses its public listing/API flow.
- NIC GePNIC-style portals use shared HTML parsing and organization-page crawling.
- Karnataka, Gujarat nProcure, Telangana, Andhra Pradesh, Bihar, and other non-identical portals use dedicated adapters.
- Scrape runs are stored in PostgreSQL as `ScrapeRun` rows.
- Tender records are upserted by `(portal, tenderId)` to avoid duplicates.
- Search reads stored tender data from PostgreSQL.

Admin scraper controls:

- `Scrape New`: runs incremental scraping across enabled portals.
- `Full Sweep`: queues a full sweep across enabled portals.
- Portal cards can trigger single-portal scraping.
- Activity shows recent scraper runs and their status.

Important: this project does not bypass CAPTCHAs, OTPs, or login walls. Portals that require CAPTCHA or human login must use assisted scraping, where an admin opens the portal, completes the required human step, and then imports visible tender rows. This keeps the scraper lawful and reliable instead of trying to defeat access controls.

## Email Alerts

Users can open the Alerts tab, choose keywords, and turn email alerts on or off. After scraper cycles, matching new tenders are sent as one digest per user and recorded so the same tender is not emailed twice.

Admin users can open the Sessions tab to see alert recipients, whether sending is active or paused for each user, and which keywords each recipient selected.

Configure SMTP in `backend/.env` before expecting real email delivery:

```env
ALERTS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@example.com
SMTP_APP_PASSWORD=your-email-app-password
ALERT_FROM_EMAIL=your-sender@example.com
ALERT_DEFAULT_RECIPIENTS=recipient1@example.com,recipient2@example.com
```

When `ALERTS_ENABLED=false`, the alert cycle still runs safely but skips sending email.

## Docker Setup

Docker Compose runs PostgreSQL, backend, and frontend together:

```powershell
cd "C:\Users\rajpu\OneDrive\Desktop\23 portal"
docker compose up --build
```

Docker URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000/health
```

## Verification

Run these before pushing changes:

```powershell
cd backend
npm run build

cd ..\frontend
npm run build
```

Optional API check:

```powershell
Invoke-RestMethod http://localhost:4001/health
```

Expected local behavior:

- Login page shows Admin Login and User Login tabs.
- No local test credentials are displayed on the login page.
- Admin login shows admin-only scraper actions.
- User login hides scraper actions.
- User API calls to trigger scrapers return `Admin access required`.
- `/api/portals` returns the registered portal list after login.

## Git Hygiene

Ignored local files include:

- `.env` and `.env.local`
- `node_modules/`
- `.next/` and `dist/`
- logs, temporary files, local cookie files, backup folders, and zip exports

Do not commit secrets, cookies, real database backups, generated build output, or local tool state.

## Push To GitHub

The Git remote for the source project is:

```text
https://github.com/Pawan8010/allportalsscraper.git
```

Before pushing, verify the working tree contains only source/docs changes:

```powershell
git status --short
git add .
git commit -m "Complete role based auth and scraper admin controls"
git push origin main
```

If GitHub asks for credentials, use your GitHub account or a personal access token with push permission for this repository.
