import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

type GeneratedImagePreview = {
  thumbnailUrl: string | null;
  imageUrl: string;
};

type ProjectCardRecord = {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
  generatedImages: GeneratedImagePreview[];
};

const projectCardSelect = {
  id: true,
  name: true,
  thumbnail: true,
  createdAt: true,
  updatedAt: true,
  generatedImages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      thumbnailUrl: true,
      imageUrl: true,
    },
  },
} as const;

function resolveProjectCard(project: ProjectCardRecord) {
  const latestGenerated = project.generatedImages[0];
  const resolvedThumbnail =
    (typeof project.thumbnail === 'string' && project.thumbnail.trim().length > 0 ? project.thumbnail : null) ??
    (typeof latestGenerated?.thumbnailUrl === 'string' && latestGenerated.thumbnailUrl.trim().length > 0
      ? latestGenerated.thumbnailUrl
      : null) ??
    (typeof latestGenerated?.imageUrl === 'string' && latestGenerated.imageUrl.trim().length > 0
      ? latestGenerated.imageUrl
      : null);

  return {
    id: project.id,
    name: project.name,
    thumbnail: resolvedThumbnail,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

// GET /api/projects — list user's projects
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const scope = new URL(request.url).searchParams.get('scope') ?? 'my';
  const shareDelegate = (prisma as unknown as {
    projectShare?: {
      findMany?: (args: unknown) => Promise<Array<{ project: ProjectCardRecord | null }>>;
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

      const projects = shares.flatMap((share) => (share.project ? [resolveProjectCard(share.project)] : []));

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

      return NextResponse.json(projects.map((project) => resolveProjectCard(project as ProjectCardRecord)));
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

    return NextResponse.json(projects.map((project) => resolveProjectCard(project as ProjectCardRecord)));
  } catch {
    // Fallback for environments where the new shared columns are not yet available.
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: projectCardSelect,
    });

    return NextResponse.json(projects.map((project) => resolveProjectCard(project as ProjectCardRecord)));
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
