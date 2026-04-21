"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, ChevronRight, Wand2, Layers, Download, Check, Sparkles, Play, Image as ImageIcon, Paintbrush, MousePointer2 } from 'lucide-react';
import { TOOLS_LIST } from '@/config/tools.config';
import * as LucideIcons from 'lucide-react';
import { AnimatedWordRotator } from '@/components/ui/animated-text';
import { useAuthModal } from '@/stores/useAuthModal';
import { PUBLIC_PLAN_CARDS } from '@/lib/plans';

/* --- Quick Animation Helpers (Mimicking Reactbits) --- */
const FadeIn = ({ children, delay = 0, className }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

const BlurIn = ({ children, delay = 0, className }: any) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

/* --- Page Sections --- */

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const { openModal } = useAuthModal();

  return (
    <div className="relative overflow-hidden selection:bg-primary/30">
      
      {/* Aurora / Background Mesh */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px] opacity-50 mix-blend-screen" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[120px] opacity-40 mix-blend-screen" />
      </div>

      {/* SECTION 1 — HERO */}
      <section className="relative z-10 pt-32 pb-24 overflow-hidden min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 flex flex-col items-start gap-8 relative z-20">
              <BlurIn delay={0.1}>
                <div className="group cursor-pointer inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-white/90 tracking-wide">Introducing Recraft V4 Pro</span>
                  <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                </div>
              </BlurIn>

              <BlurIn delay={0.3} className="space-y-4">
                <h1 className="text-[3.5rem] lg:text-display leading-[1.05] font-display font-bold tracking-tight text-white">
                  The AI suite for
                  <br />
                  <AnimatedWordRotator words={['Designers.', 'Marketers.', 'Agencies.', 'Creators.']} />
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-light">
                  A radically new workspace combining 15 professional generation, inpainting, and vectorization tools. No complex prompting required.
                </p>
              </BlurIn>

              <BlurIn delay={0.5} className="flex flex-wrap items-center gap-4 mt-2">
                <Button 
                  size="lg" 
                  className="h-14 px-8 rounded-full text-base font-bold shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition-transform hover:scale-105 group" 
                  onClick={() => openModal('signup')}
                >
                  Start for Free <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base font-bold border-white/20 hover:bg-white/10 group" asChild>
                  <Link href="#features">
                    <Play className="w-4 h-4 mr-2 fill-white text-white group-hover:scale-110 transition-transform" />
                    See it in action
                  </Link>
                </Button>
              </BlurIn>

              {/* Social Proof Stats */}
              <BlurIn delay={0.7} className="mt-8 pt-8 border-t border-border/50 w-full grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <h4 className="text-2xl font-display font-bold text-white tracking-tight">50k+</h4>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generations</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-2xl font-display font-bold text-white tracking-tight">15</h4>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pro Tools</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-2xl font-display font-bold text-white tracking-tight">V4</h4>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recraft Model</p>
                </div>
              </BlurIn>
            </div>

            {/* Right Column Showcase - Professional Mockup UI */}
            <div className="lg:col-span-6 relative h-[600px] w-full hidden md:flex items-center justify-center">
              
              {/* Main Image Plate */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 40 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 80, damping: 20 }}
                className="absolute z-20 w-full max-w-[460px] aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 bg-black translate-x-4"
              >
                <div className="absolute top-0 inset-x-0 h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2 backdrop-blur z-20">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://picsum.photos/seed/hero3/800/600" alt="UI workflow" className="w-full h-full object-cover opacity-90 mt-10" />
              </motion.div>

              {/* Floating Canvas UI Plate (Front Left) */}
              <motion.div 
                initial={{ opacity: 0, x: -50, y: 50 }} 
                animate={{ opacity: 1, x: 0, y: 0 }} 
                transition={{ duration: 1, delay: 0.6, type: "spring" }}
                className="absolute z-30 bottom-12 -left-4 w-[280px] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-elevated backdrop-blur-xl"
              >
                <div className="p-3 border-b border-border/50 flex justify-between items-center bg-black/40">
                  <span className="text-xs font-bold text-white flex items-center gap-2"><Paintbrush className="w-3 h-3 text-secondary"/> Mask Drawing</span>
                </div>
                <div className="p-4 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://picsum.photos/seed/hero2/400/300" alt="Inpainting" className="w-full rounded-lg grayscale-[30%] opacity-80" />
                  <svg className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] text-secondary opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M20 20 Q40 50 60 20 Q80 80 20 80 Z" fill="currentColor" filter="blur(6px)" />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full border border-white/10 shadow-lg">
                    <MousePointer2 className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
              </motion.div>

              {/* Floating Tool Palette (Top Right) */}
              <motion.div 
                initial={{ opacity: 0, x: 50, y: -50 }} 
                animate={{ opacity: 1, x: 0, y: 0 }} 
                transition={{ duration: 1, delay: 0.8, type: "spring" }}
                className="absolute z-30 top-16 -right-6 w-[200px] rounded-2xl shadow-[0_0_50px_rgba(124,58,237,0.15)] border border-primary/30 bg-background/80 backdrop-blur-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-white">Generate</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-transparent hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Inpaint Area</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-transparent hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                  <LucideIcons.Combine className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">Vectorize SVG</span>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — TOOL SHOWCASE (Bento Grid / Advanced Marquee Concept) */}
      <section id="tools" className="py-32 bg-background border-y border-border/50 relative overflow-hidden">
        {/* Glow Layer */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center mb-16 relative z-10">
          <FadeIn>
            <h2 className="text-[2.75rem] font-display font-bold text-white mb-4 tracking-tight">Everything you need to create.</h2>
            <p className="text-xl text-muted-foreground font-light">From raw idea to production-ready asset in minutes.</p>
          </FadeIn>
        </div>

        {/* Diagonal Dual Marquee Wrapper */}
        <div className="relative w-full flex flex-col gap-6 overflow-hidden -mx-4 pb-12 pt-4 hidden sm:flex" style={{ perspective: "1000px" }}>
          
          <div className="absolute left-0 top-0 w-48 h-full bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
          
          {/* Row 1 - Left to Right */}
          <motion.div 
            animate={{ x: ["-50%", "0%"] }} 
            transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            className="flex gap-6 px-4 w-max hover:[animation-play-state:paused]"
            style={{ transformStyle: "preserve-3d", transform: "rotateX(5deg) rotateY(-2deg) rotateZ(-1deg)" }}
          >
            {[...TOOLS_LIST.slice(0, 8), ...TOOLS_LIST.slice(0, 8)].map((tool, i) => {
               const IconNames: Record<string, any> = {
                  image: LucideIcons.Image,
                  copy: LucideIcons.Copy,
                  paintbrush: LucideIcons.Paintbrush,
                  layers: LucideIcons.Layers,
                  'image-plus': LucideIcons.ImagePlus,
                  eraser: LucideIcons.Eraser,
                  vector: LucideIcons.Combine,
                  scissors: LucideIcons.Scissors,
                  maximize: LucideIcons.Maximize,
                  shuffle: LucideIcons.Shuffle,
                  compass: LucideIcons.Compass,
                };
                const Icon = IconNames[tool.icon] || LucideIcons.Box;

              return (
                <Link key={`r1-${tool.id}-${i}`} href={tool.route} className="group relative flex-shrink-0 w-80 bg-surface/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:bg-surface hover:border-primary/50 hover:shadow-[0_20px_40px_-15px_rgba(124,58,237,0.3)] hover:-translate-y-2">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Icon className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white mb-2 tracking-wide group-hover:text-primary-foreground transition-colors">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{tool.description}</p>
                </Link>
              );
            })}
          </motion.div>

          {/* Row 2 - Right to Left */}
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ duration: 45, ease: "linear", repeat: Infinity }}
            className="flex gap-6 px-4 w-max hover:[animation-play-state:paused]"
            style={{ transformStyle: "preserve-3d", transform: "rotateX(5deg) rotateY(2deg) rotateZ(1deg)" }}
          >
            {[...TOOLS_LIST.slice(6, 14), ...TOOLS_LIST.slice(6, 14)].map((tool, i) => {
               const IconNames: Record<string, any> = {
                  image: LucideIcons.Image,
                  copy: LucideIcons.Copy,
                  paintbrush: LucideIcons.Paintbrush,
                  layers: LucideIcons.Layers,
                  'image-plus': LucideIcons.ImagePlus,
                  eraser: LucideIcons.Eraser,
                  vector: LucideIcons.Combine,
                  scissors: LucideIcons.Scissors,
                  maximize: LucideIcons.Maximize,
                  shuffle: LucideIcons.Shuffle,
                  compass: LucideIcons.Compass,
                };
                const Icon = IconNames[tool.icon] || LucideIcons.Box;

              return (
                <Link key={`r2-${tool.id}-${i}`} href={tool.route} className="group relative flex-shrink-0 w-80 bg-surface/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:bg-surface hover:border-secondary/50 hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.3)] hover:-translate-y-2">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center text-secondary border border-secondary/20 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Icon className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white mb-2 tracking-wide group-hover:text-primary-foreground transition-colors">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{tool.description}</p>
                </Link>
              );
            })}
          </motion.div>
        </div>

        {/* Mobile View - Grid instead of complex marquee */}
        <div className="sm:hidden grid grid-cols-1 gap-4 px-6 relative z-10">
           {TOOLS_LIST.slice(0, 4).map((tool, i) => {
              const IconNames: Record<string, any> = {
                image: LucideIcons.Image, copy: LucideIcons.Copy, paintbrush: LucideIcons.Paintbrush, layers: LucideIcons.Layers, 'image-plus': LucideIcons.ImagePlus, eraser: LucideIcons.Eraser, vector: LucideIcons.Combine, scissors: LucideIcons.Scissors, maximize: LucideIcons.Maximize, shuffle: LucideIcons.Shuffle, compass: LucideIcons.Compass,
              };
              const Icon = IconNames[tool.icon] || LucideIcons.Box;
              return (
                <Link key={`mob-${tool.id}-${i}`} href={tool.route} className="bg-surface/50 border border-white/5 rounded-2xl p-5 hover:border-primary/40 transition-colors flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>
                  </div>
                </Link>
              )
           })}
           <Button variant="outline" className="w-full mt-4" asChild>
             <Link href="/dashboard">View All 15 Tools</Link>
           </Button>
        </div>
      </section>

      {/* SECTION 3 — DEEP FEATURE SPOTLIGHT */}
      <section id="features" className="py-32 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-32">
          
          {/* Block A */}
          <FadeIn className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative rounded-2xl border border-border bg-surface aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://picsum.photos/seed/gen/800/800" alt="Generated result" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute bottom-6 left-6 right-6 z-20 bg-background/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl">
                 <p className="text-sm font-mono text-muted-foreground">Prompt:</p>
                 <p className="text-white font-medium">A bioluminescent cyberpunk street market, cinematic lighting, highly detailed.</p>
              </div>
            </div>
            <div className="order-1 lg:order-2 flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-h2 font-display font-bold text-white">Generate Images from Text</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Experience the raw power of Recraft V4 Pro at 4MP resolution. Take total control over the output with multi-model support, precision style matching, and structural references.
              </p>
              <ul className="flex flex-col gap-3 mt-4">
                {['Industry-leading typography rendering', 'Photorealistic and stylized outputs', 'Unmatched prompt adherence'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* Block B */}
          <FadeIn className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary mb-2">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-h2 font-display font-bold text-white">Edit with Precision</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Leave Photoshop behind. Paint a mask directly on your canvas to seamlessly inpaint new elements, erase unwanted regions, or generate entirely new environments around your subject.
              </p>
              <Button variant="outline" className="w-fit mt-4 rounded-full group" asChild>
                <Link href="/edit/inpaint">Explore Inpainting <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></Link>
              </Button>
            </div>
            <div className="relative rounded-2xl border border-border bg-surface aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden p-8 flex items-center justify-center">
               <div className="relative w-full h-full rounded-xl border border-white/10 overflow-hidden shadow-2xl bg-black">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src="https://picsum.photos/seed/edit/800/800" alt="Inpaint Demo" className="w-full h-full object-cover" />
                 {/* Fake SVG Mask Overlay */}
                 <svg className="absolute inset-0 w-full h-full text-secondary opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M40 30 Q50 60 70 40 Q80 20 60 10 Z" fill="currentColor" filter="blur(4px)" />
                 </svg>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 whitespace-nowrap z-10">
                   "Add a vintage camera"
                 </div>
               </div>
            </div>
          </FadeIn>

          {/* Block C */}
          <FadeIn className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative rounded-2xl border border-border bg-surface aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden p-8 flex flex-col justify-center gap-6">
              <div className="flex-1 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://picsum.photos/seed/vector/800/400" className="w-full h-full object-cover blur-[2px] opacity-70" alt="raster base" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg border border-white/10 font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/3 text-center">Raster</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                 <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 lg:rotate-0" />
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-success/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-success/5 relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="bg-success text-black font-bold px-4 py-2 rounded-lg border border-success/80 font-mono text-xs uppercase tracking-wider w-1/3 text-center shadow-lg">Vector SVG</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center text-success mb-2">
                <LucideIcons.Combine className="w-6 h-6" />
              </div>
              <h2 className="text-h2 font-display font-bold text-white">Vector & Upscale</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Take your designs off the screen and into production. Use the world's only enterprise-grade AI vectorizer to turn any raster image into infinitely scalable SVGs. Need pixels? Run our Crisp Upscale to achieve 4k+ print-ready resolution instantly.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SECTION 4 — HOW IT WORKS */}
      <section className="py-24 bg-surface border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-h2 font-display font-bold text-white mb-4">Three steps to production.</h2>
            <p className="text-lg text-muted-foreground">A clean workflow built for speed.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-[28px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            {[
              { step: 1, title: 'Upload or Prompt', desc: 'Start with a raw idea, a sketch, or an existing asset.', icon: Wand2 },
              { step: 2, title: 'Choose Your Tool', desc: 'Select from 15 purpose-built AI engines to refine the vision.', icon: Layers },
              { step: 3, title: 'Export High-Res', desc: 'Download production-ready JPGs, transparent PNGs, or SVGs.', icon: Download }
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.2} className="relative z-10 flex flex-col items-center text-center p-8 rounded-2xl bg-elevated border border-border group hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold text-xl mb-6 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — PRICING */}
      <section id="pricing" className="py-32 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-h2 font-display font-bold text-white mb-4">Simple, transparent pricing.</h2>
            <p className="text-lg text-muted-foreground">Credits for every scale. No hidden fees.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PUBLIC_PLAN_CARDS.map((plan, i) => (
              <FadeIn key={plan.slug} delay={i * 0.15} className={cn(
                "flex flex-col p-8 rounded-3xl border transition-colors relative",
                plan.highlighted ? "bg-surface border-primary shadow-[0_0_40px_-15px_rgba(124,58,237,0.3)]" : "bg-elevated border-border"
              )}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold text-white">
                    {plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}`}
                  </span>
                  {plan.monthlyPrice > 0 && <span className="text-muted-foreground text-base">/mo</span>}
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-8 inline-block w-fit text-sm font-medium text-primary">
                  ⚡ {plan.creditsLabel}
                </div>
                <ul className="flex flex-col gap-4 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white">
                      <Check className="w-5 h-5 text-primary shrink-0 -mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className={cn("w-full rounded-full h-12 font-bold", plan.highlighted ? 'text-base shadow-lg shadow-primary/20' : '')}
                  onClick={() => openModal('signup')}
                >
                  {plan.ctaLabel}
                </Button>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — FINAL CTA */}
      <section className="py-32 relative z-10 border-t border-border overflow-hidden">
        <div className="absolute inset-0 bg-primary/10"></div>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-20">
          <h2 className="text-display font-display font-bold text-white mb-6 leading-tight">Ready to build?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of designers generating production-ready assests in seconds, not hours.
          </p>
          <Button size="lg" className="h-16 px-10 rounded-full text-lg font-bold shadow-[0_0_40px_-5px_rgba(124,58,237,0.5)] transition-transform hover:scale-105" asChild>
            <Link href="/dashboard">Create Your Free Account <ArrowRight className="ml-2 w-6 h-6" /></Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
