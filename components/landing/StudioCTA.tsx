'use client';

import React, { useRef } from 'react';
import { useAuthModal } from '@/stores/useAuthModal';
import { useRestrictedDevice } from '@/hooks/useRestrictedDevice';

interface StudioCTAProps {
  screenshot: string | null;
}

export default function StudioCTA({ screenshot }: StudioCTAProps) {
  const { openModal } = useAuthModal();
  const { isRestrictedDevice, isDeviceCheckReady } = useRestrictedDevice();
  const restrictAuthAccess = !isDeviceCheckReady || isRestrictedDevice;
  const lastTouchTsRef = useRef(0);

  const handleTryFreeClick = () => {
    if (restrictAuthAccess) return;
    if (Date.now() - lastTouchTsRef.current < 600) return;
    openModal('signup');
  };

  const handleTryFreeTouchEnd = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (restrictAuthAccess) return;
    lastTouchTsRef.current = Date.now();
    event.preventDefault();
    openModal('signup');
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#6d3bef' }}
    >
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-0 text-center">
        {/* Headline */}
        <h2
          className="font-display font-black uppercase text-white leading-[0.88] mb-5"
          style={{ fontSize: 'clamp(1.7rem, 7vw, 6rem)' }}
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
          onClick={handleTryFreeClick}
          onTouchEnd={handleTryFreeTouchEnd}
          disabled={restrictAuthAccess}
          className={`touch-manipulation inline-flex items-center h-12 px-8 rounded-full text-white font-semibold text-sm transition-colors shadow-lg mb-3 ${
            restrictAuthAccess
              ? 'bg-white/20 text-white/70 cursor-not-allowed'
              : 'bg-black hover:bg-neutral-900'
          }`}
        >
          {restrictAuthAccess ? 'Desktop-only Access' : 'Try it free'}
        </button>

        {restrictAuthAccess && (
          <p className="text-white/70 text-sm max-w-lg mx-auto leading-relaxed mb-11">
            You can browse this landing page on phone/tablet, but sign in and Projects/Canvas/Studio are desktop-only.
          </p>
        )}

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
