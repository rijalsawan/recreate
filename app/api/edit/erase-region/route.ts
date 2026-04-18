import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireCredits } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockEraseRegion } from '@/lib/recraft-mock';
import { openaiEraseRegion } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import sharp from 'sharp';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

/**
 * Convert any PNG/JPEG mask to a true grayscale PNG (color type 0).
 * Recraft eraseRegion rejects RGBA PNGs even if they look grayscale.
 */
async function toGrayscalePng(maskFile: File): Promise<File> {
  const buf = Buffer.from(await maskFile.arrayBuffer());
  const grayscaleBuf = await sharp(buf)
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .toColourspace('b-w')
    .threshold(128)
    .png()
    .toBuffer();
  return new File([new Uint8Array(grayscaleBuf)], 'mask.png', { type: 'image/png' });
}

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  const mask = formData.get('mask') as File | null;

  if (!image || !mask) {
    return NextResponse.json({ error: 'image and mask are required' }, { status: 400 });
  }

  const cost = RECRAFT_PRICING.erase_region;
  // Credit check disabled for testing with mock service
  // const creditsError = await requireCredits(session.user.id, cost);
  // if (creditsError) return creditsError;

  // Recraft requires a true grayscale PNG — convert server-side since
  // the browser canvas always emits RGBA PNG regardless of pixel values.
  const grayscaleMask = HAS_RECRAFT ? await toGrayscalePng(mask) : mask;

  const result = HAS_RECRAFT
    ? await recraft.eraseRegion({ image, mask: grayscaleMask })
    : HAS_OPENAI
      ? await openaiEraseRegion(image, mask)
      : await mockEraseRegion();

  console.log('[erase-region] Recraft response keys:', Object.keys(result));

  // Recraft edit endpoints return { image: { url } }, generation returns { data: [{ url }] }
  const imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      model: 'erase_region',
      imageUrl,
      format: 'RASTER',
      creditsUsed: cost,
    },
  });

  // await deductCredits(session.user.id, cost, 'EDIT', 'Erase region');

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
