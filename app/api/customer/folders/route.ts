import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Get all folders for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await prisma.messageFolder.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        _count: {
          select: {
            threads: true,
          },
        },
      },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST - Create a new folder
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Get the highest order number
    const lastFolder = await prisma.messageFolder.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
    });

    const folder = await prisma.messageFolder.create({
      data: {
        userId: session.user.id,
        name,
        color: color || '#3B82F6',
        icon: icon || 'folder',
        order: (lastFolder?.order || 0) + 1,
      },
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
