import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { simFormSchema, type SimFormInput } from '@san/shared';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { OPERATIONAL_STATUS_LABELS, NETWORK_PROVIDER_LABELS } from '@san/shared';

export function SimFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const simQuery = useQuery({
    queryKey: ['sim', id],
    queryFn: () => apiRequest<{ sim: any }>(`/sims/${id}`),
    enabled: isEdit,
  });

  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SimFormInput>({
    resolver: zodResolver(simFormSchema),
    defaultValues: {
      internalId: '',
      mobileNumber: '',
      provider: 'AIRTEL',
      activationDate: '',
      expiryDate: '',
      operationalStatus: 'IN_STOCK',
      companyId: '',
      machineId: '',
      contactId: '',
      notes: '',
    },
  });

  const companyId = watch('companyId');

  const machinesQuery = useQuery({
    queryKey: ['lookups', 'machines', companyId],
    queryFn: () =>
      apiRequest<{ items: Array<{ id: string; name: string; serialNumber: string; available: boolean; sim: any }> }>(
        `/lookups/companies/${companyId}/machines`,
      ),
    enabled: Boolean(companyId),
  });
  const contactsQuery = useQuery({
    queryKey: ['lookups', 'contacts', companyId],
    queryFn: () =>
      apiRequest<{ items: Array<{ id: string; fullName: string; email: string | null }> }>(
        `/lookups/companies/${companyId}/contacts`,
      ),
    enabled: Boolean(companyId),
  });

  React.useEffect(() => {
    if (isEdit && simQuery.data?.sim) {
      const sim = simQuery.data.sim;
      reset({
        internalId: sim.internalId ?? '',
        mobileNumber: sim.mobileNumber ?? '',
        provider: sim.provider,
        activationDate: sim.activationDate ?? '',
        expiryDate: sim.expiryDate ?? '',
        operationalStatus: sim.operationalStatus,
        companyId: sim.company?.id ?? '',
        machineId: sim.machine?.id ?? '',
        contactId: sim.contact?.id ?? '',
        notes: sim.notes ?? '',
      });
    }
  }, [isEdit, simQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: SimFormInput) => {
      const payload = {
        ...values,
        internalId: values.internalId || null,
        activationDate: values.activationDate || null,
        expiryDate: values.expiryDate || null,
        companyId: values.companyId || null,
        machineId: values.machineId || null,
        contactId: values.contactId || null,
        notes: values.notes || null,
      };
      if (isEdit) {
        return apiRequest(`/sims/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return apiRequest('/sims', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['sims'] });
      const simId = result?.sim?.id ?? id;
      navigate(simId ? `/sims/${simId}` : '/sims');
    },
  });

  if (isEdit && simQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isEdit && !simQuery.data?.sim) {
    return <EmptyState title="SIM not found" description="The requested SIM could not be loaded." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'Edit SIM' : 'Add SIM'}
        subtitle={isEdit ? 'Update SIM details, assignment and validity.' : 'Register a new SIM card in the estate.'}
      />

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <Label htmlFor="internalId">SIM ID (optional)</Label>
              <Input id="internalId" {...register('internalId')} placeholder="Auto-generated if blank" />
              {errors.internalId && <p className="mt-1 text-xs text-red-600">{errors.internalId.message}</p>}
            </div>
            <div>
              <Label htmlFor="mobileNumber">Mobile number</Label>
              <Input id="mobileNumber" {...register('mobileNumber')} placeholder="+919876543210" />
              {errors.mobileNumber && <p className="mt-1 text-xs text-red-600">{errors.mobileNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={watch('provider')}
                onValueChange={(value) => setValue('provider', value as SimFormInput['provider'])}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NETWORK_PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="operationalStatus">Operational status</Label>
              <Select
                value={watch('operationalStatus')}
                onValueChange={(value) => setValue('operationalStatus', value as SimFormInput['operationalStatus'])}
              >
                <SelectTrigger id="operationalStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATIONAL_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="activationDate">Activation date</Label>
              <Input id="activationDate" type="date" {...register('activationDate')} />
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input id="expiryDate" type="date" {...register('expiryDate')} />
              {errors.expiryDate && <p className="mt-1 text-xs text-red-600">{errors.expiryDate.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <Label htmlFor="companyId">Company</Label>
              <Select
                value={watch('companyId') || ''}
                onValueChange={(value) => {
                  setValue('companyId', value);
                  setValue('machineId', '');
                  setValue('contactId', '');
                }}
              >
                <SelectTrigger id="companyId">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No company (in stock)</SelectItem>
                  {(companiesQuery.data?.items ?? []).map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="machineId">Machine</Label>
              <Select
                value={watch('machineId') || ''}
                onValueChange={(value) => setValue('machineId', value)}
                disabled={!companyId}
              >
                <SelectTrigger id="machineId">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No machine</SelectItem>
                  {(machinesQuery.data?.items ?? []).map((machine) => (
                    <SelectItem key={machine.id} value={machine.id} disabled={!machine.available && machine.id !== watch('machineId')}>
                      {machine.name} ({machine.serialNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactId">Contact</Label>
              <Select
                value={watch('contactId') || ''}
                onValueChange={(value) => setValue('contactId', value)}
                disabled={!companyId}
              >
                <SelectTrigger id="contactId">
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
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        {mutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(mutation.error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create SIM'}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default SimFormPage;
