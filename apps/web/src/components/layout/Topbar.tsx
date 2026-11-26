import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User as UserIcon, Bell as BellIcon, Menu } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SidebarNav } from './Sidebar';

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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const meta = TITLES[location.pathname] ?? (location.pathname.startsWith('/sims/') ? { title: 'SIM Details' } : { title: 'SAN SOLUTION' });

  const statsQuery = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: () => apiRequest<{ sent: number; failed: number; pending: number; cancelled: number; sentThisMonth: number }>('/notifications/stats'),
    refetchInterval: 60_000,
  });

  const pending = statsQuery.data?.pending ?? 0;
  const failed = statsQuery.data?.failed ?? 0;

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E7EAF0] bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-[#202B3A] transition hover:bg-[#F0F2F5] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#202B3A]">{meta.title}</h2>
          {meta.subtitle && (
            <p className="hidden truncate text-xs text-[#788496] sm:block">{meta.subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#202B3A] transition-colors hover:bg-[#F0F2F5]"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {(pending + failed) > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C6535D] px-1 text-[10px] font-bold text-white">
              {pending + failed > 99 ? '99+' : pending + failed}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-2.5 py-1.5 text-sm transition-colors hover:bg-[#F0F2F5]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#315F9D] text-xs font-bold text-white">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
              <span className="hidden max-w-[140px] truncate text-[#202B3A] sm:inline">
                {user?.fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium text-[#202B3A]">{user?.fullName}</p>
              <p className="truncate text-xs text-[#788496]">{user?.email}</p>
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
              className="text-[#C6535D] focus:bg-red-50 focus:text-[#C6535D]"
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

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="left-0 top-0 h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-navy-900 p-0 text-white">
          <div className="flex h-16 items-center px-5">
            <div className="inline-flex items-center rounded-xl bg-white px-3 py-2">
              <img
                src="/assets/san-solutions-logo.webp"
                alt="San Solution"
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          <div className="border-t border-white/10 px-5 py-4">
            <p className="text-[11px] text-navy-200">© {new Date().getFullYear()} SAN SOLUTION</p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
export default Topbar;
