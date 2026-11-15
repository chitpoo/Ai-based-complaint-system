import { useCallback, useEffect, useState } from 'react';
import client, { errorMessage } from '../api/client.js';
import { ErrorAlert } from '../components/Feedback.jsx';
import Overview from './admin/Overview.jsx';
import AllGrievances from './admin/AllGrievances.jsx';
import Officers from './admin/Officers.jsx';
import Departments from './admin/Departments.jsx';

const TABS = ['Overview', 'Grievances', 'Officers', 'Departments'];

/**
 * This page only mounts after ProtectedRoute has confirmed the ADMIN role, so no admin
 * data is requested before that. The server checks the role again on every call.
 */
export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [error, setError] = useState('');

  // Departments and officers feed the reassign dropdowns as well as their own tabs.
  const loadLookups = useCallback(async () => {
    try {
      const [d, o] = await Promise.all([client.get('/departments'), client.get('/admin/officers')]);
      setDepartments(d.data);
      setOfficers(o.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  return (
    <>
      <h1 className="h4 mb-3">Admin dashboard</h1>
      <ul className="nav nav-tabs mb-4">
        {TABS.map((name) => (
          <li className="nav-item" key={name}>
            <button type="button" className={`nav-link ${tab === name ? 'active' : ''}`} onClick={() => setTab(name)}>
              {name}
            </button>
          </li>
        ))}
      </ul>
      <ErrorAlert message={error} />
      {tab === 'Overview' && <Overview departments={departments} officers={officers} />}
      {tab === 'Grievances' && <AllGrievances departments={departments} officers={officers} />}
      {tab === 'Officers' && <Officers departments={departments} officers={officers} onChanged={loadLookups} />}
      {tab === 'Departments' && <Departments departments={departments} onChanged={loadLookups} />}
    </>
  );
}
