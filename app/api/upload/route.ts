import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { uploadFileToCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'upload',
    creditsRequired: 0,
  });
  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const persist = formData.get('persist') === '1';
  const projectIdRaw = formData.get('projectId');
  const projectId = typeof projectIdRaw === 'string' && projectIdRaw.trim() ? projectIdRaw.trim() : null;
  const width = parsePositiveInt(formData.get('width'));
  const height = parsePositiveInt(formData.get('height'));
  const nameRaw = formData.get('name');
  const prompt = typeof nameRaw === 'string' && nameRaw.trim()
    ? nameRaw.trim().slice(0, 200)
    : (file.name || 'Uploaded image');

  if (persist && projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  const url = await uploadFileToCloudinary(file, { folder: 'recreate/uploads' });

  // Backward-compatible fast path used by existing callers (crop/outpaint, etc.)
  if (!persist) {
    await consumeUsageAndCredits({
      userId: session.user.id,
      operation: 'upload',
      creditsUsed: 0,
      transactionType: 'TOOL',
      description: 'Uploaded source asset',
    });
    return NextResponse.json({ url });
  }

  const saved = await prisma.generatedImage.create({
    data: {
      userId: session.user.id,
      projectId,
      prompt,
      model: 'upload',
      style: 'any',
      imageUrl: url,
      width,
      height,
      format: 'RASTER',
      creditsUsed: 0,
    },
    select: {
      id: true,
      imageUrl: true,
      prompt: true,
      width: true,
      height: true,
      projectId: true,
    },
  });

  await consumeUsageAndCredits({
    userId: session.user.id,
    operation: 'upload',
    creditsUsed: 0,
    transactionType: 'TOOL',
    description: 'Uploaded source asset',
    relatedImageId: saved.id,
  });

  return NextResponse.json({
    url,
    image: {
      id: saved.id,
      url: saved.imageUrl,
      name: saved.prompt || prompt,
      w: saved.width ?? width ?? 0,
      h: saved.height ?? height ?? 0,
      projectId: saved.projectId,
    },
  });
}
