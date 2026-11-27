import Icon from './Icons.jsx';

const POINTS = [
  ['sparkle', 'Describe the problem once. It is categorised and sent to the right department automatically.'],
  ['search', 'Follow every step with your tracking ID, even without logging in.'],
  ['eyeOff', 'Submit anonymously when you need to: officers handle the complaint without seeing your name.'],
  ['clock', 'Grievances left open past their deadline are escalated automatically.'],
];

/** Two-column shell for the login and register pages; the side panel hides on small screens. */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="card">
        <div className="row g-0">
          <div className="col-md-5 d-none d-md-flex auth-aside">
            <h2>Raise it. Track it. Get it resolved.</h2>
            <ul>
              {POINTS.map(([icon, text]) => (
                <li key={icon}>
                  <Icon name={icon} size={18} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-7">
            <div className="p-4 p-md-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
