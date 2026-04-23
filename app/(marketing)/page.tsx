import React from 'react';
import Hero from '@/components/landing/Hero';
import PromptReveal from '@/components/landing/PromptReveal';
import GalleryCarousel from '@/components/landing/GalleryCarousel';
import VectorCarousel from '@/components/landing/VectorCarousel';
import PhotorealCarousel from '@/components/landing/PhotorealCarousel';
import ConsistentStylesGrid from '@/components/landing/ConsistentStylesGrid';
import TestimonialsScroller from '@/components/landing/TestimonialsScroller';
import StudioCTA from '@/components/landing/StudioCTA';
import { cloudinaryOptimizedUrl } from '@/lib/utils';
import { getLandingImages } from '@/lib/landing-images';

function compact(v: (string | null)[]): string[] {
  return v.filter((x): x is string => x !== null);
}

export default async function LandingPage() {
  const data = await getLandingImages();

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
