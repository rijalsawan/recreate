"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthModal } from '@/stores/useAuthModal';
import { signIn } from 'next-auth/react';

export const AuthModal = () => {
  const { isOpen, view, openModal, closeModal } = useAuthModal();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/projects' });
  };

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
            className="relative w-full max-w-md bg-elevated border border-border shadow-2xl rounded-3xl overflow-hidden"
          >
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
            
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 sm:p-10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4 border border-primary/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  {view === 'login' ? 'Welcome back' : 'Get started'}
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {view === 'login' 
                    ? 'Sign in to access your workspace and projects.' 
                    : 'Create your account and start generating production-ready assets.'}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full bg-surface border-white/10 hover:bg-white/5 py-6 text-base font-medium"
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => openModal(view === 'login' ? 'signup' : 'login')}
                  className="text-primary font-bold hover:text-primary-hover transition-colors"
                >
                  {view === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
