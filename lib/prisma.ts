import { PrismaClient } from '@/lib/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Retry a Prisma operation once if the underlying socket was closed by
 * Prisma Accelerate (stale keep-alive connection).  On retry, undici will
 * open a fresh connection automatically.
 */
export async function withPrismaRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const cause = (err as { cause?: { code?: string } })?.cause;
    if (cause?.code === 'UND_ERR_SOCKET') {
      return fn();
    }
    throw err;
  }
}

function createPrismaClient() {
  return new PrismaClient({ accelerateUrl: process.env.DATABASE_URL! });
}

function isCompatibleClient(client?: PrismaClient): client is PrismaClient {
  // During Next.js dev HMR, a Prisma singleton created before schema updates
  // may stay in memory and miss newer delegates like projectShare.
  if (!client) return false;
  return typeof (client as unknown as { projectShare?: unknown }).projectShare !== 'undefined';
}

const existingClient = globalForPrisma.prisma;

export const prisma = isCompatibleClient(existingClient)
  ? existingClient
  : createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
