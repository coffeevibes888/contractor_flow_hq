import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTeamMembers } from '@/lib/actions/team.actions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const result = await getTeamMembers();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get team members' }, { status: 500 });
  }
}
