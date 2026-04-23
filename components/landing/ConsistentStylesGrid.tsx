'use client';

import React from 'react';

interface ConsistentStylesGridProps {
  images: string[];
}

const FALLBACK_COLORS = [
  '#1a0b2e', '#0d1a35', '#1a1a2e', '#0b1a0b',
  '#1a0b0b', '#1a1a0b', '#0b0b1a', '#1a0b1a', '#0b1a1a',
];

export default function ConsistentStylesGrid({ images }: ConsistentStylesGridProps) {
  const getImg = (i: number) => images[i] ?? null;
  const getFallback = (i: number) => FALLBACK_COLORS[i % FALLBACK_COLORS.length];

  const Cell = ({ index, className }: { index: number; className?: string }) => {
    const src = getImg(index);
    return (
      <div className={`rounded-xl overflow-hidden ${className ?? ''}`}
           style={src ? undefined : { background: getFallback(index) }}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
    );
  };

  return (
    <section className="bg-black py-20 px-4 sm:px-6 overflow-hidden">
      {/* Headline */}
      <div className="text-center mb-4 max-w-4xl mx-auto">
        <h2
          className="font-display font-black uppercase text-white leading-[0.9]"
          style={{ fontSize: 'clamp(2.4rem, 6.5vw, 6rem)' }}
        >
          CONSISTENT STYLES
          <br />
          <em className="italic">WITHOUT</em>{' '}
          <span className="not-italic">TRAINING</span>
        </h2>
        <p className="mt-4 text-white/50 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
          Creating a custom style is as easy as dropping in your images.
          Recreate instantly turns them into a reusable, editable style.
        </p>
      </div>

      {/* Bento grid — 5 cols, 2 rows, center spans 2 rows */}
      <div
        className="mx-auto mt-10"
        style={{ maxWidth: '1400px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 2.2fr 1fr 1fr',
            gridTemplateRows: 'clamp(130px, 18vw, 280px) clamp(130px, 18vw, 280px)',
            gap: '6px',
          }}
        >
          {/* Col 1 */}
          <Cell index={0} />
          <Cell index={1} />
          {/* Col 2 */}
          <Cell index={2} />
          <Cell index={3} />
          {/* Col 3 — large center, spans 2 rows */}
          <div className="rounded-xl overflow-hidden" style={{ gridRow: '1 / 3', background: getImg(4) ? undefined : getFallback(4) }}>
            {getImg(4) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getImg(4)!} alt="" className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          {/* Col 4 */}
          <Cell index={5} />
          <Cell index={6} />
          {/* Col 5 */}
          <Cell index={7} />
          <Cell index={8} />
        </div>
      </div>
    </section>
  );
}
