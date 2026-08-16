import { NextRequest, NextResponse } from 'next/server';
import { purchaseDomain } from '@/lib/services/godaddy-service';
import { auth } from '@/auth';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

const purchaseSchema = z.object({
  domain: z.string().min(1),
  years: z.number().min(1).max(10).default(1),
  contactInfo: z.object({
    nameFirst: z.string().min(1),
    nameLast: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = purchaseSchema.parse(body);

    // Get or create landlord
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Failed to get landlord' }, { status: 500 });
    }

    // Purchase domain through GoDaddy
    const purchaseResult = await purchaseDomain(
      validatedData.domain,
      validatedData.contactInfo,
      validatedData.years
    );

    if (!purchaseResult.success) {
      return NextResponse.json(
        { error: purchaseResult.message || 'Failed to purchase domain' },
        { status: 400 }
      );
    }

    // Update landlord with custom domain
    await prisma.landlord.update({
      where: { id: landlordResult.landlord.id },
      data: {
        customDomain: validatedData.domain,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: purchaseResult.orderId,
      domain: validatedData.domain,
    });
  } catch (error) {
    console.error('Domain purchase error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase domain' },
      { status: 500 }
    );
  }
}

