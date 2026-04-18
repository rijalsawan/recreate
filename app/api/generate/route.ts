import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireCredits } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { mockGenerateImage } from '@/lib/recraft-mock';
import { openaiGenerate, openaiEdit } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { Prisma } from '@/lib/generated/prisma/client';
import { calculateCost, type RecraftModel, type GenerateImageRequest } from '@/types/recraft.types';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_RECRAFT = !!process.env.RECRAFT_API_KEY;
const USE_MOCK = !HAS_RECRAFT && !HAS_OPENAI;

function isRecraftModel(model: string): boolean {
  return model.startsWith('recraft');
}

function isOpenAIModel(model: string): boolean {
  return model === 'dall-e-3' || model === 'gpt-image-1';
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
  let body: Record<string, any>;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    body = {
      prompt: formData.get('prompt') as string,
      model: formData.get('model') as string,
      size: formData.get('size') as string,
      n: parseInt(formData.get('n') as string) || 1,
      style: formData.get('style') as string || undefined,
      substyle: formData.get('substyle') as string || undefined,
      styleModel: formData.get('styleModel') as string || undefined,
      projectId: formData.get('projectId') as string || undefined,
    };
    // Attachments are sent as image files — for OpenAI image edits with reference
    const attachments = formData.getAll('attachments') as File[];
    if (attachments.length > 0) {
      body.attachments = attachments;
    }
  } else {
    body = await request.json();
  }

  const model = (body.model || 'recraftv4') as RecraftModel;
  const imageCount = Math.min(Math.max(body.n || 1, 1), 6);
  const cost = calculateCost('generate', model, imageCount);

  // Credit check disabled for testing with mock service
  // const creditsError = await requireCredits(session.user.id, cost);
  // if (creditsError) return creditsError;

  const params: GenerateImageRequest = {
    prompt: body.prompt,
    model,
    style: body.style || 'any',
    size: body.size || '1024x1024',
    n: imageCount,
    response_format: 'url',
  };
  if (body.substyle) params.substyle = body.substyle;
  if (body.style_id) params.style_id = body.style_id;
  if (body.controls) params.controls = body.controls;

  // Route based on model: Recraft models → Recraft API, OpenAI models → OpenAI API
  const hasAttachments = body.attachments && body.attachments.length > 0;

  let result;
  if (isRecraftModel(model) && HAS_RECRAFT) {
    // Use the style's native model when a specific style is selected.
    // This ensures style+model compatibility (e.g. 'realistic_image' → recraftv3,
    // 'kawaii' substyle → recraftv2, 'icon' → recraftv2_vector, etc.)
    const effectiveModel = resolveRecraftModel(model, body.styleModel, params.style);
    const recraftParams = { ...params, model: effectiveModel };
    try {
      result = await recraft.generateImage(recraftParams);
    } catch (err: any) {
      const msg: string = err.message || '';
      // Retry without substyle if style+substyle combo is invalid
      if (msg.includes("can't be used together") && recraftParams.substyle) {
        const { substyle: _dropped, ...paramsWithoutSubstyle } = recraftParams;
        result = await recraft.generateImage(paramsWithoutSubstyle);
      } else {
        throw err;
      }
    }
  } else if (hasAttachments && isOpenAIModel(model) && HAS_OPENAI) {
    // Use edit endpoint with reference images when attachments present (GPT Image 1 only)
    const openaiModel = model === 'dall-e-3' ? 'dall-e-3' : 'gpt-image-1';
    result = await openaiEdit(body.attachments[0], params.prompt, null, params.size);
  } else if (isOpenAIModel(model) && HAS_OPENAI) {
    const openaiModel = model === 'dall-e-3' ? 'dall-e-3' : 'gpt-image-1';
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
  } else if (USE_MOCK) {
    result = await mockGenerateImage(params);
  } else if (HAS_RECRAFT) {
    // Fallback: unknown model with Recraft key → use Recraft
    result = await recraft.generateImage(params);
  } else if (HAS_OPENAI) {
    // Fallback: unknown model with OpenAI key → use OpenAI
    result = await openaiGenerate(params.prompt, params.size, params.n, 'gpt-image-1');
  } else {
    result = await mockGenerateImage(params);
  }

  // Save generated images and deduct credits
  const savedImages = await Promise.all(
    result.data.map((img) =>
      prisma.generatedImage.create({
        data: {
          userId: session.user.id,
          projectId: body.projectId || null,
          prompt: body.prompt,
          model,
          style: body.style || 'any',
          imageUrl: img.url || '',
          width: parseInt(params.size?.split('x')[0] || '1024'),
          height: parseInt(params.size?.split('x')[1] || '1024'),
          format: model.includes('vector') ? 'VECTOR' : 'RASTER',
          creditsUsed: Math.ceil(cost / imageCount),
          metadata: { recraftResponse: JSON.parse(JSON.stringify(img)) } satisfies Prisma.InputJsonValue,
        },
        // Only return id + imageUrl to avoid hitting Prisma Accelerate 5MB response limit
        // (imageUrl is a large base64 data URL; metadata JSON would push it over)
        select: { id: true, imageUrl: true },
      })
    )
  );

  // Credit deduction disabled for testing with mock service
  // await deductCredits(session.user.id, cost, 'GENERATION', `Generated ${imageCount} image(s) with ${model}`);

  return NextResponse.json({
    images: savedImages,
    creditsUsed: cost,
  });
}
