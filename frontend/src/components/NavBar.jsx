import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import Icon from './Icons.jsx';

const LINKS = {
  USER: [
    { to: '/submit', text: 'Submit grievance' },
    { to: '/my', text: 'My grievances' },
  ],
  OFFICER: [{ to: '/officer', text: 'Department queue' }],
  ADMIN: [{ to: '/admin', text: 'Dashboard' }],
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

const ROLE_NAMES = { USER: 'Student', OFFICER: 'Officer', ADMIN: 'Administrator' };

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const links = user ? LINKS[user.role] || [] : [];

  // On a phone the menu closes as soon as a link has been followed.
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-md app-nav sticky-top mb-4">
      <div className="container page">
        <Link className="navbar-brand" to={user ? homeFor(user.role) : '/'}>
          <span className="brand-mark"><Icon name="logo" size={18} /></span>
          Grievance Portal
        </Link>
        <button type="button" className="navbar-toggler border-0" aria-controls="main-menu" aria-expanded={open}
          aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          <Icon name="menu" size={22} />
        </button>
        <div id="main-menu" className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <div className="navbar-nav me-auto gap-1 py-2 py-md-0">
            {links.map((link) => (
              <NavLink key={link.to} className="nav-link" to={link.to}>
                {link.text}
              </NavLink>
            ))}
            <NavLink className="nav-link" to="/track">
              Track
            </NavLink>
          </div>
          <div className="navbar-nav align-items-md-center gap-2 pb-2 pb-md-0">
            {user ? (
              <>
                <div className="d-flex align-items-center gap-2 me-md-2">
                  <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                  <div className="user-chip">
                    <div className="fw-medium small">{user.name}</div>
                    <div className="role">{ROLE_NAMES[user.role] || user.role}</div>
                  </div>
                </div>
                <button type="button" className="btn btn-outline-secondary btn-sm align-self-start align-self-md-center"
                  onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-link btn-sm nav-login align-self-start align-self-md-center" to="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary btn-sm align-self-start align-self-md-center" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
