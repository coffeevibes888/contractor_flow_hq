import { NextRequest, NextResponse } from 'next/server';
import { searchDomain, getDomainSuggestions } from '@/lib/services/godaddy-service';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const domain = searchParams.get('domain');
    const suggestions = searchParams.get('suggestions') === 'true';

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
    }

    if (suggestions) {
      const domainSuggestions = await getDomainSuggestions(domain, 10);
      return NextResponse.json({ suggestions: domainSuggestions });
    }

    const availability = await searchDomain(domain);
    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Domain search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search domain' },
      { status: 500 }
    );
  }
}

