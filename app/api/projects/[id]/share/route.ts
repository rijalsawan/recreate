import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function createShareToken() {
  return randomBytes(18).toString('base64url');
}

// POST /api/projects/[id]/share — create or reuse a share link for a project
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const [session, error] = await getAuthSession();
  if (error) return error;

  const shareDelegate = (prisma as unknown as {
    projectShare?: {
      findUnique: (args: unknown) => Promise<{ id: string; token: string; isActive: boolean } | null>;
      update: (args: unknown) => Promise<{ token: string }>;
      create: (args: unknown) => Promise<{ token: string }>;
    };
  }).projectShare;

  if (!shareDelegate) {
    return NextResponse.json(
      { error: 'Sharing is temporarily unavailable. Please refresh and try again.' },
      { status: 503 },
    );
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let share: { token: string };
  try {
    const existingShare = await shareDelegate.findUnique({
      where: {
        projectId_ownerId: {
          projectId: id,
          ownerId: session.user.id,
        },
      },
      select: { id: true, token: true, isActive: true },
    });

    share = existingShare
      ? await shareDelegate.update({
          where: { id: existingShare.id },
          data: existingShare.isActive ? {} : { isActive: true },
          select: { token: true },
        })
      : await shareDelegate.create({
          data: {
            projectId: id,
            ownerId: session.user.id,
            token: createShareToken(),
          },
          select: { token: true },
        });
  } catch {
    return NextResponse.json(
      { error: 'Sharing is temporarily unavailable. Please try again in a moment.' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    sharePath: `/shared/${share.token}`,
    token: share.token,
  });
}
