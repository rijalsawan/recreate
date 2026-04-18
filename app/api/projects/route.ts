import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/projects — list user's projects
export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(projects);
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.slice(0, 100) : 'Untitled';

  const project = await prisma.project.create({
    data: {
      name,
      userId: session.user.id,
      canvasData: body.canvasData ?? null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
