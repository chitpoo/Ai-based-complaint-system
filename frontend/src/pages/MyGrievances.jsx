import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { errorMessage } from '../api/client.js';
import { EmptyState, ErrorAlert, Loading } from '../components/Feedback.jsx';
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">My grievances</h1>
        <Link className="btn btn-primary" to="/submit">Submit grievance</Link>
      </div>
      <ErrorAlert message={error} />
      {!error && rows === null && <Loading />}
      {rows && rows.length === 0 && (
        <EmptyState>
          You have not submitted any grievances yet. <Link to="/submit">Submit your first one</Link>.
        </EmptyState>
      )}
      {rows && rows.length > 0 && (
        <div className="card shadow-sm">
          <GrievanceTable rows={rows} />
        </div>
      )}
    </>
  );
}
