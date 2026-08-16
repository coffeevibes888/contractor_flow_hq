import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractorId, date, time, name, email, phone, service } = body;

    // Create a lead for this booking request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const lead = await prisma.contractorLead.create({
      data: {
        source: 'subdomain',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        projectType: service,
        projectDescription: `Booking request for ${service} on ${date} at ${time}`,
        status: 'new',
        expiresAt,
        matches: {
          create: {
            contractorId,
            status: 'sent',
            sentAt: new Date(),
          },
        },
      },
    });

    // Emit event for new booking
    await eventBus.emit('appointment.created', {
      bookingId: lead.id,
      contractorId,
      customerName: name,
      customerEmail: email,
      requestedDate: date,
      requestedTime: time,
    });

    return NextResponse.json({ booking: lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
