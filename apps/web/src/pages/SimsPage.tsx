import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Download,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
} from 'lucide-react';
import { apiRequest, buildQuery } from '@/lib/api';
import { humanDate, NETWORK_PROVIDER_LABELS, OPERATIONAL_STATUS_LABELS, VALIDITY_STATUS_LABELS } from '@san/shared';
import type { SimListItem, Paginated } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { ValidityBadge, OperationalStatusBadge } from '@/components/ui/status-badges';

const providers = Object.entries(NETWORK_PROVIDER_LABELS) as [string, string][];
const validityOptions = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'UNKNOWN'] as const;

export function SimsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [provider, setProvider] = React.useState('ALL');
  const [validity, setValidity] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const [companyId, setCompanyId] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [selectedSim, setSelectedSim] = React.useState<SimListItem | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [unassignOpen, setUnassignOpen] = React.useState(false);
  const [renewOpen, setRenewOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, provider, validity, status, companyId]);

  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
  });

  const simsQuery = useQuery({
    queryKey: ['sims', { debouncedSearch, provider, validity, status, companyId, page, pageSize }],
    queryFn: () =>
      apiRequest<Paginated<SimListItem>>(
        `/sims${buildQuery({
          search: debouncedSearch,
          provider: provider === 'ALL' ? undefined : provider,
          validity: validity === 'ALL' ? undefined : validity,
          status: status === 'ALL' ? undefined : status,
          companyId: companyId === 'ALL' ? undefined : companyId,
          page,
          pageSize,
        })}`,
      ),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/sims/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sims'] });
      setArchiveOpen(false);
      setSelectedSim(null);
    },
  });

  const sims = simsQuery.data;
  const items = sims?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="SIM Inventory"
        subtitle="Search, filter and manage every SIM card in the estate."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const format = 'csv';
                window.open(`/api/sims/export?format=${format}`, '_blank');
              }}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => navigate('/sims/new')}>
              <Plus className="h-4 w-4" /> Add SIM
            </Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Search SIM ID, mobile, ICCID, company or machine…"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All providers</SelectItem>
              {providers.map(([value, label]) => (
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
              {validityOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {VALIDITY_STATUS_LABELS[value]}
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
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-64">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setProvider('ALL');
              setValidity('ALL');
              setStatus('ALL');
              setCompanyId('ALL');
            }}
          >
            <RefreshCw className="h-4 w-4" /> Reset filters
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {simsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No SIMs found"
              description="Try adjusting the filters or add a new SIM card."
              action={
                <Button onClick={() => navigate('/sims/new')}>
                  <Plus className="h-4 w-4" /> Add SIM
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>SIM</th>
                    <th>Provider</th>
                    <th>Company</th>
                    <th>Machine</th>
                    <th>Expiry</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sim) => (
                    <tr key={sim.id}>
                      <td>
                        <div className="font-medium text-ink-900">{sim.internalId}</div>
                        <div className="text-xs text-ink-500">{sim.mobileNumber}</div>
                      </td>
                      <td>{NETWORK_PROVIDER_LABELS[sim.provider]}</td>
                      <td>{sim.company?.name ?? '—'}</td>
                      <td>{sim.machine?.name ?? '—'}</td>
                      <td>{humanDate(sim.expiryDate)}</td>
                      <td>
                        <ValidityBadge status={sim.validityStatus as keyof typeof VALIDITY_STATUS_LABELS} />
                      </td>
                      <td>
                        <OperationalStatusBadge status={sim.operationalStatus as keyof typeof OPERATIONAL_STATUS_LABELS} />
                      </td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/sims/${sim.id}`)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sims/${sim.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSim(sim);
                                setRenewOpen(true);
                              }}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" /> Renew
                            </DropdownMenuItem>
                            {sim.company ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSim(sim);
                                  setUnassignOpen(true);
                                }}
                              >
                                Return to stock
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSim(sim);
                                  setAssignOpen(true);
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" /> Assign
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              onClick={() => {
                                setSelectedSim(sim);
                                setArchiveOpen(true);
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" /> Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sims && (
              <div className="px-4">
                <Pagination
                  page={sims.pagination.page}
                  pageSize={sims.pagination.pageSize}
                  total={sims.pagination.total}
                  totalPages={sims.pagination.totalPages}
                  hasNext={sims.pagination.hasNext}
                  hasPrev={sims.pagination.hasPrev}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <AssignDialog
        sim={selectedSim}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['sims'] })}
      />
      <UnassignDialog
        sim={selectedSim}
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['sims'] })}
      />
      <RenewDialog
        sim={selectedSim}
        open={renewOpen}
        onOpenChange={setRenewOpen}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['sims'] })}
      />
      <ArchiveDialog
        sim={selectedSim}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={() => {
          if (selectedSim) archiveMutation.mutate(selectedSim.id);
        }}
        isPending={archiveMutation.isPending}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={() => queryClient.invalidateQueries({ queryKey: ['sims'] })} />
    </div>
  );
}

/* ------------------------------ Dialogs ------------------------------ */

function AssignDialog({
  sim,
  open,
  onOpenChange,
  onDone,
}: {
  sim: SimListItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDone: () => void;
}) {
  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
    enabled: open,
  });
  const [companyId, setCompanyId] = React.useState('');
  const [machineId, setMachineId] = React.useState('');
  const [contactId, setContactId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const machinesQuery = useQuery({
    queryKey: ['lookups', 'machines', companyId],
    queryFn: () =>
      apiRequest<{ items: Array<{ id: string; name: string; serialNumber: string; available: boolean }> }>(
        `/lookups/companies/${companyId}/machines`,
      ),
    enabled: open && Boolean(companyId),
  });
  const contactsQuery = useQuery({
    queryKey: ['lookups', 'contacts', companyId],
    queryFn: () => apiRequest<{ items: Array<{ id: string; fullName: string; email: string | null }> }>(
      `/lookups/companies/${companyId}/contacts`,
    ),
    enabled: open && Boolean(companyId),
  });

  React.useEffect(() => {
    if (open) {
      setCompanyId('');
      setMachineId('');
      setContactId('');
      setNotes('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!sim || !companyId) {
      setError('Select a company first.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/sims/${sim.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          machineId: machineId || null,
          contactId: contactId || null,
          notes: notes || null,
        }),
      });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign SIM</DialogTitle>
          <DialogDescription>
            {sim ? `Assign ${sim.internalId} to a company and optionally a machine.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="label">Company</label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {(companiesQuery.data?.items ?? []).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label">Machine (optional)</label>
            <Select value={machineId} onValueChange={setMachineId} disabled={!companyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No machine</SelectItem>
                {(machinesQuery.data?.items ?? [])
                  .filter((machine) => machine.available)
                  .map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.serialNumber})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label">Contact (optional)</label>
            <Select value={contactId} onValueChange={setContactId} disabled={!companyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No contact</SelectItem>
                {(contactsQuery.data?.items ?? []).map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label">Notes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Assignment notes" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnassignDialog({
  sim,
  open,
  onOpenChange,
  onDone,
}: {
  sim: SimListItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!sim) return;
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/sims/${sim.id}/unassign`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes || null }),
      });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unassignment failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return to stock</DialogTitle>
          <DialogDescription>
            {sim ? `Return ${sim.internalId} to stock and close the active assignment.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="label">Notes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for unassignment" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Processing…' : 'Return to stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewDialog({
  sim,
  open,
  onOpenChange,
  onDone,
}: {
  sim: SimListItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDone: () => void;
}) {
  const [newExpiryDate, setNewExpiryDate] = React.useState('');
  const [renewalDate, setRenewalDate] = React.useState('');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNewExpiryDate('');
      setRenewalDate(new Date().toISOString().slice(0, 10));
      setReferenceNumber('');
      setCost('');
      setNotes('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!sim || !newExpiryDate) {
      setError('New expiry date is required.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/sims/${sim.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          newExpiryDate,
          renewalDate: renewalDate || null,
          referenceNumber: referenceNumber || null,
          cost: cost ? Number(cost) : null,
          notes: notes || null,
        }),
      });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renewal failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew SIM</DialogTitle>
          <DialogDescription>
            {sim ? `Extend validity for ${sim.internalId}. Current expiry: ${humanDate(sim.expiryDate)}.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="label">New expiry date</label>
            <Input type="date" value={newExpiryDate} onChange={(event) => setNewExpiryDate(event.target.value)} />
          </div>
          <div>
            <label className="label">Renewal date</label>
            <Input type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} />
          </div>
          <div>
            <label className="label">Reference number</label>
            <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
          </div>
          <div>
            <label className="label">Cost (INR)</label>
            <Input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Renewing…' : 'Renew'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  sim,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  sim: SimListItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive SIM</DialogTitle>
          <DialogDescription>
            {sim
              ? `${sim.internalId} will be decommissioned and hidden from active lists. History is preserved.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDone: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [dryRun, setDryRun] = React.useState(true);
  const [result, setResult] = React.useState<any>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
      setError(null);
      setDryRun(true);
    }
  }, [open]);

  const submit = async () => {
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/sims/import?dryRun=${dryRun}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Import failed.');
      setResult(body.result);
      if (!dryRun && body.result?.created > 0) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setPending(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    window.open(`/api/sims/import-template?format=${format}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import SIMs</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file. Validate first, then commit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
              <Download className="h-4 w-4" /> CSV template
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
              <Download className="h-4 w-4" /> Excel template
            </Button>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-navy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100"
          />
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-navy-500"
            />
            Validate only (dry run)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm">
              <p className="font-medium text-ink-800">
                {result.dryRun ? 'Validation result' : 'Import result'}: {result.created} created,{' '}
                {result.skipped} skipped, {result.totalRows} rows
              </p>
              {result.issues?.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700">
                  {result.issues.map((issue: any, index: number) => (
                    <li key={index}>
                      Row {issue.row}: {issue.messages.join('; ')}
                    </li>
                  ))}
                </ul>
              )}
              {result.preview?.length > 0 && (
                <p className="mt-2 text-xs text-ink-500">
                  Preview shows first {result.preview.length} valid row(s).
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Processing…' : dryRun ? 'Validate' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SimsPage;
