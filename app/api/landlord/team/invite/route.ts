import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { inviteTeamMember } from '@/lib/actions/team.actions';
import { TeamMemberRole } from '@/lib/types/team.types';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, role, sendEmail } = body; // phone destructuring removed until Twilio is active

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const result = await inviteTeamMember(
      email,
      (role as TeamMemberRole) || 'employee',
      undefined, // phone — re-add when Twilio is active
      { sendEmail: sendEmail !== false }, // default true
    );

    if (!result.success) {
      return NextResponse.json(result, { status: (result as any).featureLocked ? 403 : 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
    const inviteUrl = result.inviteToken
      ? `${baseUrl}/team/invite?token=${encodeURIComponent(result.inviteToken)}`
      : null;

    return NextResponse.json({ ...result, inviteUrl });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send invitation' }, { status: 500 });
  }
}
