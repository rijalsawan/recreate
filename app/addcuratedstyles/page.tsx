import { AdminRouteGate } from '@/components/auth/AdminRouteGate';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/api-helpers';
import AddCuratedStylesClientPage from './AddCuratedStylesClientPage';

export default async function AddCuratedStylesPage() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;

  if (!isAdminEmail(email)) {
    return <AdminRouteGate isAuthenticated={!!session?.user?.id} attemptedEmail={email} />;
  }

  return <AddCuratedStylesClientPage />;
}
