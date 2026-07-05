import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { useAuth } from '@/context/AuthContext';
import { Menu } from 'lucide-react';
import dioceseLogo from '@/assets/diocese-logo.jpg';

export function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'PRIEST' && location.pathname === '/') {
    return <Navigate to="/remittances" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF9F2', overflow: 'hidden', maxWidth: '100vw' }}>

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile sidebar drawer */}
      {isMobile && <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />}

      <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', height: '56px', backgroundColor: '#8B4C39',
            position: 'sticky', top: 0, zIndex: 40, flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={dioceseLogo} alt="CADIAG"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #C89B6E' }} />
              <span style={{ color: 'white', fontWeight: 900, fontSize: '13px', letterSpacing: '0.02em' }}>CADIAG FINANCE</span>
            </div>
            <button onClick={() => setMenuOpen(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Menu size={22} color="white" strokeWidth={2} />
            </button>
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: isMobile ? '20px 16px' : '40px', maxWidth: '1280px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
