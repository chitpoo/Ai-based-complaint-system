export const label = (value) => (value ? value.replaceAll('_', ' ') : '');

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

export function formatDate(value) {
  if (!value) return '-';
  // The backend runs in UTC and sends timestamps without a zone. Without the "Z" the browser
  // would read them as local time and show them 5.5 hours off in India.
  const iso = HAS_ZONE.test(value) ? value : `${value}Z`;
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
export const CATEGORIES = ['ACADEMIC', 'HOSTEL', 'INFRASTRUCTURE', 'FINANCE', 'HARASSMENT', 'UNCLASSIFIED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * Status moves a person may make, mirroring plan.md §2. This only decides which buttons to
 * show; the backend's StatusTransitionPolicy is what actually enforces the rules.
 */
export function nextStatuses(current, role) {
  const moves = {
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: role === 'ADMIN' ? ['CLOSED'] : [],
  };
  return moves[current] || [];
}
