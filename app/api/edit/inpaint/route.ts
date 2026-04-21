import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockEraseRegion } from '@/lib/recraft-mock';
import { openaiInpaint } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { RECRAFT_PRICING } from '@/types/recraft.types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { normalizeMaskForTarget } from '@/lib/edit-mask';
import sharp from 'sharp';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;

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
    let imageUrl = '';

    if (HAS_RECRAFT) {
      // Recraft has no native mask+prompt inpaint endpoint.
      // Strategy: run imageToImage on the full image with the prompt, then
      // composite only the masked region of the result onto the original.
      // This gives true prompt-based area modification (distinct from eraseRegion).
      const i2iResult = await recraft.imageToImage({ image, prompt, strength: 0.8 });
      const i2iUrl =
        i2iResult.data?.[0]?.url ||
        (i2iResult as unknown as { image?: { url?: string } }).image?.url ||
        '';

      if (!i2iUrl) throw new Error('imageToImage returned no URL');

      // Download the i2i result
      const i2iBuffer = Buffer.from(await fetch(i2iUrl).then((r) => r.arrayBuffer()) as ArrayBuffer);
      const origBuffer = Buffer.from(await image.arrayBuffer() as ArrayBuffer);

      // Get original image dimensions
      const { width: origW, height: origH } = await sharp(origBuffer).metadata();
      if (!origW || !origH) throw new Error('Could not read image dimensions');

      // Get a binary grayscale mask (white=edit, black=keep) resized to original dims
      // normalizeMaskForTarget handles dilation for clean edges
      const normalizedMask = await normalizeMaskForTarget(image, mask, 'recraft');
      const maskBuffer = Buffer.from(await normalizedMask.arrayBuffer());

      // Resize i2i result to exactly match original dimensions
      const i2iResized = await sharp(i2iBuffer)
        .resize(origW, origH, { fit: 'fill' })
        .png()
        .toBuffer();

      // Apply the mask as an alpha channel to the i2i result:
      //   where mask=white(255) → i2i pixel is fully opaque (use new content)
      //   where mask=black(0)   → i2i pixel is transparent (reveal original below)
      const maskedI2I = await sharp(i2iResized)
        .composite([{ input: maskBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

      // Composite the masked i2i result over the original image
      const compositeBuffer = await sharp(origBuffer)
        .composite([{ input: maskedI2I, blend: 'over' }])
        .png()
        .toBuffer();

      // Upload composite to Cloudinary via base64 data URL
      const dataUrl = `data:image/png;base64,${compositeBuffer.toString('base64')}`;
      imageUrl = await uploadToCloudinary(dataUrl, { folder: 'recreate/edits' });
    } else if (HAS_OPENAI) {
      const normalizedMask = await normalizeMaskForTarget(image, mask, 'openai');
      const result = await openaiInpaint(image, normalizedMask, prompt);
      const rawUrl =
        result.data?.[0]?.url ||
        (result as unknown as { image?: { url?: string } }).image?.url ||
        '';
      try { if (rawUrl) imageUrl = await uploadToCloudinary(rawUrl, { folder: 'recreate/edits' }); } catch { imageUrl = rawUrl; }
    } else {
      const result = await mockEraseRegion();
      imageUrl =
        result.data?.[0]?.url ||
        (result as unknown as { image?: { url?: string } }).image?.url ||
        '';
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
