import { NextRequest, NextResponse } from 'next/server';
import { addContractor, getContractors } from '@/lib/actions/contractor.actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || undefined;

  const result = await getContractors(search);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ contractors: result.contractors });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await addContractor(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      contractorId: result.contractorId,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
