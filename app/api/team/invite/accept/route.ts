import { NextRequest, NextResponse } from 'next/server';
import { acceptTeamInvite } from '@/lib/actions/team.actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, isExistingEmployee } = body;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
    }

    const result = await acceptTeamInvite(token);
    
    // If successful and they're a new employee, we could trigger additional onboarding
    // For now, just return the result
    return NextResponse.json({
      ...result,
      isExistingEmployee,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ success: false, message: 'Failed to accept invitation' }, { status: 500 });
  }
}
