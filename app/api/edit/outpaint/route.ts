import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { mockGenerateImage } from '@/lib/recraft-mock';
import { openaiOutpaint } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

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

  let result;
  if (HAS_OPENAI) {
    result = await openaiOutpaint(image, mask, prompt);
  } else {
    result = await mockGenerateImage({ prompt: prompt || 'outpaint', size: '1024x1024', n: 1 });
  }

  const imageUrl =
    result.data?.[0]?.url ||
    (result as unknown as { image?: { url?: string } }).image?.url ||
    '';

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId: (formData.get('projectId') as string) || null,
      prompt: prompt || 'Outpaint expansion',
      model: 'outpaint',
      imageUrl,
      format: 'RASTER',
      creditsUsed: 0,
    },
  });

  return NextResponse.json({ image: saved, imageUrl, creditsUsed: 0 });
}
