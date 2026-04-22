'use client';

import Link from 'next/link';
import { ShieldAlert, Lock, LogOut } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';

type AdminRouteGateProps = {
  isAuthenticated: boolean;
  attemptedEmail?: string;
};

export function AdminRouteGate({ isAuthenticated, attemptedEmail }: AdminRouteGateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-elevated/95 backdrop-blur-xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/35 text-primary flex items-center justify-center mb-5">
          {isAuthenticated ? <ShieldAlert className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>

        <h1 className="text-2xl font-display font-bold text-white">Secure Admin Access</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          This page is restricted to admin accounts only. Please continue with an authorized account.
        </p>

        {isAuthenticated && attemptedEmail && (
          <p className="mt-3 text-xs text-muted-foreground">
            Signed in as <span className="text-white/90 font-medium">{attemptedEmail}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {!isAuthenticated && (
            <button
              onClick={() => signIn('google')}
              className="w-full rounded-xl bg-white text-black font-semibold py-2.5 hover:bg-white/90 transition-colors"
            >
              Sign in as admin
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full rounded-xl border border-white/15 text-foreground font-semibold py-2.5 hover:bg-white/8 transition-colors inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Switch account
            </button>
          )}

          <Link
            href="/projects"
            className="w-full rounded-xl border border-white/10 text-muted-foreground text-center font-medium py-2.5 hover:text-white hover:bg-white/6 transition-colors"
          >
            Back to projects
          </Link>
        </div>
      </div>
    </div>
  );
}
