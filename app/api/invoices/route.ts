import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get('leaseId');

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 403 });
    }

    const whereClause: any = {
      property: {
        landlordId: landlordResult.landlord.id,
      },
    };

    if (leaseId) {
      whereClause.leaseId = leaseId;
    }

    const invoices = await prisma.tenantInvoice.findMany({
      where: whereClause,
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        propertyName: inv.property.name,
        tenantName: inv.tenant.name,
        tenantEmail: inv.tenant.email,
        amount: Number(inv.amount),
        reason: inv.reason,
        description: inv.description,
        dueDate: inv.dueDate.toISOString(),
        status: inv.status,
        paidAt: inv.paidAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ message: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, tenantId, leaseId, amount, reason, description, dueDate } = body;

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!property) {
      return NextResponse.json({ message: 'Property not found or access denied' }, { status: 404 });
    }

    // Create the invoice
    const invoice = await prisma.tenantInvoice.create({
      data: {
        propertyId,
        tenantId,
        leaseId: leaseId || null,
        amount,
        reason,
        description: description || null,
        dueDate: new Date(dueDate),
        status: 'pending',
      },
    });

    // Notify the tenant
    await NotificationService.createNotification({
      userId: tenantId,
      type: 'payment',
      title: 'New Invoice',
      message: `You have a new invoice for $${amount.toFixed(2)} - ${reason}`,
      actionUrl: '/user/profile/invoices',
      metadata: { invoiceId: invoice.id, propertyId },
      landlordId: landlordResult.landlord.id,
    });

    return NextResponse.json({ success: true, invoiceId: invoice.id });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
  }
}
