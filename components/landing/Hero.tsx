'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useAuthModal } from '@/stores/useAuthModal';

interface HeroProps {
  images: string[];
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #1a0b2e 0%, #080810 60%, #0d1a35 100%)',
  'linear-gradient(135deg, #0d1a35 0%, #080810 60%, #1a0b2e 100%)',
  'linear-gradient(135deg, #0b1e1a 0%, #080810 60%, #1a0b2e 100%)',
];

export default function Hero({ images }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openModal } = useAuthModal();

  const count = images.length > 0 ? images.length : 3;

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 800);
    },
    [isTransitioning],
  );

  const next = useCallback(() => goTo((current + 1) % count), [current, count, goTo]);
  const prev = useCallback(() => goTo((current - 1 + count) % count), [current, count, goTo]);

  // Auto-advance
  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setTimeout(next, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, count, next]);

  // Entrance animation — static text animates in once on mount
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !textRef.current) return;
    gsap.from(textRef.current, { y: 24, opacity: 0, duration: 0.9, delay: 0.35, ease: 'power3.out' });
  }, []);

  return (
    <section className="bg-black">
      {/* Push below fixed nav (h-16 = 64px) */}
      <div className="pt-16">
        {/* ── Announcement strip ─────────────────────────────────── */}
        <div className="bg-violet-600 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            <p className="text-white text-[12px] font-medium text-center leading-none">
              Powered by Recraft V4 + GPT Image 2 &mdash; Generate, edit, and export from one workspace
            </p>
          </div>
        </div>

        {/* ── Carousel card ──────────────────────────────────────── */}
        <div className="px-4 sm:px-8 md:px-10 pt-4 pb-10">
          <div
            className="relative rounded-[20px] overflow-hidden w-full"
            style={{ height: 'clamp(420px, calc(100svh - 168px), 920px)' }}
          >
            {/* ── Slides: only background changes per slide ─────── */}
            {images.length > 0
              ? images.map((src, i) => (
                  <div
                    key={src}
                    aria-hidden={i !== current}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === current ? 1 : 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                      decoding={i === 0 ? 'sync' : 'async'}
                    />
                  </div>
                ))
              : FALLBACK_GRADIENTS.map((bg, i) => (
                  <div
                    key={i}
                    aria-hidden={i !== current % 3}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === current % 3 ? 1 : 0, background: bg }}
                  />
                ))}

            {/* Gradient — helps legibility of bottom text */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/82 via-black/10 to-black/28" />

            {/* ── Static text — stays fixed across ALL slides ────── */}
            <div
              ref={textRef}
              className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-14 md:px-12 pointer-events-auto"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-3 font-medium select-none">
                AI Image Platform &mdash; Recreate Studio
              </p>
              <h1
                className="font-display font-black uppercase italic text-white leading-[0.88] select-none"
                style={{ fontSize: 'clamp(2.6rem, 7vw, 5.8rem)' }}
              >
                RECREATE<br />
                <span className="not-italic font-bold tracking-tight">ANYTHING.</span><br />
                INSTANTLY.
              </h1>
              <p className="mt-4 text-white/65 text-sm md:text-base max-w-[320px] leading-relaxed select-none">
                The fastest way to generate, edit, and export production&#8209;quality visuals — from prompt to pixel.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openModal('signup')}
                  className="h-11 px-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-[0_0_28px_-4px_rgba(124,58,237,0.75)]"
                >
                  Start creating
                </button>
                <button
                  type="button"
                  onClick={() => openModal('login')}
                  className="h-11 px-7 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  Get API
                </button>
              </div>
            </div>

            {/* ── Dots — bottom right ───────────────────────────── */}
            {count > 1 && (
              <div className="absolute bottom-5 right-8 md:right-12 z-10 flex gap-1.5 pointer-events-auto">
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/55'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* ── Arrows ───────────────────────────────────────────── */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous slide"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border border-white/12 bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 hover:border-white/25 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next slide"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border border-white/12 bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 hover:border-white/25 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
