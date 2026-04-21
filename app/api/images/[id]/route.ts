import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/images/[id] — delete a user image record
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const existing = await prisma.generatedImage.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  await prisma.generatedImage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
