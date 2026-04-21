import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireAdminAccess } from '@/lib/api-helpers';
import { getFontsCache, setFontsCache, invalidateFontsCache } from '@/lib/fonts-cache';
import { prisma } from '@/lib/prisma';

// GET /api/fonts — list all saved fonts
export async function GET() {
  const cachedFonts = getFontsCache();
  if (cachedFonts) {
    return NextResponse.json({ fonts: cachedFonts });
  }

  try {
    const fonts = await prisma.canvasFont.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const nextCache = fonts.map((f) => ({
      id: f.id,
      family: f.family,
      category: f.category,
      variants: f.variants as number[],
    }));
    setFontsCache(nextCache);
    return NextResponse.json({ fonts: nextCache });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// POST /api/fonts — add a Google Font by family name
// Body: { family: string }
// Validates against Google Fonts CSS API before saving.
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = requireAdminAccess(session.user.email);
  if (adminError) return adminError;

  const { family } = await request.json();
  if (!family || typeof family !== 'string' || family.trim().length === 0) {
    return NextResponse.json({ error: 'family is required' }, { status: 400 });
  }

  const trimmed = family.trim();

  // Check if already exists
  const existing = await prisma.canvasFont.findUnique({ where: { family: trimmed } });
  if (existing) {
    return NextResponse.json({ error: 'Font already added' }, { status: 409 });
  }

  // Validate by fetching Google Fonts CSS
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(trimmed)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  let cssText: string;
  try {
    const res = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, // Google Fonts requires a browser-like UA
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Font "${trimmed}" not found on Google Fonts` }, { status: 404 });
    }
    cssText = await res.text();
  } catch {
    return NextResponse.json({ error: 'Failed to validate font with Google Fonts' }, { status: 502 });
  }

  // Parse available weights from CSS
  const weightMatches = cssText.matchAll(/font-weight:\s*(\d+)/g);
  const weights = [...new Set([...weightMatches].map((m) => parseInt(m[1])))].sort((a, b) => a - b);
  if (weights.length === 0) weights.push(400);

  // Detect category from CSS (heuristic from font-family fallback)
  let category = 'display';
  if (cssText.includes('sans-serif')) category = 'sans-serif';
  else if (cssText.includes('serif') && !cssText.includes('sans-serif')) category = 'serif';
  else if (cssText.includes('monospace')) category = 'monospace';
  else if (cssText.includes('cursive')) category = 'handwriting';

  const font = await prisma.canvasFont.create({
    data: { family: trimmed, category, variants: weights },
  });

  // Invalidate cache
  invalidateFontsCache();

  return NextResponse.json({
    font: { id: font.id, family: font.family, category: font.category, variants: weights },
  });
}

// DELETE /api/fonts — clear all fonts (admin)
export async function DELETE() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = requireAdminAccess(session.user.email);
  if (adminError) return adminError;

  await prisma.canvasFont.deleteMany({});
  invalidateFontsCache();

  return NextResponse.json({ success: true });
}
