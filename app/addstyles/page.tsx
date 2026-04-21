import { redirect } from 'next/navigation';

export default function AddStylesPage() {
  redirect('/styles?source=curated&createStyle=1');
}
