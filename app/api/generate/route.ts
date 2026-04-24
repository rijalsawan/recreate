import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockGenerateImage } from '@/lib/recraft-mock';
import { openaiGenerate, openaiEdit, isOpenAIRequestError } from '@/lib/openai';
import { geminiGenerate, isGeminiRequestError, type GeminiModel } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { consumeUsageAndCredits, guardUsage } from '@/lib/billing.server';
import { Prisma } from '@/lib/generated/prisma/client';
import { calculateCost, type RecraftModel, type GenerateImageRequest } from '@/types/recraft.types';
import { STYLE_LOOKUP } from '@/lib/styles-data';
import { uploadToCloudinary } from '@/lib/cloudinary';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const HAS_GEMINI = !!process.env.GEMINI_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI && !HAS_GEMINI;

const VALID_RECRAFT_STYLES: Array<NonNullable<GenerateImageRequest['style']>> = [
  'any',
  'realistic_image',
  'digital_illustration',
  'vector_illustration',
  'icon',
];

const VALID_IMAGE_SIZES: Array<NonNullable<GenerateImageRequest['size']>> = [
  '1024x1024',
  '1365x1024',
  '1024x1365',
  '1536x1024',
  '1024x1536',
  '1820x1024',
  '1024x1820',
];

function isRecraftModel(model: string): boolean {
  return model.startsWith('recraft');
}

function isRecraftV4FamilyModel(model: string): boolean {
  return model === 'recraftv4'
    || model === 'recraftv4_vector'
    || model === 'recraftv4_pro'
    || model === 'recraftv4_pro_vector';
}

function isOpenAIModel(model: string): model is 'dall-e-3' | 'gpt-image-1' | 'gpt-image-1.5' | 'gpt-image-2' {
  return model === 'dall-e-3' || model === 'gpt-image-1' || model === 'gpt-image-1.5' || model === 'gpt-image-2';
}

function isGeminiModel(model: string): model is GeminiModel {
  return model === 'gemini-2.5-flash' || model === 'nano-banana' || model === 'nano-banana-2' || model === 'nano-banana-pro';
}

function isDisabledPaidGeminiModel(model: string): boolean {
  return model === 'nano-banana' || model === 'nano-banana-2' || model === 'nano-banana-pro';
}

type GenerateRequestBody = {
  prompt?: string;
  model?: string;
  size?: string;
  n?: number;
  strength?: string;
  style?: string;
  substyle?: string;
  styleName?: string;
  styleModel?: string;
  style_id?: string;
  controls?: GenerateImageRequest['controls'];
  projectId?: string;
  aiFeedSource?: string;
  aiCategory?: string;
  aiStyleKey?: string;
  aiStyleName?: string;
  aiApiModel?: string;
  aiApiStyle?: string;
  aiApiSubstyle?: string;
  landingSlot?: string;
  saveToDatabase?: boolean | string;
  attachments?: File[];
};

function toRequestBody(value: unknown): GenerateRequestBody {
  if (!value || typeof value !== 'object') return {};
  return value as GenerateRequestBody;
}

function normalizeImageToImageStrength(value: unknown, fallback: number = 0.8): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeStyle(value: unknown): NonNullable<GenerateImageRequest['style']> {
  if (typeof value !== 'string') return 'any';
  return VALID_RECRAFT_STYLES.includes(value as NonNullable<GenerateImageRequest['style']>)
    ? (value as NonNullable<GenerateImageRequest['style']>)
    : 'any';
}

function normalizeImageSize(value: unknown): NonNullable<GenerateImageRequest['size']> {
  if (typeof value !== 'string') return '1024x1024';
  return VALID_IMAGE_SIZES.includes(value as NonNullable<GenerateImageRequest['size']>)
    ? (value as NonNullable<GenerateImageRequest['size']>)
    : '1024x1024';
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return fallback;
}

