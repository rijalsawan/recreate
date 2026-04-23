import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Optional delay for faking network requests during dev
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Injects Cloudinary transformation parameters into a Cloudinary delivery URL,
 * preserving the stored original while controlling delivery quality and format.
 *
 * Defaults to `f_auto,q_100`:
 *   - `f_auto`  → serve WebP/AVIF where the browser supports it (better compression, same perceived quality)
 *   - `q_100`   → lossless/max-quality delivery — zero additional compression step
 *
 * Non-Cloudinary URLs are returned unchanged.
 *
 * @example
 * cloudinaryOptimizedUrl(url)
 * // → https://res.cloudinary.com/.../image/upload/f_auto,q_100/v.../file.jpg
 *
 * cloudinaryOptimizedUrl(url, 'f_auto,q_100,w_2560')
 * // → ...with responsive width cap applied at delivery time
 */
export function cloudinaryOptimizedUrl(
  url: string,
  transformations = 'f_auto,q_100',
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const uploadMarker = '/upload/';
  const pos = url.indexOf(uploadMarker);
  if (pos === -1) return url;

  const before = url.slice(0, pos + uploadMarker.length);
  const after = url.slice(pos + uploadMarker.length);

  // Idempotent — skip if these exact transformations are already applied
  if (after.startsWith(`${transformations}/`)) return url;

  return `${before}${transformations}/${after}`;
}
