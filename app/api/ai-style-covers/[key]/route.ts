import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const AI_STYLE_KEY_PREFIX = 'ai::';
const MAX_SAFE_COVER_BYTES = 4_500_000;

type StyleCoverQueryRow = {
  imageUrl: string | null;
};

function toDbKey(styleKey: string): string {
  return `${AI_STYLE_KEY_PREFIX}${styleKey}`;
}

// GET /api/ai-style-covers/[key]
// Returns { imageUrl } for the given AI-generated style key.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const styleKey = decodeURIComponent(key);

  try {
    const rows = await prisma.$queryRaw<StyleCoverQueryRow[]>`
      SELECT
        CASE
          WHEN OCTET_LENGTH("imageUrl") > ${MAX_SAFE_COVER_BYTES} THEN NULL
          ELSE "imageUrl"
        END AS "imageUrl"
      FROM "StyleCover"
      WHERE "styleKey" = ${toDbKey(styleKey)}
      LIMIT 1
    `;

    const cover = rows[0];

    if (!cover || !cover.imageUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ imageUrl: cover.imageUrl });
  } catch (error) {
    console.error('[ai-style-covers:key] Failed to fetch cover', { styleKey, error });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
