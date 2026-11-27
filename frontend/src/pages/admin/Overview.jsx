import { useCallback, useEffect, useState } from 'react';
import client, { errorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert, Loading } from '../../components/Feedback.jsx';
import Icon from '../../components/Icons.jsx';
import GrievanceTable from '../../components/GrievanceTable.jsx';
import { titleCase } from '../../utils/format.js';
import AssignControl from './AssignControl.jsx';

function StatCard({ title, value, icon, tone }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card stat-card h-100">
        <div className="card-body">
          <span className={`icon ${tone ? `tone-${tone}` : ''}`}><Icon name={icon} size={20} /></span>
          <div>
            <div className="text-muted small">{title}</div>
            <div className="value">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, counts }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="col-md-4">
      <div className="card h-100">
        <div className="card-body">
          <h2 className="section-title">{title}</h2>
          {Object.entries(counts).map(([key, count]) => (
            <div key={key} className="mb-2">
              <div className="d-flex justify-content-between small">
                <span>{key === 'UNCLASSIFIED' ? 'Awaiting review' : titleCase(key)}</span>
                <span className="fw-semibold">{count}</span>
              </div>
              <div className="progress" style={{ height: 6 }} aria-hidden="true">
                <div className="progress-bar" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Overview({ departments, officers }) {
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [error, setError] = useState('');
  const [mlAvailable, setMlAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        client.get('/admin/stats'),
        client.get('/grievances', { params: { overdue: true, size: 50 } }),
      ]);
      setStats(s.data);
      // A failed status check must not hide the dashboard; it only decides whether to warn.
      client.get('/admin/ml-status').then((r) => setMlAvailable(r.data.available)).catch(() => {});
      setOverdue(o.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorAlert message={error} />;
  if (!stats || !overdue) return <Loading />;

  const total = Object.values(stats.byStatus).reduce((sum, n) => sum + n, 0);
  const open = stats.byStatus.SUBMITTED + stats.byStatus.ASSIGNED + stats.byStatus.IN_PROGRESS + stats.byStatus.ESCALATED;

  return (
    <>
      {!mlAvailable && (
        <div className="alert alert-warning d-flex gap-2 align-items-start" role="alert">
          <Icon name="alert" className="flex-shrink-0 mt-1" size={16} />
          <div>
            <strong>The AI service is not reachable.</strong> New grievances are being saved as “Awaiting
            review” with Medium priority and need to be assigned by hand. Start the ML service to restore
            automatic categorisation and priority.
          </div>
        </div>
      )}
      <div className="row g-3 mb-4">
        <StatCard title="Total grievances" value={total} icon="layers" />
        <StatCard title="Open" value={open} icon="folder" tone="amber" />
        <StatCard title="Overdue (past SLA)" value={stats.overdueCount} icon="alert"
          tone={stats.overdueCount > 0 ? 'red' : 'green'} />
        <StatCard title="Avg. resolution time" icon="clock"
          value={stats.avgResolutionHours == null ? '-' : `${stats.avgResolutionHours} h`} />
      </div>
      <div className="row g-3 mb-4">
        <Breakdown title="By status" counts={stats.byStatus} />
        <Breakdown title="By priority" counts={stats.byPriority} />
        <Breakdown title="By category" counts={stats.byCategory} />
      </div>
      <div className="card">
        <div className="card-header py-3">
          <h2 className="section-title mb-0">Overdue grievances</h2>
        </div>
        {overdue.content.length === 0 ? (
          <EmptyState icon="check">Nothing is past its SLA.</EmptyState>
        ) : (
          <GrievanceTable rows={overdue.content} showDepartment
            extra={{
              header: 'Reassign',
              render: (g) => <AssignControl grievance={g} departments={departments} officers={officers} onAssigned={load} />,
            }} />
        )}
      </div>
    </>
  );
}
