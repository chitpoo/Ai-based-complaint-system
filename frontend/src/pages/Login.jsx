import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      navigate(homeFor(me.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="h3 fw-semibold mb-1">Welcome back</h1>
      <p className="text-muted mb-4">Log in to submit and follow your grievances.</p>
      {location.state?.expired && !error && (
        <div className="alert alert-warning">Your session has expired. Please log in again.</div>
      )}
      <ErrorAlert message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="form-control" autoComplete="email" required
            placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="form-control" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-100 py-2" disabled={busy || !email || !password}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="small text-muted mt-4 mb-0">
        New here? <Link to="/register">Create an account</Link>. Have a tracking ID?{' '}
        <Link to="/track">Track a grievance</Link>.
      </p>
    </AuthLayout>
  );
}
