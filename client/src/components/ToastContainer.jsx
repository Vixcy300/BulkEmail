import React, { useEffect, useRef } from 'react';

const icons = {
  success: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

let toastId = 0;

// Singleton toast array — exported for external use
let listeners = [];
export const toastStore = {
  toasts: [],
  add(toast) {
    const id = ++toastId;
    this.toasts = [...this.toasts, { ...toast, id }];
    listeners.forEach((l) => l([...this.toasts]));
    setTimeout(() => this.remove(id), toast.duration || 4000);
    return id;
  },
  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l([...this.toasts]));
  },
  subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  },
};

export const toast = {
  success: (title, desc) => toastStore.add({ type: 'success', title, desc }),
  error: (title, desc) => toastStore.add({ type: 'error', title, desc }),
  warning: (title, desc) => toastStore.add({ type: 'warning', title, desc }),
};

export default function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className={`toast-icon ${t.type}`}>{icons[t.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.desc && <div className="toast-desc">{t.desc}</div>}
          </div>
          <button className="toast-close" onClick={() => toastStore.remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
