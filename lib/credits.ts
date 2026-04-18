import { prisma } from '@/lib/prisma';
import type { TransactionType } from '@/lib/generated/prisma/client';

/** Check whether a user has enough credits. */
export async function hasCredits(userId: string, required: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return (user?.credits ?? 0) >= required;
}

/** Deduct credits and log the transaction atomically. */
export async function deductCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description?: string,
  relatedImageId?: string
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type,
        description,
        relatedImageId,
      },
    }),
  ]);
}

/** Add credits (purchase or bonus). */
export async function addCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description?: string
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
      },
    }),
  ]);
}
