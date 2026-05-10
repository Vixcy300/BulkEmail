import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';
import { toast } from './ToastContainer';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ─── Icons ────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ExcelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

// ─── Excel Upload Panel ───────────────────────────────────────────────────────
function ExcelUploader({ onEmailsImported }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null); // { filename, total, valid, invalid, emails[] }
  const [importing, setImporting] = useState(false);

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          const allEmails = [];

          // Scan all sheets
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            rows.forEach((row) => {
              row.forEach((cell) => {
                const val = String(cell).trim().toLowerCase();
                const emailMatches = val.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
                if (emailMatches) allEmails.push(...emailMatches);
              });
            });
          });

          // Deduplicate
          const unique = [...new Set(allEmails.map((e) => e.toLowerCase()))];
          const valid = unique.filter(isValidEmail);
          const invalid = unique.filter((e) => !isValidEmail(e));

          resolve({ unique, valid, invalid, filename: file.name });
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFile = async (file) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
    ];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Invalid file', 'Please upload an .xlsx, .xls, or .csv file.');
      return;
    }

    setImporting(true);
    try {
      let result;
      if (ext === 'csv') {
        const text = await file.text();
        const allEmails = [];
        const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
        allEmails.push(...emailMatches.map((e) => e.toLowerCase()));
        const unique = [...new Set(allEmails)];
        const valid = unique.filter(isValidEmail);
        const invalid = unique.filter((e) => !isValidEmail(e));
        result = { unique, valid, invalid, filename: file.name };
      } else {
        result = await parseExcelFile(file);
      }

      if (result.valid.length === 0 && result.invalid.length === 0) {
        toast.warning('No emails found', 'No email addresses were detected in the file.');
        setImporting(false);
        return;
      }

      setPreview(result);
    } catch (err) {
      toast.error('Parse Error', err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    if (!preview) return;
    onEmailsImported(preview.valid);
    toast.success('Imported!', `${preview.valid.length} email${preview.valid.length !== 1 ? 's' : ''} added from "${preview.filename}".`);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDiscard = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="excel-uploader">
      {/* Drop Zone */}
      {!preview && (
        <div
          className={`excel-dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            id="excel-file-input"
            onChange={(e) => { const f = e.target.files[0]; if (f) handleFile(f); }}
          />
          {importing ? (
            <div className="excel-dropzone-content">
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              <p>Parsing file...</p>
            </div>
          ) : (
            <div className="excel-dropzone-content">
              <div className="excel-drop-icon">
                <ExcelIcon />
              </div>
              <p className="excel-drop-title">
                {dragging ? 'Drop it here!' : 'Upload Excel / CSV'}
              </p>
              <p className="excel-drop-sub">
                Drag & drop or <span className="excel-browse-link" style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>browse</span> — .xlsx, .xls, .csv
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview Panel */}
      {preview && (
        <div className="excel-preview">
          <div className="excel-preview-header">
            <div className="excel-preview-icon">
              <ExcelIcon />
            </div>
            <div className="excel-preview-meta">
              <span className="excel-preview-filename">{preview.filename}</span>
              <span className="excel-preview-counts">
                <span className="excel-count-valid" style={{ color: 'var(--success)' }}>✓ {preview.valid.length} valid</span>
                {preview.invalid.length > 0 && (
                  <span className="excel-count-invalid" style={{ color: 'var(--danger)' }}> · ✗ {preview.invalid.length} invalid</span>
                )}
              </span>
            </div>
          </div>

          <div className="excel-email-scroll">
            {preview.valid.slice(0, 40).map((email) => (
              <span key={email} className="excel-email-chip">{email}</span>
            ))}
            {preview.valid.length > 40 && (
              <span className="excel-email-chip excel-more-chip" style={{ background: '#eee' }}>
                +{preview.valid.length - 40} more...
              </span>
            )}
          </div>

          <div className="excel-preview-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleImport} id="import-excel-btn">
              <UploadIcon />
              Import {preview.valid.length} Emails
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>
              <ClearIcon />
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Queue Progress Overlay ───────────────────────────────────────────────────
function QueueProgress({ logId, onComplete }) {
  const { token } = useAuth();
  const [log, setLog] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    
    // Trigger the actual sending process on the backend immediately.
    // On Vercel, this request will stay alive while sending emails.
    axios.post(`/api/email/process/${logId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(console.error);

    const fetchProgress = async () => {
      try {
        const res = await axios.get(`/api/email/history/${logId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLog(res.data);
        const s = res.data.status;
        if (s === 'success' || s === 'failed' || s === 'partial') {
          // Keep it visible for a moment if successful
          setTimeout(onComplete, 3000);
          clearInterval(interval);
        }
      } catch (err) {
        setError('Failed to track progress.');
        clearInterval(interval);
      }
    };

    fetchProgress();
    interval = setInterval(fetchProgress, 1500);
    return () => clearInterval(interval);
  }, [logId, token, onComplete]);

  if (!log && !error) return (
    <div className="queue-overlay">
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ marginTop: '20px', fontWeight: 600 }}>Initializing Queue...</p>
    </div>
  );

  const total = log?.recipients?.length || 0;
  const processed = (log?.successCount || 0) + (log?.failCount || 0);
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const s = log?.status;
  const isDone = s === 'success' || s === 'failed' || s === 'partial';

  // SVG Circle calculations
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="queue-overlay">
      <div className="queue-content">
        {!isDone ? (
          <>
            <h2 className="queue-title">Sending Emails<span className="sending-dots"></span></h2>
            <p className="queue-subtitle">Your campaign is being delivered in real-time.</p>
            
            <div className="progress-circle-wrap">
              <div className="pulse-border"></div>
              <svg width="240" height="240" viewBox="0 0 240 240">
                <circle className="progress-circle-bg" cx="120" cy="120" r={radius} />
                <circle 
                  className="progress-circle-fill" 
                  cx="120" cy="120" r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="progress-info">
                <span className="progress-number">{percent}%</span>
                <span className="progress-label">Complete</span>
              </div>
            </div>

            <div className="queue-stats">
              <div className="queue-stat-item">
                <span className="queue-stat-val success" style={{ color: 'var(--success)' }}>{log?.successCount}</span>
                <span className="queue-stat-label">Sent</span>
              </div>
              <div className="queue-stat-item">
                <span className="queue-stat-val" style={{ color: 'var(--text-main)' }}>{total - processed}</span>
                <span className="queue-stat-label">Remaining</span>
              </div>
              {log?.failCount > 0 && (
                <div className="queue-stat-item">
                  <span className="queue-stat-val danger" style={{ color: 'var(--danger)' }}>{log?.failCount}</span>
                  <span className="queue-stat-label">Failed</span>
                </div>
              )}
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Processing {processed} of {total} recipients...
            </p>
          </>
        ) : (
          <div className="success-state">
            <div className="success-icon-animated">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="queue-title" style={{ background: 'none', webkitTextFillColor: 'initial', color: 'var(--success)' }}>Campaign Delivered!</h2>
            <p className="queue-subtitle">All emails have been processed successfully.</p>
            <div className="queue-stats" style={{ marginTop: '24px' }}>
               <div className="queue-stat-item">
                <span className="queue-stat-val">{log?.successCount}</span>
                <span className="queue-stat-label">Delivered</span>
              </div>
              <div className="queue-stat-item">
                <span className="queue-stat-val">{log?.failCount}</span>
                <span className="queue-stat-label">Failed</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={onComplete} style={{ marginTop: '12px' }}>Back to Dashboard</button>
          </div>
        )}
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ─── Main EmailForm ───────────────────────────────────────────────────────────
export default function EmailForm({ onEmailSent }) {
  const { token } = useAuth();
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(''); // This will now hold HTML from Quill
  const [scheduledFor, setScheduledFor] = useState('');
  
  const [recipients, setRecipients] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [activeLogId, setActiveLogId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [showExcel, setShowExcel] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/templates', { headers: { Authorization: `Bearer ${token}` } });
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates', err);
    }
  };

  const handleLoadTemplate = (e) => {
    const id = e.target.value;
    setSelectedTemplate(id);
    if (!id) {
      setSubject('');
      setBody('');
      return;
    }
    const t = templates.find(temp => temp._id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject.trim() || !body.trim() || body.trim() === '<p><br></p>') {
      toast.error('Template Error', 'Subject and body are required to save a template.');
      return;
    }
    const name = window.prompt("Enter a name for this template:");
    if (!name) return;
    try {
      const res = await axios.post(
        '/api/templates', 
        { name, subject, body }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTemplates([res.data, ...templates]);
      setSelectedTemplate(res.data._id);
      toast.success('Template Saved', `Template "${name}" has been saved.`);
    } catch (err) {
      toast.error('Save Error', 'Could not save template.');
    }
  };

  const addRecipient = useCallback((email) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setRecipients((prev) => {
      if (prev.find((r) => r.email === trimmed)) return prev;
      return [...prev, { email: trimmed, valid: isValidEmail(trimmed) }];
    });
    setInputVal('');
    setErrors((e) => ({ ...e, recipients: '' }));
  }, []);

  const handleExcelImport = useCallback((emails) => {
    setRecipients((prev) => {
      const existing = new Set(prev.map((r) => r.email));
      const newOnes = emails
        .filter((e) => !existing.has(e))
        .map((e) => ({ email: e, valid: true }));
      return [...prev, ...newOnes];
    });
    setErrors((e) => ({ ...e, recipients: '' }));
    setShowExcel(false);
  }, []);

  const removeRecipient = (email) => {
    setRecipients((prev) => prev.filter((r) => r.email !== email));
  };

  const clearAll = () => {
    setRecipients([]);
    setErrors((e) => ({ ...e, recipients: '' }));
  };

  const handleKeyDown = (e) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addRecipient(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const emails = pasted.split(/[\s,;]+/).filter(Boolean);
    emails.forEach(addRecipient);
  };

  const validate = () => {
    const newErrors = {};
    if (!subject.trim()) newErrors.subject = 'Subject is required.';
    // Quill empty state is often '<p><br></p>'
    if (!body.trim() || body.trim() === '<p><br></p>') newErrors.body = 'Email body is required.';
    const validCount = recipients.filter((r) => r.valid).length;
    if (recipients.length === 0) newErrors.recipients = 'Add at least one recipient.';
    else if (validCount === 0) newErrors.recipients = 'No valid email addresses found.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputVal.trim()) addRecipient(inputVal);
    if (!validate()) return;

    const validEmails = recipients.filter((r) => r.valid).map((r) => r.email);
    setSending(true);
    setSendResult(null);

    try {
      const cleanBody = DOMPurify.sanitize(body); // Sanitize HTML
      const payload = { subject: subject.trim(), body: cleanBody, recipients: validEmails };
      
      if (scheduledFor) {
        payload.scheduledFor = new Date(scheduledFor).toISOString();
      }

      const res = await axios.post(
        '/api/email/send',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { status, message } = res.data;
      setSendResult({ success: true, message, status });

      if (status === 'scheduled') {
        toast.success('Scheduled!', message);
      } else {
        toast.success('Queued!', message);
      }

      setSubject(''); setBody(''); setRecipients([]); setInputVal(''); setScheduledFor('');
      setSelectedTemplate('');
      
      if (status === 'pending' && res.data.logId) {
        setActiveLogId(res.data.logId);
      }

      if (onEmailSent) onEmailSent();

    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to queue emails.';
      toast.error('Error', msg);
      setSendResult({ success: false, error: msg });
    } finally {
      setSending(false);
    }
  };

  const invalidCount = recipients.filter((r) => !r.valid).length;
  const validCount = recipients.filter((r) => r.valid).length;

  return (
    <>
    {activeLogId && (
      <QueueProgress 
        logId={activeLogId} 
        onComplete={() => setActiveLogId(null)} 
      />
    )}
    <form onSubmit={handleSubmit} noValidate>
      
      {/* Templates Row */}
      <div className="form-group" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="template-select">Load Template</label>
          <select 
            id="template-select" 
            className="form-control" 
            value={selectedTemplate} 
            onChange={handleLoadTemplate}
          >
            <option value="">-- Blank Email --</option>
            {templates.map(t => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleSaveTemplate} title="Save current subject and body as a template">
          <SaveIcon />
          Save as Template
        </button>
      </div>

      {/* Subject */}
      <div className="form-group">
        <label htmlFor="email-subject">Subject</label>
        <input
          id="email-subject"
          type="text"
          className="form-control"
          placeholder="Enter email subject..."
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setErrors((er) => ({ ...er, subject: '' })); }}
        />
        {errors.subject && <p className="error-msg">⚠ {errors.subject}</p>}
      </div>

      {/* Body (Rich Text) */}
      <div className="form-group">
        <label htmlFor="email-body">Message Body</label>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <ReactQuill 
            theme="snow" 
            value={body} 
            onChange={(val) => { setBody(val); setErrors((er) => ({ ...er, body: '' })); }}
            style={{ minHeight: '200px', background: 'var(--bg-card)' }}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'clean']
              ]
            }}
          />
        </div>
        {errors.body && <p className="error-msg">⚠ {errors.body}</p>}
      </div>

      {/* Recipients Header */}
      <div className="form-group">
        <div className="recipients-label-row">
          <label htmlFor="recipient-input">
            Recipients
            {recipients.length > 0 && (
              <span className="recipients-count-badge" style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {validCount} valid{invalidCount > 0 ? ` · ${invalidCount} invalid` : ''}
              </span>
            )}
          </label>
          <div className="recipients-actions">
            <button
              type="button"
              className={`btn btn-sm${showExcel ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setShowExcel((v) => !v)}
              id="toggle-excel-btn"
              title="Import from Excel / CSV"
            >
              <ExcelIcon />
              {showExcel ? 'Hide Importer' : 'Import from Excel'}
            </button>
            {recipients.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll} title="Clear all recipients">
                <ClearIcon />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Excel Upload Panel */}
        {showExcel && (
          <div className="excel-panel">
            <ExcelUploader onEmailsImported={handleExcelImport} />
          </div>
        )}

        {/* Tag Input */}
        <div
          className="tags-container"
          onClick={() => inputRef.current?.focus()}
          style={{ marginTop: showExcel ? '12px' : undefined }}
        >
          {recipients.map((r) => (
            <span key={r.email} className={`tag${r.valid ? '' : ' invalid-tag'}`} style={!r.valid ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}}>
              {r.email}
              <button
                type="button"
                className="tag-remove"
                onClick={(e) => { e.stopPropagation(); removeRecipient(r.email); }}
                aria-label={`Remove ${r.email}`}
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="tags-input"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => inputVal.trim() && addRecipient(inputVal)}
            placeholder={recipients.length ? '' : 'Type email and press Enter, or import from Excel...'}
            id="recipient-input"
          />
        </div>
        <p className="tags-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Press <kbd>Enter</kbd>, comma, or space to add manually. Paste multiple emails at once.
        </p>
        {errors.recipients && <p className="error-msg">⚠ {errors.recipients}</p>}
      </div>

      {/* Invalid warning */}
      {invalidCount > 0 && (
        <div className="invalid-warning" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠ {invalidCount} invalid email{invalidCount > 1 ? 's' : ''} will be skipped during sending.
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

      {/* Sending Controls (Schedule + Send) */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label htmlFor="schedule-time">Schedule For (Optional)</label>
          <input 
            type="datetime-local" 
            id="schedule-time"
            className="form-control"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        <div style={{ flex: 2 }}>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={sending}
            id="send-email-btn"
            style={{ height: '42px' }}
          >
            {sending ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Queueing {validCount} recipient{validCount !== 1 ? 's' : ''}...</>
            ) : (
              <><SendIcon /> {scheduledFor ? 'Schedule Email' : `Queue for ${validCount || 'All'} Recipient${validCount !== 1 ? 's' : ''}`}</>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {sendResult && (
        <div className="send-result" style={{
          marginTop: '16px',
          borderColor: sendResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
          background: sendResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
          padding: '12px',
          borderRadius: '4px'
        }}>
          {sendResult.success
            ? <p style={{ color: 'var(--success)' }}>✓ {sendResult.message}</p>
            : <p style={{ color: 'var(--danger)' }}>✕ {sendResult.error}</p>
          }
        </div>
      )}
    </form>
    </>
  );
}
