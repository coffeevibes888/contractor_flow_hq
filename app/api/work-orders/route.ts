import { NextRequest, NextResponse } from 'next/server';
import { createWorkOrder, getWorkOrders } from '@/lib/actions/contractor.actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filters = {
    status: searchParams.get('status') || undefined,
    contractorId: searchParams.get('contractorId') || undefined,
    propertyId: searchParams.get('propertyId') || undefined,
  };

  const result = await getWorkOrders(filters);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ workOrders: result.workOrders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createWorkOrder(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      workOrderId: result.workOrderId,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
