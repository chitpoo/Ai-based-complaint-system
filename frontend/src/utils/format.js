export const label = (value) => (value ? value.replaceAll('_', ' ') : '');

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
