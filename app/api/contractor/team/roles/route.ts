import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { seedContractorRoles } from '@/lib/services/contractor-role-seeder';

const db = prisma as any;

/**
 * GET /api/contractor/team/roles
 * List all roles for this contractor (seeds defaults if none exist)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Seed defaults if needed
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorAuth.contractorId },
      select: { specialties: true },
    });
    await seedContractorRoles(contractorAuth.contractorId, contractor?.specialties?.[0]);

    const roles = await db.contractorRole.findMany({
      where: { contractorId: contractorAuth.contractorId, isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('GET /api/contractor/team/roles', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

/**
 * POST /api/contractor/team/roles
 * Create a custom role
 * Body: { name, description?, permissions: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.manage_roles')) {
      return NextResponse.json({ error: 'Insufficient permissions — team.manage_roles required' }, { status: 403 });
    }

    const { name, description, permissions } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.contractorRole.findFirst({
      where: { contractorId: contractorAuth.contractorId, name, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
    }

    const role = await db.contractorRole.create({
      data: {
        contractorId: contractorAuth.contractorId,
        name,
        description: description || null,
        permissions,
        isCustom: true,
        isActive: true,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/team/roles', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
