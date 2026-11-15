import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
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
    <div className="page-narrow mx-auto">
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h1 className="h4 mb-3">Log in</h1>
          {location.state?.expired && !error && (
            <div className="alert alert-warning">Your session has expired. Please log in again.</div>
          )}
          <ErrorAlert message={error} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-control" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-control" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={busy || !email || !password}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="small text-muted mt-3 mb-0">
            New here? <Link to="/register">Create an account</Link>. Have a tracking ID?{' '}
            <Link to="/track">Track a grievance</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
