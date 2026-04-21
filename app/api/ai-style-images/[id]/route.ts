import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

const AI_FEED_SOURCE = 'ai-generated-style-feed';
const MAX_DB_SCAN = 360;

type AiFeedMetadata = {
  aiFeedSource: string;
  aiCategory: string;
  aiStyleKey: string;
  aiStyleName: string;
  aiSavedByUser?: boolean;
  aiApiModel?: string;
  aiApiStyle?: string;
  aiApiSubstyle?: string;
};

type AiFeedItem = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  prompt: string | null;
  model: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  category: string;
  styleKey: string;
  styleName: string;
  isSaved: boolean;
  apiModel?: string;
  apiStyle?: string;
  apiSubstyle?: string;
};

function normalizePreviewUrl(
  imageUrl: string,
  thumbnailUrl: string | null,
  preferFullImage: boolean,
): { imageUrl: string; thumbnailUrl: string | null } | null {
  const thumb = typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0
    ? thumbnailUrl.trim()
    : null;
  const full = typeof imageUrl === 'string' ? imageUrl.trim() : '';

  if (preferFullImage) {
    if (full) return { imageUrl: full, thumbnailUrl: thumb };
    if (thumb) return { imageUrl: thumb, thumbnailUrl: thumb };
    return null;
  }

  if (thumb) {
    return { imageUrl: thumb, thumbnailUrl: thumb };
  }

  if (!full) return null;
  if (full.startsWith('data:image')) {
    return null;
  }

  return { imageUrl: full, thumbnailUrl: null };
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toMutableMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function readAiMetadata(value: unknown): AiFeedMetadata | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const aiFeedSource = toOptionalString(raw.aiFeedSource);
  const aiCategory = toOptionalString(raw.aiCategory);
  const aiStyleKey = toOptionalString(raw.aiStyleKey);
  const aiStyleName = toOptionalString(raw.aiStyleName);

  if (aiFeedSource !== AI_FEED_SOURCE) return null;
  if (!aiCategory || !aiStyleKey || !aiStyleName) return null;

  return {
    aiFeedSource,
    aiCategory,
    aiStyleKey,
    aiStyleName,
    aiSavedByUser: toOptionalBoolean(raw.aiSavedByUser),
    aiApiModel: toOptionalString(raw.aiApiModel),
    aiApiStyle: toOptionalString(raw.aiApiStyle),
    aiApiSubstyle: toOptionalString(raw.aiApiSubstyle),
  };
}

function toFeedItem(row: {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  prompt: string | null;
  model: string;
  width: number | null;
  height: number | null;
  createdAt: Date;
  metadata: unknown;
}, options?: { preferFullImage?: boolean }): AiFeedItem | null {
  const metadata = readAiMetadata(row.metadata);
  if (!metadata) return null;

  const normalized = normalizePreviewUrl(row.imageUrl, row.thumbnailUrl, options?.preferFullImage === true);
  if (!normalized) return null;

  return {
    id: row.id,
    imageUrl: normalized.imageUrl,
    thumbnailUrl: normalized.thumbnailUrl,
    prompt: row.prompt,
    model: row.model,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    category: metadata.aiCategory,
    styleKey: metadata.aiStyleKey,
    styleName: metadata.aiStyleName,
    isSaved: metadata.aiSavedByUser === true,
    apiModel: metadata.aiApiModel,
    apiStyle: metadata.aiApiStyle,
    apiSubstyle: metadata.aiApiSubstyle,
  };
}

// GET /api/ai-style-images/[id]
// Returns a feed detail item plus related items by same style and category.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { id } = await params;

  try {
    const detailRow = await prisma.generatedImage.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        imageUrl: true,
        thumbnailUrl: true,
        prompt: true,
        model: true,
        width: true,
        height: true,
        createdAt: true,
        metadata: true,
      },
    });

    if (!detailRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const detail = toFeedItem(detailRow, { preferFullImage: true });
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let relatedRows: Array<{
      id: string;
      imageUrl: string;
      thumbnailUrl: string | null;
      prompt: string | null;
      model: string;
      width: number | null;
      height: number | null;
      createdAt: Date;
      metadata: unknown;
    }> = [];

    try {
      relatedRows = await prisma.generatedImage.findMany({
        where: {
          userId: session.user.id,
          metadata: {
            path: ['aiFeedSource'],
            equals: AI_FEED_SOURCE,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_DB_SCAN,
        select: {
          id: true,
          imageUrl: true,
          thumbnailUrl: true,
          prompt: true,
          model: true,
          width: true,
          height: true,
          createdAt: true,
          metadata: true,
        },
      });
    } catch {
      relatedRows = await prisma.generatedImage.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: MAX_DB_SCAN,
        select: {
          id: true,
          imageUrl: true,
          thumbnailUrl: true,
          prompt: true,
          model: true,
          width: true,
          height: true,
          createdAt: true,
          metadata: true,
        },
      });
    }

    const allItems = relatedRows
      .map((row) => toFeedItem(row, { preferFullImage: false }))
      .filter((item): item is AiFeedItem => item !== null && item.id !== detail.id);

    const sameStyle = allItems.filter((item) => item.styleKey === detail.styleKey).slice(0, 60);
    const sameCategory = allItems
      .filter((item) => item.category === detail.category && item.styleKey !== detail.styleKey)
      .slice(0, 60);

    return NextResponse.json({
      detail,
      sameStyle,
      sameCategory,
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// PATCH /api/ai-style-images/[id]
// Toggle saved state for an AI style feed image for the authenticated user.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { id } = await params;

  let isSaved: boolean | null = null;
  try {
    const body = await request.json();
    isSaved = typeof body?.isSaved === 'boolean' ? body.isSaved : null;
  } catch {
    isSaved = null;
  }

  if (isSaved === null) {
    return NextResponse.json({ error: 'isSaved must be a boolean' }, { status: 400 });
  }

  try {
    const row = await prisma.generatedImage.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const metadata = toMutableMetadataObject(row.metadata);
    const aiMeta = readAiMetadata(metadata);

    if (!aiMeta) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      aiSavedByUser: isSaved,
    };

    await prisma.generatedImage.update({
      where: { id: row.id },
      data: {
        metadata: nextMetadata as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: row.id, isSaved });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
