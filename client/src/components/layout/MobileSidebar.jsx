import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, ShieldAlert,
  Users, LogOut, UploadCloud, KeyRound,
  BookOpen, Wheat, Church, GraduationCap, Sun, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import dioceseLogo from '@/assets/diocese-logo.jpg';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP'] },
  { to: '/rectory', icon: ReceiptText, label: 'Rectory', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/national-collections', icon: BookOpen, label: 'National Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/harvest-bazaar', icon: Wheat, label: 'Harvest & Bazaar', roles: ['ADMIN','BISHOP'] },
  { to: '/cathedraticum', icon: Church, label: 'Cathedraticum', roles: ['ADMIN','BISHOP'] },
  { to: '/project-sunday', icon: Sun, label: 'Project Sunday', roles: ['ADMIN','BISHOP'] },
  { to: '/seminary-collections', icon: GraduationCap, label: 'Seminary Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/debtors', icon: ShieldAlert, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/upload', icon: UploadCloud, label: 'Upload', roles: ['ADMIN'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { to: '/profile', icon: KeyRound, label: 'Profile', roles: ['ADMIN','BISHOP','PRIEST'] },
];

export function MobileSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const allowed = navItems.filter(i => i.roles.includes(user?.role));

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '280px', zIndex: 51, backgroundColor: '#8B4C39',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease'
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={dioceseLogo} alt="CADIAG"
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #C89B6E' }} />
            <div>
              <p style={{ color: 'white', fontWeight: 900, fontSize: '13px', letterSpacing: '0.02em' }}>CADIAG FINANCE</p>
              <p style={{ color: '#C89B6E', fontSize: '10px', marginTop: '1px' }}>Diocese of Aguleri</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {allowed.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 14px', borderRadius: '8px', marginBottom: '2px',
                textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                backgroundColor: isActive ? '#D3542A' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
              })}>
              {({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.5 : 2} />{label}</>}
            </NavLink>
          ))}
        </nav>

        <div style={{ margin: '0 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <div style={{ padding: '12px' }}>
          <div onClick={() => { navigate('/profile'); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '4px', cursor: 'pointer', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#C89B6E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {user?.name?.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ color: '#C89B6E', fontSize: '11px' }}>{user?.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500 }}>
            <LogOut size={16} strokeWidth={2} /> Sign out
          </button>
        </div>
      </div>
    </>
  );
}
