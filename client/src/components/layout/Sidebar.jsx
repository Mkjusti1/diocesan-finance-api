import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Church, FileText, Users, AlertTriangle, LogOut, Cross } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/parishes', icon: Church, label: 'Parishes', roles: ['ADMIN','BISHOP'] },
  { to: '/remittances', icon: FileText, label: 'Remittances', roles: ['ADMIN','BISHOP','PRIEST'] },
  { to: '/debtors', icon: AlertTriangle, label: 'Debtors', roles: ['ADMIN','BISHOP'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
];

const roleColors = {
  ADMIN: 'bg-ember/20 text-blush',
  BISHOP: 'bg-gold/20 text-gold',
  PRIEST: 'bg-sage/20 text-sage',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const allowed = navItems.filter(i => i.roles.includes(user?.role));

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#8B4C39' }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D3542A' }}>
            <Church className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white leading-tight">Diocesan Finance</p>
            <p className="text-xs mt-0.5" style={{ color: '#C89B6E' }}>Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5">
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'text-white'
                : 'text-white/60 hover:text-white hover:bg-white/8'
            )}
            style={({ isActive }) => isActive ? { backgroundColor: '#D3542A' } : {}}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10" />

      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
               style={{ backgroundColor: '#C89B6E' }}>
            {user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', roleColors[user?.role] || 'text-white/50')}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150 mt-1"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
