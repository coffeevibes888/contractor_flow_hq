/**
 * POST /api/contractor/jobs/[id]/confirm-sms
 *
 * Sends an automated SMS confirmation to the job's customer via Twilio.
 * Includes job title, date, time, and a short confirmation message.
 * Gracefully no-ops if Twilio is not configured.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { sendSms } from '@/lib/services/sms-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, businessName: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id: params.id, contractorId: profile.id },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        estimatedStartDate: true,
        address: true,
        city: true,
        state: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!job.customer?.phone) {
      return NextResponse.json({ error: 'Customer has no phone number on file' }, { status: 400 });
    }

    const businessName = profile.businessName || 'Your contractor';
    const customerName = job.customer.name;
    const address = [job.address, job.city, job.state].filter(Boolean).join(', ');

    let dateStr = '';
    if (job.estimatedStartDate) {
      const d = new Date(job.estimatedStartDate);
      dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      dateStr = `${dateStr} at ${timeStr}`;
    }

    const message = [
      `Hi ${customerName}, this is ${businessName} confirming your upcoming service.`,
      job.title ? `Job: ${job.title}` : null,
      dateStr ? `Date: ${dateStr}` : null,
      address ? `Location: ${address}` : null,
      `Questions? Reply to this message or call us. We look forward to seeing you!`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await sendSms({
      to: job.customer.phone,
      message,
      eventType: 'general',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'SMS failed to send' },
        { status: 500 },
      );
    }

    // Log a job note so there's a record
    await db.contractorJobNote.create({
      data: {
        contractorId: profile.id,
        jobId: job.id,
        content: `SMS confirmation sent to ${customerName} (${job.customer.phone}).`,
        type: 'system',
        isInternal: true,
      },
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error('[confirm-sms]', error);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}
