const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());

// Top skills overall, or filtered by role_category via ?role=
app.get('/api/skills', async (req, res) => {
  const { role } = req.query;
  try {
    let query, params;
    if (role) {
      query = `
        SELECT s.name, COUNT(*) AS demand
        FROM job_skills js
        JOIN skills s ON js.skill_id = s.skill_id
        JOIN jobs j ON js.job_id = j.job_id
        WHERE j.role_category = $1
        GROUP BY s.name
        ORDER BY demand DESC
        LIMIT 15;
      `;
      params = [role];
    } else {
      query = `
        SELECT s.name, COUNT(*) AS demand
        FROM job_skills js
        JOIN skills s ON js.skill_id = s.skill_id
        GROUP BY s.name
        ORDER BY demand DESC
        LIMIT 15;
      `;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Job counts per role category
app.get('/api/role-counts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT role_category, COUNT(*) AS total
      FROM jobs
      GROUP BY role_category
      ORDER BY total DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch role counts' });
  }
});

// Daily posting volume over time (from job_daily_snapshot)
app.get('/api/daily-volume', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT snapshot_date, COUNT(*) AS total
      FROM job_daily_snapshot
      GROUP BY snapshot_date
      ORDER BY snapshot_date;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch daily volume' });
  }
});

// Top hiring companies
app.get('/api/top-companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.name, COUNT(*) AS total
      FROM jobs j
      JOIN companies c ON j.company_id = c.company_id
      GROUP BY c.name
      ORDER BY total DESC
      LIMIT 10;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top companies' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));