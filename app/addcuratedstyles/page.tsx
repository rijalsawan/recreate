import { AdminRouteGate } from '@/components/auth/AdminRouteGate';
import { auth } from '@/lib/auth';
import { isAdminById } from '@/lib/api-helpers';
import AddCuratedStylesClientPage from './AddCuratedStylesClientPage';

export default async function AddCuratedStylesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const isAdmin = userId
    ? session.user.role === 'ADMIN' || await isAdminById(userId)
    : false;

  if (!isAdmin) {
    return <AdminRouteGate isAuthenticated={!!userId} attemptedEmail={session?.user?.email ?? undefined} />;
  }

  return <AddCuratedStylesClientPage />;
}
