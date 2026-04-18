import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/palettes — list user's palettes
export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const palettes = await prisma.colorPalette.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(palettes);
}

// POST /api/palettes — create palette
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = await request.json();

  if (!Array.isArray(body.colors) || body.colors.length === 0) {
    return NextResponse.json({ error: 'colors array is required' }, { status: 400 });
  }

  const palette = await prisma.colorPalette.create({
    data: {
      userId: session.user.id,
      name: typeof body.name === 'string' ? body.name.slice(0, 50) : 'Untitled Palette',
      colors: body.colors,
      isExtracted: body.isExtracted ?? false,
    },
  });

  return NextResponse.json(palette, { status: 201 });
}
