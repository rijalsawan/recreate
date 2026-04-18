import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { recraft } from '@/lib/recraft';
import { prisma } from '@/lib/prisma';

// GET /api/styles — list user's custom styles
export async function GET() {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const styles = await prisma.style.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(styles);
}

// POST /api/styles — create a custom style via Recraft API
export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const formData = await request.formData();
  const name = (formData.get('name') as string) || 'Custom Style';
  const baseStyle = (formData.get('baseStyle') as string) || 'digital_illustration';
  const images = formData.getAll('images') as File[];

  if (images.length === 0) {
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
  }

  // Create style on Recraft
  const recraftResult = await recraft.createStyle({
    style: baseStyle as 'digital_illustration',
    images,
  });

  const style = await prisma.style.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 100),
      baseStyle,
      recraftStyleId: recraftResult.id,
    },
  });

  return NextResponse.json(style, { status: 201 });
}
