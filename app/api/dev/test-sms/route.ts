import { NextResponse } from 'next/server';
import { sendSms } from '@/lib/services/sms-service';

// DEV-ONLY endpoint — remove before going to production
// Hit: GET /api/dev/test-sms?to=+1XXXXXXXXXX
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  if (!to) {
    return NextResponse.json(
      { message: 'Provide ?to=+1XXXXXXXXXX in the URL' },
      { status: 400 }
    );
  }

  // Log env so we can see what's loaded
  const envCheck = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID
      ? `${process.env.TWILIO_ACCOUNT_SID.slice(0, 6)}...` 
      : 'MISSING',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN
      ? `${process.env.TWILIO_AUTH_TOKEN.slice(0, 4)}...`
      : 'MISSING',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
  };

  console.log('[test-sms] Env check:', envCheck);

  const result = await sendSms({
    to,
    message: 'RentFlowHQ test message — SMS notifications are working!',
    eventType: 'general',
  });

  return NextResponse.json({ result, envCheck });
}
