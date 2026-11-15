import { useState } from 'react';
import client, { errorMessage } from '../../api/client.js';
import { label } from '../../utils/format.js';

function DepartmentRow({ department, onChanged }) {
  const [slaHours, setSlaHours] = useState(String(department.slaHours));
  const [email, setEmail] = useState(department.email || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const changed = slaHours !== String(department.slaHours) || email !== (department.email || '');
  const hours = Number(slaHours);
  const valid = Number.isInteger(hours) && hours >= 1 && hours <= 8760;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await client.put(`/departments/${department.id}`, { slaHours: hours, email: email.trim() });
      await onChanged();
      setMessage({ ok: true, text: 'Saved' });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>{department.name}</td>
      <td>{label(department.category)}</td>
      <td>
        <input type="email" className="form-control form-control-sm" aria-label={`Email for ${department.name}`}
          placeholder="No notification email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td style={{ width: 120 }}>
        <input type="number" min={1} max={8760} className={`form-control form-control-sm ${valid ? '' : 'is-invalid'}`}
          aria-label={`SLA hours for ${department.name}`} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
      </td>
      <td className="text-nowrap">
        <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy || !changed || !valid} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {message && <span className={`small ms-2 ${message.ok ? 'text-success' : 'text-danger'}`}>{message.text}</span>}
      </td>
    </tr>
  );
}

export default function Departments({ departments, onChanged }) {
  return (
    <div className="card shadow-sm">
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr><th>Department</th><th>Handles</th><th>Notification email</th><th>SLA (hours)</th><th /></tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <DepartmentRow key={d.id} department={d} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer bg-white text-muted small">
        A grievance still open after its department's SLA is escalated automatically.
      </div>
    </div>
  );
}
