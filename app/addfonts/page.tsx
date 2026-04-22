import { AdminRouteGate } from '@/components/auth/AdminRouteGate';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/api-helpers';
import AddFontsClientPage from './AddFontsClientPage';

export default async function AddFontsPage() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;

  if (!isAdminEmail(email)) {
    return <AdminRouteGate isAuthenticated={!!session?.user?.id} attemptedEmail={email} />;
  }

  return <AddFontsClientPage />;
}
