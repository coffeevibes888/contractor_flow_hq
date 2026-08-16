import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
      },
      include: {
        landlord: { select: { id: true } },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ success: false, message: 'Not a team member' }, { status: 403 });
    }

    const body = await req.json();
    const { type, startDate, endDate, reason } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Store type in reason field as prefix if provided
    const reasonWithType = type ? `[${type}] ${reason || ''}`.trim() : reason;

    const request = await prisma.timeOffRequest.create({
      data: {
        teamMemberId: teamMember.id,
        landlordId: teamMember.landlord.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reasonWithType || null,
        status: 'pending',
      },
    });

    // Extract type from reason for response
    const typeMatch = request.reason?.match(/^\[(\w+)\]/);
    const extractedType = typeMatch ? typeMatch[1] : 'vacation';
    const cleanReason = request.reason?.replace(/^\[\w+\]\s*/, '') || null;

    return NextResponse.json({ 
      success: true, 
      message: 'Time off request submitted',
      request: {
        id: request.id,
        type: extractedType,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        reason: cleanReason,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Time off request error:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit request' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
      },
    });

    if (!teamMember) {
      return NextResponse.json({ success: false, message: 'Not a team member' }, { status: 403 });
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: {
        teamMemberId: teamMember.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      success: true, 
      requests: requests.map(r => {
        const typeMatch = r.reason?.match(/^\[(\w+)\]/);
        const extractedType = typeMatch ? typeMatch[1] : 'vacation';
        const cleanReason = r.reason?.replace(/^\[\w+\]\s*/, '') || null;
        
        return {
          id: r.id,
          type: extractedType,
          startDate: r.startDate.toISOString(),
          endDate: r.endDate.toISOString(),
          reason: cleanReason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error('Get time off requests error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get requests' }, { status: 500 });
  }
}
