import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SendIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const HistoryIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MailIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default function Navbar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = admin?.username?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>📧 BulkMail</h1>
          <p>Admin Dashboard</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <SendIcon />
            Compose & Send
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <HistoryIcon />
            Email History
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-badge">
            <div className="admin-avatar">VI</div>
            <div className="admin-info">
              <span>Vignesh</span>
              <small>Core access</small>
            </div>
          </div>
          <button className="nav-link btn-ghost" onClick={handleLogout} style={{ width: '100%', marginBottom: '16px' }}>
            <LogoutIcon />
            Logout
          </button>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            Project by <a href="https://github.com/vignesh" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '500' }}>Vignesh</a>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailIcon />
          <strong style={{ fontSize: '0.95rem' }}>BulkMail</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
            Send
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
            History
          </NavLink>
          <button className="nav-link" onClick={handleLogout} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
            Logout
          </button>
        </div>
      </header>
    </>
  );
}
