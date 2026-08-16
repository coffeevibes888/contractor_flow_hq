'use client';

import { cn } from '@/lib/utils';
import { 
  FileText, 
  Send, 
  PenTool, 
  CheckCircle2, 
  Clock
} from 'lucide-react';

export interface LeaseTimelineEvent {
  id: string;
  type: 'created' | 'sent_to_tenant' | 'tenant_signed' | 'sent_to_landlord' | 'landlord_signed' | 'activated';
  timestamp: Date;
  description?: string;
  actor?: string;
}

export interface LeaseTimelineProps {
  events: LeaseTimelineEvent[];
  className?: string;
}

const eventConfig = {
  created: {
    icon: FileText,
    label: 'Lease Created',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  sent_to_tenant: {
    icon: Send,
    label: 'Sent to Tenant',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
  },
  tenant_signed: {
    icon: PenTool,
    label: 'Tenant Signed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  sent_to_landlord: {
    icon: Send,
    label: 'Sent to Landlord',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
  },
  landlord_signed: {
    icon: PenTool,
    label: 'Landlord Signed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  activated: {
    icon: CheckCircle2,
    label: 'Lease Activated',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
};

export default function LeaseTimeline({ events, className }: LeaseTimelineProps) {
  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Clock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-400">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />

      <div className="space-y-4">
        {sortedEvents.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = index === sortedEvents.length - 1;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-4', !isLast && 'border-b border-white/5')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{config.label}</p>
                    {event.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
                    )}
                    {event.actor && (
                      <p className="text-xs text-slate-500 mt-0.5">by {event.actor}</p>
                    )}
                  </div>
                  <time className="text-[10px] text-slate-500 whitespace-nowrap">
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Helper function to build timeline events from lease data
 */
export function buildLeaseTimelineEvents(lease: {
  createdAt: Date | string;
  tenantSignedAt?: Date | string | null;
  landlordSignedAt?: Date | string | null;
  status: string;
  tenant?: { name?: string | null } | null;
  signatureRequests?: Array<{
    role: string;
    status: string;
    createdAt: Date | string;
    signedAt?: Date | string | null;
    recipientName?: string | null;
  }>;
}): LeaseTimelineEvent[] {
  const events: LeaseTimelineEvent[] = [];

  // Lease created
  events.push({
    id: 'created',
    type: 'created',
    timestamp: new Date(lease.createdAt),
    description: 'Lease agreement generated',
  });

  // Find tenant signature request
  const tenantRequest = lease.signatureRequests?.find(sr => sr.role === 'tenant');
  if (tenantRequest) {
    events.push({
      id: 'sent_to_tenant',
      type: 'sent_to_tenant',
      timestamp: new Date(tenantRequest.createdAt),
      description: `Signing invitation sent`,
      actor: tenantRequest.recipientName || lease.tenant?.name || 'Tenant',
    });
  }

  // Tenant signed
  if (lease.tenantSignedAt) {
    events.push({
      id: 'tenant_signed',
      type: 'tenant_signed',
      timestamp: new Date(lease.tenantSignedAt),
      actor: lease.tenant?.name || 'Tenant',
    });
  }

  // Find landlord signature request
  const landlordRequest = lease.signatureRequests?.find(sr => sr.role === 'landlord');
  if (landlordRequest && lease.tenantSignedAt) {
    events.push({
      id: 'sent_to_landlord',
      type: 'sent_to_landlord',
      timestamp: new Date(landlordRequest.createdAt),
      description: 'Awaiting landlord signature',
    });
  }

  // Landlord signed
  if (lease.landlordSignedAt) {
    events.push({
      id: 'landlord_signed',
      type: 'landlord_signed',
      timestamp: new Date(lease.landlordSignedAt),
      actor: 'Landlord',
    });
  }

  // Lease activated
  if (lease.status === 'active' && lease.landlordSignedAt) {
    events.push({
      id: 'activated',
      type: 'activated',
      timestamp: new Date(lease.landlordSignedAt),
      description: 'Lease is now active',
    });
  }

  return events;
}
