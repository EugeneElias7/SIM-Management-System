import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationSettingsSchema, appPreferencesSchema, userCreateSchema, userUpdateSchema, adminResetPasswordSchema } from '@san/shared';
import type { OrganizationSettings, AppPreferences, UserCreateInput, UserUpdateInput, AdminResetPasswordInput } from '@san/shared';
import { apiRequest, buildQuery } from '@/lib/api';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userPage, setUserPage] = React.useState(1);
  const [userSearch, setUserSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [resetting, setResetting] = React.useState<any>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(userSearch), 350);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest<{ organization: OrganizationSettings; preferences: AppPreferences }>('/settings'),
  });
  const usersQuery = useQuery({
    queryKey: ['users', { debounced, userPage }],
    queryFn: () => apiRequest<any>(`/users${buildQuery({ search: debounced || undefined, page: userPage, pageSize: 20 })}`),
  });
  const rolesQuery = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: () => apiRequest<{ items: any[] }>('/users/roles'),
  });

  const orgForm = useForm<OrganizationSettings>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: settingsQuery.data?.organization ?? {
      name: 'SAN SOLUTION',
      legalName: 'SAN SOLUTION',
      email: '',
      phone: '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      taxId: '',
    },
  });
  const prefForm = useForm<AppPreferences>({
    resolver: zodResolver(appPreferencesSchema),
    defaultValues: settingsQuery.data?.preferences ?? {
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD MMM YYYY',
      currency: 'INR',
      defaultPageSize: 20,
    },
  });

  React.useEffect(() => {
    if (settingsQuery.data) {
      orgForm.reset(settingsQuery.data.organization);
      prefForm.reset(settingsQuery.data.preferences);
    }
  }, [settingsQuery.data, orgForm, prefForm]);

  const saveOrg = useMutation({
    mutationFn: (values: OrganizationSettings) =>
      apiRequest('/settings/organization', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
  const savePref = useMutation({
    mutationFn: (values: AppPreferences) =>
      apiRequest('/settings/preferences', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const archiveUser = useMutation({
    mutationFn: (id: string) => apiRequest(`/users/${id}/archive`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = usersQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Organisation profile, preferences and user accounts." />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardContent className="p-6">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={orgForm.handleSubmit((values) => saveOrg.mutate(values))}>
                <Field label="Name" error={orgForm.formState.errors.name?.message}>
                  <Input {...orgForm.register('name')} />
                </Field>
                <Field label="Legal name" error={orgForm.formState.errors.legalName?.message}>
                  <Input {...orgForm.register('legalName')} />
                </Field>
                <Field label="Email" error={orgForm.formState.errors.email?.message}>
                  <Input type="email" {...orgForm.register('email')} />
                </Field>
                <Field label="Phone" error={orgForm.formState.errors.phone?.message}>
                  <Input {...orgForm.register('phone')} />
                </Field>
                <Field label="Website" error={orgForm.formState.errors.website?.message}>
                  <Input {...orgForm.register('website')} />
                </Field>
                <Field label="Tax ID" error={orgForm.formState.errors.taxId?.message}>
                  <Input {...orgForm.register('taxId')} />
                </Field>
                <Field label="Address line 1" error={orgForm.formState.errors.addressLine1?.message}>
                  <Input {...orgForm.register('addressLine1')} />
                </Field>
                <Field label="Address line 2" error={orgForm.formState.errors.addressLine2?.message}>
                  <Input {...orgForm.register('addressLine2')} />
                </Field>
                <Field label="City" error={orgForm.formState.errors.city?.message}>
                  <Input {...orgForm.register('city')} />
                </Field>
                <Field label="State" error={orgForm.formState.errors.state?.message}>
                  <Input {...orgForm.register('state')} />
                </Field>
                <Field label="Postal code" error={orgForm.formState.errors.postalCode?.message}>
                  <Input {...orgForm.register('postalCode')} />
                </Field>
                <Field label="Country" error={orgForm.formState.errors.country?.message}>
                  <Input {...orgForm.register('country')} />
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={saveOrg.isPending}>
                    {saveOrg.isPending ? 'Saving…' : 'Save organization'}
                  </Button>
                  {saveOrg.isError && <p className="mt-2 text-sm text-red-600">{(saveOrg.error as Error).message}</p>}
                  {saveOrg.isSuccess && <p className="mt-2 text-sm text-green-600">Organization settings saved.</p>}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardContent className="p-6">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={prefForm.handleSubmit((values) => savePref.mutate(values))}>
                <Field label="Timezone" error={prefForm.formState.errors.timezone?.message}>
                  <Input {...prefForm.register('timezone')} />
                </Field>
                <Field label="Date format" error={prefForm.formState.errors.dateFormat?.message}>
                  <Select
                    value={prefForm.watch('dateFormat')}
                    onValueChange={(value) => prefForm.setValue('dateFormat', value as AppPreferences['dateFormat'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Currency" error={prefForm.formState.errors.currency?.message}>
                  <Select
                    value={prefForm.watch('currency')}
                    onValueChange={(value) => prefForm.setValue('currency', value as AppPreferences['currency'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['INR', 'USD', 'AED', 'GBP', 'EUR'].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default page size" error={prefForm.formState.errors.defaultPageSize?.message}>
                  <Input type="number" min={10} max={100} {...prefForm.register('defaultPageSize', { valueAsNumber: true })} />
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={savePref.isPending}>
                    {savePref.isPending ? 'Saving…' : 'Save preferences'}
                  </Button>
                  {savePref.isError && <p className="mt-2 text-sm text-red-600">{(savePref.error as Error).message}</p>}
                  {savePref.isSuccess && <p className="mt-2 text-sm text-green-600">Preferences saved.</p>}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700">User accounts</h3>
              <Button onClick={() => setCreateOpen(true)}>Add user</Button>
            </div>
            <Card className="p-4">
              <Input
                placeholder="Search users…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-3"
              />
              {usersQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <EmptyState title="No users" description="Create the first user account." />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last login</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((account: any) => (
                          <tr key={account.id}>
                            <td className="font-medium">{account.fullName}</td>
                            <td>{account.email}</td>
                            <td>{account.role}</td>
                            <td>
                              <Badge variant={account.isActive ? 'success' : 'muted'}>
                                {account.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : '—'}</td>
                            <td className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditing(account)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setResetting(account)}>
                                  Reset password
                                </Button>
                                {account.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => archiveUser.mutate(account.id)}
                                  >
                                    Archive
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {usersQuery.data?.pagination && (
                    <Pagination {...usersQuery.data.pagination} onPageChange={setUserPage} />
                  )}
                </>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Description</th>
                        <th>Users</th>
                        <th>Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rolesQuery.data?.items ?? []).map((role: any) => (
                        <tr key={role.id}>
                          <td className="font-medium">{role.name}</td>
                          <td>{role.description ?? '—'}</td>
                          <td>{role.userCount}</td>
                          <td className="text-xs text-ink-500">{role.permissions.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <UserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={rolesQuery.data?.items ?? []}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
      <UserDialog
        open={Boolean(editing)}
        onOpenChange={(value) => {
          if (!value) setEditing(null);
        }}
        roles={rolesQuery.data?.items ?? []}
        editing={editing}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          setEditing(null);
        }}
      />
      <ResetPasswordDialog
        open={Boolean(resetting)}
        onOpenChange={(value) => {
          if (!value) setResetting(null);
        }}
        user={resetting}
        onDone={() => setResetting(null)}
      />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
  roles,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  roles: any[];
  editing?: any;
  onDone: () => void;
}) {
  const isEdit = Boolean(editing);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema) as any,
    defaultValues: isEdit
      ? {
          email: editing?.email ?? '',
          firstName: editing?.firstName ?? '',
          lastName: editing?.lastName ?? '',
          roleId: editing?.roleId ?? '',
          isActive: editing?.isActive ?? true,
        }
      : {
          email: '',
          firstName: '',
          lastName: '',
          roleId: '',
          password: '',
          isActive: true,
        },
  });

  React.useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          email: editing.email,
          firstName: editing.firstName,
          lastName: editing.lastName,
          roleId: editing.roleId,
          isActive: editing.isActive,
        });
      } else {
        reset({
          email: '',
          firstName: '',
          lastName: '',
          roleId: '',
          password: '',
          isActive: true,
        });
      }
    }
  }, [open, editing, reset]);

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (values: any) => {
    setPending(true);
    setError(null);
    try {
      if (isEdit) {
        await apiRequest(`/users/${editing.id}`, { method: 'PATCH', body: JSON.stringify(values) });
      } else {
        await apiRequest('/users', { method: 'POST', body: JSON.stringify(values) });
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
          <DialogTitle>{isEdit ? 'Edit user' : 'Create user'}</DialogTitle>
          <DialogDescription>Manage account details and role assignment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" error={(errors as any).firstName?.message}>
              <Input {...register('firstName')} />
            </Field>
            <Field label="Last name" error={(errors as any).lastName?.message}>
              <Input {...register('lastName')} />
            </Field>
            <Field label="Email" error={(errors as any).email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Role" error={(errors as any).roleId?.message}>
              <Select value={watch('roleId') || ''} onValueChange={(value) => setValue('roleId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!isEdit && (
              <Field label="Initial password" error={(errors as any).password?.message}>
                <Input type="password" {...register('password' as any)} />
              </Field>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActiveUser" {...register('isActive')} className="h-4 w-4 rounded border-ink-300 text-navy-500" />
              <Label htmlFor="isActiveUser" className="normal-case tracking-normal text-ink-700">
                Active account
              </Label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onDone,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  user: any;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminResetPasswordInput>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { password: '', mustChangePassword: true },
  });
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (values: AdminResetPasswordInput) => {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/users/${user.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Field label="New password" error={errors.password?.message}>
            <Input type="password" {...register('password')} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" {...register('mustChangePassword')} className="h-4 w-4 rounded border-ink-300 text-navy-500" />
            Require password change on next sign-in
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Resetting…' : 'Reset password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsPage;
