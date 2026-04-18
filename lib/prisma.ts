import { PrismaClient } from '@/lib/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({ accelerateUrl: process.env.DATABASE_URL! });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
