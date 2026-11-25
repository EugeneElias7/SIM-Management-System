import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notificationSettingsSchema, type NotificationSettingsInput } from '@san/shared';
import { apiRequest, buildQuery } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState('ALL');
  const [reminderType, setReminderType] = React.useState('ALL');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [testEmail, setTestEmail] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => setPage(1), [status, reminderType, debounced]);

  const statsQuery = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: () => apiRequest<any>('/notifications/stats'),
  });
  const listQuery = useQuery({
    queryKey: ['notifications', 'list', status, reminderType, debounced, page],
    queryFn: () =>
      apiRequest<any>(
        `/notifications${buildQuery({
          status: status === 'ALL' ? undefined : status,
          reminderType: reminderType === 'ALL' ? undefined : reminderType,
          search: debounced || undefined,
          page,
          pageSize: 20,
        })}`,
      ),
  });
  const settingsQuery = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: () => apiRequest<{ settings: any }>('/notifications/settings'),
  });
  const emailConfigQuery = useQuery({
    queryKey: ['notifications', 'email-config'],
    queryFn: () => apiRequest<{ config: any }>('/notifications/email-config'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const scanMutation = useMutation({
    mutationFn: () => apiRequest('/notifications/scan', { method: 'POST' }),
  });
  const testEmailMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest('/notifications/test-email', { method: 'POST', body: JSON.stringify({ email }) }),
  });

  const settingsForm = useForm<NotificationSettingsInput>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enabled: true,
      reminderDaysBefore: [30, 15, 7],
      notifyOnExpiry: true,
      postExpiryWeekly: true,
      postExpiryIntervalDays: 7,
      recipients: [],
      ccEmails: [],
    },
  });

  React.useEffect(() => {
    if (settingsQuery.data?.settings) {
      const settings = settingsQuery.data.settings;
      settingsForm.reset({
        enabled: settings.enabled,
        reminderDaysBefore: settings.reminderDaysBefore,
        notifyOnExpiry: settings.notifyOnExpiry,
        postExpiryWeekly: settings.postExpiryWeekly,
        postExpiryIntervalDays: settings.postExpiryIntervalDays,
        recipients: settings.recipients,
        ccEmails: settings.ccEmails,
      });
    }
  }, [settingsQuery.data, settingsForm]);

  const saveSettings = useMutation({
    mutationFn: (values: NotificationSettingsInput) =>
      apiRequest('/notifications/settings', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="Delivery log, reminder settings and email transport." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Sent" value={statsQuery.data?.sent ?? 0} />
        <Metric label="Failed" value={statsQuery.data?.failed ?? 0} />
        <Metric label="Pending" value={statsQuery.data?.pending ?? 0} />
        <Metric label="Sent this month" value={statsQuery.data?.sentThisMonth ?? 0} />
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Delivery log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <Card className="p-4">
            <div className="mb-3 flex flex-col gap-3 md:flex-row">
              <Input
                placeholder="Search recipient, subject or SIM…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {['PENDING', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="BEFORE_EXPIRY">Before expiry</SelectItem>
                  <SelectItem value="ON_EXPIRY">On expiry</SelectItem>
                  <SelectItem value="POST_EXPIRY">Post-expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {listQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (listQuery.data?.items ?? []).length === 0 ? (
              <EmptyState title="No notifications" description="Reminder deliveries will appear here." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SIM</th>
                        <th>Recipient</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Attempts</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(listQuery.data?.items ?? []).map((notification: any) => (
                        <tr key={notification.id}>
                          <td>{notification.sim?.internalId ?? '—'}</td>
                          <td>{notification.recipientEmail}</td>
                          <td>{notification.reminderType.replace('_', ' ')}</td>
                          <td>
                            <Badge
                              variant={
                                notification.status === 'SENT'
                                  ? 'success'
                                  : notification.status === 'FAILED'
                                    ? 'danger'
                                    : 'muted'
                              }
                            >
                              {notification.status}
                            </Badge>
                          </td>
                          <td>{notification.sentAt ? new Date(notification.sentAt).toLocaleString() : '—'}</td>
                          <td>
                            {notification.attempts}/{notification.maxAttempts}
                          </td>
                          <td>
                            {notification.status !== 'SENT' && notification.status !== 'CANCELLED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryMutation.mutate(notification.id)}
                              >
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...listQuery.data.pagination} onPageChange={setPage} />
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Reminder settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={settingsForm.handleSubmit((values) => saveSettings.mutate(values))}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enabled"
                      {...settingsForm.register('enabled')}
                      className="h-4 w-4 rounded border-ink-300 text-navy-500"
                    />
                    <Label htmlFor="enabled" className="normal-case tracking-normal text-ink-700">
                      Notifications enabled
                    </Label>
                  </div>

                  <div>
                    <Label>Reminder days before expiry</Label>
                    <Input
                      placeholder="30, 15, 7"
                      defaultValue={(settingsQuery.data?.settings?.reminderDaysBefore ?? []).join(', ')}
                      onBlur={(event) => {
                        const values = event.target.value
                          .split(',')
                          .map((value) => Number(value.trim()))
                          .filter((value) => Number.isFinite(value) && value > 0);
                        settingsForm.setValue('reminderDaysBefore', values);
                      }}
                    />
                    <p className="mt-1 text-xs text-ink-500">
                      Comma-separated days. Current: {settingsForm.watch('reminderDaysBefore').join(', ') || 'none'}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input type="checkbox" {...settingsForm.register('notifyOnExpiry')} className="h-4 w-4 rounded border-ink-300 text-navy-500" />
                      Notify on expiry day
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input type="checkbox" {...settingsForm.register('postExpiryWeekly')} className="h-4 w-4 rounded border-ink-300 text-navy-500" />
                      Post-expiry weekly follow-ups
                    </label>
                  </div>

                  <div>
                    <Label>Post-expiry interval (days)</Label>
                    <Input type="number" min={1} max={90} {...settingsForm.register('postExpiryIntervalDays', { valueAsNumber: true })} />
                  </div>

                  <div>
                    <Label>Recipients (one per line)</Label>
                    <textarea
                      className="input min-h-[80px]"
                      defaultValue={(settingsQuery.data?.settings?.recipients ?? []).join('\n')}
                      onBlur={(event) => {
                        const values = event.target.value
                          .split(/\n|,/)
                          .map((value) => value.trim().toLowerCase())
                          .filter(Boolean);
                        settingsForm.setValue('recipients', values);
                      }}
                    />
                  </div>

                  <div>
                    <Label>CC emails (one per line)</Label>
                    <textarea
                      className="input min-h-[60px]"
                      defaultValue={(settingsQuery.data?.settings?.ccEmails ?? []).join('\n')}
                      onBlur={(event) => {
                        const values = event.target.value
                          .split(/\n|,/)
                          .map((value) => value.trim().toLowerCase())
                          .filter(Boolean);
                        settingsForm.setValue('ccEmails', values);
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saveSettings.isPending}>
                      {saveSettings.isPending ? 'Saving…' : 'Save settings'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => scanMutation.mutate()}
                      disabled={scanMutation.isPending}
                    >
                      {scanMutation.isPending ? 'Queueing…' : 'Run scan now'}
                    </Button>
                  </div>
                  {saveSettings.isError && (
                    <p className="text-sm text-red-600">{(saveSettings.error as Error).message}</p>
                  )}
                  {scanMutation.isError && (
                    <p className="text-sm text-red-600">{(scanMutation.error as Error).message}</p>
                  )}
                  {scanMutation.isSuccess && (
                    <p className="text-sm text-green-600">Expiry scan queued. The worker will process it shortly.</p>
                  )}
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email transport</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Transport:</span> {emailConfigQuery.data?.config?.transport}
                  </p>
                  <p>
                    <span className="font-medium">Configured:</span>{' '}
                    {emailConfigQuery.data?.config?.configured ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="font-medium">Host:</span> {emailConfigQuery.data?.config?.host ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">From:</span> {emailConfigQuery.data?.config?.fromEmail ?? '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Test email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={testEmailMutation.isPending || !testEmail}
                    onClick={() => testEmailMutation.mutate(testEmail)}
                  >
                    {testEmailMutation.isPending ? 'Sending…' : 'Send test email'}
                  </Button>
                  {testEmailMutation.isError && (
                    <p className="text-xs text-red-600">{(testEmailMutation.error as Error).message}</p>
                  )}
                  {testEmailMutation.isSuccess && (
                    <p className="text-xs text-green-600">Test email sent.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
    </Card>
  );
}
export default NotificationsPage;
