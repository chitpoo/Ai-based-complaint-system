import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { AnonymousBadge, CategoryText, PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import { ErrorAlert, Loading } from '../components/Feedback.jsx';
import Icon from '../components/Icons.jsx';
import Timeline from '../components/Timeline.jsx';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import { formatDate, nextStatuses, titleCase } from '../utils/format.js';

/** Offers only the moves allowed from the current status; the backend re-checks every one. */
function StatusForm({ grievance, role, onUpdated }) {
  const options = nextStatuses(grievance.status, role);
  const [status, setStatus] = useState(options[0] || '');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(options[0] || '');
    setRemark('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grievance.status]);

  if (!options.length) {
    return <p className="text-muted mb-0">No status change is available from “{titleCase(grievance.status)}”.</p>;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await client.put(`/grievances/${grievance.id}/status`, { status, remark: remark.trim() || null });
      await onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorAlert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="status">Move to</label>
        <select id="status" className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>{titleCase(option)}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="remark">Remark (optional)</label>
        <textarea id="remark" className="form-control" rows={2} maxLength={500}
          value={remark} onChange={(e) => setRemark(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Updating…' : 'Update status'}
      </button>
    </form>
  );
}

export default function GrievanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [grievance, setGrievance] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setGrievance((await client.get(`/grievances/${id}`)).data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    setGrievance(null);
    load();
  }, [load]);

  const canUpdate = user.role === 'OFFICER' || user.role === 'ADMIN';
  const back = (
    <Link className="d-inline-flex align-items-center gap-1" to={homeFor(user.role)}>
      <Icon name="arrowLeft" size={16} /> Back to list
    </Link>
  );

  if (error && !grievance) return <>{back}<div className="mt-3"><ErrorAlert message={error} /></div></>;
  if (!grievance) return <Loading />;

  const steps = grievance.statusHistory.map((h) => ({
    status: h.newStatus, from: h.oldStatus, at: h.at, by: h.changedBy, remark: h.remark,
  }));

  return (
    <>
      <div className="mb-3">{back}</div>
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="tracking-id text-muted mb-1">{grievance.trackingId}</div>
                  <h1 className="h4 mb-0">{grievance.title}</h1>
                </div>
                <StatusBadge status={grievance.status} />
              </div>
              <p className="description mb-4">{grievance.description}</p>
              <hr className="text-muted opacity-25" />
              <dl className="row mb-0 detail-list">
                <dt className="col-sm-4">Category</dt>
                <dd className="col-sm-8">
                  <CategoryText category={grievance.category} />
                  {grievance.aiConfidence != null && (
                    <span className="text-muted small"> · AI confidence {Math.round(grievance.aiConfidence * 100)}%</span>
                  )}
                </dd>
                <dt className="col-sm-4">Priority</dt>
                <dd className="col-sm-8"><PriorityBadge priority={grievance.priority} /></dd>
                <dt className="col-sm-4">Department</dt>
                <dd className="col-sm-8">{grievance.departmentName || <span className="text-muted">Not routed yet</span>}</dd>
                {grievance.officerName && (
                  <>
                    <dt className="col-sm-4">Officer</dt>
                    <dd className="col-sm-8">{grievance.officerName}</dd>
                  </>
                )}
                <dt className="col-sm-4">Submitted by</dt>
                <dd className="col-sm-8">
                  {grievance.anonymous ? (
                    <>
                      <AnonymousBadge />
                      {/* The server sends the real name only to the owner and to admins. */}
                      {grievance.submittedBy !== 'Anonymous' && (
                        <span className="ms-2">
                          {grievance.submittedBy}
                          <span className="text-muted small">
                            {user.role === 'ADMIN' ? ' · visible to admins only' : ' · officers do not see your name'}
                          </span>
                        </span>
                      )}
                    </>
                  ) : grievance.submittedBy}
                </dd>
                <dt className="col-sm-4">Submitted</dt>
                <dd className="col-sm-8">{formatDate(grievance.createdAt)}</dd>
                {grievance.escalated && (
                  <>
                    <dt className="col-sm-4">Escalated</dt>
                    <dd className="col-sm-8">{formatDate(grievance.escalatedAt)}</dd>
                  </>
                )}
                {grievance.resolvedAt && (
                  <>
                    <dt className="col-sm-4">Resolved</dt>
                    <dd className="col-sm-8">{formatDate(grievance.resolvedAt)}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          {canUpdate && (
            <div className="card mb-4">
              <div className="card-body p-4">
                <h2 className="section-title">Update status</h2>
                <StatusForm grievance={grievance} role={user.role} onUpdated={load} />
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-body p-4">
              <h2 className="section-title">History</h2>
              <Timeline steps={steps} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
