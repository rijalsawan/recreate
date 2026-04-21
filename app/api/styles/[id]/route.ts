import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_BASE_STYLES = new Set([
  'realistic_image',
  'digital_illustration',
  'vector_illustration',
  'icon',
  'any',
]);

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));

  const existing = await prisma.style.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Style not found' }, { status: 404 });
  }

  const nextName = toOptionalString((body as Record<string, unknown>).name);
  const nextBaseStyle = toOptionalString((body as Record<string, unknown>).baseStyle);

  const data: { name?: string; baseStyle?: string } = {};

  if (nextName) {
    data.name = nextName.slice(0, 100);
  }

  if (nextBaseStyle && ALLOWED_BASE_STYLES.has(nextBaseStyle)) {
    data.baseStyle = nextBaseStyle;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
  }

  const style = await prisma.style.update({
    where: { id },
    data,
  });

  return NextResponse.json(style);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const existing = await prisma.style.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Style not found' }, { status: 404 });
  }

  await prisma.style.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
