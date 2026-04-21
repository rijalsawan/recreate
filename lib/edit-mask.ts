import sharp from 'sharp';

type MaskTarget = 'recraft' | 'openai';

function isEditPixel(r: number, g: number, b: number, a: number): boolean {
  // Support both mask conventions:
  // - Recraft-style: white = edit, black = keep
  // - OpenAI-style: transparent = edit, black opaque = keep
  if (a < 128) return true;
  const luminance = (r + g + b) / 3;
  return luminance > 127;
}

/**
 * Morphological dilation on a 1-channel BINARY buffer (only 0 / 255 values).
 * Uses separable 1-D max-pool (horizontal then vertical) so the output is
 * guaranteed to contain only 0 or 255 — no intermediate gray values.
 * This expands the "white" (erase) region outward by `radius` pixels so that
 * object-edge pixels just outside the user's lasso/brush are also erased.
 */
function dilateBinaryMask(src: Buffer, width: number, height: number, radius: number): Buffer {
  // ── horizontal pass ──────────────────────────────────────────────────────
  const hPass = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      let found = false;
      for (let nx = xMin; nx <= xMax; nx++) {
        if (src[rowOff + nx] > 0) { found = true; break; }
      }
      hPass[rowOff + x] = found ? 255 : 0;
    }
  }
  // ── vertical pass ────────────────────────────────────────────────────────
  const dst = Buffer.alloc(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);
      let found = false;
      for (let ny = yMin; ny <= yMax; ny++) {
        if (hPass[ny * width + x] > 0) { found = true; break; }
      }
      dst[y * width + x] = found ? 255 : 0;
    }
  }
  return dst;
}

async function getImageDimensions(imageFile: File | Blob): Promise<{ width: number; height: number }> {
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error('Could not determine source image dimensions');
  }

  return { width, height };
}

async function getResizedMaskRgba(maskFile: File | Blob, width: number, height: number): Promise<Buffer> {
  const maskBuffer = Buffer.from(await maskFile.arrayBuffer());
  const { data } = await sharp(maskBuffer)
    .ensureAlpha()
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return data;
}

export async function normalizeMaskForTarget(
  imageFile: File | Blob,
  maskFile: File | Blob,
  target: MaskTarget,
): Promise<File> {
  const { width, height } = await getImageDimensions(imageFile);
  const source = await getResizedMaskRgba(maskFile, width, height);

  if (target === 'recraft') {
    // Step 1: build a strict binary 1-channel buffer (only 0 or 255).
    const binary = Buffer.alloc(width * height);
    for (let i = 0, d = 0; d < binary.length; i += 4, d++) {
      binary[d] = isEditPixel(source[i], source[i + 1], source[i + 2], source[i + 3]) ? 255 : 0;
    }

    // Step 2: morphological dilation — expand the erase region outward by
    // ~2% of the image short side (min 4px, max 24px).  This removes the need
    // for multiple erase passes by covering the edge halo that falls just
    // outside the user's lasso/brush stroke.
    const radius = Math.max(4, Math.min(24, Math.round(Math.min(width, height) * 0.02)));
    const dilated = dilateBinaryMask(binary, width, height, radius);

    // Step 3: encode as a strict 1-channel grayscale PNG.
    // Feed 1-channel raw directly; toColourspace('b-w') ensures PNG colortype 0.
    const png = await sharp(dilated, {
      raw: { width, height, channels: 1 },
    })
      .toColourspace('b-w')
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();

    return new File([new Uint8Array(png)], 'mask-recraft.png', { type: 'image/png' });
  }

  const openaiMask = Buffer.alloc(width * height * 4);

  for (let i = 0; i < source.length; i += 4) {
    const shouldEdit = isEditPixel(source[i], source[i + 1], source[i + 2], source[i + 3]);
    openaiMask[i] = 0;
    openaiMask[i + 1] = 0;
    openaiMask[i + 2] = 0;
    openaiMask[i + 3] = shouldEdit ? 0 : 255;
  }

  const png = await sharp(openaiMask, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return new File([new Uint8Array(png)], 'mask-openai.png', { type: 'image/png' });
}
