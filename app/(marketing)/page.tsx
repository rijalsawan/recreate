'use client';

import React, { useEffect, useState } from 'react';
import Hero from '@/components/landing/Hero';
import PromptReveal from '@/components/landing/PromptReveal';
import GalleryCarousel from '@/components/landing/GalleryCarousel';
import VectorCarousel from '@/components/landing/VectorCarousel';
import PhotorealCarousel from '@/components/landing/PhotorealCarousel';
import ConsistentStylesGrid from '@/components/landing/ConsistentStylesGrid';
import TestimonialsScroller from '@/components/landing/TestimonialsScroller';
import StudioCTA from '@/components/landing/StudioCTA';
import { cloudinaryOptimizedUrl } from '@/lib/utils';

type LandingData = {
  'hero-1': string | null;
  'hero-2': string | null;
  'hero-3': string | null;
  'prompt-reveal': string | null;
  'gallery-1': string | null;
  'gallery-2': string | null;
  'gallery-3': string | null;
  'vector-1': string | null;
  'vector-2': string | null;
  'vector-3': string | null;
  'photoreal-1': string | null;
  'photoreal-2': string | null;
  'photoreal-3': string | null;
  'styles-1': string | null;
  'styles-2': string | null;
  'styles-3': string | null;
  'styles-4': string | null;
  'styles-5': string | null;
  'styles-6': string | null;
  'styles-7': string | null;
  'styles-8': string | null;
  'styles-9': string | null;
  'studio-preview': string | null;
};

const EMPTY_DATA: LandingData = {
  'hero-1': null, 'hero-2': null, 'hero-3': null,
  'prompt-reveal': null,
  'gallery-1': null, 'gallery-2': null, 'gallery-3': null,
  'vector-1': null, 'vector-2': null, 'vector-3': null,
  'photoreal-1': null, 'photoreal-2': null, 'photoreal-3': null,
  'styles-1': null, 'styles-2': null, 'styles-3': null,
  'styles-4': null, 'styles-5': null, 'styles-6': null,
  'styles-7': null, 'styles-8': null, 'styles-9': null,
  'studio-preview': null,
};

function compact(v: (string | null)[]): string[] {
  return v.filter((x): x is string => x !== null);
}

export default function LandingPage() {
  const [data, setData] = useState<LandingData>(EMPTY_DATA);

  useEffect(() => {
    fetch('/api/landing-images')
      .then((res) => res.json())
      .then((d: LandingData) => setData(d))
      .catch(() => {});
  }, []);

  const heroImages     = compact([data['hero-1'], data['hero-2'], data['hero-3']]);
  const galleryImages  = compact([data['gallery-1'], data['gallery-2'], data['gallery-3']]);
  const vectorImages   = compact([data['vector-1'], data['vector-2'], data['vector-3']]);
  const photorealImages = compact([data['photoreal-1'], data['photoreal-2'], data['photoreal-3']]);
  const stylesImages   = compact([
    data['styles-1'], data['styles-2'], data['styles-3'],
    data['styles-4'], data['styles-5'], data['styles-6'],
    data['styles-7'], data['styles-8'], data['styles-9'],
  ]);

  const heroOptimized      = heroImages.map((u) => cloudinaryOptimizedUrl(u));
  const galleryOptimized   = galleryImages.map((u) => cloudinaryOptimizedUrl(u));
  const vectorOptimized    = vectorImages.map((u) => cloudinaryOptimizedUrl(u));
  const photorealOptimized = photorealImages.map((u) => cloudinaryOptimizedUrl(u));
  const stylesOptimized    = stylesImages.map((u) => cloudinaryOptimizedUrl(u));
  const promptReveal       = cloudinaryOptimizedUrl(data['prompt-reveal'] ?? '');
  const studioPreview      = data['studio-preview'] ? cloudinaryOptimizedUrl(data['studio-preview']) : null;

  return (
    <>
      <Hero images={heroOptimized} />
      <PromptReveal image={promptReveal || null} />
      <GalleryCarousel images={galleryOptimized} />
      <VectorCarousel images={vectorOptimized} />
      <PhotorealCarousel images={photorealOptimized} />
      <ConsistentStylesGrid images={stylesOptimized} />
      <TestimonialsScroller />
      <StudioCTA screenshot={studioPreview} />
    </>
  );
}
