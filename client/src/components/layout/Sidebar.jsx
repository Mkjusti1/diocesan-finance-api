import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ReceiptText,
  Users, ShieldAlert, LogOut, Landmark, UploadCloud, KeyRound
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/parishes', icon: Building2, label: 'Parishes', roles: ['ADMIN','BISHOP'] },
  { to: '/remittances', icon: ReceiptText, label: 'Remittances', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/debtors', icon: ShieldAlert, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { to: '/upload', icon: UploadCloud, label: 'Upload', roles: ['ADMIN'] },
  { to: '/profile', icon: KeyRound, label: 'Profile', roles: ['ADMIN','BISHOP','PRIEST'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const allowed = navItems.filter(i => i.roles.includes(user?.role));

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', backgroundColor: '#8B4C39',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            backgroundColor: '#D3542A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <Landmark size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>Diocesan Finance</p>
            <p style={{ color: '#C89B6E', fontSize: '11px', marginTop: '2px' }}>Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px' }}>
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              transition: 'all 0.15s',
              backgroundColor: isActive ? '#D3542A' : 'transparent',
              color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ margin: '0 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

      {/* User */}
      <div style={{ padding: '12px' }}>
        <div
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', marginBottom: '2px',
            cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: '#C89B6E', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '13px', fontWeight: 700,
            color: 'white', flexShrink: 0
          }}>
            {user?.name?.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              color: 'white', fontSize: '13px', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {user?.name}
            </p>
            <p style={{ color: '#C89B6E', fontSize: '11px', marginTop: '1px' }}>{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 12px', borderRadius: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
