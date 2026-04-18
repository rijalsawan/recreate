"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useScroll,
  animate,
  type Variant,
} from "framer-motion";
import Image from "next/image";

/* ─── shared constants ─── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═══════════════════════════════════════════
   1. FadeUp
   ═══════════════════════════════════════════ */
interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  className,
}: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   2. RevealText
   ═══════════════════════════════════════════ */
interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}

export function RevealText({
  text,
  className,
  delay = 0,
  stagger = 0.05,
}: RevealTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  const words = text.split(" ");

  return (
    <span ref={ref} className={className} style={{ display: "inline" }}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ y: "110%" }}
            animate={isInView ? { y: "0%" } : { y: "110%" }}
            transition={{
              duration: 0.7,
              delay: delay + i * stagger,
              ease: EASE,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && (
            <span style={{ display: "inline-block", width: "0.3em" }}>&nbsp;</span>
          )}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════
   3. CountUp
   ═══════════════════════════════════════════ */
interface CountUpProps {
  from?: number;
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  separator?: boolean;
}

export function CountUp({
  from = 0,
  to,
  suffix = "",
  prefix = "",
  duration = 2,
  className,
  separator = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionVal = useMotionValue(from);
  const [display, setDisplay] = useState(
    separator ? from.toLocaleString() : String(from)
  );

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionVal, to, {
      duration,
      ease: EASE as unknown as [number, number, number, number],
      onUpdate: (v) => {
        const rounded = Math.round(v);
        setDisplay(separator ? rounded.toLocaleString() : String(rounded));
      },
    });
    return () => controls.stop();
  }, [isInView, motionVal, to, duration, separator]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════
   4. StaggerGrid
   ═══════════════════════════════════════════ */
interface StaggerGridProps {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}

export function StaggerGrid({
  children,
  stagger = 0.08,
  className,
}: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  const childArray = React.Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      {childArray.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={
            isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 32, scale: 0.96 }
          }
          transition={{ duration: 0.5, delay: i * stagger, ease: EASE }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   5. ParallaxImage
   ═══════════════════════════════════════════ */
interface ParallaxImageProps {
  src: string;
  alt: string;
  speed?: number;
  className?: string;
}

export function ParallaxImage({
  src,
  alt,
  speed = 0.15,
  className,
}: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${speed * 100}%`, `${speed * 100}%`]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className ?? ""}`}>
      <motion.div style={{ y }} className="relative w-full h-[110%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </div>
  );
}