function buildGeneratedImageMetadata(body: GenerateRequestBody): Prisma.InputJsonValue {
  const aiFeedSource = normalizeOptionalString(body.aiFeedSource);
  const aiCategory = normalizeOptionalString(body.aiCategory);
  const aiStyleKey = normalizeOptionalString(body.aiStyleKey);
  const aiStyleName = normalizeOptionalString(body.aiStyleName);
  const aiApiModel = normalizeOptionalString(body.aiApiModel);
  const aiApiStyle = normalizeOptionalString(body.aiApiStyle);
  const aiApiSubstyle = normalizeOptionalString(body.aiApiSubstyle);

  const metadata: Record<string, string> = {};

  const landingSlot = normalizeOptionalString(body.landingSlot);

  if (aiFeedSource) metadata.aiFeedSource = aiFeedSource;
  if (aiCategory) metadata.aiCategory = aiCategory;
  if (aiStyleKey) metadata.aiStyleKey = aiStyleKey;
  if (aiStyleName) metadata.aiStyleName = aiStyleName;
  if (aiApiModel) metadata.aiApiModel = aiApiModel;
  if (aiApiStyle) metadata.aiApiStyle = aiApiStyle;
  if (aiApiSubstyle) metadata.aiApiSubstyle = aiApiSubstyle;
  if (landingSlot) metadata.landingSlot = landingSlot;

  return metadata;
}

// Retry a Prisma operation up to maxAttempts times on transient Accelerate errors (P6000).
async function withPrismaRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isAccelerateError =
        err instanceof Error &&
        'code' in err &&
        (err as { code: unknown }).code === 'P6000';
      if (!isAccelerateError || attempt === maxAttempts) break;
      // Back off: 500ms, 1000ms, ...
      await new Promise<void>((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function isRgbTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((channel) => typeof channel === 'number' && Number.isFinite(channel))
  );
}

function toGenerateControls(value: unknown): GenerateImageRequest['controls'] | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as {
    colors?: unknown;
    background_color?: unknown;
  };

  const controls: NonNullable<GenerateImageRequest['controls']> = {};

  if (Array.isArray(candidate.colors)) {
    const colors = candidate.colors
      .filter((item): item is { rgb: [number, number, number] } => {
        if (!item || typeof item !== 'object') return false;
        return isRgbTuple((item as { rgb?: unknown }).rgb);
      })
      .map((item) => ({ rgb: item.rgb }));

    if (colors.length > 0) {
      controls.colors = colors;
    }
  }

  if (candidate.background_color && typeof candidate.background_color === 'object') {
    const bgRgb = (candidate.background_color as { rgb?: unknown }).rgb;
    if (isRgbTuple(bgRgb)) {
      controls.background_color = { rgb: bgRgb };
    }
  }

  return Object.keys(controls).length > 0 ? controls : undefined;
}

function resolvePromptStyleName(
  selectedStyleName: string | undefined,
  apiStyle: string | undefined,
  apiSubstyle: string | undefined,
): string | null {
  const explicit = selectedStyleName?.trim();
  if (explicit) return explicit;

  if (!apiStyle || apiStyle === 'any') return null;

  const allStyles = Object.values(STYLE_LOOKUP);
  const exactMatch = allStyles.find((entry) =>
    entry.apiStyle === apiStyle && entry.apiSubstyle === apiSubstyle
  );
  if (exactMatch) return exactMatch.name;

  const styleOnlyMatch = allStyles.find((entry) =>
    entry.apiStyle === apiStyle && !entry.apiSubstyle
  );
  if (styleOnlyMatch) return styleOnlyMatch.name;

  return apiStyle.replace(/_/g, ' ');
}

function hasStyleHint(prompt: string | undefined, styleName: string): boolean {
  return typeof prompt === 'string' && prompt.toLowerCase().includes(styleName.toLowerCase());
}

function isVectorModel(model: string): boolean {
  return model.endsWith('_vector');
}

/**
 * Resolve the correct Recraft model for the request.
 * When a specific style is selected (not 'any'), the style's native model
 * takes precedence because styles are only supported on specific model versions.
 * When style is 'any', the user's chosen model is used directly.
 */
