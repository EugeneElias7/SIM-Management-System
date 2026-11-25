import * as React from 'react';
import { Badge } from './badge';
import {
  OPERATIONAL_STATUS_LABELS,
  VALIDITY_STATUS_LABELS,
} from '@san/shared';

const validityVariant: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  ACTIVE: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'danger',
  UNKNOWN: 'muted',
};

const statusVariant: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'muted' | 'info' | 'purple' | 'orange'> = {
  IN_STOCK: 'muted',
  ACTIVE: 'success',
  SUSPENDED: 'purple',
  FAULTY: 'orange',
  DECOMMISSIONED: 'muted',
};

export function ValidityBadge({ status }: { status: keyof typeof VALIDITY_STATUS_LABELS }) {
  return <Badge variant={validityVariant[status]}>{VALIDITY_STATUS_LABELS[status]}</Badge>;
}

export function OperationalStatusBadge({ status }: { status: keyof typeof OPERATIONAL_STATUS_LABELS }) {
  return <Badge variant={statusVariant[status]}>{OPERATIONAL_STATUS_LABELS[status]}</Badge>;
}

export function ProviderBadge({ provider }: { provider: string }) {
  return <Badge variant="primary">{provider}</Badge>;
}
export default { ValidityBadge, OperationalStatusBadge, ProviderBadge };
