import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendBrandedEmail } from '@/lib/services/email-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, template, data, landlordId } = await request.json();

    if (!to || !subject || !template || !landlordId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: to, subject, template, landlordId' 
      }, { status: 400 });
    }

    await sendBrandedEmail({
      to,
      subject,
      template,
      data,
      landlordId,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });
  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to send email' 
    }, { status: 500 });
  }
}
