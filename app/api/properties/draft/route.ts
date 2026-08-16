import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

// POST - Create or update a draft
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
    }

    const body = await req.json();
    const { propertyType, listingType, formData, currentStep, draftId } = body;

    // For now, store drafts in localStorage on the client side
    // In a full implementation, you would create a PropertyDraft table
    // and store the draft data there

    // Generate a draft ID if not provided
    const newDraftId = draftId || `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      draftId: newDraftId,
      message: 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

// GET - List all drafts for current landlord
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
    }

    // For now, return empty array - drafts are stored client-side
    // In a full implementation, query the PropertyDraft table
    return NextResponse.json({
      success: true,
      drafts: [],
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}
