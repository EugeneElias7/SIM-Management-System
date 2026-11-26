import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, Bell, CheckCircle2, Clock, Gauge, Users, Wrench } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { humanDate, VALIDITY_STATUS_LABELS } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { ValidityBadge } from '@/components/ui/status-badges';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardData {
  stats: {
    totalSims: number;
    activeSims: number;
    expiringSoon: number;
    expiredSims: number;
    inStock: number;
    assignedSims: number;
    companies: number;
    machines: number;
  };
  statusDistribution: Array<{ key: string; label: string; count: number; color: string }>;
  expiryTimeline: Array<{ label: string; count: number }>;
  upcomingExpiries: Array<{
    id: string;
    internalId: string;
    mobileNumber: string;
    provider: string;
    expiryDate: string | null;
    validityStatus: string;
    daysRemaining: number | null;
    company: { id: string; name: string } | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    entityType: string;
    user: { id: string; fullName: string } | null;
    createdAt: string;
  }>;
  notificationHealth: {
    enabled: boolean;
    failed: number;
    pending: number;
    lastScanAt: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: '#315F9D',
  expiring: '#B7791F',
  expired: '#C6535D',
  inStock: '#788496',
  suspended: '#6B5B95',
  faulty: '#B86A3C',
  decommissioned: '#A0A7B4',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/dashboard'),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-44 lg:col-span-5" />
          <Skeleton className="h-44 lg:col-span-3" />
          <Skeleton className="h-44 lg:col-span-4" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 lg:col-span-7" />
          <Skeleton className="h-80 lg:col-span-5" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-72 lg:col-span-7" />
          <Skeleton className="h-72 lg:col-span-5" />
        </div>
      </div>
    );
  }

  const data = query.data!;
  const stats = data.stats;
  const total = stats.totalSims || 1;
  const assignedPct = Math.round((stats.assignedSims / total) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#202B3A] sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#788496]">
            Live overview of the SIM estate, renewals and notification health.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="self-start rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-4 py-2 text-sm font-medium text-[#202B3A] shadow-sm transition hover:bg-[#F0F2F5] sm:self-auto"
        >
          Export report
        </button>
      </div>

      {/* Asymmetric hero metrics */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#788496]">
                  Total SIMs
                </p>
                <p className="mt-3 text-6xl font-light tracking-tight text-[#202B3A]">
                  {stats.totalSims}
                </p>
                <p className="mt-2 text-sm text-[#788496]">
                  {stats.assignedSims} assigned · {stats.inStock} in stock
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF1FA] text-[#315F9D]">
                <Gauge className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-[#F0F2F5]">
              <div
                className="h-full rounded-full bg-[#315F9D] transition-all duration-700"
                style={{ width: `${assignedPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#788496]">{assignedPct}% of SIMs are assigned</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#788496]">
                Active
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4EE] text-[#23865D]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-light tracking-tight text-[#202B3A]">
              {stats.activeSims}
            </p>
            <p className="mt-1 text-xs text-[#788496]">Valid and operational</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#788496]">
                Expiring soon
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF3E6] text-[#B7791F]">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-light tracking-tight text-[#202B3A]">
              {stats.expiringSoon}
            </p>
            <p className="mt-1 text-xs text-[#788496]">Within 30 days</p>
            {stats.expiredSims > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-[#C6535D]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stats.expiredSims} expired and need attention
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row: companies, machines, notifications */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Companies" value={stats.companies} icon={<Users className="h-4 w-4" />} />
        <MiniStat label="Machines" value={stats.machines} icon={<Wrench className="h-4 w-4" />} />
        <MiniStat
          label="Notifications"
          value={data.notificationHealth.pending + data.notificationHealth.failed}
          icon={<Bell className="h-4 w-4" />}
          tone={data.notificationHealth.failed > 0 ? 'danger' : 'default'}
          hint={`${data.notificationHealth.failed} failed · ${data.notificationHealth.pending} pending`}
        />
        <MiniStat
          label="Last scan"
          value={data.notificationHealth.lastScanAt ? new Date(data.notificationHealth.lastScanAt).toLocaleDateString() : 'Never'}
          icon={<Clock className="h-4 w-4" />}
          hint={data.notificationHealth.enabled ? 'Enabled' : 'Disabled'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Expiry timeline</CardTitle>
                <p className="mt-1 text-xs text-[#788496]">SIM expiries over the next six months.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.expiryTimeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#315F9D" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#315F9D" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#788496' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#788496' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(49,95,157,0.06)' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E7EAF0',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status distribution</CardTitle>
            <p className="mt-1 text-xs text-[#788496]">Operational vs validity classification.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={68}
                    outerRadius={104}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.statusDistribution.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E7EAF0',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-[#788496]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Upcoming expiries</CardTitle>
              <p className="mt-1 text-xs text-[#788496]">Next SIMs to expire.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/expiry')}
              className="text-xs font-medium text-[#315F9D] transition hover:underline"
            >
              View all
            </button>
          </CardHeader>
          <CardContent>
            {data.upcomingExpiries.length === 0 ? (
              <EmptyState title="No upcoming expiries" description="No SIMs expire in the near term." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>SIM</th>
                      <th>Company</th>
                      <th>Expiry</th>
                      <th>Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingExpiries.map((sim) => (
                      <tr
                        key={sim.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/sims/${sim.id}`)}
                      >
                        <td>
                          <div className="font-medium text-[#202B3A]">{sim.internalId}</div>
                          <div className="text-xs text-[#788496]">{sim.mobileNumber}</div>
                        </td>
                        <td>{sim.company?.name ?? '—'}</td>
                        <td>{humanDate(sim.expiryDate)}</td>
                        <td>
                          <ValidityBadge status={sim.validityStatus as keyof typeof VALIDITY_STATUS_LABELS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent activity</CardTitle>
            <p className="mt-1 text-xs text-[#788496]">Latest changes across the system.</p>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions you take will appear here." />
            ) : (
              <ul className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#315F9D]" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#202B3A]">{activity.description}</p>
                      <p className="mt-0.5 text-xs text-[#788496]">
                        {activity.user?.fullName ?? 'System'} · {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'default' | 'danger';
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            tone === 'danger' ? 'bg-[#FBE9EA] text-[#C6535D]' : 'bg-[#EAF1FA] text-[#315F9D]'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#788496]">{label}</p>
          <p className="mt-0.5 text-2xl font-light tracking-tight text-[#202B3A]">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-[#788496]">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardPage;
