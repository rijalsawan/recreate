import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Check if a user is an admin by querying the database directly.
 * Use this in server components / API routes that already have the userId.
 */
export async function isAdminById(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'ADMIN';
}

/**
 * Check if the session user is admin from the JWT role field (no extra DB query).
 * Falls back to a DB check if the token predates the role field.
 */
export function isAdminSession(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

/**
 * @deprecated Use isAdminById or isAdminSession instead.
 * Kept for backward compatibility during migration; always returns false now.
 */
export function isAdminEmail(_email: string | null | undefined): boolean {
  return false;
}

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
 * Require admin role from session. Returns 403 response if not admin.
 */
export async function requireAdminAccess(userId?: string, sessionRole?: string) {
  // Fast path: role already in JWT
  if (sessionRole === 'ADMIN') return null;

  // Slow path: re-check DB (handles tokens issued before role was added)
  if (userId) {
    const isAdmin = await isAdminById(userId);
    if (isAdmin) return null;
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
