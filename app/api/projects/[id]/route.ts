import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] — get project with elements
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true, thumbnail: true, canvasData: true, createdAt: true, updatedAt: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

// PATCH /api/projects/[id] — update project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));

  // Ensure ownership
  const existing = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.slice(0, 100);
  if (body.canvasData !== undefined) data.canvasData = body.canvasData;
  if (typeof body.thumbnail === 'string') data.thumbnail = body.thumbnail;

  const project = await prisma.project.update({ where: { id }, data });
  return NextResponse.json(project);
}

// DELETE /api/projects/[id] — delete project
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const existing = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
