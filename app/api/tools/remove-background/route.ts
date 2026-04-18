import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireCredits } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockRemoveBackground } from '@/lib/recraft-mock';
import { openaiRemoveBackground } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { RECRAFT_PRICING } from '@/types/recraft.types';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const image = formData.get('image') as File | null;

  if (!image) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 });
  }

  const cost = RECRAFT_PRICING.remove_background;
  // Credit check disabled for testing with mock service
  // const creditsError = await requireCredits(session.user.id, cost);
  // if (creditsError) return creditsError;

  const result = HAS_RECRAFT
    ? await recraft.removeBackground({ image })
    : HAS_OPENAI
      ? await openaiRemoveBackground(image)
      : await mockRemoveBackground();

  const imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      model: 'remove_background',
      imageUrl,
      format: 'RASTER',
      creditsUsed: cost,
    },
  });

  // await deductCredits(session.user.id, cost, 'TOOL', 'Remove background');

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
