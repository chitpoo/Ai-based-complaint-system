import { useEffect, useState } from 'react';
import client, { errorMessage } from '../api/client.js';
import { EmptyState, ErrorAlert, Loading, PageHeader } from '../components/Feedback.jsx';
import GrievanceTable from '../components/GrievanceTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUSES, titleCase } from '../utils/format.js';

export default function OfficerQueue() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  // Runs on first load, on every filter change, and again whenever the officer comes back from a detail page.
  useEffect(() => {
    let cancelled = false;
    setRows(null);
    client
      .get('/grievances/assigned', { params: status ? { status } : {} })
      .then((res) => !cancelled && (setRows(res.data), setError('')))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <>
      <PageHeader title="Department queue" subtitle="Open a grievance to read it and update its status.">
        <select className="form-select w-auto" aria-label="Filter by status" value={status}
          onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.filter((s) => s !== 'SUBMITTED').map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
      </PageHeader>
      {user.departmentId == null && (
        <div className="alert alert-warning">Your account is not linked to a department yet. Ask an administrator.</div>
      )}
      <ErrorAlert message={error} />
      {!error && rows === null && <Loading />}
      {rows && rows.length === 0 && (
        <div className="card">
          <EmptyState>No grievances {status ? `with status “${titleCase(status)}”` : 'in your department'}.</EmptyState>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="card">
          <GrievanceTable rows={rows} />
        </div>
      )}
      {rows?.some((g) => g.anonymous) && (
        <p className="text-muted small mt-3">
          Grievances marked with the crossed-eye icon were submitted anonymously; the submitter's name is hidden from you.
        </p>
      )}
    </>
  );
}
