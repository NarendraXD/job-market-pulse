import os
import requests
import psycopg2
from datetime import date
from dotenv import load_dotenv
load_dotenv()

APP_ID = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

# The roles we're tracking — this maps our internal category name
# to the search term we send Adzuna
ROLE_QUERIES = {
    "Data Analyst": "data analyst",
    "MERN Developer": "mern developer",
    "Full Stack Developer": "full stack developer",
    "Software Engineer": "software engineer",
}

BASE_URL = "https://api.adzuna.com/v1/api/jobs/in/search/{page}"


def fetch_jobs_for_role(role_category, query, max_pages=2):
    """Pull job listings from Adzuna for a given role query."""
    all_jobs = []
    for page in range(1, max_pages + 1):
        params = {
            "app_id": APP_ID,
            "app_key": APP_KEY,
            "what": query,
            "where": "india",
            "results_per_page": 50,
            "content-type": "application/json",
        }
        url = BASE_URL.format(page=page)
        resp = requests.get(url, params=params)
        if resp.status_code != 200:
            print(f"  [warn] {role_category} page {page} failed: {resp.status_code}")
            break
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        for job in results:
            job["_role_category"] = role_category
        all_jobs.extend(results)
    return all_jobs


def get_or_create(cur, table, id_col, unique_col, value, extra_cols=None):
    """Generic helper: look up a row by unique value, insert if missing, return its id."""
    cur.execute(f"SELECT {id_col} FROM {table} WHERE {unique_col} = %s", (value,))
    row = cur.fetchone()
    if row:
        return row[0]

    cols = [unique_col] + list((extra_cols or {}).keys())
    vals = [value] + list((extra_cols or {}).values())
    placeholders = ", ".join(["%s"] * len(vals))
    cur.execute(
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders}) RETURNING {id_col}",
        vals,
    )
    return cur.fetchone()[0]


def insert_job(cur, job, role_category):
    company_name = (job.get("company") or {}).get("display_name", "Unknown")
    city = (job.get("location") or {}).get("area", ["Unknown"])[-1] if job.get("location") else "Unknown"

    company_id = get_or_create(cur, "companies", "company_id", "name", company_name)
    location_id = get_or_create(cur, "locations", "location_id", "city", city, {"state": None})

    external_id = str(job.get("id"))
    title = job.get("title", "")[:255]
    description = job.get("description", "")
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")
    posted_date = job.get("created", "")[:10] or None
    url = job.get("redirect_url")

    cur.execute(
        """
        INSERT INTO jobs (
            source, external_id, title, role_category, company_id, location_id,
            description, salary_min, salary_max, posted_date, url, last_seen_at
        ) VALUES (
            'adzuna', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (source, external_id)
        DO UPDATE SET last_seen_at = NOW()
        RETURNING job_id
        """,
        (external_id, title, role_category, company_id, location_id,
         description, salary_min, salary_max, posted_date, url),
    )
    job_id = cur.fetchone()[0]

    # Log today's snapshot for time-series tracking
    cur.execute(
        """
        INSERT INTO job_daily_snapshot (snapshot_date, job_id)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
        """,
        (date.today(), job_id),
    )
    return job_id


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    total_inserted = 0
    for role_category, query in ROLE_QUERIES.items():
        print(f"Fetching: {role_category} ...")
        jobs = fetch_jobs_for_role(role_category, query)
        print(f"  -> {len(jobs)} jobs found")
        for job in jobs:
            insert_job(cur, job, role_category)
            total_inserted += 1
        conn.commit()

    cur.close()
    conn.close()
    print(f"Done. Processed {total_inserted} job records.")


if __name__ == "__main__":
    main()