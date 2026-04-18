'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/useUserStore';

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
        plan: (session.user.plan as 'free' | 'pro' | 'business') ?? 'free',
      });
    } else if (status === 'unauthenticated') {
      setUser(null);
    }
  }, [session, status, setUser]);

  return { status };
}
