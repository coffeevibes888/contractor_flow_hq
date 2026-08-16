import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateInvestorReportPdf, generateFinancialCSV } from '@/lib/services/report-pdf.service';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reportData, format } = body;

    if (!reportData) {
      return NextResponse.json({ message: 'Report data required' }, { status: 400 });
    }

    if (format === 'csv') {
      const csv = generateFinancialCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="investor-report-${(reportData.periodLabel || 'report').replace(/\s+/g, '-')}.csv"`,
        },
      });
    }

    // Generate PDF
    console.log('Generating investor report PDF...');
    const pdfBuffer = await generateInvestorReportPdf(reportData);
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="investor-report-${(reportData.periodLabel || 'report').replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ 
      message: error?.message || 'Failed to generate PDF',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
