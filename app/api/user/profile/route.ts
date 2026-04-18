import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      credits: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
