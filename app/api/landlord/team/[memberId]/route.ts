import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateTeamMemberRole, removeTeamMember, type TeamMemberRole } from '@/lib/actions/team.actions';

// Valid roles for the system
const VALID_ROLES: TeamMemberRole[] = [
  'admin', 
  'property_manager', 
  'leasing_agent', 
  'showing_agent', 
  'maintenance_tech', 
  'accountant', 
  'employee',
  // Legacy roles (will be normalized)
  'manager' as TeamMemberRole,
  'member' as TeamMemberRole,
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;
    const body = await req.json();
    const { role, keepCustomPermissions = false } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    const result = await updateTeamMemberRole(memberId, role, keepCustomPermissions);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update team member error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;
    const result = await removeTeamMember(memberId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json({ success: false, message: 'Failed to remove member' }, { status: 500 });
  }
}
