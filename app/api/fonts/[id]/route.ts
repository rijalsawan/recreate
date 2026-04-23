import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireAdminAccess } from '@/lib/api-helpers';
import { invalidateFontsCache } from '@/lib/fonts-cache';
import { prisma } from '@/lib/prisma';

// DELETE /api/fonts/[id] — remove a specific font
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const adminError = await requireAdminAccess(session.user.id, session.user.role);
  if (adminError) return adminError;

  const { id } = await params;

  try {
    await prisma.canvasFont.delete({ where: { id } });
    invalidateFontsCache();
  } catch {
    return NextResponse.json({ error: 'Font not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
