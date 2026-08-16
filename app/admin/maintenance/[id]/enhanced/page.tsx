import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { MaintenanceDetailClient } from '@/components/admin/maintenance/maintenance-detail-client';
import { notFound } from 'next/navigation';

interface EnhancedMaintenanceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnhancedMaintenanceDetailPage({ params }: EnhancedMaintenanceDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: {
      tenant: {
        select: { id: true, name: true, email: true },
      },
      unit: {
        select: {
          id: true,
          name: true,
          images: true,
          property: {
            select: { id: true, name: true, address: true, type: true },
          },
        },
      },
    },
  });

  if (!ticket) notFound();

  const propertyImage = ticket.unit?.images?.[0] || null;
  const propertyName = ticket.unit?.property?.name || 'Unknown Property';
  const unitName = ticket.unit?.name || 'Unknown Unit';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = ticket.unit?.property?.address as any;

  const transformedTicket = {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assignedToName: ticket.assignedToName,
    cost: ticket.cost ? Number(ticket.cost) : null,
    isRecurring: ticket.isRecurring,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    estimatedCompletionDate: ticket.estimatedCompletionDate?.toISOString() || null,
    location: ticket.location || null,
    attachments: Array.isArray(ticket.attachments) ? (ticket.attachments as {
      type: 'image' | 'video';
      url: string;
      filename: string;
      uploadedAt: string;
    }[]) : [],
    accessSchedule: Array.isArray(ticket.accessSchedule) ? (ticket.accessSchedule as string[]) : [],
    accessNotes: ticket.accessNotes || null,
    comments: Array.isArray(ticket.comments) ? (ticket.comments as {
      userId: string;
      userName: string;
      message: string;
      isInternal: boolean;
      createdAt: string;
    }[]) : [],
    tenant: ticket.tenant,
    propertyImage,
    propertyName,
    unitName,
    propertyId: ticket.unit?.property?.id,
    unitId: ticket.unit?.id,
    address: address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''}`.replace(/^,\s*|,\s*$/, '') : null,
  };

  return <MaintenanceDetailClient ticket={transformedTicket} />;
}
