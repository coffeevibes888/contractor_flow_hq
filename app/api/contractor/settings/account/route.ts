import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { type } = body;

    if (type === 'profile') {
      const { name, phoneNumber, businessName, displayName, phone, baseCity, baseState } = body;

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name && { name }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
      });

      await prisma.contractorProfile.updateMany({
        where: { userId: session.user.id },
        data: {
          ...(businessName && { businessName }),
          ...(displayName && { displayName }),
          ...(phone !== undefined && { phone }),
          ...(baseCity !== undefined && { baseCity }),
          ...(baseState !== undefined && { baseState }),
        },
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'password') {
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, message: 'Both current and new password are required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });

      if (!user?.password) {
        return NextResponse.json({ success: false, message: 'No password set on this account (OAuth login)' }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashed, sessionVersion: { increment: 1 } },
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'notifications') {
      const { emailJobs, emailInvoices, emailMarketing, smsJobs, smsReminders } = body;

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          notificationPreferences: {
            emailJobs: !!emailJobs,
            emailInvoices: !!emailInvoices,
            emailMarketing: !!emailMarketing,
            smsJobs: !!smsJobs,
            smsReminders: !!smsReminders,
          },
        },
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'billingAddress') {
      const { name, line1, line2, city, state, postalCode, country } = body;

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          billingAddress: { name, line1, line2, city, state, postalCode, country },
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Unknown type' }, { status: 400 });
  } catch (error) {
    console.error('Account settings error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
