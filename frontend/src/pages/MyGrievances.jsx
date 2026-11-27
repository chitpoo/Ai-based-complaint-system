import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { EmptyState, ErrorAlert, Loading, PageHeader } from '../components/Feedback.jsx';
import Icon from '../components/Icons.jsx';
import GrievanceTable from '../components/GrievanceTable.jsx';

export default function MyGrievances() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/grievances/my')
      .then((res) => setRows(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <PageHeader title="My grievances" subtitle="Everything you have submitted, newest first.">
        <Link className="btn btn-primary d-inline-flex align-items-center gap-1" to="/submit">
          <Icon name="plus" size={16} /> Submit grievance
        </Link>
      </PageHeader>
      <ErrorAlert message={error} />
      {!error && rows === null && <Loading />}
      {rows && rows.length === 0 && (
        <div className="card">
          <EmptyState>
            <p className="mb-3">You have not submitted any grievances yet.</p>
            <Link className="btn btn-primary" to="/submit">Submit your first one</Link>
          </EmptyState>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="card">
          <GrievanceTable rows={rows} />
        </div>
      )}
    </>
  );
}
