import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { MaintenanceListClient } from '@/components/admin/maintenance/maintenance-list-client';

export default async function EnhancedMaintenancePage() {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  const landlordId = landlordResult.landlord.id;

  // Fetch tickets with full property and unit details including images
  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      unit: { property: { landlordId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      unit: {
        select: {
          id: true,
          name: true,
          images: true,
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              type: true,
            }
          }
        }
      },
    },
  });

  // Transform tickets to include property image
  const transformedTickets = tickets.map(ticket => {
    const propertyImage = ticket.unit?.images?.[0] || null;
    const propertyName = ticket.unit?.property?.name || 'Unknown Property';
    const unitName = ticket.unit?.name || 'Unknown Unit';
    const address = ticket.unit?.property?.address as any;
    
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedToName: ticket.assignedToName,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      tenant: ticket.tenant,
      propertyImage,
      propertyName,
      unitName,
      propertyId: ticket.unit?.property?.id,
      unitId: ticket.unit?.id,
      address: address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''}` : null,
    };
  });

  return <MaintenanceListClient tickets={transformedTickets} />;
}

// Made with Bob
