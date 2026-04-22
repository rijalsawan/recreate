import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { openaiInpaint } from '@/lib/openai';
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
  const prompt = (formData.get('prompt') as string) || 'Edit this area';

  if (!image || !mask) {
    return NextResponse.json({ error: 'image and mask are required' }, { status: 400 });
  }

  if (!HAS_OPENAI) {
    return NextResponse.json(
      { error: 'OpenAI is required for Modify with AI. Set OPENAI_API_KEY and try again.' },
      { status: 503 },
    );
  }

  const cost = RECRAFT_PRICING.inpaint;

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'edit',
    creditsRequired: cost,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  try {
    const inpaintInstruction = `Edit only the masked area. Keep everything outside the mask unchanged. Match perspective, lighting, material detail, and color with surrounding pixels. Request: ${prompt}`;

    const normalizedMask = await normalizeMaskForTarget(image, mask, 'openai');
    const result = await openaiInpaint(image, normalizedMask, inpaintInstruction);
    const editedImageUrl =
      result.data?.[0]?.url ||
      (result as unknown as { image?: { url?: string } }).image?.url ||
      '';
    if (!editedImageUrl) {
      throw new Error('Inpaint returned no image URL');
    }

    const imageUrl = await uploadToCloudinary(editedImageUrl, { folder: 'recreate/edits' });
    if (!imageUrl) {
      throw new Error('Failed to store inpaint image');
    }

    const saved = await prisma.generatedImage.create({
      data: {
        userId: session.user.id,
        projectId: (formData.get('projectId') as string) || null,
        prompt,
        model: 'inpaint',
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
      description: 'Inpaint edit',
      relatedImageId: saved.id,
    });

    return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to modify area';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
