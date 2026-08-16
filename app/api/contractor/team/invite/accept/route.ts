import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * POST /api/contractor/team/invite/accept
 *
 * Called when an invited employee clicks the invite link and signs up / signs in.
 * Links their User account to the ContractorEmployee record and activates them.
 *
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to accept an invite' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 });
    }

    // Find the employee record by invite token
    const employee = await prisma.contractorEmployee.findFirst({
      where: {
        inviteToken: token,
        status: { in: ['invited', 'inactive'] },
      },
      include: {
        contractor: {
          select: { id: true, businessName: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
    }

    // Check expiry
    if (employee.inviteExpiry && new Date() > employee.inviteExpiry) {
      return NextResponse.json({ error: 'This invite has expired. Ask your employer to resend it.' }, { status: 410 });
    }

    // Email match guard — make sure the signed-in user is who the invite was for.
    // Owners can mistype, and we'd rather fail loud than silently link the wrong user.
    if (employee.email && session.user.email) {
      const inviteEmail = employee.email.trim().toLowerCase();
      const userEmail = session.user.email.trim().toLowerCase();
      if (inviteEmail !== userEmail) {
        return NextResponse.json(
          {
            error: `This invite was sent to ${employee.email}. Please sign in with that email address to accept.`,
          },
          { status: 403 }
        );
      }
    }

    // Check if this user is already linked to another contractor as an employee
    const existingLink = await prisma.contractorEmployee.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
        id: { not: employee.id },
      },
    });

    if (existingLink) {
      return NextResponse.json({
        error: 'Your account is already linked to another contractor. Contact support if this is an error.',
      }, { status: 409 });
    }

    // Link the user and activate the employee
    await prisma.contractorEmployee.update({
      where: { id: employee.id },
      data: {
        userId: session.user.id,
        status: 'active',
        inviteToken: null, // Clear the token so it can't be reused
        inviteExpiry: null,
        onboardedAt: new Date(),
        firstName: employee.firstName || session.user.name?.split(' ')[0] || '',
        lastName: employee.lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
      },
    });

    // Update the user's role to contractor_employee so they can access /contractor/* routes.
    // Don't downgrade users who already have a privileged role (admin/superAdmin/contractor owner).
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const PRESERVE_ROLES = new Set(['admin', 'superAdmin', 'contractor']);
    if (!currentUser?.role || !PRESERVE_ROLES.has(currentUser.role)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'contractor_employee' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Welcome to ${employee.contractor.businessName}!`,
      contractorId: employee.contractor.id,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
