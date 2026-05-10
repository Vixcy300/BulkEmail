import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';
import { toast } from './ToastContainer';

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const TrashIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function DetailModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📧 Email Log Details</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-detail-row">
          <label>Subject</label>
          <p>{log.subject}</p>
        </div>

        <div className="modal-detail-row">
          <label>Status</label>
          <div style={{ marginTop: '4px' }}><StatusBadge status={log.status} /></div>
        </div>

        <div className="modal-detail-row">
          <label>Sent At</label>
          <p>{formatDate(log.sentAt)}</p>
        </div>

        <div className="modal-detail-row">
          <label>Delivery — {log.successCount} success, {log.failCount} failed</label>
          <div style={{ marginTop: '4px' }}>
            <div className="progress-bar-wrap">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.round((log.successCount / (log.successCount + log.failCount || 1)) * 100)}%`,
                  background: log.status === 'failed' ? 'var(--danger)' : undefined,
                }}
              />
            </div>
          </div>
        </div>

        <div className="modal-detail-row">
          <label>Recipients ({log.recipients.length})</label>
          <div className="recipients-chips">
            {log.recipients.map((r) => (
              <span key={r} className="recipient-chip">{r}</span>
            ))}
          </div>
        </div>

        <div className="modal-detail-row">
          <label>Message Body</label>
          <p>{log.body}</p>
        </div>

        {log.errorMessage && (
          <div className="modal-detail-row">
            <label>Error Details</label>
            <p style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{log.errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryTable({ refreshTrigger }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email/history?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error('Error', 'Failed to fetch email history.');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory, refreshTrigger]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this email log?')) return;
    try {
      await axios.delete(`/api/email/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Deleted', 'Email log removed.');
      fetchHistory();
    } catch {
      toast.error('Error', 'Could not delete log.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading history...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3>No emails sent yet</h3>
        <p>Sent emails will appear here with full delivery details.</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Recipients</th>
              <th>Status</th>
              <th>Delivery</th>
              <th>Sent At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log._id} onClick={() => setSelectedLog(log)}>
                <td className="td-muted">{(page - 1) * 10 + i + 1}</td>
                <td style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.subject}
                </td>
                <td className="td-muted">{log.recipients.length} addresses</td>
                <td><StatusBadge status={log.status} /></td>
                <td className="td-muted">
                  <span style={{ color: 'var(--success)' }}>{log.successCount}✓</span>
                  {log.failCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: '6px' }}>{log.failCount}✗</span>}
                </td>
                <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(log.sentAt)}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleDelete(e, log._id)}
                    title="Delete log"
                    id={`delete-log-${log._id}`}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="pagination-info">Showing {logs.length} of {total} records</span>
        <div className="pagination-btns">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ padding: '7px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </>
  );
}
