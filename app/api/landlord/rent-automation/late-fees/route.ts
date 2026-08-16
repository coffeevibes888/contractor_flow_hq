import { NextRequest, NextResponse } from 'next/server';
import { getLateFeeSettings, updateLateFeeSettings } from '@/lib/actions/rent-automation.actions';

export async function GET() {
  try {
    const result = await getLateFeeSettings();
    
    if (!result.success) {
      return NextResponse.json(result, { status: result.featureLocked ? 403 : 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get late fee settings:', error);
    return NextResponse.json({ success: false, message: 'Failed to get settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await updateLateFeeSettings(data);
    
    if (!result.success) {
      return NextResponse.json(result, { status: result.featureLocked ? 403 : 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update late fee settings:', error);
    return NextResponse.json({ success: false, message: 'Failed to update settings' }, { status: 500 });
  }
}
