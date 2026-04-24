"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthModal } from '@/stores/useAuthModal';
import { signIn } from 'next-auth/react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/body-scroll-lock';
import { useRestrictedDevice } from '@/hooks/useRestrictedDevice';

export const AuthModal = () => {
  const { isOpen, view, openModal, closeModal } = useAuthModal();
  const { isRestrictedDevice, isDeviceCheckReady } = useRestrictedDevice();
  const restrictAuthAccess = !isDeviceCheckReady || isRestrictedDevice;

  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  const handleGoogleSignIn = () => {
    if (restrictAuthAccess) return;
    signIn('google', { callbackUrl: '/projects' });
  };

  const heading = restrictAuthAccess
    ? 'Desktop Access Required'
    : view === 'login'
      ? 'Welcome back'
      : 'Create your account';

  const description = restrictAuthAccess
    ? 'You can explore the landing page on this device, but workspace access is desktop-only.'
    : view === 'login'
      ? 'Sign in to access your projects, canvas workspace, and studio tools.'
      : 'Create your account and start building production-ready visuals.';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400, bounce: 0.2 }}
            className="relative w-full max-w-md bg-[#0B0B0C] border border-white/10 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.95)] rounded-3xl overflow-hidden"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 sm:p-9">
              <div className="mb-7">
                <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">
                  RECREATE
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-3">
                  {heading}
                </h2>
                <p className="text-sm text-white/60 mt-2 max-w-sm leading-relaxed">
                  {description}
                </p>
              </div>

              {restrictAuthAccess ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/12 bg-white/4 p-4 text-sm text-white/70 leading-relaxed">
                    Projects, Canvas, and Studio management are only available on laptop/desktop.
                    You can continue browsing the landing experience on this device.
                  </div>
                  <Button
                    type="button"
                    onClick={closeModal}
                    className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold"
                  >
                    Continue Exploring
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full h-12 border-white/15 bg-white hover:bg-white/90 text-black font-semibold"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="mt-5 text-center text-xs text-white/50 leading-relaxed">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-white/80 hover:text-white underline underline-offset-2">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-white/80 hover:text-white underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    .
                  </p>

                  <div className="mt-6 text-center text-sm text-white/60">
                    {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => openModal(view === 'login' ? 'signup' : 'login')}
                      className="text-white font-semibold hover:text-white/80 transition-colors"
                    >
                      {view === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
