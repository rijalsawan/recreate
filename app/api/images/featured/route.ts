import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

async function getImageUrls(prefix: string): Promise<string[]> {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 10,
    });
    return (result.resources as { secure_url: string }[]).map(
      (r) => r.secure_url,
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const [hero, gallery, avatars] = await Promise.all([
    getImageUrls('landing/hero'),
    getImageUrls('landing/gallery'),
    getImageUrls('landing/avatars'),
  ]);

  return NextResponse.json(
    { hero, gallery, avatars },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
