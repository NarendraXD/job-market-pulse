CREATE TABLE IF NOT EXISTS companies (
    company_id      SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations (
    location_id     SERIAL PRIMARY KEY,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'India',
    UNIQUE (city, state, country)
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id          SERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL,
    external_id     VARCHAR(255) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    role_category   VARCHAR(100),
    company_id      INTEGER REFERENCES companies(company_id),
    location_id     INTEGER REFERENCES locations(location_id),
    description     TEXT,
    salary_min      NUMERIC(12,2),
    salary_max      NUMERIC(12,2),
    salary_currency VARCHAR(10) DEFAULT 'INR',
    posted_date     DATE,
    first_seen_at   TIMESTAMP DEFAULT NOW(),
    last_seen_at    TIMESTAMP DEFAULT NOW(),
    url             TEXT,
    UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id        SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_skills (
    job_id          INTEGER REFERENCES jobs(job_id) ON DELETE CASCADE,
    skill_id        INTEGER REFERENCES skills(skill_id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS job_daily_snapshot (
    snapshot_date   DATE NOT NULL,
    job_id          INTEGER REFERENCES jobs(job_id) ON DELETE CASCADE,
    PRIMARY KEY (snapshot_date, job_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_role_category ON jobs(role_category);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill_id);