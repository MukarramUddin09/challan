import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChallanList from './pages/ChallanList';
import ChallanNew from './pages/ChallanNew';
import ChallanDetail from './pages/ChallanDetail';
import AdminUsers from './pages/AdminUsers';
import AdminEmails from './pages/AdminEmails';
import AdminViolations from './pages/AdminViolations';
import AdminDivisions from './pages/AdminDivisions';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin, isPending } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ghmc-light">
        <div className="text-center">
          <div className="spinner spinner-lg text-navy-600 mx-auto mb-4" />
          <p className="text-navy-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPending && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ghmc-light p-4">
        <div className="card p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account is awaiting administrator approval. You will be notified once your access is granted.
          </p>
          <p className="text-xs text-gray-400">Registered as: {user.email}</p>
          <p className="text-xs text-gray-400">Division: {user.division}</p>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Guest-only route wrapper (login/register)
const GuestRoute = ({ children }) => {
  const { user, loading, isAdmin, isPending } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ghmc-light">
        <div className="spinner spinner-lg text-navy-600" />
      </div>
    );
  }

  if (user && (!isPending || isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public / Guest Routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/challans" element={<ProtectedRoute><ChallanList /></ProtectedRoute>} />
      <Route path="/challans/new" element={<ProtectedRoute><ChallanNew /></ProtectedRoute>} />
      <Route path="/challans/:id" element={<ProtectedRoute><ChallanDetail /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/emails" element={<ProtectedRoute adminOnly><AdminEmails /></ProtectedRoute>} />
      <Route path="/admin/violations" element={<ProtectedRoute adminOnly><AdminViolations /></ProtectedRoute>} />
      <Route path="/admin/divisions" element={<ProtectedRoute adminOnly><AdminDivisions /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
