import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { openaiOutpaint } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { normalizeMaskForTarget } from '@/lib/edit-mask';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  const mask = formData.get('mask') as File | null;
  const prompt = (formData.get('prompt') as string) || '';

  if (!image || !mask) {
    return NextResponse.json({ error: 'image (padded) and mask are required' }, { status: 400 });
  }

  if (!HAS_OPENAI) {
    return NextResponse.json(
      { error: 'OpenAI is required for Expand with AI. Set OPENAI_API_KEY and try again.' },
      { status: 503 },
    );
  }

  const cost = RECRAFT_PRICING.image_to_image;

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'edit',
    creditsRequired: cost,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  try {
    const normalizedMask = await normalizeMaskForTarget(image, mask, 'openai');
    const result = await openaiOutpaint(image, normalizedMask, prompt);

    const providerImageUrl =
      result.data?.[0]?.url ||
      (result as unknown as { image?: { url?: string } }).image?.url ||
      '';
    if (!providerImageUrl) {
      throw new Error('Outpaint returned no image URL');
    }

    const imageUrl = await uploadToCloudinary(providerImageUrl, { folder: 'recreate/edits' });
    if (!imageUrl) {
      throw new Error('Failed to store outpaint image');
    }

    const saved = await prisma.generatedImage.create({
      data: {
        userId: session.user.id,
        projectId: (formData.get('projectId') as string) || null,
        prompt: prompt || 'Outpaint expansion',
        model: 'outpaint',
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
      description: 'Outpaint edit',
      relatedImageId: saved.id,
    });

    return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to outpaint image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
