import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateContractorContractHtml, type ContractorContractData } from '@/lib/services/contractor-contract-builder';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contractData } = body as { contractData: ContractorContractData };

    if (!contractData) {
      return NextResponse.json({ error: 'Contract data is required' }, { status: 400 });
    }

    // Set signing date — JSON deserializes dates as strings, so always parse
    contractData.signingDate = contractData.signingDate
      ? new Date(contractData.signingDate)
      : new Date();

    const html = generateContractorContractHtml(contractData);

    return NextResponse.json({ html });
  } catch (error: any) {
    console.error('POST /api/contractor/contracts/preview', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate preview' }, { status: 500 });
  }
}
