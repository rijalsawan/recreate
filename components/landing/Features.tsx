'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap, ScrollTrigger } from '@/lib/gsap';

interface FeaturesProps {
  images: string[];
}

const FEATURES = [
  {
    headline: 'Generate stunning images with a single prompt',
    body: 'Describe your vision in plain language and watch it materialize. Our AI models — including Recraft V4 and GPT Image 2 — translate your ideas into production-ready visuals at any dimension, style, or format you need.',
    imageAlt: 'AI image generation preview',
  },
  {
    headline: 'Edit with precision. Iterate in seconds.',
    body: 'Mask regions, erase unwanted elements, replace backgrounds, and outpaint beyond the original frame — all without leaving the workspace. Every edit is non-destructive, composable, and reversible.',
    imageAlt: 'AI image editing tools in action',
  },
  {
    headline: 'Every style. Any format. Production ready.',
    body: 'Choose from dozens of curated styles or define your own. Export in PNG, JPEG, SVG, or WebP at any resolution. What you build is ready to ship the moment you download it.',
    imageAlt: 'Style and export options',
  },
] as const;

export default function Features({ images }: FeaturesProps) {
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.matchMedia({
        '(prefers-reduced-motion: no-preference)': () => {
          FEATURES.forEach((_, i) => {
            const textEl = textRefs.current[i];
            const imgEl = imageRefs.current[i];
            const sectionEl = sectionRefs.current[i];
            if (!textEl || !imgEl || !sectionEl) return;

            const isReversed = i % 2 === 1;

            // Text slides in from left (or right on reversed rows)
            gsap.from(textEl, {
              x: isReversed ? 60 : -60,
              opacity: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: sectionEl,
                start: 'top 80%',
                toggleActions: 'play none none none',
              },
            });

            // Image slides in from the opposite side
            gsap.from(imgEl, {
              x: isReversed ? -60 : 60,
              opacity: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: sectionEl,
                start: 'top 80%',
                toggleActions: 'play none none none',
              },
            });

            // Infinite float animation
            gsap.to(imgEl, {
              y: -8,
              duration: 4,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
            });
          });
        },
      });

      setTimeout(() => ScrollTrigger.refresh(), 500);
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" className="bg-[#080810]">
      {FEATURES.map((feature, i) => {
        const isReversed = i % 2 === 1;
        const imgUrl = images[i] ?? null;

        return (
          <div
            key={i}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            className={`max-w-7xl mx-auto px-6 lg:px-8 py-24 flex flex-col gap-16 items-center ${
              isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
            }`}
          >
            {/* Text side */}
            <div
              ref={(el) => {
                textRefs.current[i] = el;
              }}
              className="flex-1 max-w-xl"
              style={{ willChange: 'transform' }}
            >
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                {feature.headline}
              </h2>
              <p className="text-white/50 text-lg leading-relaxed">
                {feature.body}
              </p>
            </div>

            {/* Image side */}
            <div
              ref={(el) => {
                imageRefs.current[i] = el;
              }}
              className="flex-1 max-w-lg w-full"
              style={{ willChange: 'transform' }}
            >
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_-20px_rgba(124,58,237,0.25)]">
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={feature.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0f0f1a] flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/40" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
