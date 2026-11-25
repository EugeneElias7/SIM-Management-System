import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, buildQuery } from '@/lib/api';
import { humanDate } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { ValidityBadge } from '@/components/ui/status-badges';

export function ExpiryPage() {
  const navigate = useNavigate();
  const [days, setDays] = React.useState(30);
  const [upcomingPage, setUpcomingPage] = React.useState(1);
  const [expiredPage, setExpiredPage] = React.useState(1);
  const [renewalFrom, setRenewalFrom] = React.useState('');
  const [renewalTo, setRenewalTo] = React.useState('');
  const [renewalSearch, setRenewalSearch] = React.useState('');
  const [renewalPage, setRenewalPage] = React.useState(1);

  const summaryQuery = useQuery({
    queryKey: ['expiry', 'summary'],
    queryFn: () => apiRequest<any>('/expiry/summary'),
  });
  const upcomingQuery = useQuery({
    queryKey: ['expiry', 'upcoming', days, upcomingPage],
    queryFn: () => apiRequest<any>(`/expiry/upcoming${buildQuery({ days, page: upcomingPage, pageSize: 20 })}`),
  });
  const expiredQuery = useQuery({
    queryKey: ['expiry', 'expired', expiredPage],
    queryFn: () => apiRequest<any>(`/expiry/expired${buildQuery({ page: expiredPage, pageSize: 20 })}`),
  });
  const renewalsQuery = useQuery({
    queryKey: ['expiry', 'renewals', renewalFrom, renewalTo, renewalSearch, renewalPage],
    queryFn: () =>
      apiRequest<any>(
        `/expiry/renewals${buildQuery({ from: renewalFrom || undefined, to: renewalTo || undefined, search: renewalSearch || undefined, page: renewalPage, pageSize: 20 })}`,
      ),
  });
  const statsQuery = useQuery({
    queryKey: ['expiry', 'renewal-stats'],
    queryFn: () => apiRequest<any>('/expiry/renewal-stats'),
  });

  const summary = summaryQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader title="Expiry & Renewals" subtitle="Track upcoming expiries, expired SIMs and renewal history." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Expired" value={summary?.expired ?? 0} tone="red" />
        <MetricCard label="Within 7 days" value={summary?.within7 ?? 0} tone="red" />
        <MetricCard label="Within 15 days" value={summary?.within15 ?? 0} tone="amber" />
        <MetricCard label="Within 30 days" value={summary?.within30 ?? 0} tone="amber" />
        <MetricCard label="Within 60 days" value={summary?.within60 ?? 0} tone="slate" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total renewals" value={statsQuery.data?.total ?? 0} tone="navy" />
        <MetricCard label="This month" value={statsQuery.data?.thisMonth ?? 0} tone="navy" />
        <MetricCard label="Last 30 days" value={statsQuery.data?.last30 ?? 0} tone="navy" />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="renewals">Renewal history</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm text-ink-600">Show next</span>
              <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 15, 30, 60, 90, 180].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {upcomingQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (upcomingQuery.data?.items ?? []).length === 0 ? (
              <EmptyState title="No upcoming expiries" description="No SIMs expire in the selected window." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SIM</th>
                        <th>Company</th>
                        <th>Machine</th>
                        <th>Expiry</th>
                        <th>Days left</th>
                        <th>Validity</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(upcomingQuery.data?.items ?? []).map((sim: any) => (
                        <tr key={sim.id}>
                          <td>
                            <div className="font-medium">{sim.internalId}</div>
                            <div className="text-xs text-ink-500">{sim.mobileNumber}</div>
                          </td>
                          <td>{sim.company?.name ?? '—'}</td>
                          <td>{sim.machine?.name ?? '—'}</td>
                          <td>{humanDate(sim.expiryDate)}</td>
                          <td>{sim.daysRemaining}</td>
                          <td>
                            <ValidityBadge status={sim.validityStatus} />
                          </td>
                          <td>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/sims/${sim.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...upcomingQuery.data.pagination} onPageChange={setUpcomingPage} />
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card className="p-4">
            {expiredQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (expiredQuery.data?.items ?? []).length === 0 ? (
              <EmptyState title="No expired SIMs" description="Nothing has expired yet." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SIM</th>
                        <th>Company</th>
                        <th>Machine</th>
                        <th>Expiry</th>
                        <th>Days overdue</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expiredQuery.data?.items ?? []).map((sim: any) => (
                        <tr key={sim.id}>
                          <td>
                            <div className="font-medium">{sim.internalId}</div>
                            <div className="text-xs text-ink-500">{sim.mobileNumber}</div>
                          </td>
                          <td>{sim.company?.name ?? '—'}</td>
                          <td>{sim.machine?.name ?? '—'}</td>
                          <td>{humanDate(sim.expiryDate)}</td>
                          <td className="text-red-600">{Math.abs(sim.daysRemaining ?? 0)}</td>
                          <td>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/sims/${sim.id}`)}>
                              Renew
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...expiredQuery.data.pagination} onPageChange={setExpiredPage} />
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="renewals">
          <Card className="p-4">
            <div className="mb-3 flex flex-col gap-3 md:flex-row">
              <Input
                placeholder="Search reference, SIM or company…"
                value={renewalSearch}
                onChange={(e) => setRenewalSearch(e.target.value)}
                className="flex-1"
              />
              <Input type="date" value={renewalFrom} onChange={(e) => setRenewalFrom(e.target.value)} className="w-44" />
              <Input type="date" value={renewalTo} onChange={(e) => setRenewalTo(e.target.value)} className="w-44" />
            </div>
            {renewalsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (renewalsQuery.data?.items ?? []).length === 0 ? (
              <EmptyState title="No renewals" description="Renewal records will appear here." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>SIM</th>
                        <th>Company</th>
                        <th>Previous expiry</th>
                        <th>New expiry</th>
                        <th>Reference</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(renewalsQuery.data?.items ?? []).map((renewal: any) => (
                        <tr key={renewal.id}>
                          <td>{humanDate(renewal.renewalDate)}</td>
                          <td>{renewal.sim?.internalId ?? '—'}</td>
                          <td>{renewal.company?.name ?? '—'}</td>
                          <td>{humanDate(renewal.previousExpiryDate)}</td>
                          <td>{humanDate(renewal.newExpiryDate)}</td>
                          <td>{renewal.referenceNumber ?? '—'}</td>
                          <td>{renewal.cost !== null ? `₹${Number(renewal.cost).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...renewalsQuery.data.pagination} onPageChange={setRenewalPage} />
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'slate' | 'navy' }) {
  const toneClass = {
    red: 'text-red-600',
    amber: 'text-amber-600',
    slate: 'text-ink-700',
    navy: 'text-navy-600',
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </Card>
  );
}
export default ExpiryPage;
