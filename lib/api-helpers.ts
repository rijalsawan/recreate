import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL_ALLOWLIST = new Set(
  (process.env.ADMIN_EMAILS || process.env.FONT_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Get authenticated session or return 401 response.
 * Returns [session, null] on success, or [null, NextResponse] on failure.
 */
export async function getAuthSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return [null, NextResponse.json({ error: 'Unauthorized' }, { status: 401 })] as const;
  }
  return [session, null] as const;
}

/**
 * Check if the authenticated user is an admin.
 * Admin users are configured by ADMIN_EMAILS or FONT_ADMIN_EMAILS env vars.
 */
export function requireAdminAccess(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!ADMIN_EMAIL_ALLOWLIST.has(normalizedEmail)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

/**
 * Check if user has enough credits. Returns error response or null.
 */
export async function requireCredits(userId: string, amount: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user || user.credits < amount) {
    return NextResponse.json(
      { error: 'Insufficient credits', required: amount, available: user?.credits ?? 0 },
      { status: 402 }
    );
  }
  return null;
}
