import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Archive, Edit, RefreshCw, UserPlus } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { humanDate } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';
import { OperationalStatusBadge, ValidityBadge } from '@/components/ui/status-badges';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SimDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renewOpen, setRenewOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const query = useQuery({
    queryKey: ['sim', id],
    queryFn: () => apiRequest<{ sim: any }>(`/sims/${id}`),
    enabled: Boolean(id),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiRequest(`/sims/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim', id] });
      queryClient.invalidateQueries({ queryKey: ['sims'] });
      setArchiveOpen(false);
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const sim = query.data?.sim;
  if (!sim) return <EmptyState title="SIM not found" description="The requested SIM could not be loaded." />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={sim.internalId}
        subtitle={sim.mobileNumber}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/sims/${id}/edit`)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setRenewOpen(true)}>
              <RefreshCw className="h-4 w-4" /> Renew
            </Button>
            {sim.company ? (
              <Button variant="outline" onClick={() => navigate(`/sims/${id}/edit`)}>
                Reassign
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-4 w-4" /> Assign
              </Button>
            )}
            <Button variant="danger" onClick={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" /> Archive
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OperationalStatusBadge status={sim.operationalStatus} />
        <ValidityBadge status={sim.validityStatus} />
        <Badge variant="muted">{sim.provider}</Badge>
        {sim.daysRemaining !== null && sim.daysRemaining !== undefined && (
          <Badge variant={sim.daysRemaining < 0 ? 'danger' : sim.daysRemaining <= 30 ? 'warning' : 'muted'}>
            {sim.daysRemaining} day{Math.abs(sim.daysRemaining) === 1 ? '' : 's'} remaining
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="ICCID" value={sim.iccid} />
            <Info label="IMSI" value={sim.imsi ?? '—'} />
            <Info label="Provider" value={sim.provider} />
            <Info label="Activation date" value={humanDate(sim.activationDate)} />
            <Info label="Expiry date" value={humanDate(sim.expiryDate)} />
            <Info label="Last renewed" value={sim.lastRenewedAt ? new Date(sim.lastRenewedAt).toLocaleDateString() : '—'} />
            <Info label="Company" value={sim.company?.name ?? '—'} />
            <Info label="Machine" value={sim.machine?.name ?? '—'} />
            <Info label="Contact" value={sim.contact?.fullName ?? '—'} />
            <Info label="Created" value={new Date(sim.createdAt).toLocaleString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-700 whitespace-pre-wrap">{sim.notes || 'No notes recorded.'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Assignment history</TabsTrigger>
          <TabsTrigger value="renewals">Renewal history</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="assignments">
          <Card>
            <CardContent className="p-0">
              {(sim.assignments ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No assignment history" description="Assignments will appear here." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Machine</th>
                        <th>Contact</th>
                        <th>Assigned</th>
                        <th>Unassigned</th>
                        <th>Status</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.assignments.map((assignment: any) => (
                        <tr key={assignment.id}>
                          <td>{assignment.company?.name ?? '—'}</td>
                          <td>{assignment.machine?.name ?? '—'}</td>
                          <td>{assignment.contact?.fullName ?? '—'}</td>
                          <td>{new Date(assignment.assignedAt).toLocaleString()}</td>
                          <td>{assignment.unassignedAt ? new Date(assignment.unassignedAt).toLocaleString() : '—'}</td>
                          <td>
                            <Badge variant={assignment.isActive ? 'success' : 'muted'}>
                              {assignment.isActive ? 'Active' : 'Closed'}
                            </Badge>
                          </td>
                          <td>{assignment.assignedBy?.fullName ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="renewals">
          <Card>
            <CardContent className="p-0">
              {(sim.renewals ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No renewals recorded" description="Renew this SIM to create history." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Renewal date</th>
                        <th>Previous expiry</th>
                        <th>New expiry</th>
                        <th>Reference</th>
                        <th>Cost</th>
                        <th>Recorded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.renewals.map((renewal: any) => (
                        <tr key={renewal.id}>
                          <td>{humanDate(renewal.renewalDate)}</td>
                          <td>{humanDate(renewal.previousExpiryDate)}</td>
                          <td>{humanDate(renewal.newExpiryDate)}</td>
                          <td>{renewal.referenceNumber ?? '—'}</td>
                          <td>{renewal.cost !== null ? `₹${Number(renewal.cost).toFixed(2)}` : '—'}</td>
                          <td>{renewal.recordedBy?.fullName ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardContent className="p-0">
              {(sim.notifications ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No notifications" description="Reminder delivery records will appear here." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Recipient</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.notifications.map((notification: any) => (
                        <tr key={notification.id}>
                          <td>{notification.reminderType.replace('_', ' ')}</td>
                          <td>{notification.recipientEmail}</td>
                          <td>
                            <Badge variant={notification.status === 'SENT' ? 'success' : notification.status === 'FAILED' ? 'danger' : 'muted'}>
                              {notification.status}
                            </Badge>
                          </td>
                          <td>{notification.sentAt ? new Date(notification.sentAt).toLocaleString() : '—'}</td>
                          <td>
                            {notification.attempts}/{notification.maxAttempts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RenewDialog sim={sim} open={renewOpen} onOpenChange={setRenewOpen} onDone={() => queryClient.invalidateQueries({ queryKey: ['sim', id] })} />
      <AssignDialog sim={sim} open={assignOpen} onOpenChange={setAssignOpen} onDone={() => queryClient.invalidateQueries({ queryKey: ['sim', id] })} />
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive SIM</DialogTitle>
            <DialogDescription>
              {sim.internalId} will be decommissioned and hidden from active lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {archiveMutation.isPending ? 'Archiving…' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-sm text-ink-800">{value}</p>
    </div>
  );
}

function RenewDialog({ sim, open, onOpenChange, onDone }: { sim: any; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [newExpiryDate, setNewExpiryDate] = React.useState('');
  const [renewalDate, setRenewalDate] = React.useState(new Date().toISOString().slice(0, 10));
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
    if (!newExpiryDate) {
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
            {sim.internalId} · current expiry {humanDate(sim.expiryDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>New expiry date</Label>
            <Input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} />
          </div>
          <div>
            <Label>Renewal date</Label>
            <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <div>
            <Label>Reference number</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div>
            <Label>Cost (INR)</Label>
            <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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

function AssignDialog({ sim, open, onOpenChange, onDone }: { sim: any; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const companiesQuery = useQuery({
    queryKey: ['lookups', 'companies'],
    queryFn: () => apiRequest<{ items: Array<{ id: string; name: string }> }>('/lookups/companies'),
    enabled: open,
  });
  const [companyId, setCompanyId] = React.useState('');
  const [machineId, setMachineId] = React.useState('');
  const [contactId, setContactId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    queryFn: () =>
      apiRequest<{ items: Array<{ id: string; fullName: string; email: string | null }> }>(
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
    if (!companyId) {
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
          <DialogDescription>Assign {sim.internalId} to a company.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company</Label>
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
            <Label>Machine (optional)</Label>
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
            <Label>Contact (optional)</Label>
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
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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

export default SimDetailPage;
