import { useState } from 'react';
import { Link } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { AnonymousBadge, CategoryText, PriorityBadge } from '../components/Badges.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import Icon from '../components/Icons.jsx';

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
    <div className="card">
      <div className="card-body p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-3">
          <span className="success-mark"><Icon name="check" size={24} /></span>
          <div>
            <h1 className="h4 mb-0">Grievance submitted</h1>
            {result.anonymous && <div className="mt-1"><AnonymousBadge /></div>}
          </div>
        </div>
        <p className="text-muted">Keep this tracking ID. Anyone who has it can check the status, without logging in.</p>
        <div className="tracking-box mb-4">
          <span className="tracking-id">{result.trackingId}</span>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={copy} aria-live="polite">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {awaitingReview ? (
          <div className="alert alert-info mb-4">
            Received — awaiting manual review. An administrator will send it to the right department.
          </div>
        ) : (
          <dl className="row mb-4 detail-list">
            <dt className="col-sm-4">Category</dt>
            <dd className="col-sm-8"><CategoryText category={result.category} /></dd>
            <dt className="col-sm-4">Priority</dt>
            <dd className="col-sm-8"><PriorityBadge priority={result.priority} /></dd>
            <dt className="col-sm-4">Sent to</dt>
            <dd className="col-sm-8">{result.departmentName}</dd>
          </dl>
        )}
        {result.anonymous && (
          <p className="small text-muted">
            The officers handling this grievance will see “Anonymous” in place of your name. Administrators can still
            see who submitted it.
          </p>
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
  const [anonymous, setAnonymous] = useState(false);
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
      const res = await client.post('/grievances', {
        title: title.trim(), description: description.trim(), anonymous,
      });
      setResult(res.data);
      setTitle('');
      setDescription('');
      setAnonymous(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <div className="mx-auto" style={{ maxWidth: 680 }}><ResultCard result={result} onAnother={() => setResult(null)} /></div>;

  return (
    <div className="mx-auto" style={{ maxWidth: 680 }}>
      <div className="card">
        <div className="card-body p-4 p-md-5">
          <h1 className="h3 fw-semibold mb-1">Submit a grievance</h1>
          <p className="text-muted mb-4">Describe the problem. It is categorised and sent to the right department automatically.</p>
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
            <label className={`option-card mb-4 ${anonymous ? 'on' : ''}`} htmlFor="anonymous">
              <span className="form-check form-switch p-0 m-0">
                <input id="anonymous" type="checkbox" role="switch" className="form-check-input"
                  aria-describedby="anonymous-help" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              </span>
              <span>
                <span className="fw-medium d-flex align-items-center gap-2">
                  <Icon name="eyeOff" size={16} /> Submit anonymously
                </span>
                <span id="anonymous-help" className="d-block small text-muted mt-1">
                  Department officers will see “Anonymous” in place of your name. Administrators can still see who
                  submitted it, and you keep getting updates. Avoid putting your name in the text itself.
                </span>
              </span>
            </label>
            <button type="submit" className="btn btn-primary px-4 py-2" disabled={busy}>
              {busy ? 'Submitting…' : anonymous ? 'Submit anonymously' : 'Submit grievance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
