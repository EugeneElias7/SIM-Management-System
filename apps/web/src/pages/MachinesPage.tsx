import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { machineFormSchema, type MachineFormInput } from '@san/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest, buildQuery } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { MACHINE_STATUS_LABELS } from '@san/shared';

export function MachinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [companyId, setCompanyId] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => setPage(1), [debounced, companyId, status]);

  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
  });

  const machinesQuery = useQuery({
    queryKey: ['machines', { debounced, companyId, status, page }],
    queryFn: () =>
      apiRequest<any>(`/machines${buildQuery({ search: debounced, companyId: companyId === 'ALL' ? undefined : companyId, status: status === 'ALL' ? undefined : status, page, pageSize: 20 })}`),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/machines/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const machines = machinesQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Machinery"
        subtitle="Equipment registered against client companies and SIMs."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add machine
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Input placeholder="Search name, model or serial…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-52">
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {Object.entries(MACHINE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {machinesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No machines found" description="Register machinery for a company." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Model</th>
                    <th>Serial number</th>
                    <th>Company</th>
                    <th>SIM</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine: any) => (
                    <tr key={machine.id}>
                      <td className="font-medium">{machine.name}</td>
                      <td>{machine.model ?? '—'}</td>
                      <td>{machine.serialNumber}</td>
                      <td>{machine.company?.name ?? '—'}</td>
                      <td>{machine.sim?.internalId ?? '—'}</td>
                      <td>
                        <Badge variant={machine.status === 'OPERATIONAL' ? 'success' : machine.status === 'DECOMMISSIONED' ? 'muted' : 'warning'}>
                          {MACHINE_STATUS_LABELS[machine.status as keyof typeof MACHINE_STATUS_LABELS]}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(machine);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => archiveMutation.mutate(machine.id)}
                          >
                            Archive
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {machinesQuery.data?.pagination && (
              <div className="px-4">
                <Pagination
                  page={machinesQuery.data.pagination.page}
                  pageSize={machinesQuery.data.pagination.pageSize}
                  total={machinesQuery.data.pagination.total}
                  totalPages={machinesQuery.data.pagination.totalPages}
                  hasNext={machinesQuery.data.pagination.hasNext}
                  hasPrev={machinesQuery.data.pagination.hasPrev}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <MachineModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        companies={companiesQuery.data?.items ?? []}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['machines'] })}
      />
    </div>
  );
}

function MachineModal({
  open,
  onOpenChange,
  editing,
  companies,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any;
  companies: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MachineFormInput>({
    resolver: zodResolver(machineFormSchema),
    defaultValues: {
      name: '',
      model: '',
      serialNumber: '',
      companyId: '',
      simId: '',
      installationDate: '',
      status: 'OPERATIONAL',
      notes: '',
    },
  });

  const companyId = watch('companyId');

  const simsQuery = useQuery({
    queryKey: ['company', companyId, 'sims'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; internalId: string; mobileNumber: string; machineName: string | null }> }>(`/companies/${companyId}/sims`),
    enabled: open && Boolean(companyId),
  });

  React.useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          model: editing.model ?? '',
          serialNumber: editing.serialNumber,
          companyId: editing.company?.id ?? editing.companyId ?? '',
          simId: editing.sim?.id ?? '',
          installationDate: editing.installationDate ?? '',
          status: editing.status,
          notes: editing.notes ?? '',
        });
      } else {
        reset({
          name: '',
          model: '',
          serialNumber: '',
          companyId: '',
          simId: '',
          installationDate: '',
          status: 'OPERATIONAL',
          notes: '',
        });
      }
    }
  }, [open, editing, reset]);

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (values: MachineFormInput) => {
    setPending(true);
    setError(null);
    try {
      const payload = {
        ...values,
        model: values.model || null,
        simId: values.simId || null,
        installationDate: values.installationDate || null,
        notes: values.notes || null,
      };
      if (editing) {
        await apiRequest(`/machines/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/machines', { method: 'POST', body: JSON.stringify(payload) });
      }
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit machine' : 'Add machine'}</DialogTitle>
          <DialogDescription>Register equipment and optionally link a SIM.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Model</Label>
              <Input {...register('model')} />
            </div>
            <div>
              <Label>Serial number</Label>
              <Input {...register('serialNumber')} />
              {errors.serialNumber && <p className="mt-1 text-xs text-red-600">{errors.serialNumber.message}</p>}
            </div>
            <div>
              <Label>Company</Label>
              <Select value={companyId || ''} onValueChange={(value) => setValue('companyId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SIM (optional)</Label>
              <Select value={watch('simId') || ''} onValueChange={(value) => setValue('simId', value)} disabled={!companyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SIM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No SIM</SelectItem>
                  {(simsQuery.data?.items ?? [])
                    .filter((sim: any) => !sim.machineName || sim.id === watch('simId'))
                    .map((sim: any) => (
                      <SelectItem key={sim.id} value={sim.id}>
                        {sim.internalId} ({sim.mobileNumber})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as MachineFormInput['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MACHINE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Installation date</Label>
              <Input type="date" {...register('installationDate')} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} {...register('notes')} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create machine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default MachinesPage;
