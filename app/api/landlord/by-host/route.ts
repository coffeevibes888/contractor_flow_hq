import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

function extractSubdomain(hostname: string) {
  const host = hostname.split(':')[0].toLowerCase();

  const apex = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!apex) return null;

  if (host === apex.toLowerCase()) return null;

  if (!host.endsWith(`.${apex.toLowerCase()}`)) return null;

  const subdomain = host.slice(0, host.length - apex.length - 1);
  return subdomain || null;
}

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host');

    if (!host) {
      return NextResponse.json(
        { success: false, message: 'Host header is missing.' },
        { status: 400 }
      );
    }

    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return NextResponse.json(
        { success: false, message: 'No landlord subdomain on this host.' },
        { status: 404 }
      );
    }

    const landlord = await prisma.landlord.findUnique({
      where: { subdomain },
    });

    if (!landlord) {
      return NextResponse.json(
        { success: false, message: 'Landlord not found for this subdomain.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      landlord: {
        id: landlord.id,
        name: landlord.name,
        subdomain: landlord.subdomain,
      },
    });
  } catch (error) {
    console.error('Error resolving landlord by host:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resolve landlord by host.' },
      { status: 500 }
    );
  }
}
