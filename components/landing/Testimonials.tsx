'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap, ScrollTrigger } from '@/lib/gsap';

interface TestimonialsProps {
  avatars: string[];
}

const TESTIMONIALS = [
  {
    name: 'Jordan Kim',
    role: 'Creative Director, Forma',
    quote:
      'Recreate cut our concept-to-asset pipeline from 3 days to 20 minutes. The Recraft V4 model alone is worth the subscription — the quality at export is genuinely indistinguishable from custom illustration work.',
  },
  {
    name: 'Priya Nair',
    role: 'Product Designer, Artboard',
    quote:
      "The inpainting is the best I've used anywhere. I can mask a background, replace it, and tweak until it's pixel-perfect — all without leaving the workspace. It feels like Photoshop if Photoshop didn't hate you.",
  },
  {
    name: 'Marcus Webb',
    role: 'Founder, Visually Studio',
    quote:
      'We use Recreate for every client deliverable now. The style consistency across a batch of 40+ images is something I couldn\'t achieve manually in a week. We ship the same thing in an afternoon.',
  },
] as const;

export default function Testimonials({ avatars }: TestimonialsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.matchMedia({
        '(prefers-reduced-motion: no-preference)': () => {
          const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

          gsap.from(cards, {
            y: 30,
            opacity: 0,
            stagger: 0.15,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          });
        },
      });

      setTimeout(() => ScrollTrigger.refresh(), 500);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#080810] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-white text-center mb-16">
          Loved by creators
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => {
            const avatarUrl = avatars[i] ?? null;
            const initials = t.name
              .split(' ')
              .map((n) => n[0])
              .join('');

            return (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="bg-[#0f0f1a] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4"
                style={{ willChange: 'transform' }}
              >
                <p className="text-white/60 text-sm leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={t.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-violet-600/25 flex items-center justify-center text-violet-300 text-xs font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
