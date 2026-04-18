import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/style-covers/[key]
// Returns { imageUrl } for the given styleKey, or 404.
// Public — no auth required (covers are shared across all users).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const styleKey = decodeURIComponent(key);

  const cover = await prisma.styleCover.findUnique({
    where: { styleKey },
    select: { imageUrl: true },
  });

  if (!cover) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ imageUrl: cover.imageUrl });
}
