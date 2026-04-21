import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/images — list user's generated images
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 200);
  const cursor = searchParams.get('cursor');
  const model = searchParams.get('model');
  const projectId = searchParams.get('projectId');

  const where: { userId: string; model?: string; projectId?: string } = {
    userId: session.user.id,
  };

  if (model) where.model = model;
  if (projectId) where.projectId = projectId;

  let images: Array<{
    id: string;
    prompt: string | null;
    model: string;
    style: string | null;
    imageUrl: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    format: 'RASTER' | 'VECTOR';
    creditsUsed: number;
    createdAt: Date;
    projectId: string | null;
  }> = [];

  try {
    images = await prisma.generatedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        prompt: true,
        model: true,
        style: true,
        imageUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        format: true,
        creditsUsed: true,
        createdAt: true,
        projectId: true,
      },
    });
  } catch {
    // Resolve gracefully so callers don't stay stuck waiting on image library loads.
    return NextResponse.json({ images: [], nextCursor: null });
  }

  const hasMore = images.length > limit;
  if (hasMore) images.pop();

  return NextResponse.json({
    images,
    nextCursor: hasMore ? images[images.length - 1]?.id : null,
  });
}
