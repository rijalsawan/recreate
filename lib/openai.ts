/**
 * OpenAI Image API service.
 * Uses gpt-image-1.5 for generation and editing.
 * Returns normalized responses matching Recraft's { data: [{ url }] } format.
 * Base64 images are returned as data URLs.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE = 'https://api.openai.com/v1';

interface NormalizedResponse {
  data: { url: string }[];
}

export class OpenAIRequestError extends Error {
  status: number;
  code?: string;
  type?: string;
  requestId?: string;
  providerMessage?: string;

  constructor(args: {
    status: number;
    message: string;
    code?: string;
    type?: string;
    requestId?: string;
    providerMessage?: string;
  }) {
    super(args.message);
    this.name = 'OpenAIRequestError';
    this.status = args.status;
    this.code = args.code;
    this.type = args.type;
    this.requestId = args.requestId;
    this.providerMessage = args.providerMessage;
  }
}

export function isOpenAIRequestError(error: unknown): error is OpenAIRequestError {
  return error instanceof OpenAIRequestError;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function b64ToDataUrl(b64: string, format = 'png'): string {
  return `data:image/${format};base64,${b64}`;
}

function normalizeResponse(
  openaiRes: { data: Array<{ b64_json?: string; url?: string }> },
  format = 'png',
  useUrl = false,
): NormalizedResponse {
  return {
    data: openaiRes.data.map((item) => ({
      url: useUrl && item.url ? item.url : (item.url || b64ToDataUrl(item.b64_json || '', format)),
    })),
  };
}

function mapSize(size: string): string {
  const map: Record<string, string> = {
    '1024x1024': '1024x1024',
    '1365x1024': '1536x1024',
    '1024x1365': '1024x1536',
    '1536x1024': '1536x1024',
    '1024x1536': '1024x1536',
    '1820x1024': '1536x1024',
    '1024x1820': '1024x1536',
  };
  return map[size] || 'auto';
}

async function openaiRequest(endpoint: string, body: FormData | Record<string, unknown>, isForm = false) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };

  let requestBody: BodyInit;
  if (isForm) {
    requestBody = body as FormData;
  } else {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${OPENAI_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: requestBody,
  });

  if (!res.ok) {
    const requestId = res.headers.get('x-request-id') || undefined;
    const text = await res.text().catch(() => '');

    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const providerError = (parsed && typeof parsed === 'object' ? (parsed as { error?: unknown }).error : null) as
      | { message?: unknown; type?: unknown; code?: unknown }
      | null;

    const providerMessage = typeof providerError?.message === 'string'
      ? providerError.message
      : (text || `OpenAI request failed with status ${res.status}`);

    throw new OpenAIRequestError({
      status: res.status,
      message: `OpenAI API error ${res.status}: ${providerMessage}`,
      code: typeof providerError?.code === 'string' ? providerError.code : undefined,
      type: typeof providerError?.type === 'string' ? providerError.type : undefined,
      requestId,
      providerMessage,
    });
  }

  return res.json();
}

// ─── Generate ─────────────────────────────────────────────────────────────

export async function openaiGenerate(
  prompt: string,
  size = '1024x1024',
  n = 1,
  model = 'gpt-image-1.5',
): Promise<NormalizedResponse> {
  const response = await openaiRequest('/images/generations', {
    model,
    prompt,
    n,
    size: mapSize(size),
    quality: 'low',
  });
  return normalizeResponse(response, 'png');
}

// ─── Edit / Inpaint (image + optional mask + prompt) ─────────────────────

export async function openaiEdit(
  image: File | Blob,
  prompt: string,
  mask?: File | Blob | null,
  size?: string,
): Promise<NormalizedResponse> {
  const form = new FormData();
  form.append('model', 'gpt-image-1.5');
  form.append('image[]', image);
  form.append('prompt', prompt);
  form.append('quality', 'low');
  if (mask) form.append('mask', mask);
  if (size) form.append('size', mapSize(size));

  const response = await openaiRequest('/images/edits', form, true);
  return normalizeResponse(response);
}

// ─── Remove Background ───────────────────────────────────────────────────

export async function openaiRemoveBackground(image: File | Blob): Promise<NormalizedResponse> {
  return openaiEdit(
    image,
    'Remove the background completely. Keep only the main subject with a transparent/white clean background.',
  );
}

// ─── Replace Background ──────────────────────────────────────────────────

export async function openaiReplaceBackground(
  image: File | Blob,
  prompt: string,
): Promise<NormalizedResponse> {
  return openaiEdit(image, `Replace the background with: ${prompt}. Keep the main subject intact.`);
}

// ─── Upscale (simulate by regenerating at higher quality) ────────────────

export async function openaiUpscale(
  image: File | Blob,
  type: 'crisp' | 'creative' = 'crisp',
): Promise<NormalizedResponse> {
  const detail = type === 'creative'
    ? 'Recreate this image with enhanced artistic detail, richer colors, and creative improvements at higher quality.'
    : 'Recreate this exact image with maximum sharpness, clarity, and fine detail preservation. Keep it identical but crisper.';
  return openaiEdit(image, detail, null, '1536x1024');
}

// ─── Vectorize (simulate — OpenAI can not produce SVG) ───────────────────

export async function openaiVectorize(image: File | Blob): Promise<NormalizedResponse> {
  return openaiEdit(
    image,
    'Recreate this image as a clean, flat vector-style illustration with solid colors, clean edges, minimal gradients, and a simplified graphic style.',
  );
}

// ─── Erase Region ─────────────────────────────────────────────────────────

export async function openaiEraseRegion(
  image: File | Blob,
  mask: File | Blob,
): Promise<NormalizedResponse> {
  return openaiEdit(
    image,
    'Seamlessly remove and fill the masked area so it blends naturally with the surrounding content. Do not add any new objects.',
    mask,
  );
}

// ─── Inpaint (edit masked area based on prompt) ──────────────────────────

export async function openaiInpaint(
  image: File | Blob,
  mask: File | Blob,
  prompt: string,
): Promise<NormalizedResponse> {
  return openaiEdit(image, prompt, mask);
}

// ─── Image-to-Image / Remix ──────────────────────────────────────────────

export async function openaiImageToImage(
  image: File | Blob,
  prompt: string,
): Promise<NormalizedResponse> {
  return openaiEdit(image, prompt);
}

// ─── Outpaint / Expand ──────────────────────────────────────────────────

export async function openaiOutpaint(
  image: File | Blob,
  mask: File | Blob,
  prompt: string,
): Promise<NormalizedResponse> {
  const expandPrompt = prompt.trim()
    ? `Expand this image outward. New content must follow this request: ${prompt}. Only generate in transparent mask regions. Preserve the original central image exactly. Match perspective, lighting, texture, and color continuity from adjacent pixels so the extension looks native.`
    : 'Expand this image outward. Only generate in transparent mask regions. Preserve the original central image exactly. Fill new regions by naturally continuing perspective, lighting, texture, and color from nearby image context.';
  return openaiEdit(image, expandPrompt, mask);
}
