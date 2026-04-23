'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAuthModal } from '@/stores/useAuthModal';

interface CTASectionProps {
  hero: string[];
}

export default function CTASection({ hero }: CTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { openModal } = useAuthModal();

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.matchMedia({
        '(prefers-reduced-motion: no-preference)': () => {
          if (!contentRef.current) return;

          gsap.from(contentRef.current, {
            scale: 0.95,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const bgImage = hero[0] ?? null;

  return (
    <section
      ref={sectionRef}
      className="relative py-36 overflow-hidden bg-[#080810]"
    >
      {/* Background image */}
      {bgImage && (
        <div className="absolute inset-0">
          <Image
            src={bgImage}
            alt=""
            fill
            className="object-cover"
            priority={false}
          />
        </div>
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/75" />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center text-center px-6"
        style={{ willChange: 'transform' }}
      >
        <h2 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Start creating.
          <br />
          It&apos;s free.
        </h2>
        <p className="text-white/50 text-lg max-w-xl leading-relaxed mb-10">
          No credit card required. 100 free credits to explore every tool.
          Upgrade when you&apos;re ready.
        </p>
        <button
          onClick={() => openModal('signup')}
          className="px-10 py-4 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-all duration-200 shadow-[0_0_40px_-8px_rgba(124,58,237,0.8)]"
        >
          Get started for free
        </button>
      </div>
    </section>
  );
}
