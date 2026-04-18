import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockEraseRegion } from '@/lib/recraft-mock';
import { openaiInpaint } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

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
  const prompt = (formData.get('prompt') as string) || 'Edit this area';

  if (!image || !mask) {
    return NextResponse.json({ error: 'image and mask are required' }, { status: 400 });
  }

  let result;
  if (HAS_RECRAFT) {
    // Recraft eraseRegion is the inpaint equivalent on the Recraft platform.
    // Recraft requires a true grayscale PNG mask — convert server-side.
    const grayscaleMask = await toGrayscalePng(mask);
    result = await recraft.eraseRegion({ image, mask: grayscaleMask });
  } else if (HAS_OPENAI) {
    result = await openaiInpaint(image, mask, prompt);
  } else {
    result = await mockEraseRegion();
  }

  // Recraft edit endpoints return { image: { url } }, generation returns { data: [{ url }] }
  const imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      prompt,
      model: 'inpaint',
      imageUrl,
      format: 'RASTER',
      creditsUsed: 0,
    },
  });

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: 0 });
}
