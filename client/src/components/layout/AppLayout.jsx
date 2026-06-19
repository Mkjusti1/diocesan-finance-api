import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';

export function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Redirect priests away from dashboard to remittances
  if (user?.role === 'PRIEST' && location.pathname === '/') {
    return <Navigate to="/remittances" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF9F2' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '40px', maxWidth: '1280px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
