import * as React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sims', label: 'SIM Inventory', icon: Smartphone },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/expiry', label: 'Expiry & Renewals', icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/activity', label: 'Activity Log', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.to === '/'
            ? location.pathname === '/'
            : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => {
              onNavigate?.();
              navigate(item.to);
            }}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-navy-100 hover:bg-white/5 hover:text-white',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-navy-200')} />
            <span className="truncate">{item.label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-navy-300" />}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [logoError, setLogoError] = React.useState(false);
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-navy-900 text-white lg:flex">
      <div className="flex flex-col items-start gap-2 px-5 py-4">
        {!logoError ? (
          <div className="inline-flex items-center rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <img
              src="/assets/san-solutions-logo.webp"
              alt="San Solution"
              className="h-12 w-auto object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="inline-flex items-center rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B3A70] text-white text-xl font-extrabold">
              SAN
            </div>
          </div>
        )}
        <p className="text-[11px] font-medium text-navy-200">SIM Management</p>
      </div>
      <SidebarNav />
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] text-navy-200">© {new Date().getFullYear()} SAN SOLUTION</p>
      </div>
    </aside>
  );
}
export default Sidebar;
