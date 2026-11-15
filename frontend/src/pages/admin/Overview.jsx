import { useCallback, useEffect, useState } from 'react';
import client, { errorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert, Loading } from '../../components/Feedback.jsx';
import GrievanceTable from '../../components/GrievanceTable.jsx';
import { label } from '../../utils/format.js';
import AssignControl from './AssignControl.jsx';

function StatCard({ title, value, tone }) {
  return (
    <div className="col-6 col-md-3">
      <div className={`card shadow-sm stat-card h-100 ${tone ? `border-${tone}` : ''}`}>
        <div className="card-body">
          <div className="text-muted small">{title}</div>
          <div className={`value ${tone ? `text-${tone}` : ''}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, counts }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="col-md-4">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <h2 className="h6">{title}</h2>
          {Object.entries(counts).map(([key, count]) => (
            <div key={key} className="mb-2">
              <div className="d-flex justify-content-between small">
                <span>{key === 'UNCLASSIFIED' ? 'Awaiting review' : label(key)}</span>
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

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        client.get('/admin/stats'),
        client.get('/grievances', { params: { overdue: true, size: 50 } }),
      ]);
      setStats(s.data);
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
      <div className="row g-3 mb-4">
        <StatCard title="Total grievances" value={total} />
        <StatCard title="Open" value={open} />
        <StatCard title="Overdue (past SLA)" value={stats.overdueCount} tone={stats.overdueCount > 0 ? 'danger' : ''} />
        <StatCard title="Avg. resolution time"
          value={stats.avgResolutionHours == null ? '-' : `${stats.avgResolutionHours} h`} />
      </div>
      <div className="row g-3 mb-4">
        <Breakdown title="By status" counts={stats.byStatus} />
        <Breakdown title="By priority" counts={stats.byPriority} />
        <Breakdown title="By category" counts={stats.byCategory} />
      </div>
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Overdue grievances</h2>
        </div>
        {overdue.content.length === 0 ? (
          <EmptyState>Nothing is past its SLA.</EmptyState>
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
