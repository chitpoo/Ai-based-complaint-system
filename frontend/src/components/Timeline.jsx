import { formatDate, label } from '../utils/format.js';
import { StatusBadge } from './Badges.jsx';

/**
 * steps: [{ status, at, from?, by?, remark? }]. The public tracking page passes only status and at.
 * Everything is rendered as plain text; nothing a user typed is ever treated as HTML.
 */
export default function Timeline({ steps }) {
  if (!steps.length) return <p className="text-muted mb-0">No history yet.</p>;
  return (
    <ol className="timeline">
      {steps.map((step, index) => (
        <li key={index}>
          <div>
            {step.from && step.from === step.status ? (
              <span className="badge text-bg-light border">Reassigned</span>
            ) : (
              <StatusBadge status={step.status} />
            )}
            <span className="text-muted small ms-2">{formatDate(step.at)}</span>
          </div>
          {(step.by !== undefined || step.remark) && (
            <div className="small mt-1">
              {step.by !== undefined && <span className="text-muted">by {step.by || 'System'}</span>}
              {step.from && step.from !== step.status && (
                <span className="text-muted"> · from {label(step.from)}</span>
              )}
              {step.remark && <div>{step.remark}</div>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
