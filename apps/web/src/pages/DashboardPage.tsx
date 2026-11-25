import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Clock, Gauge, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { humanDate, VALIDITY_STATUS_LABELS } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OperationalStatusBadge, ValidityBadge } from '@/components/ui/status-badges';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
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
  active: '#16A34A',
  expiring: '#F59E0B',
  expired: '#DC2626',
  inStock: '#64748B',
  suspended: '#7C3AED',
  faulty: '#EA580C',
  decommissioned: '#94A3B8',
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
        <PageHeader title="Dashboard" subtitle="Loading your SIM estate…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const data = query.data!;
  const stats = data.stats;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of SIM inventory, renewals and notification health."
        actions={
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="btn-secondary"
          >
            Export report
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total SIMs" value={stats.totalSims} icon={<Gauge className="h-5 w-5" />} accent="navy" hint={`${stats.assignedSims} assigned`} />
        <StatCard label="Active" value={stats.activeSims} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" hint={`${stats.inStock} in stock`} />
        <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={<Clock className="h-5 w-5" />} accent="amber" hint="Within 30 days" />
        <StatCard label="Expired" value={stats.expiredSims} icon={<AlertTriangle className="h-5 w-5" />} accent="red" hint="Needs attention" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={stats.companies} icon={<Users className="h-5 w-5" />} accent="slate" />
        <StatCard label="Machines" value={stats.machines} icon={<Activity className="h-5 w-5" />} accent="slate" />
        <StatCard
          label="Notifications"
          value={data.notificationHealth.pending + data.notificationHealth.failed}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent={data.notificationHealth.failed > 0 ? 'red' : 'green'}
          hint={`${data.notificationHealth.failed} failed · ${data.notificationHealth.pending} pending`}
        />
        <StatCard
          label="Last scan"
          value={data.notificationHealth.lastScanAt ? new Date(data.notificationHealth.lastScanAt).toLocaleDateString() : 'Never'}
          icon={<Clock className="h-5 w-5" />}
          accent="slate"
          hint={data.notificationHealth.enabled ? 'Enabled' : 'Disabled'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
            <p className="text-xs text-ink-500">Operational vs validity classification across active SIMs.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={104}
                    paddingAngle={2}
                  >
                    {data.statusDistribution.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} SIMs`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.statusDistribution.map((entry) => (
                <div key={entry.key} className="flex items-center gap-1.5 text-xs text-ink-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.key] ?? entry.color }}
                  />
                  {entry.label} ({entry.count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiry timeline</CardTitle>
            <p className="text-xs text-ink-500">SIM expiries over the next six months.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.expiryTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming expiries</CardTitle>
              <p className="text-xs text-ink-500">Next six SIMs to expire.</p>
            </div>
            <button type="button" onClick={() => navigate('/expiry')} className="text-xs font-medium text-navy-600 hover:underline">
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
                      <tr key={sim.id} className="cursor-pointer" onClick={() => navigate(`/sims/${sim.id}`)}>
                        <td>
                          <div className="font-medium text-ink-900">{sim.internalId}</div>
                          <div className="text-xs text-ink-500">{sim.mobileNumber}</div>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <p className="text-xs text-ink-500">Latest changes across the system.</p>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions you take will appear here." />
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-ink-800">{activity.description}</p>
                      <p className="text-xs text-ink-500">
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
export default DashboardPage;
