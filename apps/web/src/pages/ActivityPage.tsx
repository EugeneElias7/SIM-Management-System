import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, buildQuery } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function ActivityPage() {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [entityType, setEntityType] = React.useState('ALL');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => setPage(1), [debounced, entityType]);

  const query = useQuery({
    queryKey: ['activity', { debounced, entityType, page }],
    queryFn: () =>
      apiRequest<any>(`/activity${buildQuery({ search: debounced || undefined, entityType: entityType === 'ALL' ? undefined : entityType, page, pageSize: 25 })}`),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Log" subtitle="Auditable history of every change in the system." />
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            placeholder="Search description or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              {['SIM', 'COMPANY', 'MACHINE', 'NOTIFICATION', 'SYSTEM', 'USER'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (query.data?.items ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState title="No activity" description="Actions you take will appear here." />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              {(query.data?.items ?? []).map((activity: any) => (
                <li key={activity.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800">{activity.description}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {activity.user?.fullName ?? 'System'} · {activity.entityType} · {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-600">
                      {activity.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4">
              <Pagination {...query.data.pagination} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
export default ActivityPage;
