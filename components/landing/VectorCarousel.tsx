'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VectorCarouselProps {
  images: string[];
}

const SLIDE_LABELS = [
  'Complex editable vector graphics',
  'Illustration and character design',
  'Icon systems and iconography',
];

const FALLBACK_BG = [
  'linear-gradient(135deg, #1a0b0b 0%, #0f0f1a 100%)',
  'linear-gradient(135deg, #0b1a0b 0%, #0f0f1a 100%)',
  'linear-gradient(135deg, #0b0b1a 0%, #0f0f1a 100%)',
];

export default function VectorCarousel({ images }: VectorCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = images.length > 0 ? images.length : 3;

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 750);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % count), [current, count, goTo]);
  const prev = useCallback(() => goTo((current - 1 + count) % count), [current, count, goTo]);

  useEffect(() => {
    timerRef.current = setTimeout(next, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, next]);

  const prevIndex = (current - 1 + count) % count;
  const nextIndex = (current + 1) % count;

  const renderPanel = (activeIndex: number, dimmed: boolean, flexClass: string) => (
    <div className={`relative ${flexClass} rounded-xl overflow-hidden flex-shrink-0`}>
      {images.length > 0
        ? images.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === activeIndex ? 1 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))
        : FALLBACK_BG.map((bg, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === activeIndex % 3 ? 1 : 0, background: bg }}
            />
          ))
      }
      {dimmed && <div className="absolute inset-0 bg-black/55 pointer-events-none transition-opacity duration-700" />}
    </div>
  );

  return (
    <section className="bg-black py-16 overflow-hidden">
      <div className="text-center mb-10 px-6">
        <h2 className="font-display uppercase text-white leading-[0.88]"
          style={{ fontSize: 'clamp(2.2rem,5.5vw,5rem)' }}>
          <em className="font-black italic">UNMATCHED</em>
          <br />
          <span className="font-bold not-italic">VECTOR GENERATION</span>
        </h2>
      </div>

      <div
        className="flex items-stretch gap-2 px-3 mx-auto"
        style={{ height: 'clamp(260px, 42vw, 580px)', maxWidth: '1440px' }}
      >
        {renderPanel(prevIndex, true, 'flex-[0.85]')}
        {renderPanel(current, false, 'flex-[2.3]')}
        {renderPanel(nextIndex, true, 'flex-[0.85]')}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3.5">
        <p className="text-white font-medium text-sm">{SLIDE_LABELS[current % SLIDE_LABELS.length]}</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={prev}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />
            ))}
          </div>
          <button type="button" onClick={next}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
