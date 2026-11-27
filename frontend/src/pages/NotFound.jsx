import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Feedback.jsx';

export default function NotFound() {
  return (
    <EmptyState icon="search">
      <h1 className="h3 text-body">Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link className="btn btn-primary" to="/">Go to the home page</Link>
    </EmptyState>
  );
}
