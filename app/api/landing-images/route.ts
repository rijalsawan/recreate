import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type LandingSlot =
  | 'hero-1' | 'hero-2' | 'hero-3'
  | 'prompt-reveal'
  | 'gallery-1' | 'gallery-2' | 'gallery-3'
  | 'vector-1' | 'vector-2' | 'vector-3'
  | 'photoreal-1' | 'photoreal-2' | 'photoreal-3'
  | 'styles-1' | 'styles-2' | 'styles-3' | 'styles-4' | 'styles-5' | 'styles-6' | 'styles-7' | 'styles-8' | 'styles-9'
  | 'studio-preview';

export type LandingImagesResponse = Record<LandingSlot, string | null>;

export async function GET() {
  const slots: LandingSlot[] = [
    'hero-1', 'hero-2', 'hero-3',
    'prompt-reveal',
    'gallery-1', 'gallery-2', 'gallery-3',
    'vector-1', 'vector-2', 'vector-3',
    'photoreal-1', 'photoreal-2', 'photoreal-3',
    'styles-1', 'styles-2', 'styles-3', 'styles-4', 'styles-5', 'styles-6', 'styles-7', 'styles-8', 'styles-9',
    'studio-preview',
  ];
  const result = Object.fromEntries(slots.map((s) => [s, null])) as LandingImagesResponse;

  try {
    const rows = await Promise.all(
      slots.map((slot) =>
        prisma.generatedImage.findFirst({
          where: {
            AND: [
              { metadata: { path: ['aiFeedSource'], equals: 'landing-page' } },
              { metadata: { path: ['landingSlot'], equals: slot } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: { imageUrl: true },
        }),
      ),
    );

    slots.forEach((slot, index) => {
      if (rows[index]?.imageUrl) {
        result[slot] = rows[index]?.imageUrl ?? null;
      }
    });
  } catch {
    // Return nulls gracefully
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
