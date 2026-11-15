import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Loading } from './components/Feedback.jsx';
import { homeFor, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SubmitGrievance from './pages/SubmitGrievance.jsx';
import MyGrievances from './pages/MyGrievances.jsx';
import GrievanceDetail from './pages/GrievanceDetail.jsx';
import Track from './pages/Track.jsx';
import OfficerQueue from './pages/OfficerQueue.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container page pb-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/:trackingId" element={<Track />} />
          <Route path="/submit" element={<ProtectedRoute roles={['USER']}><SubmitGrievance /></ProtectedRoute>} />
          <Route path="/my" element={<ProtectedRoute roles={['USER']}><MyGrievances /></ProtectedRoute>} />
          <Route path="/grievances/:id" element={<ProtectedRoute><GrievanceDetail /></ProtectedRoute>} />
          <Route path="/officer" element={<ProtectedRoute roles={['OFFICER']}><OfficerQueue /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
