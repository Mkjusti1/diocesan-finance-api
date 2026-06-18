import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Church, FileText, Users, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
const navItems = [
  { to:'/', icon:LayoutDashboard, label:'Dashboard', roles:['ADMIN','BISHOP','PRIEST'] },
  { to:'/parishes', icon:Church, label:'Parishes', roles:['ADMIN','BISHOP'] },
  { to:'/remittances', icon:FileText, label:'Remittances', roles:['ADMIN','BISHOP','PRIEST'] },
  { to:'/debtors', icon:AlertTriangle, label:'Debtors', roles:['ADMIN','BISHOP'] },
  { to:'/users', icon:Users, label:'Users', roles:['ADMIN'] },
];
export function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 min-h-screen bg-primary text-primary-foreground flex flex-col">
      <div className="p-6 border-b border-primary-foreground/20">
        <div className="flex items-center gap-2">
          <Church className="h-6 w-6" />
          <div><p className="font-bold text-sm">Diocesan Finance</p><p className="text-xs text-primary-foreground/70">Management System</p></div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(i => i.roles.includes(user?.role)).map(({ to, icon:Icon, label }) => (
          <NavLink key={to} to={to} end={to==='/'} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors', isActive ? 'bg-primary-foreground/20' : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground')}>
            <Icon className="h-4 w-4" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-primary-foreground/20">
        <div className="mb-3 px-3"><p className="text-sm font-medium truncate">{user?.name}</p><p className="text-xs text-primary-foreground/60">{user?.role}</p></div>
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors">
          <LogOut className="h-4 w-4" />Sign out
        </button>
      </div>
    </aside>
  );
}
