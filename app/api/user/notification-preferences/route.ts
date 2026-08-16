import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phoneNumber: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const prefs = (user.notificationPreferences as { email?: boolean; sms?: boolean } | null) ?? {};

    return NextResponse.json({
      phoneNumber: user.phoneNumber ?? '',
      emailEnabled: prefs.email ?? true,
      smsEnabled: prefs.sms ?? false,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ message: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, emailEnabled, smsEnabled } = body as {
      phoneNumber?: string;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
    };

    // If SMS is being turned on, a phone number is required
    if (smsEnabled && !phoneNumber?.trim()) {
      return NextResponse.json(
        { message: 'A phone number is required to enable SMS notifications.' },
        { status: 400 }
      );
    }

    const notificationPreferences = {
      email: emailEnabled ?? true,
      sms: smsEnabled ?? false,
      both: (emailEnabled ?? true) && (smsEnabled ?? false),
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phoneNumber: phoneNumber?.trim() || null,
        notificationPreferences,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ message: 'Failed to update preferences' }, { status: 500 });
  }
}
