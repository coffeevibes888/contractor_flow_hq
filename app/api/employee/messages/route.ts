/**
 * POST /api/employee/messages
 *
 * Send a message to a team channel from the employee portal.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, contractorId, channelId, content, senderName } = body;

    if (!employeeId || !contractorId || !channelId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const employee = await prisma.contractorEmployee.findFirst({
      where: { id: employeeId, userId: session.user.id, status: 'active', contractorId },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = prisma as any;

    // Verify channel belongs to this contractor
    const channel = await db.contractorTeamChannel.findFirst({
      where: { id: channelId, contractorId },
    });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Create message
    const message = await db.contractorTeamMessage.create({
      data: {
        channelId,
        senderId: employeeId,
        senderName: senderName || `${employee.firstName} ${employee.lastName}`.trim(),
        content: content.trim(),
        senderRole: 'employee',
      },
    });

    return NextResponse.json({ success: true, id: message.id });
  } catch (error) {
    console.error('POST /api/employee/messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
