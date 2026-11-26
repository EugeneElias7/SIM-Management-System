import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Cpu,
  Gauge,
  Radio,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { apiRequest, buildQuery } from '@/lib/api';
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

interface SimRow {
  id: string;
  internalId: string;
  mobileNumber: string;
  provider: string;
  operationalStatus: string;
  expiryDate: string | null;
  validityStatus: string;
  daysRemaining: number | null;
  company: { id: string; name: string } | null;
  machine: { id: string; name: string; serialNumber: string } | null;
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

const PROVIDER_COLORS = ['#315F9D', '#5B8DEF', '#8FB3F5', '#B7CFFA', '#DCE7FC'];

export function DashboardPage() {
  const navigate = useNavigate();

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/dashboard'),
  });

  const simsQuery = useQuery({
    queryKey: ['dashboard', 'sims-snapshot'],
    queryFn: () => apiRequest<{ items: SimRow[] }>('/sims?pageSize=12&sort=expiry_asc'),
  });

  const expirySummaryQuery = useQuery({
    queryKey: ['dashboard', 'expiry-summary'],
    queryFn: () => apiRequest<{ expired: number; within7: number; within15: number; within30: number; within60: number }>('/expiry/summary'),
  });

  const renewalsQuery = useQuery({
    queryKey: ['dashboard', 'renewals'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; renewalDate: string; newExpiryDate: string; sim: { internalId: string; mobileNumber: string } | null; company: { name: string } | null; referenceNumber: string | null }> }>('/expiry/renewals?pageSize=6'),
  });

  const notificationStatsQuery = useQuery({
    queryKey: ['dashboard', 'notification-stats'],
    queryFn: () => apiRequest<{ sent: number; failed: number; pending: number; cancelled: number; sentThisMonth: number }>('/notifications/stats'),
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-7" />
          <Skeleton className="h-64 lg:col-span-5" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-72 lg:col-span-7" />
          <Skeleton className="h-72 lg:col-span-5" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const data = dashboardQuery.data!;
  const stats = data.stats;
  const sims = simsQuery.data?.items ?? [];
  const total = stats.totalSims || 1;
  const assignedPct = Math.round((stats.assignedSims / total) * 100);
  const unassigned = stats.totalSims - stats.assignedSims;

  // Provider distribution from the SIM snapshot (best-effort, real data only)
  const providerCounts = sims.reduce<Record<string, number>>((acc, sim) => {
    acc[sim.provider] = (acc[sim.provider] ?? 0) + 1;
    return acc;
  }, {});
  const providerData = Object.entries(providerCounts).map(([name, value], index) => ({
    name,
    value,
    fill: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
  }));

  const renewalItems = renewalsQuery.data?.items ?? [];
  const expirySummary = expirySummaryQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#202B3A] sm:text-4xl">
            SIM Operations Command Centre
          </h1>
          <p className="mt-1 text-sm text-[#788496]">
            Estate health, expiry intelligence, machinery allocation and notification status.
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

      {/* 1. SIM Estate Overview + 2. Connectivity/Machinery Allocation */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">SIM Estate Overview</CardTitle>
                <p className="mt-1 text-xs text-[#788496]">
                  Total, assigned, active, in-stock, expiring, expired, suspended and faulty SIMs.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF1FA] text-[#315F9D]">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#788496]">Total SIMs</p>
                <p className="mt-2 text-6xl font-light tracking-tight text-[#202B3A]">{stats.totalSims}</p>
                <p className="mt-2 text-sm text-[#788496]">
                  {stats.assignedSims} assigned · {stats.inStock} in stock
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <EstateMetric label="Active" value={stats.activeSims} tone="primary" />
                <EstateMetric label="Expiring" value={stats.expiringSoon} tone="warning" />
                <EstateMetric label="Expired" value={stats.expiredSims} tone="danger" />
                <EstateMetric label="In stock" value={stats.inStock} tone="muted" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <EstateMetric label="Suspended" value={sims.filter((s) => s.operationalStatus === 'SUSPENDED').length} tone="muted" compact />
              <EstateMetric label="Faulty" value={sims.filter((s) => s.operationalStatus === 'FAULTY').length} tone="muted" compact />
              <EstateMetric label="Unassigned" value={unassigned} tone="muted" compact />
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-[#788496]">
                <span>SIM allocation</span>
                <span>{assignedPct}% assigned</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F0F2F5]">
                <div
                  className="h-full rounded-full bg-[#315F9D] transition-all duration-700"
                  style={{ width: `${assignedPct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Connectivity &amp; Machinery Allocation</CardTitle>
                <p className="mt-1 text-xs text-[#788496]">
                  Provider distribution and SIM-to-machine relationships from existing data.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF1FA] text-[#315F9D]">
                <Radio className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#788496]">Providers (snapshot)</p>
                <div className="mt-3 h-40">
                  {providerData.length === 0 ? (
                    <EmptyState title="No SIM data" description="Provider distribution appears once SIMs are loaded." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={providerData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={58} paddingAngle={2} stroke="none">
                          {providerData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #E7EAF0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {providerData.map((entry) => (
                    <span key={entry.name} className="flex items-center gap-1.5 text-xs text-[#788496]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <AllocRow label="Companies" value={stats.companies} icon={<Users className="h-4 w-4" />} />
                <AllocRow label="Machines" value={stats.machines} icon={<Wrench className="h-4 w-4" />} />
                <AllocRow label="Assigned SIMs" value={stats.assignedSims} icon={<Cpu className="h-4 w-4" />} />
                <AllocRow label="Unassigned stock" value={unassigned} icon={<Radio className="h-4 w-4" />} />
                <p className="pt-2 text-xs text-[#788496]">
                  Live network telemetry is not collected by this system; figures reflect recorded assignments only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Expiry & Renewal Intelligence */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Expiry &amp; Renewal Intelligence</CardTitle>
                <p className="mt-1 text-xs text-[#788496]">Expiry timeline and urgent renewal schedule.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#788496]">Expiry timeline</p>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.expiryTimeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="expiryBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#315F9D" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#315F9D" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#788496' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#788496' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(49,95,157,0.06)' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E7EAF0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="url(#expiryBar)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {expirySummary && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniBucket label="Expired" value={expirySummary.expired} tone="danger" />
                    <MiniBucket label="≤7 days" value={expirySummary.within7} tone="danger" />
                    <MiniBucket label="≤30 days" value={expirySummary.within30} tone="warning" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#788496]">Upcoming renewals</p>
                {renewalItems.length === 0 ? (
                  <EmptyState title="No renewals" description="Renewal records will appear here." />
                ) : (
                  <ul className="mt-3 space-y-2">
                    {renewalItems.map((renewal) => (
                      <li key={renewal.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#202B3A]">
                            {renewal.sim?.internalId ?? '—'}
                          </p>
                          <p className="text-xs text-[#788496]">
                            {renewal.company?.name ?? '—'} · {humanDate(renewal.newExpiryDate)}
                          </p>
                        </div>
                        <Badge variant="muted">{humanDate(renewal.renewalDate)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#788496]">Urgent expiry list</p>
                <ul className="mt-2 space-y-1.5">
                  {data.upcomingExpiries.slice(0, 5).map((sim) => (
                    <li key={sim.id} className="flex items-center justify-between gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => navigate(`/sims/${sim.id}`)}
                        className="truncate font-medium text-[#202B3A] hover:text-[#315F9D]"
                      >
                        {sim.internalId}
                      </button>
                      <span className="text-xs text-[#788496]">{humanDate(sim.expiryDate)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Notification Centre */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Notification Centre</CardTitle>
                <p className="mt-1 text-xs text-[#788496]">Delivery health and reminder status.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF1FA] text-[#315F9D]">
                <Bell className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <NotifyMetric label="Sent" value={notificationStatsQuery.data?.sent ?? 0} tone="success" />
              <NotifyMetric label="Failed" value={data.notificationHealth.failed} tone="danger" />
              <NotifyMetric label="Pending" value={data.notificationHealth.pending} tone="warning" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2">
                <span className="text-[#788496]">Reminders enabled</span>
                <Badge variant={data.notificationHealth.enabled ? 'success' : 'muted'}>
                  {data.notificationHealth.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2">
                <span className="text-[#788496]">Last successful scan</span>
                <span className="text-xs text-[#202B3A]">
                  {data.notificationHealth.lastScanAt ? new Date(data.notificationHealth.lastScanAt).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="mt-4 w-full rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2 text-sm font-medium text-[#315F9D] transition hover:bg-[#F0F2F5]"
            >
              Open notification centre
            </button>
          </CardContent>
        </Card>
      </div>

      {/* 5. SIM Inventory Snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">SIM Inventory Snapshot</CardTitle>
            <p className="mt-1 text-xs text-[#788496]">Compact operational view of SIMs, providers, companies and validity.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sims')}
            className="text-xs font-medium text-[#315F9D] transition hover:underline"
          >
            View all
          </button>
        </CardHeader>
        <CardContent>
          {sims.length === 0 ? (
            <EmptyState title="No SIMs" description="SIM records will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>SIM ID</th>
                    <th>Mobile number</th>
                    <th>Provider</th>
                    <th>Company</th>
                    <th>Machine</th>
                    <th>Validity</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {sims.map((sim) => (
                    <tr key={sim.id} className="cursor-pointer" onClick={() => navigate(`/sims/${sim.id}`)}>
                      <td className="font-medium text-[#202B3A]">{sim.internalId}</td>
                      <td>{sim.mobileNumber}</td>
                      <td>{sim.provider}</td>
                      <td>{sim.company?.name ?? '—'}</td>
                      <td>{sim.machine?.name ?? '—'}</td>
                      <td>
                        <ValidityBadge status={sim.validityStatus as keyof typeof VALIDITY_STATUS_LABELS} />
                      </td>
                      <td>{humanDate(sim.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <p className="mt-1 text-xs text-[#788496]">Polished operational activity timeline.</p>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" description="Actions you take will appear here." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#315F9D]" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#202B3A]">{activity.description}</p>
                    <p className="mt-1 text-xs text-[#788496]">
                      {activity.user?.fullName ?? 'System'} · {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EstateMetric({ label, value, tone, compact }: { label: string; value: number; tone: 'primary' | 'warning' | 'danger' | 'muted'; compact?: boolean }) {
  const toneClass = {
    primary: 'text-[#315F9D]',
    warning: 'text-[#B7791F]',
    danger: 'text-[#C6535D]',
    muted: 'text-[#788496]',
  }[tone];
  return (
    <div className={`rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#788496]">{label}</p>
      <p className={`mt-0.5 font-light tracking-tight text-[#202B3A] ${compact ? 'text-xl' : 'text-2xl'}`}>
        <span className={toneClass}>{value}</span>
      </p>
    </div>
  );
}

function AllocRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-[#788496]">
        <span className="text-[#315F9D]">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-[#202B3A]">{value}</span>
    </div>
  );
}

function MiniBucket({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'warning' }) {
  const color = tone === 'danger' ? 'text-[#C6535D]' : 'text-[#B7791F]';
  return (
    <div className="rounded-lg border border-[#E7EAF0] bg-[#FCFCFD] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[#788496]">{label}</p>
      <p className={`text-lg font-light ${color}`}>{value}</p>
    </div>
  );
}

function NotifyMetric({ label, value, tone }: { label: string; value: number; tone: 'success' | 'danger' | 'warning' }) {
  const color = tone === 'success' ? 'text-[#23865D]' : tone === 'danger' ? 'text-[#C6535D]' : 'text-[#B7791F]';
  return (
    <div className="rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#788496]">{label}</p>
      <p className={`mt-0.5 text-2xl font-light ${color}`}>{value}</p>
    </div>
  );
}

export default DashboardPage;
