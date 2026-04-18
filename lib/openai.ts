/**
 * OpenAI Image API service.
 * Uses gpt-image-1 for generation and editing.
 * Returns normalized responses matching Recraft's { data: [{ url }] } format.
 * Base64 images are returned as data URLs.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE = 'https://api.openai.com/v1';

interface NormalizedResponse {
  data: { url: string }[];
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

// DALL-E 3 only supports 1024x1024, 1024x1792, 1792x1024
function mapDalle3Size(size: string): string {
  const map: Record<string, string> = {
    '1024x1024': '1024x1024',
    '1365x1024': '1792x1024',
    '1024x1365': '1024x1792',
    '1536x1024': '1792x1024',
    '1024x1536': '1024x1792',
    '1820x1024': '1792x1024',
    '1024x1820': '1024x1792',
  };
  return map[size] || '1024x1024';
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
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Generate ─────────────────────────────────────────────────────────────

export async function openaiGenerate(
  prompt: string,
  size = '1024x1024',
  n = 1,
  model = 'gpt-image-1',
): Promise<NormalizedResponse> {
  const isDalle3 = model === 'dall-e-3';
  const response = await openaiRequest('/images/generations', {
    model,
    prompt,
    n: isDalle3 ? 1 : n, // DALL-E 3 only supports n=1
    size: isDalle3 ? mapDalle3Size(size) : mapSize(size),
    quality: isDalle3 ? 'standard' : 'low',
    ...(isDalle3 ? {} : {}),
  });
  return normalizeResponse(response, 'png', isDalle3);
}

// ─── Edit / Inpaint (image + optional mask + prompt) ─────────────────────

export async function openaiEdit(
  image: File | Blob,
  prompt: string,
  mask?: File | Blob | null,
  size?: string,
): Promise<NormalizedResponse> {
  const form = new FormData();
  form.append('model', 'gpt-image-1');
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
    ? `Expand this image outward. The new areas should contain: ${prompt}. Make the expansion seamless.`
    : 'Expand this image outward. Fill the new areas with content that naturally continues the scene. Make the expansion seamless.';
  return openaiEdit(image, expandPrompt, mask);
}
