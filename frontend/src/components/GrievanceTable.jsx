import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format.js';
import { CategoryText, PriorityBadge, StatusBadge } from './Badges.jsx';

/** Shared list table. `extra` adds one more column, e.g. the admin's reassign control. */
export default function GrievanceTable({ rows, showDepartment = false, extra }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            {showDepartment && <th>Department</th>}
            <th>Submitted</th>
            {extra && <th>{extra.header}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id}>
              <td className="tracking-id">
                <Link to={`/grievances/${g.id}`}>{g.trackingId}</Link>
              </td>
              <td>{g.title}</td>
              <td>
                <CategoryText category={g.category} />
              </td>
              <td>
                <PriorityBadge priority={g.priority} />
              </td>
              <td>
                <StatusBadge status={g.status} />
                {g.escalated && g.status !== 'ESCALATED' && (
                  <span className="badge text-bg-light border ms-1">was escalated</span>
                )}
              </td>
              {showDepartment && <td>{g.departmentName || <span className="text-muted">Unrouted</span>}</td>}
              <td className="text-nowrap small">{formatDate(g.createdAt)}</td>
              {extra && <td>{extra.render(g)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
