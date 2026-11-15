import { label } from '../utils/format.js';

const STATUS_COLOURS = {
  SUBMITTED: 'secondary',
  ASSIGNED: 'info',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
  CLOSED: 'dark',
  ESCALATED: 'danger',
};

const PRIORITY_COLOURS = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' };

export function StatusBadge({ status }) {
  return <span className={`badge text-bg-${STATUS_COLOURS[status] || 'secondary'}`}>{label(status)}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge text-bg-${PRIORITY_COLOURS[priority] || 'secondary'}`}>{priority}</span>;
}

/** UNCLASSIFIED is shown as "awaiting review", never as a failed AI result. */
export function CategoryText({ category }) {
  return category === 'UNCLASSIFIED' ? <span className="text-muted">Awaiting review</span> : label(category);
}
