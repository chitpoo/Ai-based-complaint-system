import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { CategoryText, PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import { ErrorAlert, Loading } from '../components/Feedback.jsx';
import Icon from '../components/Icons.jsx';
import Timeline from '../components/Timeline.jsx';

/** Public page: works logged out and shows only what the public endpoint returns. */
export default function Track() {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(trackingId || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null);
    setError('');
    setInput(trackingId || '');
    if (!trackingId) return;
    setLoading(true);
    client
      .get(`/grievances/track/${encodeURIComponent(trackingId)}`)
      .then((res) => setResult(res.data))
      .catch((err) =>
        setError(err.response?.status === 404
          ? `No grievance found with tracking ID "${trackingId}". Check the ID and try again.`
          : errorMessage(err)))
      .finally(() => setLoading(false));
  }, [trackingId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const id = input.trim().toUpperCase();
    if (id) navigate(`/track/${encodeURIComponent(id)}`);
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <div className="track-hero">
        <h1>Track a grievance</h1>
        <p className="text-muted">Enter the tracking ID you were given when it was submitted. No login needed.</p>
      </div>
      <form className="input-group input-group-lg mb-4" onSubmit={handleSubmit}>
        <input className="form-control tracking-id" placeholder="GRV-2026-123456" aria-label="Tracking ID"
          autoCapitalize="characters" spellCheck={false} value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2 px-4" disabled={!input.trim()}>
          <Icon name="search" size={18} /> Track
        </button>
      </form>

      {loading && <Loading />}
      <ErrorAlert message={error} />
      {result && (
        <div className="card">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div className="tracking-id text-muted">{result.trackingId}</div>
                <h2 className="h5 mb-0">{result.title}</h2>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <dl className="row mb-4 detail-list">
              <dt className="col-sm-3">Category</dt>
              <dd className="col-sm-9"><CategoryText category={result.category} /></dd>
              <dt className="col-sm-3">Priority</dt>
              <dd className="col-sm-9"><PriorityBadge priority={result.priority} /></dd>
            </dl>
            <h3 className="section-title">Progress</h3>
            <Timeline steps={result.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}
