# Job Market Pulse

A live data pipeline that tracks India's tech hiring market in near real-time — built end-to-end: scraping, database design, backend API, and a React dashboard.

**Live demo:** https://job-market-pulse.vercel.app/
**Backend API:** https://job-market-pulse-api.onrender.com/

---

## What it does

Job Market Pulse pulls live job postings daily from the Adzuna API across four role categories — Data Analyst, MERN Developer, Full Stack Developer, and Software Engineer — and turns them into a queryable dataset with skill-demand analysis, role distribution, hiring trends, and top-employer tracking.

It's built to answer a real question I had while job hunting: **what do Data Analyst postings actually ask for, versus MERN/full-stack roles, in today's market — not last year's blog post?**

## Architecture
Adzuna API → Python scraper → PostgreSQL → Express API → React dashboard

- **Scraper** (`scraper/fetch_jobs.py`) — pulls postings daily, dedupes via `(source, external_id)`, and logs a daily snapshot for time-series tracking.
- **Skill extraction** (`scraper/extract_skills.py`) — keyword-matches job descriptions against a curated skill list, with alias normalization (e.g. "node" / "node.js" / "nodejs" all collapse into one canonical skill).
- **Database** (`db/schema.sql`) — normalized PostgreSQL schema: `jobs`, `companies`, `locations`, `skills`, `job_skills`, `job_daily_snapshot`.
- **Backend** (`backend/`) — Express API exposing skill demand, role counts, daily volume, and top-employer endpoints.
- **Dashboard** (`dashboard/`) — React + Vite frontend, terminal/market-ticker themed, using Recharts for visualization.

## Why these choices

- **Normalized schema over a flat table** — `jobs` references `companies`/`locations` by foreign key rather than storing repeated strings, so a query like "all jobs in Pune" or "postings per company" stays fast and clean as data grows.
- **Daily snapshot table** — rather than relying on a single `last_seen_at` timestamp, every scraper run logs which jobs were live that day. This is what makes the "posting volume over time" chart real time-series data instead of a single point-in-time count.
- **Keyword-based skill extraction over an LLM** — for a fixed, known vocabulary of tech skills, regex matching is faster, free, fully deterministic, and easy to defend/debug versus adding an LLM dependency for a task that doesn't need one.
- **Live backend API over static JSON export** — the dashboard queries Postgres directly through Express, so it reflects the database in real time rather than needing a manual re-export step every time new data lands.

## A bug worth mentioning

Early skill extraction counted "node" and "node.js" as two separate skills, splitting and understating real demand for Node.js. Fixed by introducing a `SKILL_ALIASES` mapping so multiple phrase variants collapse into one canonical skill name before being written to the database — a good reminder that keyword extraction needs a normalization layer, not just a match list.

## Key findings

Based on ~400 tracked postings across Data Analyst, MERN Developer, Full Stack Developer, and Software Engineer roles in India:

- **MERN Developer** postings are dominated by a near-textbook stack: Node.js, React, MongoDB, and Express all appear in 40%+ of postings.
- **Data Analyst** postings lead with SQL (ahead of any single BI tool), followed by general "data analysis," Python, Power BI, Excel, and ETL — reinforcing that SQL remains the baseline expectation over any specific dashboarding tool.
- Salary ranges are disclosed in only a small minority of India postings — tracked as its own metric rather than assumed, since Adzuna's India listings frequently omit compensation data.
- Posting volume held steady (~395-400/day) across the tracked window, with tracking currently spanning multiple days — daily automation runs via Windows Task Scheduler, with a known gap period documented below.

### A note on data collection reliability

The daily scraper runs via a local Windows Task Scheduler job, which depends on the machine being on and unlocked at the scheduled time — a few days were missed when the laptop was off. This is a good illustration of why production data pipelines belong on always-on infrastructure (e.g. a scheduled cloud job) rather than a personal machine; a natural next step for this project.
## Tech stack

- **Data collection:** Python, Adzuna API, `psycopg2`
- **Database:** PostgreSQL
- **Backend:** Node.js, Express
- **Frontend:** React, Vite, Recharts, Axios
- **Automation:** Windows Task Scheduler

## Running locally

```bash
# 1. Set up the database
psql -U postgres -d job_market -f db/schema.sql

# 2. Scraper (Python)
python -m venv venv
venv\Scripts\activate
pip install requests psycopg2-binary python-dotenv
python scraper/fetch_jobs.py
python scraper/extract_skills.py

# 3. Backend
cd backend
npm install
node server.js

# 4. Dashboard
cd dashboard
npm install
npm run dev
```

Requires a `.env` file (not committed) with Adzuna API credentials and Postgres connection details — see `.env.example` _(add one if you want to be thorough)_.

## Author

Narendra Kumar Ahirwar ([@NarendraXD](https://github.com/NarendraXD))
