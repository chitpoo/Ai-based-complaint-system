import { titleCase } from '../utils/format.js';
import Icon from './Icons.jsx';

const STATUS_TONES = {
  SUBMITTED: 'slate',
  ASSIGNED: 'sky',
  IN_PROGRESS: 'indigo',
  RESOLVED: 'green',
  CLOSED: 'dark',
  ESCALATED: 'red',
};

const PRIORITY_TONES = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' };

export function StatusBadge({ status }) {
  return <span className={`pill pill-dot pill-${STATUS_TONES[status] || 'slate'}`}>{titleCase(status)}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`pill pill-${PRIORITY_TONES[priority] || 'slate'}`}>{titleCase(priority)}</span>;
}

/** Marks a grievance filed in hide-identity mode. */
export function AnonymousBadge({ compact = false }) {
  return (
    <span className="pill pill-violet" title="Submitted anonymously: officers do not see the submitter's name">
      <Icon name="eyeOff" size={12} />
      {!compact && 'Anonymous'}
      {compact && <span className="visually-hidden">Anonymous</span>}
    </span>
  );
}

/** UNCLASSIFIED is shown as "awaiting review", never as a failed AI result. */
export function CategoryText({ category }) {
  return category === 'UNCLASSIFIED' ? <span className="text-muted">Awaiting review</span> : titleCase(category);
}
