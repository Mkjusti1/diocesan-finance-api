import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, ShieldAlert,
  Users, LogOut, UploadCloud, KeyRound,
  BookOpen, GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import dioceseLogo from '@/assets/diocese-logo.jpg';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP'] },
  { to: '/rectory', icon: ReceiptText, label: 'Rectory', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/national-collections', icon: BookOpen, label: 'National Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/seminary-collections', icon: GraduationCap, label: 'Seminary Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/debtors', icon: ShieldAlert, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/upload', icon: UploadCloud, label: 'Upload', roles: ['ADMIN'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
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
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={dioceseLogo}
            alt="CADIAG"
            style={{
              width: '38px', height: '38px', borderRadius: '50%',
              objectFit: 'cover', border: '2px solid #C89B6E', flexShrink: 0
            }}
          />
          <div>
            <p style={{ color: 'white', fontWeight: 900, fontSize: '13px', lineHeight: 1.1, letterSpacing: '0.02em' }}>
              CADIAG FINANCE
            </p>
            
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
              textDecoration: 'none', fontSize: '12.5px', fontWeight: 500,
              transition: 'all 0.15s',
              backgroundColor: isActive ? '#D3542A' : 'transparent',
              color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
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
            <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
