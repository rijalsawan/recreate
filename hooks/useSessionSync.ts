'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/useUserStore';
import { planToSlug } from '@/lib/plans';

export function useSessionSync() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: session.user.id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        avatarUrl: session.user.image ?? undefined,
        credits: session.user.credits ?? 0,
        plan: planToSlug(session.user.plan),
        role: session.user.role ?? 'USER',
      });
    } else if (status === 'unauthenticated') {
      setUser(null);
    }
  }, [session, status, setUser]);

  return { status };
}
