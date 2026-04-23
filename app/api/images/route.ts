import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';
import { calculateCost, type RecraftModel } from '@/types/recraft.types';

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

// POST /api/images — manually save a generated image to the library.
// Used by draft-first workflows (generate first, then explicitly Save).
export async function POST(request: NextRequest) {
  const [session, authError] = await getAuthSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>).imageUrl !== 'string' ||
    !(body as Record<string, unknown>).imageUrl
  ) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const {
    imageUrl,
    prompt,
    model,
    size,
    style,
    projectId,
    aiFeedSource,
    landingSlot,
  } = body as {
    imageUrl: string;
    prompt?: string;
    model?: string;
    size?: string;
    style?: string;
    projectId?: string;
    aiFeedSource?: string;
    landingSlot?: string;
  };

  const normalizedImageUrl = imageUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedImageUrl);
  } catch {
    return NextResponse.json({ error: 'imageUrl must be a valid absolute URL' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'imageUrl must use http or https' }, { status: 400 });
  }

  const safeModel = typeof model === 'string' && model.trim() ? model.trim() : 'unknown';
  const safeSize = typeof size === 'string' ? size : '1024x1024';
  const [widthStr, heightStr] = safeSize.split('x');
  const calculatedCreditsUsed = calculateCost('generate', safeModel as RecraftModel, 1);

  const validLandingSlots = new Set([
    'hero-1', 'hero-2', 'hero-3',
    'prompt-reveal',
    'gallery-1', 'gallery-2', 'gallery-3',
    'vector-1', 'vector-2', 'vector-3',
    'photoreal-1', 'photoreal-2', 'photoreal-3',
    'styles-1', 'styles-2', 'styles-3', 'styles-4', 'styles-5',
    'styles-6', 'styles-7', 'styles-8', 'styles-9',
    'studio-preview',
  ]);
  const normalizedLandingSlot =
    typeof landingSlot === 'string' && validLandingSlots.has(landingSlot) ? landingSlot : undefined;
  const normalizedAiFeedSource = typeof aiFeedSource === 'string' && aiFeedSource.trim()
    ? aiFeedSource.trim()
    : undefined;

  const metadataPatch: Record<string, string> = {};
  if (normalizedAiFeedSource) metadataPatch.aiFeedSource = normalizedAiFeedSource;
  if (normalizedLandingSlot) metadataPatch.landingSlot = normalizedLandingSlot;
  if (normalizedLandingSlot && !metadataPatch.aiFeedSource) {
    metadataPatch.aiFeedSource = 'landing-page';
  }

  try {
    const existing = await prisma.generatedImage.findFirst({
      where: {
        userId: session.user.id,
        imageUrl: normalizedImageUrl,
      },
      select: { id: true, imageUrl: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      if (Object.keys(metadataPatch).length > 0) {
        const currentMetadata =
          existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
            ? (existing.metadata as Record<string, unknown>)
            : {};

        const updated = await prisma.generatedImage.update({
          where: { id: existing.id },
          data: {
            metadata: {
              ...currentMetadata,
              ...metadataPatch,
            } as Prisma.InputJsonValue,
          },
          select: { id: true, imageUrl: true, createdAt: true },
        });

        return NextResponse.json(updated, { status: 200 });
      }

      return NextResponse.json(
        {
          id: existing.id,
          imageUrl: existing.imageUrl,
          createdAt: existing.createdAt,
        },
        { status: 200 },
      );
    }

    const record = await prisma.generatedImage.create({
      data: {
        userId: session.user.id,
        projectId: typeof projectId === 'string' && projectId ? projectId : null,
        prompt: typeof prompt === 'string' ? prompt : null,
        model: safeModel,
        style: typeof style === 'string' && style ? style : 'any',
        imageUrl: normalizedImageUrl,
        width: parseInt(widthStr ?? '1024') || 1024,
        height: parseInt(heightStr ?? '1024') || 1024,
        format: safeModel.includes('vector') ? 'VECTOR' : 'RASTER',
        creditsUsed: calculatedCreditsUsed,
        metadata: Object.keys(metadataPatch).length > 0
          ? (metadataPatch as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true, imageUrl: true, createdAt: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('[POST /api/images] Failed to save image:', err);
    return NextResponse.json({ error: 'Failed to save image to database' }, { status: 500 });
  }
}
