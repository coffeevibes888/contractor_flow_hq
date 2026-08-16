import { NextRequest, NextResponse } from 'next/server';
import { getTeamInviteByToken } from '@/lib/actions/team.actions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
  }

  const result = await getTeamInviteByToken(token);
  return NextResponse.json(result);
}
