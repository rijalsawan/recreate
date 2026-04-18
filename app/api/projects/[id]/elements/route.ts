import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/elements — list canvas elements
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const elements = await prisma.canvasElement.findMany({
    where: { projectId: id },
    orderBy: { zIndex: 'asc' },
  });

  return NextResponse.json(elements);
}

// POST /api/projects/[id]/elements — create element
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await request.json();

  const element = await prisma.canvasElement.create({
    data: {
      projectId: id,
      type: body.type,
      properties: body.properties ?? {},
      positionX: body.positionX ?? 0,
      positionY: body.positionY ?? 0,
      width: body.width ?? 100,
      height: body.height ?? 100,
      rotation: body.rotation ?? 0,
      zIndex: body.zIndex ?? 0,
    },
  });

  return NextResponse.json(element, { status: 201 });
}

// PATCH /api/projects/[id]/elements — batch update elements
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!Array.isArray(body.elements)) {
    return NextResponse.json({ error: 'elements array required' }, { status: 400 });
  }

  const updates = body.elements.map((el: Record<string, unknown>) => {
    const data: Record<string, unknown> = {};
    if (el.properties !== undefined) data.properties = el.properties ?? undefined;
    if (el.positionX !== undefined) data.positionX = Number(el.positionX);
    if (el.positionY !== undefined) data.positionY = Number(el.positionY);
    if (el.width !== undefined) data.width = Number(el.width);
    if (el.height !== undefined) data.height = Number(el.height);
    if (el.rotation !== undefined) data.rotation = Number(el.rotation);
    if (el.zIndex !== undefined) data.zIndex = Number(el.zIndex);

    return prisma.canvasElement.update({
      where: { id: el.id as string },
      data,
    });
  });

  await prisma.$transaction(updates);
  return NextResponse.json({ success: true });
}

// DELETE /api/projects/[id]/elements — delete element(s)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const [session, error] = await getAuthSession();
  if (error) return error;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const elementId = searchParams.get('elementId');

  if (elementId) {
    await prisma.canvasElement.delete({ where: { id: elementId } });
  } else {
    // Delete all elements for this project
    await prisma.canvasElement.deleteMany({ where: { projectId: id } });
  }

  return NextResponse.json({ success: true });
}
