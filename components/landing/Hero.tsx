'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useAuthModal } from '@/stores/useAuthModal';
import Link from 'next/link';

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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openModal } = useAuthModal();

  const slides: Array<{ key: string; image?: string; background?: string }> = images.length > 0
    ? images.map((src, index) => ({ key: `image-${index}-${src}`, image: src }))
    : FALLBACK_GRADIENTS.map((background, index) => ({ key: `fallback-${index}`, background }));
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (count <= 0) return;
      const normalized = ((index % count) + count) % count;
      setCurrent(normalized);
    },
    [count],
  );

  const next = useCallback(() => goTo((current + 1) % count), [current, count, goTo]);
  const prev = useCallback(() => goTo((current - 1 + count) % count), [current, count, goTo]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || prefersReducedMotion) return;
    timerRef.current = setTimeout(next, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, count, next, prefersReducedMotion]);

  // Entrance animation — static text animates in once on mount
  useEffect(() => {
    if (prefersReducedMotion || !textRef.current) return;
    gsap.from(textRef.current, { y: 24, opacity: 0, duration: 0.9, delay: 0.35, ease: 'power3.out' });
  }, [prefersReducedMotion]);

  return (
    <section className="bg-black">
      {/* Push below fixed nav (h-16 = 64px) */}
      <div className="pt-16">
        {/* ── Announcement strip ─────────────────────────────────── */}
        <div className="bg-violet-600 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
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
            <div className="absolute inset-0 overflow-hidden">
              <div
                className={`flex h-full w-full ${prefersReducedMotion ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
                style={{
                  width: `${count * 100}%`,
                  transform: `translate3d(-${current * (100 / count)}%, 0, 0)`,
                }}
              >
                {slides.map((slide, i) => (
                  <div
                    key={slide.key}
                    aria-hidden={i !== current}
                    className="relative h-full shrink-0"
                    style={{ width: `${100 / count}%` }}
                  >
                    {slide.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.image}
                        alt=""
                        className="w-full h-full lg:object-contain max-sm:object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'low'}
                        decoding={i === 0 ? 'sync' : 'async'}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: slide.background }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gradient — helps legibility of bottom text */}
            <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/82 via-black/10 to-black/28" />

            {/* ── Static text — stays fixed across ALL slides ────── */}
            <div
              ref={textRef}
              className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-14 md:px-12 pointer-events-auto"
            >
              
              <h1
                className="font-display font-black uppercase italic text-white leading-[0.88] select-none"
                style={{ fontSize: 'clamp(2.6rem, 7vw, 5.8rem)' }}
              >
                {/* {/* donot change line 141 i ddid it manually for responsiveness */}
                <span className="max-sm:text-[2rem]">RECREATE</span>
                <br />
                <span className="not-italic font-bold tracking-tight">ANYTHING.</span><br />
                {/* donot change line 144 i ddid it manually for responsiveness */}
                <span className="max-sm:text-[2rem]">INSTANTLY.</span> 
              </h1>
              <p className="mt-4 text-white/65 text-sm md:text-base max-w-[320px] leading-relaxed select-none">
                The fastest way to generate, edit, and export production&#8209;quality visuals — from prompt to pixel.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/projects">
                <button
                  type="button"
                  className="h-11 px-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-[0_0_28px_-4px_rgba(124,58,237,0.75)]"
                >
                  Start creating
                </button>
                </Link>
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
