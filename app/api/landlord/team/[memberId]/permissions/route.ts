import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateTeamMemberPermissions } from '@/lib/actions/team.actions';

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
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ success: false, message: 'Invalid permissions format' }, { status: 400 });
    }

    const result = await updateTeamMemberPermissions(memberId, permissions);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update permissions' }, { status: 500 });
  }
}
