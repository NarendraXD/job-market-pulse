import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "sslmode": "require",
    "connect_timeout": 10,
}

# Maps each detectable phrase -> canonical skill name.
# Multiple phrases can map to the same canonical name, so variants
# like "node" / "node.js" / "nodejs" collapse into one skill.
SKILL_ALIASES = {
    "python": "Python",
    "sql": "SQL",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "react.js": "React",
    "node.js": "Node.js",
    "node": "Node.js",
    "nodejs": "Node.js",
    "express": "Express",
    "express.js": "Express",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "git": "Git",
    "power bi": "Power BI",
    "tableau": "Tableau",
    "excel": "Excel",
    "django": "Django",
    "flask": "Flask",
    "spring boot": "Spring Boot",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "html": "HTML",
    "css": "CSS",
    "tailwind": "Tailwind CSS",
    "rest api": "REST API",
    "graphql": "GraphQL",
    "machine learning": "Machine Learning",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "data analysis": "Data Analysis",
    "etl": "ETL",
    "airflow": "Airflow",
    "spark": "Spark",
    "hadoop": "Hadoop",
    "r programming": "R",
    "sas": "SAS",
    "vba": "VBA",
    "linux": "Linux",
    "ci/cd": "CI/CD",
    "jenkins": "Jenkins",
    "redux": "Redux",
    "firebase": "Firebase",
}

# Build regex patterns once — word-boundary matching avoids false positives
# like matching "r" inside "server". Special characters (., +, #) are escaped.
SKILL_PATTERNS = {
    phrase: re.compile(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", re.IGNORECASE)
    for phrase in SKILL_ALIASES
}


def get_or_create_skill(cur, name):
    cur.execute("SELECT skill_id FROM skills WHERE name = %s", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO skills (name) VALUES (%s) RETURNING skill_id", (name,))
    return cur.fetchone()[0]


def extract_skills_from_text(text):
    """Return the set of canonical skill names found in text (deduped)."""
    if not text:
        return []
    found = set()
    for phrase, pattern in SKILL_PATTERNS.items():
        if pattern.search(text):
            found.add(SKILL_ALIASES[phrase])
    return list(found)


def main():
    print("Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print("Connected.")

    cur.execute("SELECT job_id, description FROM jobs")
    jobs = cur.fetchall()
    print(f"Scanning {len(jobs)} jobs for skills...")

    total_links = 0
    for idx, (job_id, description) in enumerate(jobs, 1):
        matched = extract_skills_from_text(description)
        for skill_name in matched:
            skill_id = get_or_create_skill(cur, skill_name)
            cur.execute(
                """
                INSERT INTO job_skills (job_id, skill_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (job_id, skill_id),
            )
            total_links += 1
        if idx % 50 == 0:
            print(f"  ...{idx}/{len(jobs)} jobs scanned")
            conn.commit()

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done. Created {total_links} job-skill links.")


if __name__ == "__main__":
    main()