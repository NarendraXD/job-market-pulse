@echo off
cd /d C:\Users\naren\Desktop\job-market-pulse
call venv\Scripts\activate.bat
python scraper\fetch_jobs.py >> logs\scraper_log.txt 2>&1