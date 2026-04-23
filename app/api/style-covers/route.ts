import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireAdminAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

// In-memory cache of styleKeys that have a saved cover.
// Clients fetch individual images via /api/style-covers/[key] to avoid
// bulk-loading all imageUrls in one response (which would hit the 5 MB
// Prisma Accelerate response limit).
let cachedKeys: string[] | null = null;

// Compress any image (URL or base64 data URL) to a 400×400 JPEG at 75 %
// quality ≈ 30–60 KB — well within the 5 MB Accelerate per-response limit
// even when fetched individually.
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

// GET /api/style-covers
// Returns { cached: string[] } — the list of styleKeys that have covers.
// Callers fetch individual images via /api/style-covers/[key].
export async function GET() {
  if (cachedKeys) {
    return NextResponse.json({ cached: cachedKeys });
  }

  try {
    const covers = await prisma.styleCover.findMany({
      select: { styleKey: true },
    });
    cachedKeys = covers.map((c) => c.styleKey);
    return NextResponse.json({ cached: cachedKeys });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// POST /api/style-covers
// Body: { styleKey: string, imageUrl: string }
// Compresses the image to ~400×400 JPEG before storing, then upserts.
// Auth required to prevent anonymous writes.
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  const { styleKey, imageUrl } = await request.json();
  if (!styleKey || typeof styleKey !== 'string') {
    return NextResponse.json({ error: 'styleKey is required' }, { status: 400 });
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const compressed = await compressImage(imageUrl);

  await prisma.styleCover.upsert({
    where: { styleKey },
    create: { styleKey, imageUrl: compressed },
    update: { imageUrl: compressed },
  });

  // Invalidate key cache so next GET reflects the new entry
  cachedKeys = null;

  return NextResponse.json({ success: true });
}

// DELETE /api/style-covers
// Clears ALL cover records — use to wipe the table before regenerating.
// Auth required.
export async function DELETE() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  await prisma.styleCover.deleteMany({});
  cachedKeys = null;

  return NextResponse.json({ success: true, message: 'All style covers cleared.' });
}
