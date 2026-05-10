import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import HistoryTable from '../components/HistoryTable';
import ToastContainer from '../components/ToastContainer';

export default function History() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app-layout">
      <Navbar />
      <ToastContainer />
      <main className="main-content">
        <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1>Email History</h1>
            <p>All previously sent bulk emails with full delivery details.</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setRefreshKey((k) => k + 1)}
            id="refresh-history-btn"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>📋 Sent Emails</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Click any row to view full details. Records are sorted newest first.
            </p>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <HistoryTable refreshTrigger={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}
