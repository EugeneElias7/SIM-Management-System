import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Pencil } from 'lucide-react';
import { apiRequest, buildQuery } from '@/lib/api';
import { humanDate } from '@san/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/feedback';

export function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const companyQuery = useQuery({
    queryKey: ['company', id],
    queryFn: () => apiRequest<{ company: any }>(`/companies/${id}`),
    enabled: Boolean(id),
  });

  const simsQuery = useQuery({
    queryKey: ['company', id, 'sims'],
    queryFn: () => apiRequest<{ items: any[] }>(`/companies/${id}/sims`),
    enabled: Boolean(id),
  });
  const contactsQuery = useQuery({
    queryKey: ['company', id, 'contacts'],
    queryFn: () => apiRequest<{ items: any[] }>(`/companies/${id}/contacts`),
    enabled: Boolean(id),
  });
  const renewalsQuery = useQuery({
    queryKey: ['company', id, 'renewals'],
    queryFn: () => apiRequest<any>(`/companies/${id}/renewals?pageSize=20`),
    enabled: Boolean(id),
  });
  const machinesQuery = useQuery({
    queryKey: ['machines', { companyId: id }],
    queryFn: () => apiRequest<any>(`/machines${buildQuery({ companyId: id, pageSize: 50 })}`),
    enabled: Boolean(id),
  });
  const activityQuery = useQuery({
    queryKey: ['activity', { companyId: id }],
    queryFn: () => apiRequest<any>(`/activity${buildQuery({ companyId: id, pageSize: 20 })}`),
    enabled: Boolean(id),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const company = companyQuery.data?.company;
  if (!company) return <EmptyState title="Company not found" description="The requested company could not be loaded." />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={company.name}
        subtitle={[company.city, company.state, company.country].filter(Boolean).join(' · ')}
        actions={
          <Button variant="outline" onClick={() => navigate(`/companies/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="SIMs" value={company.counts.sims} />
        <Stat label="Active SIMs" value={company.counts.activeSims} />
        <Stat label="Expiring soon" value={company.counts.expiringSoon} />
        <Stat label="Machines" value={company.counts.machines} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sims">SIMs</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Info label="Address" value={[company.address, company.city, company.state, company.postalCode, company.country].filter(Boolean).join(', ') || '—'} />
              <Info label="Phone" value={company.phone ?? '—'} />
              <Info label="Email" value={company.email ?? '—'} />
              <Info label="Website" value={company.website ?? '—'} />
              <Info label="Notes" value={company.notes ?? '—'} />
              <Info label="Status" value={company.isActive ? 'Active' : 'Inactive'} />
              <Info label="Primary contact" value={company.contactName ?? '—'} />
              <Info label="Contact email" value={company.contactEmail ?? '—'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sims">
          <Card>
            <CardContent className="p-0">
              {(simsQuery.data?.items ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No SIMs assigned" description="Assign SIMs to this company from the SIM inventory." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SIM ID</th>
                        <th>Mobile</th>
                        <th>Provider</th>
                        <th>Machine</th>
                        <th>Expiry</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(simsQuery.data?.items ?? []).map((sim: any) => (
                        <tr key={sim.id} className="cursor-pointer" onClick={() => navigate(`/sims/${sim.id}`)}>
                          <td className="font-medium">{sim.internalId}</td>
                          <td>{sim.mobileNumber}</td>
                          <td>{sim.provider}</td>
                          <td>{sim.machineName ?? '—'}</td>
                          <td>{humanDate(sim.expiryDate)}</td>
                          <td>{sim.operationalStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardContent className="p-0">
              {(contactsQuery.data?.items ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No contacts" description="Contacts are managed on the company edit form." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Designation</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(contactsQuery.data?.items ?? []).map((contact: any) => (
                        <tr key={contact.id}>
                          <td className="font-medium">{contact.fullName}</td>
                          <td>{contact.designation ?? '—'}</td>
                          <td>{contact.email ?? '—'}</td>
                          <td>{contact.phone ?? '—'}</td>
                          <td>{contact.isPrimary ? <Badge variant="success">Primary</Badge> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machines">
          <Card>
            <CardContent className="p-0">
              {(machinesQuery.data?.items ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No machines" description="Register machinery for this company." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Serial</th>
                        <th>Status</th>
                        <th>SIM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(machinesQuery.data?.items ?? []).map((machine: any) => (
                        <tr key={machine.id}>
                          <td className="font-medium">{machine.name}</td>
                          <td>{machine.serialNumber}</td>
                          <td>{machine.status}</td>
                          <td>{machine.sim?.internalId ?? '—'}</td>
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
              {(renewalsQuery.data?.items ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No renewals" description="Renewal records for this company's SIMs." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>SIM</th>
                        <th>Previous expiry</th>
                        <th>New expiry</th>
                        <th>Reference</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(renewalsQuery.data?.items ?? []).map((renewal: any) => (
                        <tr key={renewal.id}>
                          <td>{humanDate(renewal.renewalDate)}</td>
                          <td>{renewal.sim?.internalId ?? '—'}</td>
                          <td>{humanDate(renewal.previousExpiryDate)}</td>
                          <td>{humanDate(renewal.newExpiryDate)}</td>
                          <td>{renewal.referenceNumber ?? '—'}</td>
                          <td>{renewal.cost !== null ? `₹${Number(renewal.cost).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-0">
              {(activityQuery.data?.items ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No activity" description="Changes to this company will appear here." />
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {(activityQuery.data?.items ?? []).map((activity: any) => (
                    <li key={activity.id} className="px-6 py-3">
                      <p className="text-sm text-ink-800">{activity.description}</p>
                      <p className="text-xs text-ink-500">
                        {activity.user?.fullName ?? 'System'} · {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
    </Card>
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
export default CompanyDetailPage;
