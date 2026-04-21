import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';

interface SharedProjectPageProps {
  params: Promise<{ token: string }>;
}

function ShareErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-background text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 flex flex-col gap-4">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link
          href="/projects"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Go to projects
        </Link>
      </div>
    </main>
  );
}

export default async function SharedProjectPage({ params }: SharedProjectPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/?auth=login');
  }

  const { token } = await params;

  const shareDelegate = (prisma as unknown as {
    projectShare?: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        projectId: string;
        ownerId: string;
        isActive: boolean;
        project: {
          name: string;
          thumbnail: string | null;
          canvasData: Prisma.JsonValue;
        } | null;
      } | null>;
    };
  }).projectShare;

  if (!shareDelegate) {
    return (
      <ShareErrorState
        title="Sharing is unavailable"
        description="Sharing is still initializing in this environment. Please refresh and try again."
      />
    );
  }

  let share;
  try {
    share = await shareDelegate.findUnique({
      where: { token },
      select: {
        id: true,
        projectId: true,
        ownerId: true,
        isActive: true,
        project: {
          select: {
            name: true,
            thumbnail: true,
            canvasData: true,
          },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === 'P6009' || err?.meta?.code === 'P6009') {
      return (
        <ShareErrorState
          title="Project is too large to share"
          description="This project payload is currently too large to duplicate safely. Please simplify the canvas and try sharing again."
        />
      );
    }
    throw err;
  }

  if (!share || !share.isActive || !share.project) {
    return (
      <ShareErrorState
        title="Share link is unavailable"
        description="This link is invalid or no longer active."
      />
    );
  }

  if (share.ownerId === session.user.id) {
    redirect(`/project/${share.projectId}`);
  }

  const existingClone = await prisma.project.findFirst({
    where: {
      userId: session.user.id,
      sharedSourceShareId: share.id,
    },
    select: { id: true },
  });

  if (existingClone) {
    redirect(`/project/${existingClone.id}`);
  }

  const clonedProject = await prisma.project.create({
    data: {
      userId: session.user.id,
      name: `${share.project.name} (Shared)`,
      thumbnail: share.project.thumbnail,
      canvasData:
        share.project.canvasData === null
          ? Prisma.JsonNull
          : (share.project.canvasData as Prisma.InputJsonValue),
      sharedSourceShareId: share.id,
      sharedByUserId: share.ownerId,
      isSharedClone: true,
    },
    select: { id: true },
  });

  redirect(`/project/${clonedProject.id}`);
}
