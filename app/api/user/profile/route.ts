import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { uploadFileToCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { planToSlug } from '@/lib/plans';

const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  credits: true,
  plan: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  subscriptionCancelAtPeriodEnd: true,
  createdAt: true,
} as const;

function serializeProfile(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  credits: number;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  subscriptionCancelAtPeriodEnd: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    credits: user.credits,
    plan: planToSlug(user.plan),
    subscriptionStatus: user.subscriptionStatus,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() || null,
    subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 80);
}

function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed;
}

export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: USER_PROFILE_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(serializeProfile(user));
}

export async function PATCH(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const contentType = request.headers.get('content-type') || '';
  let nextName: string | undefined;
  let nextImage: string | undefined;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      nextName = normalizeName(formData.get('name'));

      const avatar = formData.get('avatar');
      if (avatar instanceof File && avatar.size > 0) {
        if (!avatar.type.startsWith('image/')) {
          return NextResponse.json({ error: 'Avatar must be an image file' }, { status: 400 });
        }
        nextImage = await uploadFileToCloudinary(avatar, { folder: 'recreate/avatars' });
      }
    } else {
      const body = await request.json().catch(() => ({}));
      nextName = normalizeName((body as { name?: unknown }).name);
      nextImage = normalizeImageUrl((body as { image?: unknown }).image);
    }

    const updateData: { name?: string; image?: string } = {};
    if (nextName !== undefined) updateData.name = nextName;
    if (nextImage !== undefined) updateData.image = nextImage;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No profile changes provided' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: USER_PROFILE_SELECT,
    });

    return NextResponse.json(serializeProfile(user));
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
