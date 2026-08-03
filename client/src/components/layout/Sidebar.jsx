import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, ShieldAlert,
  Users, LogOut, UploadCloud, KeyRound,
  BookOpen, GraduationCap,
  Wheat, Landmark, HeartHandshake, Building2,
  CreditCard, ChevronLeft, ChevronRight,\n  Table
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import dioceseLogo from '@/assets/diocese-logo.jpg';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP'] },
  { to: '/parishes', icon: Building2, label: 'Parishes', roles: ['ADMIN','BISHOP'] },
  { to: '/rectory', icon: ReceiptText, label: 'Rectory', roles: ['ADMIN','BISHOP'] },
  { to: '/national-collections', icon: BookOpen, label: 'National Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/harvest-bazaar', icon: Wheat, label: 'Harvest & Bazaar', roles: ['ADMIN','BISHOP'] },
  { to: '/cathedraticum', icon: Landmark, label: 'Cathedraticum', roles: ['ADMIN','BISHOP'] },
  { to: '/project-sunday', icon: HeartHandshake, label: 'Project Sunday', roles: ['ADMIN','BISHOP'] },
  { to: '/seminary-collections', icon: GraduationCap, label: 'Seminary Collections', roles: ['ADMIN','BISHOP'] },
  { to: '/debtors', icon: ShieldAlert, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/record-payment', icon: CreditCard, label: 'Record Payment', roles: ['ADMIN'] },
  { to: '/bulk-entry', icon: Table, label: 'Bulk Entry', roles: ['ADMIN'] },
  { to: '/upload', icon: UploadCloud, label: 'Upload', roles: ['ADMIN'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { to: '/profile', icon: KeyRound, label: 'Profile', roles: ['ADMIN','BISHOP'] },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const allowed = navItems.filter(i => i.roles.includes(user?.role));

  const isCollapsed = collapsed;
  const sidebarWidth = isCollapsed ? '68px' : '240px';

  return (
    <aside style={{
      width: sidebarWidth, minHeight: '100vh', backgroundColor: '#8B4C39',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      transition: 'width 0.25s ease'
    }}>
      {/* Logo + Toggle */}
      <div style={{
        padding: isCollapsed ? '16px 8px' : '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        gap: '10px', position: 'relative'
      }}>
        {!isCollapsed && (
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
        )}
        {isCollapsed && (
          <img
            src={dioceseLogo}
            alt="CADIAG"
            style={{
              width: '38px', height: '38px', borderRadius: '50%',
              objectFit: 'cover', border: '2px solid #C89B6E', flexShrink: 0
            }}
          />
        )}
        <button
          onClick={onToggle}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', padding: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={isCollapsed ? label : ''}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: isCollapsed ? '0' : '10px',
              padding: isCollapsed ? '10px' : '9px 12px',
              borderRadius: '8px', marginBottom: '2px',
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
                {!isCollapsed && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ margin: '0 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

      <div style={{ padding: '12px' }}>
        <div
          onClick={() => navigate('/profile')}
          title={isCollapsed ? user?.name : ''}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? '0' : '10px',
            padding: isCollapsed ? '10px' : '10px 12px',
            marginBottom: '2px',
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
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </p>
              <p style={{ color: '#C89B6E', fontSize: '11px', marginTop: '1px' }}>{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={isCollapsed ? 'Sign out' : ''}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? '0' : '10px',
            width: '100%', padding: isCollapsed ? '10px' : '10px 12px',
            borderRadius: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <LogOut size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          {!isCollapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}