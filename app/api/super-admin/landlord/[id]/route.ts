import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findUnique({
      where: { id },
      include: {
        owner: {
          select: { email: true, phoneNumber: true, name: true },
        },
        subscription: true,
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'active' },
                  include: {
                    tenant: { select: { id: true, name: true, email: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    // Calculate stats
    const totalUnits = landlord.properties.reduce((sum, p) => sum + p.units.length, 0);
    const occupiedUnits = landlord.properties.reduce(
      (sum, p) => sum + p.units.filter(u => u.leases.length > 0).length, 0
    );

    // Count tenants: those with active leases + unassigned tenants linked to this landlord
    const unassignedTenantCount = await prisma.tenantLandlordLink.count({
      where: { landlordId: id },
    });
    const leasedTenantCount = landlord.properties.reduce(
      (sum, p) => sum + p.units.filter(u => u.leases.length > 0 && u.leases[0].tenant).length, 0
    );
    const totalTenants = leasedTenantCount + unassignedTenantCount;

    // Get rent payments for revenue calculation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyPayments, yearlyPayments] = await Promise.all([
      prisma.rentPayment.aggregate({
        where: {
          status: 'paid',
          paidAt: { gte: startOfMonth },
          lease: { unit: { property: { landlordId: id } } },
        },
        _sum: { amount: true },
      }),
      prisma.rentPayment.aggregate({
        where: {
          status: 'paid',
          paidAt: { gte: startOfYear },
          lease: { unit: { property: { landlordId: id } } },
        },
        _sum: { amount: true },
      }),
    ]);

    const response = {
      id: landlord.id,
      name: landlord.name,
      email: landlord.owner?.email || '',
      phone: landlord.owner?.phoneNumber || undefined,
      subdomain: landlord.subdomain,
      subscriptionTier: landlord.subscription?.tier || landlord.subscriptionTier || 'free',
      createdAt: landlord.createdAt.toISOString(),
      properties: landlord.properties.map(p => {
        const addr = p.address as { street?: string; city?: string; state?: string; zipCode?: string } | null;
        const addressStr = addr 
          ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.replace(/^, |, $/g, '')
          : 'No address';
        return {
          id: p.id,
          name: p.name,
          address: addressStr,
          units: p.units.map(u => ({
            id: u.id,
            name: u.name,
            rent: Number(u.rentAmount),
            status: u.leases.length > 0 ? 'occupied' : 'vacant',
            tenant: u.leases[0]?.tenant || null,
          })),
        };
      }),
      stats: {
        totalProperties: landlord.properties.length,
        totalUnits,
        occupiedUnits,
        totalTenants,
        monthlyRevenue: Number(monthlyPayments._sum.amount || 0),
        yearlyRevenue: Number(yearlyPayments._sum.amount || 0),
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch landlord details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