function resolveRecraftModel(
  userModel: RecraftModel,
  styleModel: string | undefined,
  style: string | undefined,
): RecraftModel {
  // Recraft V4 family does not support style API params reliably in current integration.
  // Keep the selected V4 model and use prompt style injection instead.
  if (isRecraftV4FamilyModel(userModel)) {
    return userModel;
  }

  // Only override when a specific style is selected AND the style knows its model
  if (style && style !== 'any' && styleModel && styleModel.startsWith('recraft')) {
    return styleModel as RecraftModel;
  }
  return userModel;
}

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  // Parse body: support both JSON and FormData (when attachments present)
  let body: GenerateRequestBody;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    let parsedControls: GenerateImageRequest['controls'] | undefined;
    const controlsRaw = formData.get('controls');
    if (typeof controlsRaw === 'string' && controlsRaw.trim().length > 0) {
      try {
        parsedControls = toGenerateControls(JSON.parse(controlsRaw));
      } catch {
        parsedControls = undefined;
      }
    }

    body = {
      prompt: formData.get('prompt') as string,
      model: formData.get('model') as string,
      size: formData.get('size') as string,
      n: parseInt(formData.get('n') as string) || 1,
      strength: formData.get('strength') as string || undefined,
      style: formData.get('style') as string || undefined,
      substyle: formData.get('substyle') as string || undefined,
      styleName: formData.get('styleName') as string || undefined,
      styleModel: formData.get('styleModel') as string || undefined,
      controls: parsedControls,
      projectId: formData.get('projectId') as string || undefined,
      aiFeedSource: formData.get('aiFeedSource') as string || undefined,
      aiCategory: formData.get('aiCategory') as string || undefined,
      aiStyleKey: formData.get('aiStyleKey') as string || undefined,
      aiStyleName: formData.get('aiStyleName') as string || undefined,
      aiApiModel: formData.get('aiApiModel') as string || undefined,
      aiApiStyle: formData.get('aiApiStyle') as string || undefined,
      aiApiSubstyle: formData.get('aiApiSubstyle') as string || undefined,
      saveToDatabase: formData.get('saveToDatabase') as string || undefined,
    };
    // Attachments are sent as image files — for OpenAI image edits with reference
    const attachments = formData.getAll('attachments') as File[];
    if (attachments.length > 0) {
      body.attachments = attachments;
    }
  } else {
    body = toRequestBody(await request.json());
  }

  const model = (body.model || 'recraftv4') as RecraftModel;
  const imageCount = Math.min(Math.max(body.n || 1, 1), 6);
  const cost = calculateCost('generate', model, imageCount);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const shouldSaveToDatabase = parseBoolean(body.saveToDatabase, true);

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const billingGuard = await guardUsage({
    userId: session.user.id,
    operation: 'generate',
    creditsRequired: cost,
    model,
    imageCount,
  });

  if (!billingGuard.ok) {
    return NextResponse.json(billingGuard.payload, { status: billingGuard.status });
  }

  const params: GenerateImageRequest = {
    prompt,
    model,
    style: normalizeStyle(body.style),
    size: normalizeImageSize(body.size),
    n: imageCount,
    response_format: 'url',
  };
  if (body.substyle) params.substyle = body.substyle;
  if (body.style_id) params.style_id = body.style_id;
  if (body.controls) params.controls = body.controls;

  // For OpenAI/Gemini/Recraft V4 family models: style API params are not supported.
  // Inject selected style into prompt text, then strip style params.
  if (isOpenAIModel(model) || isGeminiModel(model) || isRecraftV4FamilyModel(model)) {
    const styleName = resolvePromptStyleName(body.styleName, params.style, params.substyle);
    if (styleName && !hasStyleHint(params.prompt, styleName)) {
      const basePrompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
      params.prompt = basePrompt ? `${basePrompt}. Style: ${styleName}.` : `Style: ${styleName}.`;
    }
    // Vector models reject style:'any' — omit the field entirely.
    // Non-vector V4/OpenAI/Gemini models also don't use the style field via API.
    if (isVectorModel(model)) {
      delete params.style;
    } else {
      params.style = 'any';
    }
    delete params.substyle;
  }

  // Route based on model: Recraft models → Recraft API, OpenAI models → OpenAI API
  const firstAttachment = body.attachments?.[0];
  const hasAttachments = Boolean(firstAttachment);

  let result;
  try {
    if (hasAttachments && isRecraftModel(model) && HAS_RECRAFT) {
      const effectiveModel = resolveRecraftModel(model, body.styleModel, params.style);
      const recraftParams = {
        image: firstAttachment as File,
        prompt: params.prompt,
        model: effectiveModel,
        style: params.style,
        substyle: params.substyle,
        // Keep the attachment strongly aligned with the provided context image.
        strength: normalizeImageToImageStrength(body.strength, 0.8),
        n: params.n,
        response_format: 'url' as const,
      };
      try {
        result = await recraft.imageToImage(recraftParams);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes("can't be used together") && recraftParams.substyle) {
          const paramsWithoutSubstyle = { ...recraftParams };
          delete paramsWithoutSubstyle.substyle;
          result = await recraft.imageToImage(paramsWithoutSubstyle);
        } else {
          throw err;
        }
      }
    } else if (isRecraftModel(model) && HAS_RECRAFT) {
      // Use the style's native model when a specific style is selected.
      // This ensures style+model compatibility (e.g. 'realistic_image' → recraftv3,
      // 'kawaii' substyle → recraftv2, 'icon' → recraftv2_vector, etc.)
      const effectiveModel = resolveRecraftModel(model, body.styleModel, params.style);
      const recraftParams = { ...params, model: effectiveModel };
      try {
        result = await recraft.generateImage(recraftParams);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        // Retry without substyle if style+substyle combo is invalid
        if (msg.includes("can't be used together") && recraftParams.substyle) {
          const paramsWithoutSubstyle = { ...recraftParams };
          delete paramsWithoutSubstyle.substyle;
          result = await recraft.generateImage(paramsWithoutSubstyle);
        } else {
          throw err;
        }
      }
    } else if (hasAttachments && isOpenAIModel(model) && HAS_OPENAI) {
      // DALL·E 3 does not support edit/attachment flow, so use GPT Image 2 for attachment edits.
      const openaiEditModel = model === 'dall-e-3' ? 'gpt-image-2' : model;
      result = await openaiEdit(firstAttachment as File, params.prompt, null, params.size, openaiEditModel);
    } else if (isOpenAIModel(model) && HAS_OPENAI) {
      const openaiModel = model === 'dall-e-3'
        ? 'dall-e-3'
        : model === 'gpt-image-2'
          ? 'gpt-image-2'
          : model === 'gpt-image-1.5'
            ? 'gpt-image-1.5'
            : 'gpt-image-1';
      // DALL-E 3 only supports n=1, so loop for multiple images
      if (openaiModel === 'dall-e-3' && imageCount > 1) {
        const results = await Promise.all(
          Array.from({ length: imageCount }, () =>
            openaiGenerate(params.prompt, params.size, 1, 'dall-e-3')
          )
        );
        result = { data: results.flatMap((r) => r.data) };
      } else {
        result = await openaiGenerate(params.prompt, params.size, params.n, openaiModel);
      }
    } else if (isDisabledPaidGeminiModel(model)) {
      return NextResponse.json(
        { error: 'Nano Banana models are temporarily disabled. Please use Gemini 2.5 Flash for now.' },
        { status: 403 }
      );
    } else if (isGeminiModel(model) && HAS_GEMINI) {
      if (hasAttachments) {
        return NextResponse.json(
          { error: 'Gemini 2.5 Flash currently supports prompt-only generation in this app.' },
          { status: 400 }
        );
      }

      const outputs = await Promise.all(
        Array.from({ length: imageCount }, () => geminiGenerate(params.prompt, model))
      );
      result = { data: outputs.flatMap((r) => r.data) };
    } else if (isOpenAIModel(model)) {
      // OpenAI model selected but no OpenAI API key configured — don't fall through to Recraft
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY or select a Recraft model.' },
        { status: 503 }
      );
    } else if (isGeminiModel(model)) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Add GEMINI_API_KEY or select another model.' },
        { status: 503 }
      );
    } else if (USE_MOCK) {
      result = await mockGenerateImage(params);
    } else if (HAS_RECRAFT) {
      // Fallback: unknown model with Recraft key → use Recraft
      result = await recraft.generateImage(params);
    } else if (HAS_OPENAI) {
      // Fallback: unknown model with OpenAI key → use OpenAI
      result = await openaiGenerate(params.prompt, params.size, params.n, 'gpt-image-2');
    } else {
      result = await mockGenerateImage(params);
    }
  } catch (error) {
    if (isOpenAIRequestError(error)) {
      if (error.code === 'moderation_blocked') {
        return NextResponse.json(
          {
            error: 'OpenAI blocked this prompt due to its safety policy. Try a more original description without named copyrighted characters.',
            code: error.code,
            requestId: error.requestId || null,
          },
          { status: 400 }
        );
      }

      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return NextResponse.json(
        {
          error: error.providerMessage || error.message || 'OpenAI image generation failed',
          code: error.code || null,
          requestId: error.requestId || null,
        },
        { status }
      );
    }

    if (isGeminiRequestError(error)) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return NextResponse.json(
        {
          error: error.providerMessage || error.message || 'Gemini image generation failed',
          code: error.code || null,
          requestId: error.requestId || null,
        },
        { status }
      );
    }

    throw error;
  }

  try {
    await withPrismaRetry(() =>
      consumeUsageAndCredits({
        userId: session.user.id,
        operation: 'generate',
        creditsUsed: cost,
        transactionType: 'GENERATION',
        description: `Generated ${imageCount} image(s) with ${model}`,
      })
    );
  } catch (billingError) {
    console.error('[generate] Failed to consume credits after retries', billingError);
    return NextResponse.json(
      { error: 'Unable to finalize billing for this generation. Please try again.' },
      { status: 503 },
    );
  }

  // Upload to Cloudinary first. DB save can be skipped for manual-save flows.
  const generatedImages = await Promise.all(
    result.data.map(async (img) => {
      const rawUrl = img.url || '';
      // Upload base64 data URLs and external URLs to Cloudinary for persistent, compact storage
      let imageUrl = rawUrl;
      try {
        if (rawUrl) imageUrl = await uploadToCloudinary(rawUrl, { folder: 'recreate/generated' });
      } catch { /* keep original URL if Cloudinary upload fails */ }

      if (!shouldSaveToDatabase) {
        return { id: null as string | null, imageUrl, savedToDb: false, format: model.includes('vector') ? 'VECTOR' : 'RASTER' };
      }

      try {
        const record = await withPrismaRetry(() =>
          prisma.generatedImage.create({
            data: {
              userId: session.user.id,
              projectId: body.projectId || null,
              prompt: body.prompt,
              model,
              style: body.style || 'any',
              imageUrl,
              width: parseInt(params.size?.split('x')[0] || '1024'),
              height: parseInt(params.size?.split('x')[1] || '1024'),
              format: model.includes('vector') ? 'VECTOR' : 'RASTER',
              creditsUsed: Math.ceil(cost / imageCount),
              metadata: buildGeneratedImageMetadata(body),
            },
            select: { id: true, imageUrl: true },
          })
        );
        return { id: record.id, imageUrl: record.imageUrl, savedToDb: true, format: model.includes('vector') ? 'VECTOR' : 'RASTER' };
      } catch {
        console.error('[generate] Failed to save generated image to DB after retries');
        return { id: null as string | null, imageUrl, savedToDb: false, format: model.includes('vector') ? 'VECTOR' : 'RASTER' };
      }
    })
  );

  return NextResponse.json({
    images: generatedImages,
    creditsUsed: cost,
  });
}
