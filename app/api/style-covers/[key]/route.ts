import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_SAFE_COVER_BYTES = 4_500_000;

type StyleCoverQueryRow = {
  imageUrl: string | null;
};

// GET /api/style-covers/[key]
// Returns { imageUrl } for the given styleKey, or 404.
// Public — no auth required (covers are shared across all users).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const styleKey = decodeURIComponent(key);

  try {
    // Query through SQL with a byte-length guard so oversized legacy rows do
    // not trip Prisma Accelerate's 5 MB response cap (P6009).
    const rows = await prisma.$queryRaw<StyleCoverQueryRow[]>`
      SELECT
        CASE
          WHEN OCTET_LENGTH("imageUrl") > ${MAX_SAFE_COVER_BYTES} THEN NULL
          ELSE "imageUrl"
        END AS "imageUrl"
      FROM "StyleCover"
      WHERE "styleKey" = ${styleKey}
      LIMIT 1
    `;

    const cover = rows[0];

    if (!cover || !cover.imageUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ imageUrl: cover.imageUrl });
  } catch (error) {
    console.error('[style-covers:key] Failed to fetch cover', { styleKey, error });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
