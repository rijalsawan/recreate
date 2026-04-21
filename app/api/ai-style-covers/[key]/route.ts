import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const AI_STYLE_KEY_PREFIX = 'ai::';

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

  const cover = await prisma.styleCover.findUnique({
    where: { styleKey: toDbKey(styleKey) },
    select: { imageUrl: true },
  });

  if (!cover) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ imageUrl: cover.imageUrl });
}
