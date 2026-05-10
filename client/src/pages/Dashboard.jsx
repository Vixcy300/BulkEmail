import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import EmailForm from '../components/EmailForm';
import ToastContainer from '../components/ToastContainer';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/email/history?page=1&limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logs = res.data.logs;
      setStats({
        total: res.data.total,
        sent: logs.reduce((acc, l) => acc + (l.successCount || 0), 0),
        failed: logs.reduce((acc, l) => acc + (l.failCount || 0), 0),
      });
    } catch {
      // stats are non-critical
    }
  };

  useEffect(() => { fetchStats(); }, [refreshKey]);

  const handleEmailSent = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app-layout">
      <Navbar />
      <ToastContainer />
      <main className="main-content">
        <div className="page-header">
          <h1>Compose & Send</h1>
          <p>Send emails to multiple recipients in one go.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sends</div>
            <div className="stat-value accent">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Delivered</div>
            <div className="stat-value success">{stats.sent}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value danger">{stats.failed}</div>
          </div>
        </div>

        {/* Email Compose Card */}
        <div className="card">
          <div className="card-header">
            <h2>📝 New Email</h2>
            <p>Fill in the details below and click Send.</p>
          </div>
          <EmailForm onEmailSent={handleEmailSent} />
        </div>
      </main>
    </div>
  );
}
