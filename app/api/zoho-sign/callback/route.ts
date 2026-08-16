import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  const body = error
    ? `<h1>Zoho Sign Authorization</h1><p style="color:red;">Error: ${error}</p>`
    : code
      ? `<h1>Zoho Sign Authorization</h1><p>Copy this code and paste it into the token exchange step:</p><pre style="padding:12px;border:1px solid #ccc;background:#f9f9f9;">${code}</pre>`
      : '<h1>Zoho Sign Authorization</h1><p>No code found in query params.</p>';

  return new NextResponse(body, {
    status: error ? 400 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
