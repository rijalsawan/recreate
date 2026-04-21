import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';

type SourceMetaItem = {
  sourceType?: 'canvas' | 'attachment';
  originalUrl?: string;
  styleHint?: string;
  modelHint?: string;
  promptHint?: string;
};

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSourceMeta(value: FormDataEntryValue | null): SourceMetaItem[] {
  if (typeof value !== 'string' || value.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((entry) => {
      const raw = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      const sourceType = raw.sourceType === 'canvas' ? 'canvas' : 'attachment';

      return {
        sourceType,
        originalUrl: toOptionalString(raw.originalUrl),
        styleHint: toOptionalString(raw.styleHint),
        modelHint: toOptionalString(raw.modelHint),
        promptHint: toOptionalString(raw.promptHint),
      };
    });
  } catch {
    return [];
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mime = file.type || 'image/jpeg';
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${mime};base64,${base64}`;
}

// GET /api/styles — list user's custom styles
export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const styles = await prisma.style.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(styles);
}

// POST /api/styles — create a custom style via Recraft API
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const name = (formData.get('name') as string) || 'Custom Style';
  const baseStyle = (formData.get('baseStyle') as string) || 'digital_illustration';
  const stylePrompt = toOptionalString(formData.get('prompt'));
  const contextMode = (toOptionalString(formData.get('contextMode')) || 'style_and_composition').slice(0, 60);
  const sourceMeta = parseSourceMeta(formData.get('sourceMeta'));
  const images = formData.getAll('images') as File[];

  if (images.length === 0) {
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
  }

  // Create style on Recraft
  const recraftResult = await recraft.createStyle({
    style: baseStyle as 'digital_illustration',
    images,
  });

  const sourceItems = await Promise.all(images.map(async (image, index) => {
    const meta = sourceMeta[index] || {};
    let uploadedUrl: string | undefined;

    try {
      const dataUrl = await fileToDataUrl(image);
      uploadedUrl = await uploadToCloudinary(dataUrl, { folder: 'recreate/style-context' });
    } catch {
      uploadedUrl = undefined;
    }

    return {
      sourceType: meta.sourceType || 'attachment',
      url: uploadedUrl || meta.originalUrl || undefined,
      originalUrl: meta.originalUrl,
      styleHint: meta.styleHint,
      modelHint: meta.modelHint,
      promptHint: meta.promptHint,
    };
  }));

  const thumbnailUrl = sourceItems
    .map((item) => (typeof item.url === 'string' ? item.url.trim() : ''))
    .find((url) => url.length > 0) || null;

  const style = await prisma.style.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 100),
      baseStyle,
      sourceImages: {
        contextMode,
        prompt: stylePrompt,
        thumbnailUrl,
        items: sourceItems,
      },
      recraftStyleId: recraftResult.id,
    },
  });

  return NextResponse.json(style, { status: 201 });
}
