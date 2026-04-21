import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const projectCardSelect = {
  id: true,
  name: true,
  thumbnail: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/projects — list user's projects
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const scope = new URL(request.url).searchParams.get('scope') ?? 'my';
  const shareDelegate = (prisma as unknown as {
    projectShare?: {
      findMany?: (args: unknown) => Promise<Array<{ project: { id: string; name: string; thumbnail: string | null; createdAt: Date; updatedAt: Date } | null }>>;
    };
  }).projectShare;

  if (scope === 'shared-by-me') {
    if (!shareDelegate || typeof shareDelegate.findMany !== 'function') {
      return NextResponse.json([]);
    }

    try {
      const shares = await shareDelegate.findMany({
        where: {
          ownerId: session.user.id,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          project: {
            select: projectCardSelect,
          },
        },
      });

      const projects = shares.flatMap((share) => (share.project ? [share.project] : []));

      return NextResponse.json(projects);
    } catch {
      return NextResponse.json([]);
    }
  }

  if (scope === 'shared-with-me') {
    try {
      const projects = await prisma.project.findMany({
        where: {
          userId: session.user.id,
          sharedSourceShareId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        select: projectCardSelect,
      });

      return NextResponse.json(projects);
    } catch {
      return NextResponse.json([]);
    }
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        sharedSourceShareId: null,
      },
      orderBy: { updatedAt: 'desc' },
      select: projectCardSelect,
    });

    return NextResponse.json(projects);
  } catch {
    // Fallback for environments where the new shared columns are not yet available.
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: projectCardSelect,
    });

    return NextResponse.json(projects);
  }
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.slice(0, 100) : 'Untitled';

  const project = await prisma.project.create({
    data: {
      name,
      userId: session.user.id,
      canvasData: body.canvasData ?? null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
