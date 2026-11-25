import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User as UserIcon, Bell as BellIcon } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of SIM estate, renewals and notification health.' },
  '/sims': { title: 'SIM Inventory', subtitle: 'Search, filter and manage every SIM card.' },
  '/companies': { title: 'Companies', subtitle: 'Client organisations and their assignment footprint.' },
  '/machines': { title: 'Machinery', subtitle: 'Equipment linked to SIM cards.' },
  '/expiry': { title: 'Expiry & Renewals', subtitle: 'Upcoming expiries, expired SIMs and renewal history.' },
  '/notifications': { title: 'Notifications', subtitle: 'Delivery log, reminders and email settings.' },
  '/reports': { title: 'Reports', subtitle: 'Inventory, company, expiry and renewal exports.' },
  '/activity': { title: 'Activity Log', subtitle: 'Auditable history of every change.' },
  '/settings': { title: 'Settings', subtitle: 'Organisation profile, preferences and user accounts.' },
  '/profile': { title: 'My Profile', subtitle: 'Update your account and password.' },
};

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const meta = TITLES[location.pathname] ?? (location.pathname.startsWith('/sims/') ? { title: 'SIM Details' } : { title: 'SAN SOLUTION' });

  const statsQuery = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: () => apiRequest<{ sent: number; failed: number; pending: number; cancelled: number; sentThisMonth: number }>('/notifications/stats'),
    refetchInterval: 60_000,
  });

  const pending = statsQuery.data?.pending ?? 0;
  const failed = statsQuery.data?.failed ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{meta.title}</h2>
        {meta.subtitle && <p className="text-xs text-ink-500">{meta.subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {(pending + failed) > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pending + failed > 99 ? '99+' : pending + failed}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm transition-colors hover:bg-ink-50">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-500 text-xs font-bold text-white">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
              <span className="hidden max-w-[140px] truncate text-ink-800 sm:inline">
                {user?.fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium text-ink-900">{user?.fullName}</p>
              <p className="truncate text-xs text-ink-500">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
export default Topbar;
