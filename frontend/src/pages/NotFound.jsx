import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-5">
      <h1 className="display-5">404</h1>
      <p className="text-muted">This page does not exist.</p>
      <Link to="/">Go to the home page</Link>
    </div>
  );
}
