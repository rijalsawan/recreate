'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryCarouselProps {
  images: string[];
}

const SLIDE_LABELS = [
  'Production-ready shots',
  'Brand campaign visuals',
  'Concept visualization',
];

const FALLBACK_BG = [
  'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
  'linear-gradient(135deg, #0f1a1a 0%, #0f0f1a 100%)',
  'linear-gradient(135deg, #1a0f1a 0%, #0f0f1a 100%)',
];

export default function GalleryCarousel({ images }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchBlockedRef = useRef(false);
  const lastTouchTsRef = useRef(0);
  const slides: Array<{ key: string; image?: string; background?: string }> = images.length > 0
    ? images.map((src, index) => ({ key: `image-${index}-${src}`, image: src }))
    : FALLBACK_BG.map((background, index) => ({ key: `fallback-${index}`, background }));
  const count = slides.length;

  const goTo = useCallback((index: number) => {
    if (count <= 0) return;
    const normalized = ((index % count) + count) % count;
    setCurrent(normalized);
  }, [count]);

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

  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setTimeout(next, 5500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, next, count]);

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

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, a, input, textarea, select, [role="button"]'));
  };

  const prevIndex = (current - 1 + count) % count;
  const nextIndex = (current + 1) % count;

  const renderPanel = (activeIndex: number, dimmed: boolean, flexClass: string) => (
    <div className={`relative ${flexClass} rounded-xl overflow-hidden shrink-0`}>
      <div
        className={`flex h-full w-full ${prefersReducedMotion ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
        style={{
          width: `${count * 100}%`,
          transform: `translate3d(-${activeIndex * (100 / count)}%, 0, 0)`,
        }}
      >
        {slides.map((slide) => (
          <div key={slide.key} className="relative h-full shrink-0" style={{ width: `${100 / count}%` }}>
            {slide.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.image} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="absolute inset-0" style={{ background: slide.background }} />
            )}
          </div>
        ))}
      </div>
      {dimmed && <div className="absolute inset-0 bg-black/55 pointer-events-none transition-opacity duration-700" />}
    </div>
  );

  return (
    <section className="bg-black py-16 overflow-hidden">
      <div className="text-center mb-10 px-6">
        <h2 className="font-display uppercase text-white leading-[0.88]"
          style={{ fontSize: 'clamp(1.7rem,5.5vw,5rem)' }}>
          <em className="font-black italic">DESIGN ASSETS</em>
          <br />
          <span className="font-bold not-italic">WITH TASTE BUILT IN</span>
        </h2>
      </div>

      <div
        className="flex items-stretch gap-2 px-3 mx-auto"
        style={{ height: 'clamp(260px, 42vw, 580px)', maxWidth: '1440px', touchAction: 'pan-y' }}
        onTouchStart={(e) => {
          touchBlockedRef.current = isInteractiveTarget(e.target);
          if (touchBlockedRef.current) {
            touchStartX.current = null;
            return;
          }
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchBlockedRef.current || isInteractiveTarget(e.target)) {
            touchStartX.current = null;
            touchBlockedRef.current = false;
            return;
          }
          if (touchStartX.current === null) return;
          const endX = e.changedTouches[0]?.clientX;
          if (typeof endX !== 'number') {
            touchStartX.current = null;
            touchBlockedRef.current = false;
            return;
          }
          const diff = touchStartX.current - endX;
          if (Math.abs(diff) > 40) { if (diff > 0) next(); else prev(); }
          touchStartX.current = null;
          touchBlockedRef.current = false;
        }}
        onTouchCancel={() => {
          touchStartX.current = null;
          touchBlockedRef.current = false;
        }}
      >
        {renderPanel(prevIndex, true, 'flex-[0.85]')}
        {renderPanel(current, false, 'flex-[2.3]')}
        {renderPanel(nextIndex, true, 'flex-[0.85]')}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3.5">
        <p className="text-white font-medium text-sm">{SLIDE_LABELS[current % SLIDE_LABELS.length]}</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={(e) => handleButtonClick(e, prev)}
            onTouchEnd={(e) => handleButtonTouchEnd(e, prev)}
            className="touch-manipulation w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <button key={i} type="button" onClick={(e) => handleButtonClick(e, () => goTo(i))}
                onTouchEnd={(e) => handleButtonTouchEnd(e, () => goTo(i))}
                aria-label={`Slide ${i + 1}`}
                className={`touch-manipulation h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />
            ))}
          </div>
          <button type="button" onClick={(e) => handleButtonClick(e, next)}
            onTouchEnd={(e) => handleButtonTouchEnd(e, next)}
            className="touch-manipulation w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
