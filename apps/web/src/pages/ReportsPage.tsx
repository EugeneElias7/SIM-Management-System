import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { apiRequest, buildQuery } from '@/lib/api';
import type { ReportData, ReportType } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { NETWORK_PROVIDER_LABELS, OPERATIONAL_STATUS_LABELS, VALIDITY_STATUS_LABELS } from '@san/shared';

const REPORT_TYPES: Array<{ value: ReportType; label: string; description: string }> = [
  { value: 'inventory', label: 'SIM Inventory', description: 'Complete register of active SIM cards.' },
  { value: 'company-wise', label: 'Company-wise', description: 'Assignment summary grouped by company.' },
  { value: 'expiry', label: 'Expiry Report', description: 'SIMs approaching expiry or already expired.' },
  { value: 'renewals', label: 'Renewals', description: 'Renewal transactions in the selected period.' },
  { value: 'custom', label: 'Custom SIM Report', description: 'Filtered SIM register by selected criteria.' },
];

export function ReportsPage() {
  const [reportType, setReportType] = React.useState<ReportType>('inventory');
  const [format, setFormat] = React.useState('json');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [companyId, setCompanyId] = React.useState('ALL');
  const [provider, setProvider] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const [validity, setValidity] = React.useState('ALL');
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
  });

  const queryParams = {
    reportType,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
    companyId: companyId === 'ALL' ? undefined : companyId,
    provider: provider === 'ALL' ? undefined : provider,
    status: status === 'ALL' ? undefined : status,
    validity: validity === 'ALL' ? undefined : validity,
    format: 'json',
  };

  const reportQuery = useQuery({
    queryKey: ['report', queryParams],
    queryFn: () => apiRequest<{ report: ReportData }>(`/reports${buildQuery(queryParams as any)}`),
  });

  const report = reportQuery.data?.report;

  const download = async (downloadFormat: 'csv' | 'xlsx' | 'pdf') => {
    setDownloading(downloadFormat);
    try {
      const url = `/api/reports${buildQuery({ ...queryParams, format: downloadFormat })}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed.');
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `report.${downloadFormat}`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Generate and export inventory, company, expiry and renewal reports." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setReportType(type.value)}
            className={`rounded-xl border p-4 text-left transition ${
              reportType === type.value
                ? 'border-navy-500 bg-navy-50 shadow-sm'
                : 'border-ink-200 bg-white hover:border-navy-200'
            }`}
          >
            <p className="text-sm font-semibold text-ink-900">{type.label}</p>
            <p className="mt-1 text-xs text-ink-500">{type.description}</p>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All companies</SelectItem>
              {(companiesQuery.data?.items ?? []).map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All providers</SelectItem>
              {Object.entries(NETWORK_PROVIDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {Object.entries(OPERATIONAL_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={validity} onValueChange={setValidity}>
            <SelectTrigger>
              <SelectValue placeholder="Validity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All validity</SelectItem>
              {Object.entries(VALIDITY_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{report?.title ?? 'Report'}</CardTitle>
            <p className="text-xs text-ink-500">{report?.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => download('csv')} disabled={downloading !== null}>
              <FileDown className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => download('xlsx')} disabled={downloading !== null}>
              <FileDown className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => download('pdf')} disabled={downloading !== null}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !report ? (
            <EmptyState title="No data" description="Adjust filters to generate a report." />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {report.summary.map((item, index) => (
                  <Badge key={index} variant="muted">
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {report.columns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.slice(0, 50).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {report.columns.map((column) => (
                          <td key={column.key}>{String(row[column.key] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.rows.length > 50 && (
                <p className="mt-3 text-xs text-ink-500">
                  Showing first 50 of {report.rows.length} rows. Export for the full dataset.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default ReportsPage;
