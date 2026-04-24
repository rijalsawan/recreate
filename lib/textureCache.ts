import { Assets, Texture } from 'pixi.js';

const cache = new Map<string, Texture>();
const loading = new Map<string, Promise<Texture>>();

function safeUnload(url: string) {
  const assetCache = (Assets as unknown as { cache?: { has: (key: string) => boolean } }).cache;
  if (assetCache?.has && !assetCache.has(url)) return;
  Assets.unload(url).catch(() => { /* already unloaded or never loaded */ });
}

export async function loadTexture(url: string): Promise<Texture> {
  if (cache.has(url)) return cache.get(url)!;
  if (loading.has(url)) return loading.get(url)!;

  // SVG files must use PixiJS's built-in SVG loader (auto-detected by extension).
  // Forcing the raster 'loadTextures' parser on SVG URLs causes silent failure because
  // the ImageBitmap/raster parser cannot reliably decode SVG content.
  // For all other URLs (including extension-less recraft.ai URLs) we force 'loadTextures'
  // so PixiJS doesn't try an incorrect parser.
  const isSvgUrl = url.split('?')[0].toLowerCase().endsWith('.svg');

  const promise = (
    isSvgUrl
      ? Assets.load<Texture>({ alias: url, src: url })                                    // auto-detect → loadSVG
      : Assets.load<Texture>({ alias: url, src: url, parser: 'loadTextures' })            // force raster parser
  ).then((texture) => {
    loading.delete(url);
    // Assets.load can resolve to null on CORS errors or unsupported formats
    if (!texture || !(texture instanceof Texture)) {
      return Texture.EMPTY;
    }
    cache.set(url, texture);
    return texture;
  }).catch(() => {
    loading.delete(url);
    return Texture.EMPTY;
  });

  loading.set(url, promise);
  return promise;
}

export function getLodUrl(cloudinaryUrl: string, zoom: number): string {
  if (!cloudinaryUrl.includes('res.cloudinary.com')) {
    return cloudinaryUrl;
  }

  // SVG files must not be rasterised — serve them untransformed so they remain vector.
  const path = cloudinaryUrl.split('?')[0];
  if (path.endsWith('.svg')) {
    return cloudinaryUrl;
  }

  let w: number;
  if (zoom < 0.15) w = 128;
  else if (zoom < 0.3) w = 256;
  else if (zoom < 0.6) w = 512;
  else if (zoom < 1.2) w = 1024;
  else if (zoom < 2.5) w = 2048;
  else w = 4096;

  return cloudinaryUrl.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`);
}

export function evictTexture(url: string) {
  cache.delete(url);
  loading.delete(url);
  safeUnload(url);
}

export function clearTextureCache() {
  const urls = Array.from(cache.keys());
  cache.clear();
  loading.clear();
  for (const url of urls) {
    safeUnload(url);
  }
}
