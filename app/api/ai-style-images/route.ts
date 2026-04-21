import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const AI_FEED_SOURCE = 'ai-generated-style-feed';
const MAX_DB_SCAN = 240;

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

function normalizePreviewUrl(imageUrl: string, thumbnailUrl: string | null): { imageUrl: string; thumbnailUrl: string | null } | null {
  const thumb = typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0
    ? thumbnailUrl.trim()
    : null;
  const full = typeof imageUrl === 'string' ? imageUrl.trim() : '';

  if (thumb) {
    return { imageUrl: thumb, thumbnailUrl: thumb };
  }

  if (!full) return null;
  if (full.startsWith('data:image')) {
    // Skip giant inline data URLs to keep feed payloads stable.
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

function parseBooleanQuery(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
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

// GET /api/ai-style-images
// Returns the authenticated user's AI-generated style feed images.
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '240', 10), 500));
  const savedOnly = parseBooleanQuery(searchParams.get('saved'));
  const category = toOptionalString(searchParams.get('category'));
  const styleKey = toOptionalString(searchParams.get('styleKey'));
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const take = savedOnly
    ? Math.min(1200, Math.max(limit * 6, 600))
    : Math.min(MAX_DB_SCAN, Math.max(limit * 2, 120));

  try {
    let rows: Array<{
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
      rows = await prisma.generatedImage.findMany({
        where: {
          userId: session.user.id,
          AND: [
            {
              metadata: {
                path: ['aiFeedSource'],
                equals: AI_FEED_SOURCE,
              },
            },
            ...(savedOnly
              ? [{
                metadata: {
                  path: ['aiSavedByUser'],
                  equals: true,
                },
              }]
              : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take,
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
      rows = await prisma.generatedImage.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take,
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

    const allItems = rows.reduce<AiFeedItem[]>((acc, row) => {
      const metadata = readAiMetadata(row.metadata);
      if (!metadata) return acc;

      const normalized = normalizePreviewUrl(row.imageUrl, row.thumbnailUrl);
      if (!normalized) return acc;

      acc.push({
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
      });

      return acc;
    }, []);

    const scopedItems = savedOnly
      ? allItems.filter((item) => item.isSaved === true)
      : allItems;

    const categories = Array.from(new Set(scopedItems.map((item) => item.category))).sort((a, b) => a.localeCompare(b));

    const filtered = scopedItems.filter((item) => {
      if (category && item.category !== category) return false;
      if (styleKey && item.styleKey !== styleKey) return false;
      if (!q) return true;

      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });

    const styles = Array.from(
      new Map(
        scopedItems
          .filter((item) => (category ? item.category === category : true))
          .map((item) => [item.styleKey, { styleKey: item.styleKey, styleName: item.styleName, category: item.category }]),
      ).values(),
    );

    return NextResponse.json({
      items: filtered.slice(0, limit),
      total: filtered.length,
      categories,
      styles,
    });
  } catch {
    return NextResponse.json({ items: [], total: 0, categories: [], styles: [] }, { status: 200 });
  }
}
