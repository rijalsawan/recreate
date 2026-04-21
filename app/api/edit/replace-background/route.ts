import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockReplaceBackground } from '@/lib/recraft-mock';
import { openaiReplaceBackground } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import type { RecraftModel, RecraftStyle } from '@/types/recraft.types';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

  const cost = RECRAFT_PRICING.replace_background;
  const model = (formData.get('model') as string as RecraftModel) || undefined;

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'edit',
    creditsRequired: cost,
    model,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  const result = HAS_RECRAFT
    ? await recraft.replaceBackground({
        image,
        prompt,
        model,
        style: (formData.get('style') as string as RecraftStyle) || undefined,
      })
    : HAS_OPENAI
      ? await openaiReplaceBackground(image, prompt)
      : await mockReplaceBackground();

  let imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';
  try { if (imageUrl) imageUrl = await uploadToCloudinary(imageUrl, { folder: 'recreate/edits' }); } catch {}

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      prompt,
      model: 'replace_background',
      imageUrl,
      format: 'RASTER',
      creditsUsed: cost,
    },
  });

  await consumeUsageAndCredits({
    userId: session.user.id,
    operation: 'edit',
    creditsUsed: cost,
    transactionType: 'EDIT',
    description: 'Replace background',
    relatedImageId: saved.id,
  });

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
