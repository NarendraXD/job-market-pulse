import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
  RadialBarChart, RadialBar
} from 'recharts';
import axios from 'axios';
import { LayoutDashboard, TrendingUp, Building2, Code2, Settings, Radio } from 'lucide-react';
import './App.css';

const API_BASE = 'https://job-market-pulse-api.onrender.com/api';
const ROLES = ['Data Analyst', 'MERN Developer', 'Full Stack Developer', 'Software Engineer'];
const COLORS = ['#ffb020', '#4ade80', '#60a5fa', '#f87171'];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="tooltip-value">{p.name || p.dataKey}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

function RingStat({ label, value, ringValue, ringMax, color }) {
  const data = [{ value: Math.min(100, (ringValue / ringMax) * 100) }];
  return (
    <div className="ring-stat">
      <div className="ring-chart">
        <ResponsiveContainer width={56} height={56}>
          <RadialBarChart
            innerRadius="70%" outerRadius="100%"
            data={data} startAngle={90} endAngle={-270}
          >
            <RadialBar dataKey="value" fill={color} background={{ fill: '#1c2523' }} cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="ring-text">
        <span className="ring-value">{value}</span>
        <span className="ring-label">{label}</span>
      </div>
    </div>
  );
}

function App() {
  const [selectedRole, setSelectedRole] = useState('Data Analyst');
  const [skills, setSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [roleCounts, setRoleCounts] = useState([]);
  const [dailyVolume, setDailyVolume] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);

  const [activeSection, setActiveSection] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);

  const overviewRef = useRef(null);
  const skillsRef = useRef(null);
  const trendsRef = useRef(null);
  const employersRef = useRef(null);

  const scrollToSection = (ref, name) => {
    setActiveSection(name);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    axios.get(`${API_BASE}/skills`, { params: { role: selectedRole } })
      .then(res => setSkills(res.data.map(s => ({ ...s, demand: Number(s.demand) }))));
  }, [selectedRole]);

  useEffect(() => {
    axios.get(`${API_BASE}/skills`).then(res =>
      setAllSkills(res.data.map(s => ({ ...s, demand: Number(s.demand) })))
    );
    axios.get(`${API_BASE}/role-counts`).then(res =>
      setRoleCounts(res.data.map(r => ({ ...r, total: Number(r.total) })))
    );
    axios.get(`${API_BASE}/daily-volume`).then(res =>
      setDailyVolume(res.data.map(d => ({ ...d, total: Number(d.total) })))
    );
    axios.get(`${API_BASE}/top-companies`).then(res =>
      setTopCompanies(res.data.map(c => ({ ...c, total: Number(c.total) })))
    );
  }, []);

  const totalJobs = roleCounts.reduce((sum, r) => sum + Number(r.total), 0);
  const daysTracked = dailyVolume.length;
  const tickerItems = allSkills.length ? [...allSkills, ...allSkills] : [];

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Radio size={20} color="#ffb020" />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            title="Overview"
            onClick={() => scrollToSection(overviewRef, 'overview')}
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            className={`nav-item ${activeSection === 'skills' ? 'active' : ''}`}
            title="Skills"
            onClick={() => scrollToSection(skillsRef, 'skills')}
          >
            <Code2 size={18} />
          </button>
          <button
            className={`nav-item ${activeSection === 'trends' ? 'active' : ''}`}
            title="Trends"
            onClick={() => scrollToSection(trendsRef, 'trends')}
          >
            <TrendingUp size={18} />
          </button>
          <button
            className={`nav-item ${activeSection === 'employers' ? 'active' : ''}`}
            title="Employers"
            onClick={() => scrollToSection(employersRef, 'employers')}
          >
            <Building2 size={18} />
          </button>
        </nav>
        <div className="settings-wrap">
          <button
            className="nav-item nav-bottom"
            title="Settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={18} />
          </button>
          {showSettings && (
            <div className="settings-panel">
              <div className="settings-title">DISPLAY</div>
              <label className="settings-row">
                <span>Ticker scroll</span>
                <input
                  type="checkbox"
                  checked={!tickerPaused}
                  onChange={() => setTickerPaused(!tickerPaused)}
                />
              </label>
            </div>
          )}
        </div>
      </aside>

      <div className="app">
        {/* Ticker */}
        <div className="ticker-wrap">
          <div
            className="ticker-track"
            style={{ animationPlayState: tickerPaused ? 'paused' : 'running' }}
          >
            {tickerItems.map((s, i) => (
              <span className="ticker-item" key={i}>
                <span className="ticker-dot" />
                {s.name.toUpperCase()} <span className="ticker-val">{s.demand}</span>
              </span>
            ))}
          </div>
        </div>

        <header className="header">
          <div className="header-top">
            <span className="live-pulse"><span className="pulse-dot" />LIVE</span>
            <span className="header-meta">SOURCE: ADZUNA · REGION: IN</span>
          </div>
          <h1>Job Market Pulse</h1>
          <p className="header-sub">Tracking real-time hiring signal across India's tech market — skill demand, role velocity, employer activity.</p>
        </header>

        <section className="metrics-row" ref={overviewRef}>
          <RingStat label="Jobs Tracked" value={totalJobs || '—'} ringValue={totalJobs} ringMax={500} color="#ffb020" />
          <RingStat label="Days Live" value={daysTracked || '—'} ringValue={daysTracked} ringMax={14} color="#4ade80" />
          <RingStat label="Roles Monitored" value={roleCounts.length || '—'} ringValue={roleCounts.length} ringMax={4} color="#60a5fa" />
          <RingStat label="Employers Seen" value={topCompanies.length ? `${topCompanies.length}+` : '—'} ringValue={topCompanies.length} ringMax={10} color="#f87171" />
        </section>

        <div className="panel-grid">
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">ROLE DISTRIBUTION</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleCounts}
                  dataKey="total"
                  nameKey="role_category"
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {roleCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0a0d0d" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend-list">
              {roleCounts.map((r, i) => (
                <div className="legend-row" key={i}>
                  <span className="legend-swatch" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="legend-name">{r.role_category}</span>
                  <span className="legend-count">{r.total}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" ref={employersRef}>
            <div className="panel-head">
              <span className="panel-title">TOP EMPLOYERS</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topCompanies} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1c2523" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7f7a', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#1c2523' }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} interval={0} tick={{ fill: '#c9d4d1', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,176,32,0.05)' }} />
                <Bar dataKey="total" fill="#ffb020" radius={[0, 2, 2, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        <section className="panel" ref={skillsRef}>
          <div className="panel-head">
            <span className="panel-title">SKILL DEMAND</span>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={skills} layout="vertical" margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2523" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7f7a', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#1c2523' }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} interval={0} tick={{ fill: '#c9d4d1', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,222,128,0.05)' }} />
              <Bar dataKey="demand" fill="#4ade80" radius={[0, 2, 2, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel" ref={trendsRef}>
          <div className="panel-head">
            <span className="panel-title">POSTING VOLUME / DAY</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyVolume}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2523" vertical={false} />
              <XAxis
                dataKey="snapshot_date"
                tick={{ fill: '#6b7f7a', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#1c2523' }}
                tickLine={false}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fill: '#6b7f7a', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#4ade80" strokeWidth={1.5} fill="url(#volGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <footer className="footer">
          BUILT BY NARENDRA KUMAR AHIRWAR · POSTGRESQL + EXPRESS + REACT · DATA REFRESHES DAILY
        </footer>
      </div>
    </div>
  );
}

export default App;