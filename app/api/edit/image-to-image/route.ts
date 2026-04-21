import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockImageToImage } from '@/lib/recraft-mock';
import { openaiImageToImage } from '@/lib/openai';
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

  const cost = RECRAFT_PRICING.image_to_image;
  const model = (formData.get('model') as string) || '';

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'edit',
    creditsRequired: cost,
    model: model || undefined,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

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
      model: (formData.get('model') as string) || 'recraftv4',
      style: (formData.get('style') as string) || null,
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
    description: 'Image to image transformation',
    relatedImageId: saved.id,
  });

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
