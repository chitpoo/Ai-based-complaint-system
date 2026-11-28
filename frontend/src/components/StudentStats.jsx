import { useEffect, useRef, useState } from 'react';
import client, { errorMessage } from '../api/client.js';
import { ErrorAlert, Loading } from './Feedback.jsx';
import Icon from './Icons.jsx';
import { titleCase } from '../utils/format.js';

// Fixed order, one colour per status, so a status keeps its colour whatever the counts are.
// Palette checked with the dataviz validator (colour-blind separation passes). Several slices
// are below 3:1 contrast, so every slice also has its name and count printed in the legend.
const STATUSES = [
  ['SUBMITTED', '#257de0'],
  ['ASSIGNED', '#f47230'],
  ['IN_PROGRESS', '#00b894'],
  ['ESCALATED', '#f2a600'],
  ['RESOLVED', '#008a17'],
  ['CLOSED', '#ee7fac'],
];
const FILED = '#257de0';
const RESOLVED = '#f47230';
const DAYS = 14;

const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function StatTile({ label, value, hint, icon, tone }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card stat-card h-100">
        <div className="card-body">
          <span className={`icon ${tone ? `tone-${tone}` : ''}`}><Icon name={icon} size={20} /></span>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="value">{value}</div>
            {hint && <div className="hint">{hint}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Donut of grievances by status. Hovering a slice or its legend row highlights both. */
function StatusPie({ byStatus, total }) {
  const [active, setActive] = useState(null);
  const slices = STATUSES.map(([status, color]) => ({
    status, color, count: byStatus[status] || 0,
  })).filter((s) => s.count > 0);
  if (!total) return <p className="text-muted mb-0">Nothing filed yet.</p>;

  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0; // 2px surface gap between slices
  let offset = 0;

  const shown = slices.find((s) => s.status === active);
  return (
    <div className="d-flex flex-wrap align-items-center gap-4">
      <svg width="180" height="180" viewBox="0 0 180 180" role="img"
        aria-label={`Grievances by status: ${slices.map((s) => `${titleCase(s.status)} ${s.count}`).join(', ')}`}>
        <g transform="rotate(-90 90 90)">
          {slices.map((s) => {
            const len = (s.count / total) * c;
            const el = (
              <circle key={s.status} cx="90" cy="90" r={r} fill="none" stroke={s.color}
                strokeWidth={active === s.status ? 26 : 22}
                strokeDasharray={`${Math.max(len - gap, 0.1)} ${c}`} strokeDashoffset={-offset}
                onMouseEnter={() => setActive(s.status)} onMouseLeave={() => setActive(null)}
                style={{ cursor: 'default', transition: 'stroke-width .15s' }}>
                <title>{`${titleCase(s.status)}: ${s.count} of ${total}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="fs-4 fw-semibold" fill="currentColor">
          {shown ? shown.count : total}
        </text>
        <text x="90" y="106" textAnchor="middle" className="small" fill="#64748b">
          {shown ? titleCase(shown.status) : 'total'}
        </text>
      </svg>
      <ul className="list-unstyled mb-0 small">
        {slices.map((s) => (
          <li key={s.status} className="d-flex align-items-center gap-2 py-1"
            onMouseEnter={() => setActive(s.status)} onMouseLeave={() => setActive(null)}
            style={{ fontWeight: active === s.status ? 600 : 400 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            <span>{titleCase(s.status)}</span>
            <span className="text-muted ms-auto ps-3">{s.count} · {Math.round((s.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grouped bars: grievances filed and resolved on each of the last 14 days. */
function DailyChart({ days }) {
  const [hover, setHover] = useState(null);
  // Drawn at the real width, so text stays 10-11px on a phone instead of being scaled down.
  const box = useRef(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(1, ...days.map((d) => Math.max(d.filed, d.resolved)));
  const H = 200; const left = 28; const bottom = 24; const top = 8;
  const plotH = H - bottom - top;
  const slot = (W - left) / DAYS;
  const bar = Math.min(10, (slot - 6) / 2);
  const y = (v) => top + plotH - (v / max) * plotH;
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  // Bars with a rounded top and a square base on the axis.
  const path = (x, v) => {
    const h = (v / max) * plotH; const yb = top + plotH; const rr = Math.min(4, h, bar / 2);
    return `M${x},${yb} V${yb - h + rr} Q${x},${yb - h} ${x + rr},${yb - h} H${x + bar - rr}`
      + ` Q${x + bar},${yb - h} ${x + bar},${yb - h + rr} V${yb} Z`;
  };

  return (
    <div ref={box}>
      <div className="d-flex gap-3 small mb-2">
        {[['Filed', FILED], ['Resolved', RESOLVED]].map(([label, color]) => (
          <span key={label} className="d-inline-flex align-items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
        <span className="text-muted ms-auto">
          {hover ? `${fmt(hover.date)}: ${hover.filed} filed, ${hover.resolved} resolved` : `Last ${DAYS} days`}
        </span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" style={{ display: 'block' }}
        aria-label={`Grievances filed and resolved per day over the last ${DAYS} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x0 = left + i * slot + (slot - 2 * bar - 2) / 2;
          return (
            <g key={d.key} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
              {/* Hit target: the whole day column, larger than the bars. */}
              <rect x={left + i * slot} y={top} width={slot} height={plotH}
                fill={hover === d ? '#eef2ff' : 'transparent'} />
              {d.filed > 0 && <path d={path(x0, d.filed)} fill={FILED} />}
              {d.resolved > 0 && <path d={path(x0 + bar + 2, d.resolved)} fill={RESOLVED} />}
              {((DAYS - 1 - i) % (W < 420 ? 3 : 2) === 0) && (
                <text x={i === DAYS - 1 ? W - 1 : left + i * slot + slot / 2} y={H - 6} textAnchor={i === DAYS - 1 ? "end" : "middle"} fontSize="10" fill="#64748b">
                  {fmt(d.date)}
                </text>
              )}
              <title>{`${fmt(d.date)}: ${d.filed} filed, ${d.resolved} resolved`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The same numbers for both views: computed from the user's own rows, or sent by the server. */
function fromRows(rows) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS - 1 - i));
    return { key: dayKey(d), date: d, filed: 0, resolved: 0 };
  });
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  const byStatus = {};
  rows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (byKey[dayKey(r.createdAt)]) byKey[dayKey(r.createdAt)].filed += 1;
    if (r.resolvedAt && byKey[dayKey(r.resolvedAt)]) byKey[dayKey(r.resolvedAt)].resolved += 1;
  });
  return { total: rows.length, byStatus, escalated: rows.filter((r) => r.escalated).length, days };
}

function fromServer(data) {
  const days = data.daily.map((d) => {
    const [y, m, day] = d.date.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    return { key: dayKey(date), date, filed: d.filed, resolved: d.resolved };
  });
  return { total: data.total, byStatus: data.byStatus, escalated: data.escalated, days };
}

function StatsView({ stats, scope }) {
  const s = stats.byStatus;
  const resolved = (s.RESOLVED || 0) + (s.CLOSED || 0);
  const today = stats.days[stats.days.length - 1];
  return (
    <>
      <div className="row g-3 mb-3">
        <StatTile label={scope === 'mine' ? 'Total filed' : 'Filed on the site'} value={stats.total}
          hint={`${today.filed} today`} icon="layers" />
        <StatTile label="Open" value={stats.total - resolved} icon="folder" tone="amber" />
        <StatTile label="Resolved" value={resolved} hint={`${today.resolved} today`} icon="check" tone="green" />
        <StatTile label="Escalated" value={stats.escalated} icon="alert" tone="red" />
      </div>
      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="section-title">By status</h2>
              <StatusPie byStatus={s} total={stats.total} />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="section-title">Filed and resolved per day</h2>
              <DailyChart days={stats.days} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Dashboard with a switch between the user's own grievances and site-wide counts. */
export default function StudentStats({ rows }) {
  const [scope, setScope] = useState('mine');
  const [site, setSite] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (scope !== 'everyone' || site) return;
    client.get('/stats/public')
      .then((res) => setSite(fromServer(res.data)))
      .catch((err) => setError(errorMessage(err)));
  }, [scope, site]);

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="segmented" role="group" aria-label="Whose grievances to show">
          {[['mine', 'Mine'], ['everyone', 'Everyone']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={scope === value}
              onClick={() => setScope(value)}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-muted small">
          {scope === 'mine' ? 'Your own grievances' : 'All grievances on the site, counts only'}
        </span>
      </div>
      {scope === 'mine' && <StatsView stats={fromRows(rows)} scope="mine" />}
      {scope === 'everyone' && (
        <>
          <ErrorAlert message={error} />
          {!error && !site && <Loading />}
          {site && <StatsView stats={site} scope="everyone" />}
        </>
      )}
    </>
  );
}
