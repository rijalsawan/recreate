import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/images — list user's generated images
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
  const cursor = searchParams.get('cursor');

  const images = await prisma.generatedImage.findMany({
    where: { userId: session.user.id },
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

  const hasMore = images.length > limit;
  if (hasMore) images.pop();

  return NextResponse.json({
    images,
    nextCursor: hasMore ? images[images.length - 1]?.id : null,
  });
}
