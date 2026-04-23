import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireAdminAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

const AI_STYLE_KEY_PREFIX = 'ai::';
let cachedKeys: string[] | null = null;

function toDbKey(styleKey: string): string {
  return `${AI_STYLE_KEY_PREFIX}${styleKey}`;
}

function fromDbKey(dbKey: string): string | null {
  if (!dbKey.startsWith(AI_STYLE_KEY_PREFIX)) return null;
  return dbKey.slice(AI_STYLE_KEY_PREFIX.length);
}

async function compressImage(imageUrl: string): Promise<string> {
  let buffer: Buffer;

  if (imageUrl.startsWith('data:image')) {
    const base64Data = imageUrl.split(',')[1];
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const compressed = await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 75 })
    .toBuffer();

  return `data:image/jpeg;base64,${compressed.toString('base64')}`;
}

// GET /api/ai-style-covers
// Returns { cached: string[] } for AI-generated style cover keys.
export async function GET() {
  if (cachedKeys) {
    return NextResponse.json({ cached: cachedKeys });
  }

  try {
    const covers = await prisma.styleCover.findMany({
      where: { styleKey: { startsWith: AI_STYLE_KEY_PREFIX } },
      select: { styleKey: true },
    });

    cachedKeys = covers
      .map((cover) => fromDbKey(cover.styleKey))
      .filter((key): key is string => !!key);

    return NextResponse.json({ cached: cachedKeys });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// POST /api/ai-style-covers
// Body: { styleKey: string, imageUrl: string }
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  const body = await request.json().catch(() => ({}));
  const styleKey = typeof body.styleKey === 'string' ? body.styleKey.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

  if (!styleKey) {
    return NextResponse.json({ error: 'styleKey is required' }, { status: 400 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const compressed = await compressImage(imageUrl);

  await prisma.styleCover.upsert({
    where: { styleKey: toDbKey(styleKey) },
    create: { styleKey: toDbKey(styleKey), imageUrl: compressed },
    update: { imageUrl: compressed },
  });

  cachedKeys = null;

  return NextResponse.json({ success: true });
}

// DELETE /api/ai-style-covers
// Clears all AI-generated style cover records.
export async function DELETE() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  await prisma.styleCover.deleteMany({
    where: { styleKey: { startsWith: AI_STYLE_KEY_PREFIX } },
  });

  cachedKeys = null;

  return NextResponse.json({ success: true, message: 'All AI generated style covers cleared.' });
}
