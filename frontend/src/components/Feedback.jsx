export function Loading({ text = 'Loading…' }) {
  return (
    <div className="text-center text-muted py-5">
      <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="text-center text-muted py-5">{children}</div>;
}
