import { NextRequest, NextResponse } from 'next/server';
import { payContractor, getContractorPayments } from '@/lib/actions/contractor.actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    contractorId: searchParams.get('contractorId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  };

  const result = await getContractorPayments(filters);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ payments: result.payments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await payContractor(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      paymentId: result.paymentId,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
