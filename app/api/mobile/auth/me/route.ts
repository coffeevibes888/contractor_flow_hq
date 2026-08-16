/**
 * GET /api/mobile/auth/me
 *
 * Validates a mobile JWT and returns the canonical user + portals payload.
 * Used by the app on boot to verify a cached token is still good and
 * to refresh the portal list (in case the user's roles changed since
 * the token was issued).
 *
 * Returns:
 *   200 { user, portals }      — token valid
 *   401 { error: 'Invalid' }   — token rejected; client should sign out
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'User no longer exists' }, { status: 401 });

    // Re-detect portals so the picker reflects the user's current access
    // (someone may have been promoted/demoted since their last login).
    const db = prisma as any;
    const [contractorProfile, agent, landlord, contractorEmployee, teamMember, tenantLease] = await Promise.all([
      db.contractorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.agent.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.landlord.findFirst({ where: { ownerUserId: user.id }, select: { id: true } }),
      db.contractorEmployee.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.teamMember.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.lease.findFirst({ where: { tenantId: user.id, status: { in: ['active', 'pending_signature'] } }, select: { id: true } }),
    ]);

    const portals: { role: string; label: string; reason: string }[] = [];
    if (contractorProfile) portals.push({ role: 'contractor', label: 'Contractor', reason: 'Manage jobs, invoices, crew' });
    if (landlord || user.role === 'admin' || user.role === 'superAdmin') {
      portals.push({ role: 'admin', label: 'Property Manager', reason: 'Manage properties and tenants' });
    }
    if (agent) portals.push({ role: 'agent', label: 'Real Estate Agent', reason: 'Manage listings and leads' });
    if (contractorEmployee || teamMember) portals.push({ role: 'employee', label: 'Employee', reason: 'Clock in, view paystubs' });
    if (tenantLease || user.role === 'tenant') portals.push({ role: 'tenant', label: 'Tenant', reason: 'Pay rent, request maintenance' });
    if (user.role === 'homeowner' && portals.length === 0) {
      portals.push({ role: 'homeowner', label: 'Homeowner', reason: 'Find contractors, manage projects' });
    }
    if (portals.length === 0) {
      portals.push({ role: user.role, label: user.role, reason: 'Your account' });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      portals,
    });
  } catch (error: any) {
    console.error('[mobile/auth/me]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
