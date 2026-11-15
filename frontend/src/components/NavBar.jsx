import { Link, NavLink, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

const LINKS = {
  USER: [
    { to: '/submit', text: 'Submit grievance' },
    { to: '/my', text: 'My grievances' },
  ],
  OFFICER: [{ to: '/officer', text: 'Department queue' }],
  ADMIN: [{ to: '/admin', text: 'Dashboard' }],
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? LINKS[user.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark mb-4">
      <div className="container page">
        <Link className="navbar-brand" to={user ? homeFor(user.role) : '/login'}>
          Grievance Portal
        </Link>
        <div className="navbar-nav me-auto">
          {links.map((link) => (
            <NavLink key={link.to} className="nav-link" to={link.to}>
              {link.text}
            </NavLink>
          ))}
          <NavLink className="nav-link" to="/track">
            Track
          </NavLink>
        </div>
        <div className="navbar-nav align-items-center">
          {user ? (
            <>
              <span className="navbar-text me-3 d-none d-sm-inline">
                {user.name} · {user.role}
              </span>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className="nav-link" to="/login">
                Log in
              </NavLink>
              <NavLink className="nav-link" to="/register">
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
