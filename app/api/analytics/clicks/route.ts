import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Super admin activity shouldn't land in the analytics tables.
    if (session?.user?.role === 'superAdmin') {
      return NextResponse.json({ ok: true, skipped: 'superAdmin' });
    }

    const { clicks } = await request.json();

    if (!Array.isArray(clicks) || clicks.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Drop malformed rows rather than failing the whole batch.
    const rows = clicks
      .filter((click: any) => click && click.sessionId && click.path && click.elementTag)
      .map((click: any) => ({
        sessionId: String(click.sessionId),
        userId: session?.user?.id || null,
        path: String(click.path),
        elementId: click.elementId || null,
        elementClass: click.elementClass || null,
        elementTag: String(click.elementTag),
        elementText: click.elementText || null,
        xPosition: Number.isFinite(click.xPosition) ? click.xPosition : null,
        yPosition: Number.isFinite(click.yPosition) ? click.yPosition : null,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.clickEvent.createMany({ data: rows, skipDuplicates: true });

    // Attribute total click count to the session if it exists. updateMany is
    // a no-op when the session row isn't there, so no error if the page view
    // batch hasn't landed yet.
    await prisma.userSession.updateMany({
      where: { sessionId: rows[0].sessionId },
      data: {
        clickCount: { increment: rows.length },
      },
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json({ error: 'Failed to track clicks' }, { status: 500 });
  }
}
