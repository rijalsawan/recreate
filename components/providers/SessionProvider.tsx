'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useSessionSync } from '@/hooks/useSessionSync';

function SessionSync({ children }: { children: React.ReactNode }) {
  useSessionSync();
  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionSync>{children}</SessionSync>
    </NextAuthSessionProvider>
  );
}
