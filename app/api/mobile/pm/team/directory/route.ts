/**
 * GET /api/mobile/pm/team/directory
 *
 * Returns the landlord's team members with status, role, permissions,
 * and basic compensation info. Mirrors the website's team directory page.
 *
 * Owner-only data (compensation totals, etc.) is gated server-side.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true, subscriptionTier: true, ownerUserId: true },
    });
    if (!landlord) {
      return NextResponse.json({ members: [], counts: { total: 0, active: 0, pending: 0 }, tier: 'starter' });
    }

    const members = await prisma.teamMember.findMany({
      where: { landlordId: landlord.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        compensation: true,
      },
    });

    const counts = {
      total: members.length,
      active: members.filter((m) => m.status === 'active').length,
      pending: members.filter((m) => m.status === 'pending').length,
    };

    return NextResponse.json({
      tier: landlord.subscriptionTier,
      counts,
      isOwner: payload.userId === landlord.ownerUserId,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        permissions: m.permissions,
        invitedEmail: m.invitedEmail,
        status: m.status,
        joinedAt: m.joinedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        hourlyRate: m.hourlyRate ? Number(m.hourlyRate) : null,
        paySchedule: m.paySchedule,
        user: m.user
          ? {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              image: m.user.image,
            }
          : null,
        compensation: m.compensation
          ? {
              hourlyRate: m.compensation.hourlyRate ? Number(m.compensation.hourlyRate) : null,
              paymentMethod: (m.compensation as any).paymentMethod ?? null,
            }
          : null,
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/directory]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Invite a team member by email. The actual invite flow on the website
  // uses inviteTeamMember() — we mirror its essentials here for mobile.
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, permissions } = body ?? {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true, subscriptionTier: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 400 });

    // Tier gate
    if (landlord.subscriptionTier !== 'pro' && landlord.subscriptionTier !== 'enterprise') {
      return NextResponse.json({ error: 'Team management requires Pro or Enterprise' }, { status: 402 });
    }

    // Check existing
    const existing = await prisma.teamMember.findUnique({
      where: { landlordId_invitedEmail: { landlordId: landlord.id, invitedEmail: email } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already invited' }, { status: 409 });
    }

    const inviteToken = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const inviteExpires = new Date();
    inviteExpires.setDate(inviteExpires.getDate() + 7);

    const member = await prisma.teamMember.create({
      data: {
        landlordId: landlord.id,
        invitedEmail: email,
        role: typeof role === 'string' ? role : 'member',
        permissions: Array.isArray(permissions) ? permissions : [],
        inviteToken,
        inviteExpires,
        status: 'pending',
      },
      select: { id: true, inviteToken: true, status: true },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error('[mobile/pm/team/directory POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
