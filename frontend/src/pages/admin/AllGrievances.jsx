import { useCallback, useEffect, useState } from 'react';
import client, { errorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert, Loading } from '../../components/Feedback.jsx';
import GrievanceTable from '../../components/GrievanceTable.jsx';
import { CATEGORIES, PRIORITIES, STATUSES, titleCase } from '../../utils/format.js';
import AssignControl from './AssignControl.jsx';

const PAGE_SIZE = 20;

function Filter({ name, value, options, onChange }) {
  return (
    <select className="form-select w-auto" aria-label={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All {name}</option>
      {options.map((option) => (
        <option key={option} value={option}>{option === 'UNCLASSIFIED' ? 'Awaiting review' : titleCase(option)}</option>
      ))}
    </select>
  );
}

export default function AllGrievances({ departments, officers }) {
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', overdue: false });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = { page, size: PAGE_SIZE };
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.priority) params.priority = filters.priority;
    if (filters.overdue) params.overdue = true;
    try {
      setData((await client.get('/grievances', { params })).data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing a filter always goes back to the first page.
  const change = (field) => (value) => {
    setFilters({ ...filters, [field]: value });
    setPage(0);
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Filter name="statuses" value={filters.status} options={STATUSES} onChange={change('status')} />
        <Filter name="categories" value={filters.category} options={CATEGORIES} onChange={change('category')} />
        <Filter name="priorities" value={filters.priority} options={PRIORITIES} onChange={change('priority')} />
        <div className="form-check ms-2">
          <input id="overdue" type="checkbox" className="form-check-input" checked={filters.overdue}
            onChange={(e) => change('overdue')(e.target.checked)} />
          <label className="form-check-label" htmlFor="overdue">Overdue only</label>
        </div>
      </div>
      <ErrorAlert message={error} />
      {!error && !data && <Loading />}
      {data && data.content.length === 0 && <div className="card"><EmptyState icon="search">No grievances match these filters.</EmptyState></div>}
      {data && data.content.length > 0 && (
        <>
          <div className="card">
            <GrievanceTable rows={data.content} showDepartment
              extra={{
                header: 'Assign',
                render: (g) => <AssignControl key={`${g.id}-${g.departmentId}`} grievance={g} departments={departments}
                  officers={officers} onAssigned={load} />,
              }} />
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {data.totalElements} grievance{data.totalElements === 1 ? '' : 's'} · page {data.page + 1} of {Math.max(data.totalPages, 1)}
            </span>
            <div className="btn-group">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page === 0}
                onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page + 1 >= data.totalPages}
                onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
