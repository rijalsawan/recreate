/**
 * Mock Recraft service that returns placeholder images.
 * Uses picsum.photos for realistic-looking results.
 * Drop-in replacement for the real RecraftService when RECRAFT_API_KEY is empty.
 */

import type {
  GenerateImageRequest,
  RecraftGenerateResponse,
} from '@/types/recraft.types';

// Maps ratio strings to pixel sizes matching Recraft's supported sizes
const SIZE_MAP: Record<string, { w: number; h: number }> = {
  '1024x1024': { w: 1024, h: 1024 },
  '1365x1024': { w: 1365, h: 1024 },
  '1024x1365': { w: 1024, h: 1365 },
  '1536x1024': { w: 1536, h: 1024 },
  '1024x1536': { w: 1024, h: 1536 },
  '1820x1024': { w: 1820, h: 1024 },
  '1024x1820': { w: 1024, h: 1820 },
};

function randomSeed() {
  return Math.random().toString(36).substring(2, 10);
}

/** Simulate network delay (500–1500ms) */
function mockDelay(): Promise<void> {
  const ms = 500 + Math.random() * 1000;
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockGenerateImage(
  params: GenerateImageRequest
): Promise<RecraftGenerateResponse> {
  await mockDelay();

  const size = SIZE_MAP[params.size || '1024x1024'] || { w: 1024, h: 1024 };
  const count = Math.min(Math.max(params.n || 1, 1), 6);

  const data = Array.from({ length: count }, () => ({
    url: `https://picsum.photos/seed/${randomSeed()}/${size.w}/${size.h}`,
  }));

  return { data };
}

export async function mockImageToImage(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/1024/1024` }],
  };
}

export async function mockVectorize(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/1024/1024` }],
  };
}

export async function mockRemoveBackground(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/1024/1024` }],
  };
}

export async function mockReplaceBackground(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/1024/1024` }],
  };
}

export async function mockUpscale(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/2048/2048` }],
  };
}

export async function mockEraseRegion(): Promise<RecraftGenerateResponse> {
  await mockDelay();
  return {
    data: [{ url: `https://picsum.photos/seed/${randomSeed()}/1024/1024` }],
  };
}
