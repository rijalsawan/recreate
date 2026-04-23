import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary from a URL or base64 data URL.
 * Returns the secure Cloudinary URL.
 */
export async function uploadToCloudinary(
  source: string,
  options?: { folder?: string; publicId?: string },
): Promise<string> {
  // Skip if already a Cloudinary URL
  if (source.includes('res.cloudinary.com')) return source;
  // Skip empty/missing
  if (!source) return source;

  const result = await cloudinary.uploader.upload(source, {
    folder: options?.folder || 'recreate',
    public_id: options?.publicId,
    resource_type: 'image',
    overwrite: true,
    quality: 100,         // Store at full original quality — no upload-time compression
    flags: 'preserve_transparency', // Preserve alpha channel for PNG/WebP images
  });

  return result.secure_url;
}

/**
 * Upload a File/Blob (from FormData) to Cloudinary.
 * Converts to base64 data URL first.
 */
export async function uploadFileToCloudinary(
  file: File | Blob,
  options?: { folder?: string; publicId?: string },
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'image/png';
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  return uploadToCloudinary(dataUrl, options);
}

export { cloudinary };
