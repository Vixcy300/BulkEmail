import React from 'react';

const dotMap = { success: '●', partial: '◐', failed: '●', pending: '↻', scheduled: '⏰' };
const labelMap = { success: 'Sent', partial: 'Partial', failed: 'Failed', pending: 'Queued', scheduled: 'Scheduled' };
const classMap = { success: 'badge-success', partial: 'badge-warning', failed: 'badge-danger', pending: 'badge-info', scheduled: 'badge-info' };

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${classMap[status] || 'badge-warning'}`}>
      <span>{dotMap[status] || '●'}</span>
      {labelMap[status] || status}
    </span>
  );
}
