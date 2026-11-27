import { useState } from 'react';
import client, { errorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert } from '../../components/Feedback.jsx';

const EMPTY = { name: '', email: '', password: '', departmentId: '' };

export default function Officers({ departments, officers, onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const departmentName = (id) => departments.find((d) => d.id === id)?.name || '-';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreated('');
    if (!form.name.trim() || !form.email.trim() || !form.departmentId) {
      setError('Name, email and department are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await client.post('/admin/officers', {
        name: form.name.trim(), email: form.email.trim(), password: form.password,
        departmentId: Number(form.departmentId),
      });
      setCreated(`Officer account created for ${res.data.email}.`);
      setForm(EMPTY);
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <div className="card">
          <div className="card-body p-4">
            <h2 className="section-title">Create officer account</h2>
            <ErrorAlert message={error} />
            {created && <div className="alert alert-success">{created}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="officer-name">Name</label>
                <input id="officer-name" className="form-control" maxLength={100} value={form.name} onChange={update('name')} />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="officer-email">Email</label>
                <input id="officer-email" type="email" className="form-control" maxLength={150} autoComplete="off"
                  value={form.email} onChange={update('email')} />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="officer-password">Initial password</label>
                <input id="officer-password" type="password" className="form-control" autoComplete="new-password"
                  value={form.password} onChange={update('password')} />
                <div className="form-text">At least 8 characters. Share it with the officer yourself.</div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="officer-department">Department</label>
                <select id="officer-department" className="form-select" value={form.departmentId} onChange={update('departmentId')}>
                  <option value="">Choose…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create officer'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="col-lg-7">
        <div className="card">
          {officers.length === 0 ? (
            <EmptyState>No officers yet. Create one so departments can work their queues.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Department</th></tr>
                </thead>
                <tbody>
                  {officers.map((o) => (
                    <tr key={o.id}>
                      <td>{o.name}</td>
                      <td>{o.email}</td>
                      <td>{departmentName(o.departmentId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
