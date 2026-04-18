// ─── Recraft API types & pricing ────────────────────────────────────────────

export type RecraftModel =
  | 'recraftv4'
  | 'recraftv4_vector'
  | 'recraftv4_pro'
  | 'recraftv4_pro_vector'
  | 'recraftv3'
  | 'recraftv3_vector'
  | 'recraftv2'
  | 'recraftv2_vector'
  | 'dall-e-3'
  | 'gpt-image-1';

export type RecraftStyle =
  | 'any'
  | 'realistic_image'
  | 'digital_illustration'
  | 'vector_illustration'
  | 'icon';

export type RecraftSubstyle = string; // e.g. 'hand_drawn', 'engraving', etc.

export type ImageSize =
  | '1024x1024'
  | '1365x1024'
  | '1024x1365'
  | '1536x1024'
  | '1024x1536'
  | '1820x1024'
  | '1024x1820';

export type ResponseFormat = 'url' | 'b64_json';

// ─── Request payloads ───────────────────────────────────────────────────────

export interface GenerateImageRequest {
  prompt: string;
  model?: RecraftModel;
  style?: RecraftStyle;
  substyle?: RecraftSubstyle;
  size?: ImageSize;
  n?: number; // number of images (1-6)
  response_format?: ResponseFormat;
  style_id?: string;
  controls?: {
    colors?: Array<{ rgb: [number, number, number] }>;
    background_color?: { rgb: [number, number, number] };
  };
}

export interface ImageToImageRequest {
  image: File | Blob;
  prompt: string;
  model?: RecraftModel;
  style?: RecraftStyle;
  substyle?: RecraftSubstyle;
  n?: number;
  response_format?: ResponseFormat;
  strength?: number; // 0-1
}

export interface VectorizeRequest {
  image: File | Blob;
  response_format?: ResponseFormat;
}

export interface RemoveBackgroundRequest {
  image: File | Blob;
  response_format?: ResponseFormat;
}

export interface ReplaceBackgroundRequest {
  image: File | Blob;
  prompt: string;
  model?: RecraftModel;
  style?: RecraftStyle;
  response_format?: ResponseFormat;
}

export interface UpscaleRequest {
  image: File | Blob;
  response_format?: ResponseFormat;
}

export interface CreateStyleRequest {
  style: RecraftStyle;
  images: (File | Blob)[];
}

export interface EraseRegionRequest {
  image: File | Blob;
  mask: File | Blob;
  response_format?: ResponseFormat;
}

// ─── Response types ─────────────────────────────────────────────────────────

export interface RecraftImage {
  url?: string;
  b64_json?: string;
}

export interface RecraftGenerateResponse {
  data: RecraftImage[];
}

export interface RecraftStyleResponse {
  id: string;
}

export interface RecraftUserResponse {
  credits: number;
}

// ─── Pricing (in credit units) ──────────────────────────────────────────────

export const RECRAFT_PRICING: Record<string, number> = {
  // Generation
  recraftv4: 40,
  recraftv4_vector: 80,
  recraftv4_pro: 250,
  recraftv4_pro_vector: 300,
  recraftv3: 40,
  recraftv3_vector: 80,
  recraftv2: 22,
  recraftv2_vector: 44,
  'dall-e-3': 40,
  'gpt-image-1': 50,

  // Editing (raster)
  image_to_image: 40,
  inpaint: 40,
  erase_region: 2,

  // Tools
  vectorize: 10,
  remove_background: 10,
  replace_background: 40,
  crisp_upscale: 4,
  creative_upscale: 250,

  // Style
  create_style: 0, // style creation itself is free; usage costs normal generation
};

/** Calculate credit cost for a generation, accounting for image count. */
export function calculateCost(
  operation: string,
  model?: RecraftModel,
  imageCount: number = 1
): number {
  // For generation ops, use model-specific pricing
  if (operation === 'generate' && model) {
    return (RECRAFT_PRICING[model] ?? 40) * imageCount;
  }
  return (RECRAFT_PRICING[operation] ?? 40) * imageCount;
}
