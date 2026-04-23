import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const LANDING_SLOTS = [
  'hero-1', 'hero-2', 'hero-3',
  'prompt-reveal',
  'gallery-1', 'gallery-2', 'gallery-3',
  'vector-1', 'vector-2', 'vector-3',
  'photoreal-1', 'photoreal-2', 'photoreal-3',
  'styles-1', 'styles-2', 'styles-3', 'styles-4', 'styles-5', 'styles-6', 'styles-7', 'styles-8', 'styles-9',
  'studio-preview',
] as const;

export type LandingSlot = (typeof LANDING_SLOTS)[number];
export type LandingImagesResponse = Record<LandingSlot, string | null>;

function getEmptyLandingImages(): LandingImagesResponse {
  return Object.fromEntries(LANDING_SLOTS.map((slot) => [slot, null])) as LandingImagesResponse;
}

function isLandingSlot(value: unknown): value is LandingSlot {
  return typeof value === 'string' && (LANDING_SLOTS as readonly string[]).includes(value);
}

const getLandingImagesCached = unstable_cache(
  async (): Promise<LandingImagesResponse> => {
    const result = getEmptyLandingImages();

    const rows = await prisma.generatedImage.findMany({
      where: {
        AND: [
          { metadata: { path: ['aiFeedSource'], equals: 'landing-page' } },
          {
            OR: LANDING_SLOTS.map((slot) => ({
              metadata: { path: ['landingSlot'], equals: slot },
            })),
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { imageUrl: true, metadata: true },
      take: 400,
    });

    for (const row of rows) {
      const slotCandidate = (row.metadata as { landingSlot?: unknown } | null)?.landingSlot;
      if (!isLandingSlot(slotCandidate)) continue;
      if (result[slotCandidate] === null && row.imageUrl) {
        result[slotCandidate] = row.imageUrl;
      }
      if (LANDING_SLOTS.every((slot) => result[slot] !== null)) break;
    }

    return result;
  },
  ['landing-images-v1'],
  { revalidate: 300 },
);

export async function getLandingImages(): Promise<LandingImagesResponse> {
  try {
    return await getLandingImagesCached();
  } catch {
    return getEmptyLandingImages();
  }
}
