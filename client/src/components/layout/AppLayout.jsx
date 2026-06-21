import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { useAuth } from '@/context/AuthContext';

export function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'PRIEST' && location.pathname === '/') {
    return <Navigate to="/remittances" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF9F2' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: '56px', backgroundColor: '#8B4C39',
          position: 'sticky', top: 0, zIndex: 40
        }} className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#D3542A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '14px' }}>⛪</span>
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>Diocesan Finance</span>
          </div>
          <button onClick={() => setMenuOpen(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px'
          }}>
            <div style={{ width: '22px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
            <div style={{ width: '22px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
            <div style={{ width: '22px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
          </button>
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 16px', maxWidth: '1280px' }} className="main-content">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-topbar { display: none !important; }
          .desktop-sidebar { display: block !important; }
          .main-content { padding: 40px !important; }
        }
      `}</style>
    </div>
  );
}
