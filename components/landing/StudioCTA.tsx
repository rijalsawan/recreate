'use client';

import React from 'react';
import { useAuthModal } from '@/stores/useAuthModal';

interface StudioCTAProps {
  screenshot: string | null;
}

export default function StudioCTA({ screenshot }: StudioCTAProps) {
  const { openModal } = useAuthModal();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#6d3bef' }}
    >
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-0 text-center">
        {/* Headline */}
        <h2
          className="font-display font-black uppercase text-white leading-[0.88] mb-5"
          style={{ fontSize: 'clamp(2.6rem, 7vw, 6rem)' }}
        >
          TRY IN{' '}
          <em className="italic">RECREATE</em>
          <br />
          <em className="italic">STUDIO</em>
        </h2>

        <p className="text-white/75 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-8">
          The creator&apos;s platform for generating and editing images, vectors,
          and mockups with frontier AI models.
        </p>

        <button
          type="button"
          onClick={() => openModal('signup')}
          className="inline-flex items-center h-12 px-8 rounded-full bg-black text-white font-semibold text-sm hover:bg-neutral-900 transition-colors shadow-lg mb-14"
        >
          Try it free
        </button>

        {/* App screenshot */}
        <div className="relative mx-auto" style={{ maxWidth: '760px' }}>
            <img
              src={"/pi.png"}
              alt="Recreate Studio interface"
              className="w-full rounded-t-2xl shadow-2xl block"
              loading="lazy"
            />
        </div>
      </div>
    </section>
  );
}
