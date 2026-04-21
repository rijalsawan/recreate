export type CachedFont = {
  id: string;
  family: string;
  category: string;
  variants: number[];
};

let cachedFonts: CachedFont[] | null = null;

export function getFontsCache(): CachedFont[] | null {
  return cachedFonts;
}

export function setFontsCache(fonts: CachedFont[] | null) {
  cachedFonts = fonts;
}

export function invalidateFontsCache() {
  cachedFonts = null;
}
