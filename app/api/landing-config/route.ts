import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireAdminAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

/**
 * GET /api/landing-config?key=<key>
 * Public — no auth required. Returns { value: <json> | null }.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    const record = await prisma.landingConfig.findUnique({ where: { key } });
    return NextResponse.json(
      { value: record?.value ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

/**
 * POST /api/landing-config
 * Admin-only. Body: { key: string, value: unknown }
 * Upserts the config entry for the given key.
 */
export async function POST(request: NextRequest) {
  const [session, authError] = await getAuthSession();
  if (authError) return authError;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { key, value } = body as { key?: unknown; value?: unknown };

  if (typeof key !== 'string' || !key.trim()) {
    return NextResponse.json({ error: 'key must be a non-empty string' }, { status: 400 });
  }
  if (value === undefined || value === null) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  try {
    await prisma.landingConfig.upsert({
      where: { key: key.trim() },
      update: { value: value as Prisma.InputJsonValue },
      create: { key: key.trim(), value: value as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
