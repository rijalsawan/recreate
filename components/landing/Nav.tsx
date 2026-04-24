'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuthModal } from '@/stores/useAuthModal';
import { useSession } from 'next-auth/react';
import { PricingModal } from '@/components/shared/PricingModal';
import { useRestrictedDevice } from '@/hooks/useRestrictedDevice';

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const lastTouchTsRef = useRef(0);
  const { openModal } = useAuthModal();
  const { isRestrictedDevice, isDeviceCheckReady } = useRestrictedDevice();
  const restrictAuthAccess = !isDeviceCheckReady || isRestrictedDevice;
  const { data: session, status } = useSession();

  const isLoggedIn = status === 'authenticated' && session?.user;

  const openPricingModal = () => {
    setMobileOpen(false);
    setShowPricingModal(true);
  };

  const handleButtonTouchEnd = (
    event: React.TouchEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    lastTouchTsRef.current = Date.now();
    event.preventDefault();
    action();
  };

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    if (Date.now() - lastTouchTsRef.current < 600) {
      return;
    }

    action();
  };

  const toggleMobileMenu = () => {
    setMobileOpen((v) => !v);
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-black border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="group shrink-0">
            <span className="font-display font-black uppercase tracking-[0.16em] text-base sm:text-lg text-white group-hover:text-white/85 transition-colors">
              RECREATE
            </span>
          </Link>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-7">
            <button
              type="button"
              onClick={(e) => handleButtonClick(e, openPricingModal)}
              onTouchEnd={(e) => handleButtonTouchEnd(e, openPricingModal)}
              className="touch-manipulation text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
              Pricing
            </button>
          </div>

          {/* Right — desktop */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {restrictAuthAccess ? (
              <span className="text-xs text-white/60 max-w-[320px] text-right leading-relaxed">
                Try it in desktop
              </span>
            ) : isLoggedIn ? (
              <Link
                href="/projects"
                className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                My Projects
              </Link>
            ) : (
              <>
                <button
                  onClick={(e) => handleButtonClick(e, () => openModal('login'))}
                  onTouchEnd={(e) => handleButtonTouchEnd(e, () => openModal('login'))}
                  className="touch-manipulation text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2"
                >
                  Sign in
                </button>
                <button
                  onClick={(e) => handleButtonClick(e, () => openModal('signup'))}
                  onTouchEnd={(e) => handleButtonTouchEnd(e, () => openModal('signup'))}
                  className="touch-manipulation px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                >
                  Try Recreate Studio
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, toggleMobileMenu)}
            onTouchEnd={(e) => handleButtonTouchEnd(e, toggleMobileMenu)}
            className="touch-manipulation md:hidden text-white/60 hover:text-white p-2 transition-colors"
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
                <button
                  type="button"
                  onClick={(e) => handleButtonClick(e, openPricingModal)}
                  onTouchEnd={(e) => handleButtonTouchEnd(e, openPricingModal)}
                  className="touch-manipulation text-left text-sm font-medium text-white/60 hover:text-white transition-colors py-1"
                >
                  Pricing
                </button>

                <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                  {restrictAuthAccess ? (
                    <p className="text-xs text-white/60 leading-relaxed">
                      On phone/tablet, you can explore the landing page only.
                      Sign in and Projects/Canvas/Studio are available on desktop.
                    </p>
                  ) : isLoggedIn ? (
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
                        onClick={(e) => handleButtonClick(e, () => { openModal('login'); setMobileOpen(false); })}
                        onTouchEnd={(e) => handleButtonTouchEnd(e, () => { openModal('login'); setMobileOpen(false); })}
                        className="touch-manipulation text-sm font-medium text-white/60 hover:text-white py-2 transition-colors"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={(e) => handleButtonClick(e, () => { openModal('signup'); setMobileOpen(false); })}
                        onTouchEnd={(e) => handleButtonTouchEnd(e, () => { openModal('signup'); setMobileOpen(false); })}
                        className="touch-manipulation px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
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

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  );
}

