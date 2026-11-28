import { Link } from 'react-router-dom';
import Icon from '../components/Icons.jsx';

const FEATURES = [
  ['sparkle', 'Routed by AI', 'Describe the problem in your own words. It is categorised, prioritised and sent to the right department automatically.'],
  ['search', 'Track every step', 'Each grievance gets a tracking ID. Follow its status and history at any time, even without logging in.'],
  ['eyeOff', 'Anonymous if you need it', 'Officers handle the complaint without seeing your name. You still get every update.'],
  ['clock', 'Nothing is forgotten', 'Anything left open past its department’s deadline is escalated to the administrators automatically.'],
];

const STEPS = [
  ['Submit', 'Write what happened, where and since when.'],
  ['Routed', 'The AI files it with the right department and sets its priority.'],
  ['Resolved', 'An officer works on it; you see each status change as it happens.'],
];

export default function Landing() {
  return (
    <>
      <section className="hero">
        <span className="hero-badge mb-3"><Icon name="logo" size={14} /> Grievance Portal</span>
        <h1 className="mb-3">Raise it. Track it. Get it resolved.</h1>
        <p className="lead mb-4">
          One place to report problems on campus, from a broken fan to harassment, and see exactly
          what is being done about them.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-light btn-lg" to="/register">Submit a grievance</Link>
          <Link className="btn btn-outline-light btn-lg" to="/track">Track with an ID</Link>
        </div>
        <p className="small mt-3 mb-0" style={{ color: 'rgba(255,255,255,.75)' }}>
          Already have an account? <Link className="text-white fw-semibold" to="/login">Log in</Link>
        </p>
      </section>

      <section className="row g-3 mt-4">
        {FEATURES.map(([icon, title, text]) => (
          <div key={title} className="col-sm-6 col-lg-3">
            <div className="card feature-card h-100">
              <div className="card-body p-4">
                <span className="icon"><Icon name={icon} size={20} /></span>
                <h2 className="h6 fw-semibold mb-2">{title}</h2>
                <p className="text-muted small mb-0">{text}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="card mt-4">
        <div className="card-body p-4">
          <h2 className="section-title mb-3">How it works</h2>
          <div className="row g-4">
            {STEPS.map(([title, text], i) => (
              <div key={title} className="col-md-4 d-flex gap-3">
                <span className="step-num">{i + 1}</span>
                <div>
                  <div className="fw-semibold">{title}</div>
                  <div className="text-muted small">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
