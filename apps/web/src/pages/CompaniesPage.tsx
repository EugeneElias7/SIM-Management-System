import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { apiRequest, buildQuery } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [status, setStatus] = React.useState('ALL');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => setPage(1), [debounced, status]);

  const query = useQuery({
    queryKey: ['companies', { debounced, status, page }],
    queryFn: () =>
      apiRequest<any>(`/companies${buildQuery({ search: debounced, status: status === 'ALL' ? undefined : status, page, pageSize: 20 })}`),
  });

  const companies = query.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Companies"
        subtitle="Client organisations and their SIM assignment footprint."
        actions={
          <Button onClick={() => navigate('/companies/new')}>
            <Plus className="h-4 w-4" /> Add company
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input className="pl-9" placeholder="Search company, contact, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState title="No companies found" description="Add your first client company." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company: any) => (
              <Card
                key={company.id}
                className="cursor-pointer p-5 transition-shadow hover:shadow-lg"
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge variant={company.isActive ? 'success' : 'muted'}>{company.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink-900">{company.name}</h3>
                <p className="text-xs text-ink-500">
                  {company.city ?? '—'} {company.state ? `· ${company.state}` : ''}
                </p>
                <div className="mt-3 space-y-1 text-sm text-ink-600">
                  <p>{company.contactName ?? 'No primary contact'}</p>
                  <p className="text-xs text-ink-500">{company.contactEmail ?? company.email ?? '—'}</p>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-ink-100 pt-3 text-center">
                  <Metric label="SIMs" value={company.counts.sims} />
                  <Metric label="Active" value={company.counts.activeSims} />
                  <Metric label="Expiring" value={company.counts.expiringSoon} />
                  <Metric label="Machines" value={company.counts.machines} />
                </div>
              </Card>
            ))}
          </div>
          {query.data?.pagination && (
            <Pagination
              page={query.data.pagination.page}
              pageSize={query.data.pagination.pageSize}
              total={query.data.pagination.total}
              totalPages={query.data.pagination.totalPages}
              hasNext={query.data.pagination.hasNext}
              hasPrev={query.data.pagination.hasPrev}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-base font-bold text-ink-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  );
}
export default CompaniesPage;
