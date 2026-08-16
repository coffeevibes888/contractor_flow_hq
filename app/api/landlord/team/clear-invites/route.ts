import { NextResponse } from 'next/server';
import { clearPendingInvites } from '@/lib/actions/team.actions';

export async function DELETE() {
  const result = await clearPendingInvites();
  return NextResponse.json(result);
}
