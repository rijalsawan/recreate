import { Assets, Texture } from 'pixi.js';

const cache = new Map<string, Texture>();
const loading = new Map<string, Promise<Texture>>();

export async function loadTexture(url: string): Promise<Texture> {
  if (cache.has(url)) return cache.get(url)!;
  if (loading.has(url)) return loading.get(url)!;

  const promise = Assets.load<Texture>(url).then((texture) => {
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
  const texture = cache.get(url);
  cache.delete(url);
  if (texture && texture !== Texture.EMPTY && !texture.destroyed) {
    texture.destroy(true);
  }
}

export function clearTextureCache() {
  cache.forEach((t) => {
    if (t && t !== Texture.EMPTY && !t.destroyed) {
      t.destroy(true);
    }
  });
  cache.clear();
  loading.clear();
}
