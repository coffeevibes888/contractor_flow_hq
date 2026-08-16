import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      themeColor,
      aboutBio,
      website,
      facebookUrl,
      instagramUrl,
      linkedinUrl,
    } = body;

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        companyName: companyName || null,
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
        companyAddress: companyAddress || null,
        themeColor: themeColor || 'amber',
        aboutBio: aboutBio || null,
        website: website || null,
        facebookUrl: facebookUrl || null,
        instagramUrl: instagramUrl || null,
        linkedinUrl: linkedinUrl || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent branding update error:', error);
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    );
  }
}
