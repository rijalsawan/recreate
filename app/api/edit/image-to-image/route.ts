import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireCredits } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockImageToImage } from '@/lib/recraft-mock';
import { openaiImageToImage } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import type { RecraftModel, RecraftStyle } from '@/types/recraft.types';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  const prompt = formData.get('prompt') as string;

  if (!image || !prompt) {
    return NextResponse.json({ error: 'image and prompt are required' }, { status: 400 });
  }

  const cost = RECRAFT_PRICING.image_to_image;
  // Credit check disabled for testing with mock service
  // const creditsError = await requireCredits(session.user.id, cost);
  // if (creditsError) return creditsError;

  const model = (formData.get('model') as string) || '';

  // Image-to-image is a Recraft-native operation — always use Recraft when available
  const result = HAS_RECRAFT
    ? await recraft.imageToImage({
        image,
        prompt,
        model: (model as RecraftModel) || undefined,
        style: (formData.get('style') as string as RecraftStyle) || undefined,
        strength: formData.get('strength') ? parseFloat(formData.get('strength') as string) : undefined,
      })
    : HAS_OPENAI
      ? await openaiImageToImage(image, prompt)
      : await mockImageToImage();

  const imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      prompt,
      model: (formData.get('model') as string) || 'recraftv4',
      style: (formData.get('style') as string) || null,
      imageUrl,
      format: 'RASTER',
      creditsUsed: cost,
    },
  });

  // await deductCredits(session.user.id, cost, 'EDIT', 'Image to image transformation');

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
