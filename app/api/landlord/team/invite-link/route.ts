import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateOpenTeamInvite } from '@/lib/actions/team.actions';
import { TeamMemberRole } from '@/lib/types/team.types';

/**
 * POST /api/landlord/team/invite-link
 * Generate a job-site open invite QR code for a specific role.
 * No email required - anyone who scans joins with that role.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { role } = body;

    if (!role || typeof role !== 'string') {
      return NextResponse.json({ success: false, message: 'Role is required' }, { status: 400 });
    }

    const result = await generateOpenTeamInvite(role as TeamMemberRole);

    if (!result.success) {
      return NextResponse.json(result, { status: (result as any).featureLocked ? 403 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Open team invite error:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate invite link' }, { status: 500 });
  }
}
