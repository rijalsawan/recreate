/**
 * Gemini image generation service.
 * Normalizes responses to { data: [{ url }] } where url is a data URL.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiModel = 'gemini-2.5-flash' | 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro';

const GEMINI_MODEL_IDS: Record<GeminiModel, string> = {
  'gemini-2.5-flash': process.env.GEMINI_MODEL_FREE_FLASH || 'gemini-2.5-flash',
  'nano-banana': process.env.GEMINI_MODEL_NANO_BANANA || 'nano-banana',
  'nano-banana-2': process.env.GEMINI_MODEL_NANO_BANANA_2 || 'nano-banana-2',
  'nano-banana-pro': process.env.GEMINI_MODEL_NANO_BANANA_PRO || 'nano-banana-pro',
};

const GEMINI_DEFAULT_CANDIDATES: Record<GeminiModel, string[]> = {
  'gemini-2.5-flash': [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
  ],
  'nano-banana': [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'nano-banana-pro-preview',
  ],
  'nano-banana-2': [
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'nano-banana-pro-preview',
  ],
  'nano-banana-pro': [
    'nano-banana-pro-preview',
    'gemini-3-pro-image-preview',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
  ],
};

type GeminiModelCatalog = {
  modelNames: Set<string>;
  imageModelNames: string[];
  loadedAt: number;
};

const MODEL_CATALOG_TTL_MS = 5 * 60 * 1000;
let modelCatalogCache: GeminiModelCatalog | null = null;

interface GeminiNormalizedResponse {
  data: { url: string }[];
}

export class GeminiRequestError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  providerMessage?: string;

  constructor(args: {
    status: number;
    message: string;
    code?: string;
    requestId?: string;
    providerMessage?: string;
  }) {
    super(args.message);
    this.name = 'GeminiRequestError';
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
    this.providerMessage = args.providerMessage;
  }
}

export function isGeminiRequestError(error: unknown): error is GeminiRequestError {
  return error instanceof GeminiRequestError;
}

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, '').trim();
}

function isLikelyImageModelName(name: string): boolean {
  const v = name.toLowerCase();
  return v.includes('image') || v.includes('banana');
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeModelName(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function fetchModelCatalog(forceRefresh = false): Promise<GeminiModelCatalog | null> {
  if (!GEMINI_API_KEY) return null;

  const now = Date.now();
  if (!forceRefresh && modelCatalogCache && now - modelCatalogCache.loadedAt < MODEL_CATALOG_TTL_MS) {
    return modelCatalogCache;
  }

  try {
    const endpoint = `${GEMINI_BASE}/models?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return modelCatalogCache;
    }

    const payload = (await response.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const names = (payload.models || [])
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => normalizeModelName(m.name || ''))
      .filter(Boolean);

    const uniqueNames = uniqueNonEmpty(names);
    const imageNames = uniqueNames.filter(isLikelyImageModelName);

    modelCatalogCache = {
      modelNames: new Set(uniqueNames),
      imageModelNames: imageNames,
      loadedAt: now,
    };

    return modelCatalogCache;
  } catch {
    return modelCatalogCache;
  }
}

async function resolveGeminiModel(model: GeminiModel): Promise<string> {
  const configured = GEMINI_MODEL_IDS[model] || model;
  const candidates = uniqueNonEmpty([configured, ...GEMINI_DEFAULT_CANDIDATES[model]]);
  const catalog = await fetchModelCatalog();

  if (model === 'gemini-2.5-flash') {
    if (!catalog || catalog.modelNames.size === 0) {
      return candidates[0] || configured;
    }

    for (const candidate of candidates) {
      if (catalog.modelNames.has(candidate)) {
        return candidate;
      }
    }

    return candidates[0] || configured;
  }

  if (!catalog || catalog.modelNames.size === 0) {
    return candidates[0] || configured;
  }

  // Prefer known image-capable candidates first.
  for (const candidate of candidates) {
    if (catalog.modelNames.has(candidate) && isLikelyImageModelName(candidate)) {
      return candidate;
    }
  }

  // Fall back to any candidate that exists in catalog.
  for (const candidate of candidates) {
    if (catalog.modelNames.has(candidate)) {
      return candidate;
    }
  }

  // Last resort: pick first image-capable model from account catalog.
  if (catalog.imageModelNames.length > 0) {
    return catalog.imageModelNames[0];
  }

  throw new GeminiRequestError({
    status: 503,
    message: `No image-capable Gemini model available for ${model}`,
    providerMessage: `Could not resolve a usable model for ${model}. Configure GEMINI_MODEL_NANO_BANANA, GEMINI_MODEL_NANO_BANANA_2, GEMINI_MODEL_NANO_BANANA_PRO to valid model IDs from ListModels.`,
  });
}

function toDataUrl(b64: string, mimeType?: string): string {
  const type = mimeType || 'image/png';
  return `data:${type};base64,${b64}`;
}

function parseGeminiImages(payload: unknown): string[] {
  const root = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };

  const urls: string[] = [];
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const b64 = part?.inlineData?.data;
      if (typeof b64 === 'string' && b64.length > 0) {
        urls.push(toDataUrl(b64, part.inlineData?.mimeType));
      }
    }
  }

  return urls;
}

function parseGeminiText(payload: unknown): string {
  const root = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const chunks: string[] = [];
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim().length > 0) {
        chunks.push(part.text.trim());
      }
    }
  }

  return chunks.join('\n').trim();
}

function extractSvgMarkup(text: string): string | null {
  if (!text) return null;

  const fenced = text.match(/```svg\s*([\s\S]*?)```/i);
  const source = fenced?.[1] || text;
  const start = source.indexOf('<svg');
  const end = source.lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end <= start) return null;

  return source.slice(start, end + 6).trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildFallbackSvg(prompt: string): string {
  const label = escapeXml(prompt).slice(0, 120);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#10131a"/><rect x="72" y="72" width="880" height="880" rx="48" fill="#1d2433"/><text x="512" y="480" text-anchor="middle" fill="#ffffff" font-size="48" font-family="Arial, sans-serif">Gemini 2.5 Flash</text><text x="512" y="560" text-anchor="middle" fill="#cfd7e6" font-size="28" font-family="Arial, sans-serif">${label || 'Generated artwork'}</text></svg>`;
}

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildFlashSvgPrompt(prompt: string): string {
  return `${prompt}\n\nReturn only valid standalone SVG markup for a 1024x1024 image. Do not include markdown fences. Do not include any explanation text. Use only SVG elements and attributes.`;
}

async function geminiRequest(
  model: GeminiModel,
  prompt: string,
  responseModalities: Array<'TEXT' | 'IMAGE'>,
) {
  if (!GEMINI_API_KEY) {
    throw new GeminiRequestError({
      status: 503,
      message: 'Gemini API key not configured',
      providerMessage: 'Set GEMINI_API_KEY in environment variables.',
    });
  }

  const resolvedModel = await resolveGeminiModel(model);
  const endpoint = `${GEMINI_BASE}/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities,
      },
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-goog-request-id') || undefined;
    const text = await response.text().catch(() => '');

    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const providerError = (parsed && typeof parsed === 'object'
      ? (parsed as { error?: unknown }).error
      : null) as
      | { message?: unknown; status?: unknown; code?: unknown }
      | null;

    const providerMessage = typeof providerError?.message === 'string'
      ? providerError.message
      : (text || `Gemini request failed with status ${response.status}`);

    throw new GeminiRequestError({
      status: response.status,
      message: `Gemini API error ${response.status}: ${providerMessage}`,
      code: typeof providerError?.status === 'string'
        ? providerError.status
        : typeof providerError?.code === 'string'
          ? providerError.code
          : undefined,
      requestId,
      providerMessage,
    });
  }

  return response.json();
}

export async function geminiGenerate(
  prompt: string,
  model: GeminiModel,
): Promise<GeminiNormalizedResponse> {
  if (model === 'gemini-2.5-flash') {
    const payload = await geminiRequest(model, buildFlashSvgPrompt(prompt), ['TEXT']);
    const text = parseGeminiText(payload);
    const svg = extractSvgMarkup(text) || buildFallbackSvg(prompt);
    return {
      data: [{ url: toSvgDataUrl(svg) }],
    };
  }

  const payload = await geminiRequest(model, prompt, ['TEXT', 'IMAGE']);
  const urls = parseGeminiImages(payload);

  if (urls.length === 0) {
    throw new GeminiRequestError({
      status: 502,
      message: 'Gemini returned no image data',
      providerMessage: 'No image parts were found in Gemini response.',
    });
  }

  return {
    data: urls.map((url) => ({ url })),
  };
}
