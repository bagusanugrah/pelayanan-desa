import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

/**
 * Penjaga 1: AuthenticatedRoute
 * Mencegah user masuk ke halaman yang bukan haknya (Role-based).
 */
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Jika admin nyasar ke dashboard warga, lempar ke dashboard admin, begitupun sebaliknya.
    return <Navigate to={role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />;
  }

  return children;
};

/**
 * Penjaga 2: PublicRoute
 * Mencegah user yang sudah login kembali ke halaman Login/Register.
 */
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (token) {
    // Jika sudah login, langsung lempar ke dashboard masing-masing.
    return <Navigate to={role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Routes>
          {/* Rute Login/Register: Tidak bisa diakses kalau sudah login */}
          <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Auth /></PublicRoute>} />

          {/* Dashboard Masyarakat: Hanya untuk role 'masyarakat' */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRole="masyarakat">
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Dashboard Admin: Hanya untuk role 'admin' */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Pengalihan Otomatis */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<div className="p-10 text-center font-bold">404 | Not Found</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;