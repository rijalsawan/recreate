import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockEraseRegion } from '@/lib/recraft-mock';
import { openaiEraseRegion } from '@/lib/openai';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { normalizeMaskForTarget } from '@/lib/edit-mask';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

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
  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'edit',
    creditsRequired: cost,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  try {
    let result;
    if (HAS_RECRAFT) {
      const normalizedMask = await normalizeMaskForTarget(image, mask, 'recraft');
      result = await recraft.eraseRegion({ image, mask: normalizedMask });
    } else if (HAS_OPENAI) {
      const normalizedMask = await normalizeMaskForTarget(image, mask, 'openai');
      result = await openaiEraseRegion(image, normalizedMask);
    } else {
      result = await mockEraseRegion();
    }

    // Recraft edit endpoints return { image: { url } }, generation returns { data: [{ url }] }
    let imageUrl =
      result.data?.[0]?.url ||
      (result as unknown as { image?: { url?: string } }).image?.url ||
      '';
    try { if (imageUrl) imageUrl = await uploadToCloudinary(imageUrl, { folder: 'recreate/edits' }); } catch {}

    const saved = await withPrismaRetry(() => prisma.generatedImage.create({
      data: {
        userId: session.user.id,
        projectId: (formData.get('projectId') as string) || null,
        model: 'erase_region',
        imageUrl,
        format: 'RASTER',
        creditsUsed: cost,
      },
    }));

    await withPrismaRetry(() => consumeUsageAndCredits({
      userId: session.user.id,
      operation: 'edit',
      creditsUsed: cost,
      transactionType: 'EDIT',
      description: 'Erase region',
      relatedImageId: saved.id,
    }));

    return NextResponse.json({ image: saved, imageUrl, creditsUsed: cost });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to erase region';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
