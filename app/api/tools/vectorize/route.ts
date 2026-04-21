import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockVectorize } from '@/lib/recraft-mock';
import { openaiVectorize } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

  const cost = RECRAFT_PRICING.vectorize;
  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'tool',
    creditsRequired: cost,
    feature: 'vectorize',
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  const result = HAS_RECRAFT
    ? await recraft.vectorize({ image })
    : HAS_OPENAI
      ? await openaiVectorize(image)
      : await mockVectorize();

  let imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';
  try { if (imageUrl) imageUrl = await uploadToCloudinary(imageUrl, { folder: 'recreate/tools' }); } catch {}

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      model: 'vectorize',
      imageUrl,
      format: 'VECTOR',
      creditsUsed: cost,
    },
  });

  await consumeUsageAndCredits({
    userId: session.user.id,
    operation: 'tool',
    creditsUsed: cost,
    transactionType: 'TOOL',
    description: 'Vectorize image',
    relatedImageId: saved.id,
  });

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
}
