import { NextResponse } from 'next/server';
import { getContractorSpendingReport } from '@/lib/actions/contractor.actions';

export async function GET() {
  const result = await getContractorSpendingReport();

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ report: result.report });
}
