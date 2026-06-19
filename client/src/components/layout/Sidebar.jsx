import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Church, FileText, Users, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/parishes', icon: Church, label: 'Parishes', roles: ['ADMIN','BISHOP'] },
  { to: '/remittances', icon: FileText, label: 'Remittances', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/debtors', icon: AlertTriangle, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const allowed = navItems.filter(i => i.roles.includes(user?.role));

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', backgroundColor: '#8B4C39',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            backgroundColor: '#D3542A', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Church size={16} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>Diocesan Finance</p>
            <p style={{ color: '#C89B6E', fontSize: '11px', marginTop: '2px' }}>Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
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
              color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ margin: '0 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

      {/* User */}
      <div style={{ padding: '16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '4px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: '#C89B6E', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '12px', fontWeight: 700,
            color: 'white', flexShrink: 0
          }}>
            {user?.name?.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
