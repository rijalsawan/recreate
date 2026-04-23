'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthModal } from '@/stores/useAuthModal';
import { useSession } from 'next-auth/react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'API', href: '#api' },
  { label: 'Blog', href: '#blog' },
] as const;

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openModal } = useAuthModal();
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isLoggedIn = status === 'authenticated' && session?.user;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-black border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold tracking-tight text-base text-white">
            Recreate
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-white/55">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn('hover:text-white transition-colors', pathname === link.href && 'text-white')}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right — desktop */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {isLoggedIn ? (
            <Link
              href="/projects"
              className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              My Projects
            </Link>
          ) : (
            <>
              <button
                onClick={() => openModal('login')}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </button>
              <button
                onClick={() => openModal('signup')}
                className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                Try Recreate Studio
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden text-white/60 hover:text-white p-2 transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-black border-b border-white/5"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn('text-sm font-medium text-white/60 hover:text-white transition-colors py-1', pathname === link.href && 'text-white')}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                {isLoggedIn ? (
                  <Link
                    href="/projects"
                    className="text-center px-4 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Projects
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => { openModal('login'); setMobileOpen(false); }}
                      className="text-sm font-medium text-white/60 hover:text-white py-2 transition-colors"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => { openModal('signup'); setMobileOpen(false); }}
                      className="px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                    >
                      Try Recreate Studio
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

