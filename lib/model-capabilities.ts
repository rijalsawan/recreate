// ─── Model capabilities and style compatibility ─────────────────────────────
// Defines what each model can do and which styles it supports.

export interface ModelCapabilities {
  id: string;            // API model ID
  name: string;          // Display name
  generate: boolean;     // Text-to-image generation
  imageToImage: boolean; // Image-to-image remix
  removeBackground: boolean;
  replaceBackground: boolean;
  upscaleCrisp: boolean;
  upscaleCreative: boolean;
  vectorize: boolean;
  eraseRegion: boolean;
  inpaint: boolean;
  outpaint: boolean;
  styles: boolean;       // Supports style API parameter
  attachments: boolean;  // Supports image attachments for generation context
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // ── Recraft V4 ──
  recraftv4: {
    id: 'recraftv4', name: 'Recraft V4',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: false, attachments: true,
  },
  recraftv4_vector: {
    id: 'recraftv4_vector', name: 'Recraft V4 Vector',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: false, attachments: true,
  },
  recraftv4_pro: {
    id: 'recraftv4_pro', name: 'Recraft V4 Pro',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: false, attachments: true,
  },
  recraftv4_pro_vector: {
    id: 'recraftv4_pro_vector', name: 'Recraft V4 Pro Vector',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: false, attachments: true,
  },
  // ── Recraft V3 ──
  recraftv3: {
    id: 'recraftv3', name: 'Recraft V3',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: false, eraseRegion: true, inpaint: true, outpaint: false,
    styles: true, attachments: true,
  },
  recraftv3_vector: {
    id: 'recraftv3_vector', name: 'Recraft V3 Vector',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: true, attachments: true,
  },
  // ── Recraft V2 ──
  recraftv2: {
    id: 'recraftv2', name: 'Recraft V2',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: false, eraseRegion: true, inpaint: true, outpaint: false,
    styles: true, attachments: true,
  },
  recraftv2_vector: {
    id: 'recraftv2_vector', name: 'Recraft V2 Vector',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: true, eraseRegion: true, inpaint: true, outpaint: false,
    styles: true, attachments: true,
  },
  // ── OpenAI ──
  'dall-e-3': {
    id: 'dall-e-3', name: 'DALL·E 3',
    generate: true, imageToImage: false,
    removeBackground: false, replaceBackground: false,
    upscaleCrisp: false, upscaleCreative: false,
    vectorize: false, eraseRegion: false, inpaint: false, outpaint: false,
    styles: false, attachments: false,
  },
  'gpt-image-1': {
    id: 'gpt-image-1', name: 'GPT Image 1',
    generate: true, imageToImage: true,
    removeBackground: true, replaceBackground: true,
    upscaleCrisp: true, upscaleCreative: true,
    vectorize: false, eraseRegion: true, inpaint: true, outpaint: true,
    styles: false, attachments: true,
  },
  // ── Gemini (Free) ──
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash',
    generate: true, imageToImage: false,
    removeBackground: false, replaceBackground: false,
    upscaleCrisp: false, upscaleCreative: false,
    vectorize: false, eraseRegion: false, inpaint: false, outpaint: false,
    styles: false, attachments: false,
  },
  // ── Gemini (Nano Banana) ──
  'nano-banana': {
    id: 'nano-banana', name: 'Nano Banana',
    generate: true, imageToImage: false,
    removeBackground: false, replaceBackground: false,
    upscaleCrisp: false, upscaleCreative: false,
    vectorize: false, eraseRegion: false, inpaint: false, outpaint: false,
    styles: false, attachments: false,
  },
  'nano-banana-2': {
    id: 'nano-banana-2', name: 'Nano Banana 2',
    generate: true, imageToImage: false,
    removeBackground: false, replaceBackground: false,
    upscaleCrisp: false, upscaleCreative: false,
    vectorize: false, eraseRegion: false, inpaint: false, outpaint: false,
    styles: false, attachments: false,
  },
  'nano-banana-pro': {
    id: 'nano-banana-pro', name: 'Nano Banana Pro',
    generate: true, imageToImage: false,
    removeBackground: false, replaceBackground: false,
    upscaleCrisp: false, upscaleCreative: false,
    vectorize: false, eraseRegion: false, inpaint: false, outpaint: false,
    styles: false, attachments: false,
  },
};

// ─── Model ↔ Style compatibility ─────────────────────────────────────────────
// Maps each model to the set of style apiStyle values it supports.
// Models not listed here support no styles.

// Recraft V3 styles
const V3_PHOTO = [
  'realistic_image', // base + all substyles
];
const V3_ILLUSTRATION = [
  'digital_illustration', // base + all substyles
];
const V3_VECTOR = [
  'vector_illustration', // base + all substyles
];
const V3_ICON = [
  'icon', // V3 vector only
];

// Recraft V2 styles
const V2_PHOTO = ['realistic_image'];
const V2_ILLUSTRATION = ['digital_illustration'];
const V2_VECTOR = ['vector_illustration'];
const V2_ICON = ['icon'];

export const MODEL_STYLE_SUPPORT: Record<string, string[]> = {
  // V4 family currently uses prompt style injection in this app (no native style API).
  recraftv4: [],
  recraftv4_vector: [],
  recraftv4_pro: [],
  recraftv4_pro_vector: [],
  // V3
  recraftv3: [...V3_PHOTO, ...V3_ILLUSTRATION],
  recraftv3_vector: [...V3_VECTOR, ...V3_ICON],
  // V2
  recraftv2: [...V2_PHOTO, ...V2_ILLUSTRATION],
  recraftv2_vector: [...V2_VECTOR, ...V2_ICON],
  // OpenAI — no native style API support
  'dall-e-3': [],
  'gpt-image-1': [],
  // Gemini (free) — no native style API support
  'gemini-2.5-flash': [],
  // Gemini — no native style API support
  'nano-banana': [],
  'nano-banana-2': [],
  'nano-banana-pro': [],
};

/**
 * Check if a given model supports a specific style (apiStyle value).
 * If the style is 'any', it's always supported.
 */
export function modelSupportsStyle(modelId: string, apiStyle: string): boolean {
  if (!apiStyle || apiStyle === 'any') return true;
  const supported = MODEL_STYLE_SUPPORT[modelId];
  if (!supported) return true; // unknown model = allow
  return supported.includes(apiStyle);
}

/**
 * Get model capabilities by UI model name or API model ID.
 */
const NAME_TO_ID: Record<string, string> = {
  'Recraft V4': 'recraftv4',
  'Recraft V4 Vector': 'recraftv4_vector',
  'Recraft V4 Pro': 'recraftv4_pro',
  'Recraft V4 Pro Vector': 'recraftv4_pro_vector',
  'Recraft V3': 'recraftv3',
  'Recraft V3 Vector': 'recraftv3_vector',
  'Recraft V2': 'recraftv2',
  'Recraft V2 Vector': 'recraftv2_vector',
  'DALL·E 3': 'dall-e-3',
  'GPT Image 1': 'gpt-image-1',
  'Gemini 2.5 Flash': 'gemini-2.5-flash',
  'Nano Banana': 'nano-banana',
  'Nano Banana 2': 'nano-banana-2',
  'Nano Banana Pro': 'nano-banana-pro',
  'Auto mode': 'recraftv4',
};

export function getModelCapabilities(modelNameOrId: string): ModelCapabilities | undefined {
  const id = NAME_TO_ID[modelNameOrId] || modelNameOrId;
  return MODEL_CAPABILITIES[id];
}

export function getModelId(modelName: string): string {
  return NAME_TO_ID[modelName] || modelName;
}
