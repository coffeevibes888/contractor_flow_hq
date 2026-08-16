import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { seedContractorRoles } from '@/lib/services/contractor-role-seeder';
import { eventBus } from '@/lib/event-system';

/**
 * GET /api/contractor/team
 * List all team members (employees) for the current contractor.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const canViewTeam = can(contractorAuth, 'team.view');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = {
      contractorId: contractorAuth.contractorId,
      ...(status && { status }),
    };

    if (!canViewTeam && !contractorAuth.isOwner) {
      whereClause.userId = session.user.id;
    }

    const employees = await prisma.contractorEmployee.findMany({
      where: whereClause,
      include: {
        assignedRole: {
          select: { id: true, name: true, permissions: true },
        },
        _count: {
          select: { timeEntries: true, assignments: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

/**
 * POST /api/contractor/team
 * Create a new team member directly (without invite flow).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.invite')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Seed default roles if needed
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorAuth.contractorId },
      select: { specialties: true },
    });
    await seedContractorRoles(contractorAuth.contractorId, contractor?.specialties?.[0]);

    const body = await request.json();

    // Validate roleId if provided
    let validRoleId: string | null = null;
    if (body.roleId) {
      const roleRecord = await (prisma as any).contractorRole.findFirst({
        where: { id: body.roleId, contractorId: contractorAuth.contractorId, isActive: true },
      });
      if (!roleRecord) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
      }
      validRoleId = roleRecord.id;
    }

    const employee = await prisma.contractorEmployee.create({
      data: {
        contractorId: contractorAuth.contractorId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email?.toLowerCase().trim() || null,
        phone: body.phone || null,
        role: body.role || 'technician',
        roleId: validRoleId,
        employeeType: body.employeeType || 'w2',
        status: body.status || 'active',
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        payRate: body.payRate || 0,
        payType: body.payType || 'hourly',
        paySchedule: body.paySchedule || null,
        skills: body.skills || [],
        certifications: body.certifications || [],
        licenseNumber: body.licenseNumber || null,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
        canViewFinancials: body.canViewFinancials || false,
        canManageJobs: body.canManageJobs || false,
        canManageCustomers: body.canManageCustomers || false,
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
      },
      include: {
        assignedRole: { select: { id: true, name: true, permissions: true } },
      },
    });

    await eventBus.emit('contractor.employee.created', {
      employeeId: employee.id,
      contractorId: contractorAuth.contractorId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      role: employee.role,
      employeeType: employee.employeeType,
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}
