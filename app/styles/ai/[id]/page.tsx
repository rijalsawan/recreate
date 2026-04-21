import { redirect } from 'next/navigation';

export default async function AIStyleImageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const query = new URLSearchParams({
    source: 'ai',
    aiImageId: id,
  });

  redirect(`/styles?${query.toString()}`);
}
