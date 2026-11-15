import { useState } from 'react';
import client, { errorMessage } from '../../api/client.js';

/** Department dropdown plus an optional officer of that department. */
export default function AssignControl({ grievance, departments, officers, onAssigned }) {
  const [departmentId, setDepartmentId] = useState(grievance.departmentId ? String(grievance.departmentId) : '');
  const [officerId, setOfficerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (grievance.status === 'RESOLVED' || grievance.status === 'CLOSED') {
    return <span className="text-muted small">-</span>;
  }

  const departmentOfficers = officers.filter((o) => String(o.departmentId) === departmentId);

  const assign = async () => {
    setBusy(true);
    setError('');
    try {
      await client.put(`/grievances/${grievance.id}/assign`, {
        departmentId: Number(departmentId),
        officerId: officerId ? Number(officerId) : null,
      });
      await onAssigned();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minWidth: 230 }}>
      <div className="d-flex gap-1">
        <select className="form-select form-select-sm" aria-label="Department" value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setOfficerId(''); }}>
          <option value="">Department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy || !departmentId} onClick={assign}>
          {busy ? '…' : 'Assign'}
        </button>
      </div>
      {departmentOfficers.length > 0 && (
        <select className="form-select form-select-sm mt-1" aria-label="Officer" value={officerId}
          onChange={(e) => setOfficerId(e.target.value)}>
          <option value="">Any officer</option>
          {departmentOfficers.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}
