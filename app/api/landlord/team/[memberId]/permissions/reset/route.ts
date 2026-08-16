import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resetTeamMemberPermissions } from '@/lib/actions/team.actions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;

    const result = await resetTeamMemberPermissions(memberId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Reset permissions error:', error);
    return NextResponse.json({ success: false, message: 'Failed to reset permissions' }, { status: 500 });
  }
}
