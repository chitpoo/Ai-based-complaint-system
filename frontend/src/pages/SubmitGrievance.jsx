import { useState } from 'react';
import { Link } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { PriorityBadge } from '../components/Badges.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { label } from '../utils/format.js';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

function ResultCard({ result, onAnother }) {
  const [copied, setCopied] = useState(false);
  const awaitingReview = result.category === 'UNCLASSIFIED';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.trackingId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card shadow-sm border-success">
      <div className="card-body p-4">
        <h1 className="h4 text-success">Grievance submitted</h1>
        <p className="text-muted">Keep this tracking ID. Anyone who has it can check the status, without logging in.</p>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="fs-4 tracking-id">{result.trackingId}</span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {awaitingReview ? (
          <div className="alert alert-info mb-4">
            Received — awaiting manual review. An administrator will send it to the right department.
          </div>
        ) : (
          <dl className="row mb-4">
            <dt className="col-sm-4">Category</dt>
            <dd className="col-sm-8">{label(result.category)}</dd>
            <dt className="col-sm-4">Priority</dt>
            <dd className="col-sm-8"><PriorityBadge priority={result.priority} /></dd>
            <dt className="col-sm-4">Sent to</dt>
            <dd className="col-sm-8">{result.departmentName}</dd>
          </dl>
        )}
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-primary" to={`/track/${result.trackingId}`}>Open tracking page</Link>
          <Link className="btn btn-outline-secondary" to="/my">My grievances</Link>
          <button type="button" className="btn btn-link" onClick={onAnother}>Submit another</button>
        </div>
      </div>
    </div>
  );
}

export default function SubmitGrievance() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in both the title and the description.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await client.post('/grievances', { title: title.trim(), description: description.trim() });
      setResult(res.data);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <div className="mx-auto" style={{ maxWidth: 640 }}><ResultCard result={result} onAnother={() => setResult(null)} /></div>;

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Submit a grievance</h1>
          <p className="text-muted">Describe the problem. It is categorised and sent to the right department automatically.</p>
          <ErrorAlert message={error} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="title">Title</label>
              <input id="title" className="form-control" maxLength={TITLE_MAX} placeholder="e.g. Water leakage in hostel block B"
                value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="form-text text-end">{title.length} / {TITLE_MAX}</div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea id="description" className="form-control" rows={7} maxLength={DESCRIPTION_MAX}
                placeholder="What happened, where, and since when?"
                value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="form-text text-end">{description.length} / {DESCRIPTION_MAX}</div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit grievance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
