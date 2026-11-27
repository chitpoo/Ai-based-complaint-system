import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

// Same rules as the backend's RegisterRequest, so most mistakes are caught before the request.
function validate({ name, email, password }) {
  if (!name.trim()) return 'Please enter your name.';
  if (name.trim().length > 100) return 'Name must be 100 characters or fewer.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  return '';
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const me = await register(form.name.trim(), form.email.trim(), form.password);
      navigate(homeFor(me.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="h3 fw-semibold mb-1">Create an account</h1>
      <p className="text-muted mb-4">It takes a minute. You can submit your first grievance straight away.</p>
      <ErrorAlert message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="name">Full name</label>
          <input id="name" className="form-control" autoComplete="name" maxLength={100}
            value={form.name} onChange={update('name')} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="form-control" autoComplete="email" maxLength={150}
            placeholder="you@example.com" value={form.email} onChange={update('email')} />
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="form-control" autoComplete="new-password"
            aria-describedby="password-help" value={form.password} onChange={update('password')} />
          <div id="password-help" className="form-text">At least 8 characters.</div>
        </div>
        <button type="submit" className="btn btn-primary w-100 py-2" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="small text-muted mt-4 mb-0">
        Already registered? <Link to="/login">Log in</Link>.
      </p>
    </AuthLayout>
  );
}
