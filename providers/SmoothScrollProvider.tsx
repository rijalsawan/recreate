'use client';

import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from '@/lib/gsap';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      allowNestedScroll: true,
    });

    lenisRef.current = lenis;

    const tickerCb = (time: number) => {
      lenis.raf(time * 1000);
    };

    const handleBodyLockChange = (event: Event) => {
      const { detail } = event as CustomEvent<{ locked?: boolean }>;
      if (detail?.locked) {
        lenis.stop();
        return;
      }

      lenis.start();
    };

    const initialLockCount = Number(document.body.dataset.scrollLockCount || '0');
    if (initialLockCount > 0) {
      lenis.stop();
    }

    gsap.ticker.add(tickerCb);
    window.addEventListener('app:body-scroll-lock-change', handleBodyLockChange as EventListener);

    return () => {
      window.removeEventListener('app:body-scroll-lock-change', handleBodyLockChange as EventListener);
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
