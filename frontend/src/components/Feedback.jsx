import Icon from './Icons.jsx';

export function Loading({ text = 'Loading…' }) {
  return (
    <div className="text-center text-muted py-5" role="status">
      <div className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger d-flex gap-2 align-items-start" role="alert">
      <Icon name="alert" className="flex-shrink-0 mt-1" size={16} />
      <div>{message}</div>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', children }) {
  return (
    <div className="empty-state">
      <div><span className="icon"><Icon name={icon} size={22} /></span></div>
      {children}
    </div>
  );
}

/** Page title row with an optional subtitle and right-aligned actions. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="d-flex flex-wrap align-items-center gap-2">{children}</div>}
    </div>
  );
}
