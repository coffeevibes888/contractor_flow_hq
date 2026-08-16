import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { randomBytes } from 'crypto';

// Generate a short, readable invite code
function generateInviteCode(): string {
  // Generate 6 character alphanumeric code (uppercase for readability)
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// GET - Get active invite code for current landlord
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    // Find existing active invite code
    const existingInvite = await prisma.contractorInvite.findFirst({
      where: {
        landlordId: landlordResult.landlord.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingInvite) {
      return NextResponse.json({
        inviteCode: existingInvite.token,
        expiresAt: existingInvite.expiresAt,
      });
    }

    return NextResponse.json({ inviteCode: null });
  } catch (error) {
    console.error('Error fetching contractor invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite code' },
      { status: 500 }
    );
  }
}

// POST - Generate new invite code
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const landlordId = landlordResult.landlord.id;

    // Expire any existing pending invites
    await prisma.contractorInvite.updateMany({
      where: {
        landlordId,
        status: 'pending',
      },
      data: {
        status: 'expired',
      },
    });

    // Generate new invite code
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Generate a unique placeholder email using the invite code and timestamp
    const uniqueId = `${inviteCode.toLowerCase()}-${Date.now()}`;
    const placeholderEmail = `pending-${uniqueId}@invite.placeholder`;

    // Create a placeholder contractor record (will be updated when contractor signs up)
    const placeholderContractor = await prisma.contractor.create({
      data: {
        landlordId,
        userId: null, // No user yet - will be linked when contractor signs up
        name: 'Pending Contractor',
        email: placeholderEmail,
      },
    });

    const invite = await prisma.contractorInvite.create({
      data: {
        landlordId,
        contractorId: placeholderContractor.id,
        email: placeholderEmail,
        token: inviteCode,
        status: 'pending',
        expiresAt,
      },
    });

    return NextResponse.json({
      inviteCode: invite.token,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error('Error generating contractor invite:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite code' },
      { status: 500 }
    );
  }
}
