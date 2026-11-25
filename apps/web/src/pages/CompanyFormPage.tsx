import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { companyFormSchema, type CompanyFormInput } from '@san/shared';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function CompanyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ['company', id],
    queryFn: () => apiRequest<{ company: any }>(`/companies/${id}`),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormInput>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      phone: '',
      email: '',
      website: '',
      notes: '',
      isActive: true,
      contactName: '',
      contactDesignation: '',
      contactPhone: '',
      contactEmail: '',
    },
  });

  React.useEffect(() => {
    if (isEdit && companyQuery.data?.company) {
      const company = companyQuery.data.company;
      reset({
        name: company.name,
        address: company.address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        postalCode: company.postalCode ?? '',
        country: company.country ?? 'India',
        phone: company.phone ?? '',
        email: company.email ?? '',
        website: company.website ?? '',
        notes: company.notes ?? '',
        isActive: company.isActive,
        contactName: company.contactName ?? '',
        contactDesignation: company.contactDesignation ?? '',
        contactPhone: company.contactPhone ?? '',
        contactEmail: company.contactEmail ?? '',
      });
    }
  }, [isEdit, companyQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormInput) => {
      const payload = {
        ...values,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        postalCode: values.postalCode || null,
        phone: values.phone || null,
        email: values.email || null,
        website: values.website || null,
        notes: values.notes || null,
        contactDesignation: values.contactDesignation || null,
        contactPhone: values.contactPhone || null,
        contactEmail: values.contactEmail || null,
      };
      if (isEdit) return apiRequest(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      return apiRequest('/companies', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      const companyId = result?.company?.id ?? id;
      navigate(companyId ? `/companies/${companyId}` : '/companies');
    },
  });

  if (isEdit && companyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isEdit && !companyQuery.data?.company) {
    return <EmptyState title="Company not found" description="The requested company could not be loaded." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={isEdit ? 'Edit company' : 'Add company'} subtitle="Client organisation and primary contact details." />

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" rows={2} {...register('address')} />
            </div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} />
              </div>
            </div>
            <div>
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" {...register('postalCode')} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register('website')} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...register('notes')} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4 rounded border-ink-300 text-navy-500" />
              <Label htmlFor="isActive" className="normal-case tracking-normal text-ink-700">
                Active company
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-ink-900">Primary contact</h3>
            </div>
            <div>
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" {...register('contactName')} />
              {errors.contactName && <p className="mt-1 text-xs text-red-600">{errors.contactName.message}</p>}
            </div>
            <div>
              <Label htmlFor="contactDesignation">Designation</Label>
              <Input id="contactDesignation" {...register('contactDesignation')} />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input id="contactPhone" {...register('contactPhone')} />
              {errors.contactPhone && <p className="mt-1 text-xs text-red-600">{errors.contactPhone.message}</p>}
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && <p className="mt-1 text-xs text-red-600">{errors.contactEmail.message}</p>}
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
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default CompanyFormPage;
