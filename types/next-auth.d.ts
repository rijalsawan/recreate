import { DefaultSession, DefaultJWT } from 'next-auth';

type SessionPlan = 'free' | 'pro' | 'business';
type SessionRole = 'USER' | 'ADMIN';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      credits: number;
      plan: SessionPlan;
      role: SessionRole;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    credits?: number;
    plan?: SessionPlan;
    role?: SessionRole;
  }
}
