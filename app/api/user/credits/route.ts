import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/user/credits — get credit balance and recent transactions
export async function GET(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, plan: true },
    }),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  return NextResponse.json({
    credits: user?.credits ?? 0,
    plan: user?.plan ?? 'FREE',
    transactions,
  });
}
