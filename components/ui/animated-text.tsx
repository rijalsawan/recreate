"use client";

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AnimationPhase = 'typing' | 'holding' | 'deleting';

interface AnimatedWordRotatorProps {
  words: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  holdDuration?: number;
  showCaret?: boolean;
}

export const AnimatedWordRotator = ({
  words,
  className,
  typingSpeed = 74,
  deletingSpeed = 40,
  holdDuration = 1600,
  showCaret = true,
}: AnimatedWordRotatorProps) => {
  const prefersReducedMotion = useReducedMotion();
  const safeWords = useMemo(() => words.filter((word) => word.trim().length > 0), [words]);

  const [wordIndex, setWordIndex] = useState(0);
  const [displayedWord, setDisplayedWord] = useState('');
  const [phase, setPhase] = useState<AnimationPhase>('typing');

  const longestWord = useMemo(() => {
    return safeWords.reduce((max, word) => (word.length > max.length ? word : max), '');
  }, [safeWords]);

  useEffect(() => {
    if (safeWords.length === 0) return;
    if (prefersReducedMotion) {
      setDisplayedWord(safeWords[0]);
      return;
    }

    const activeWord = safeWords[wordIndex % safeWords.length];

    const timeout = setTimeout(() => {
      if (phase === 'typing') {
        if (displayedWord.length < activeWord.length) {
          setDisplayedWord(activeWord.slice(0, displayedWord.length + 1));
          return;
        }
        setPhase('holding');
        return;
      }

      if (phase === 'holding') {
        setPhase('deleting');
        return;
      }

      if (displayedWord.length > 0) {
        setDisplayedWord(activeWord.slice(0, displayedWord.length - 1));
        return;
      }

      setWordIndex((prev) => (prev + 1) % safeWords.length);
      setPhase('typing');
    }, phase === 'typing' ? typingSpeed : phase === 'holding' ? holdDuration : deletingSpeed);

    return () => clearTimeout(timeout);
  }, [deletingSpeed, displayedWord, holdDuration, phase, prefersReducedMotion, safeWords, typingSpeed, wordIndex]);

  if (safeWords.length === 0) {
    return null;
  }

  return (
    <span className={cn('inline-flex items-center align-baseline', className)}>
      <span className="sr-only">{safeWords.join(', ')}</span>
      <span className="relative inline-grid">
        <span aria-hidden="true" className="invisible whitespace-nowrap select-none">
          {longestWord}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-emerald-200"
        >
          {prefersReducedMotion ? safeWords[0] : displayedWord}
        </span>
      </span>
      {showCaret && !prefersReducedMotion && (
        <motion.span
          aria-hidden="true"
          className="ml-1 inline-block w-[2px] h-[0.95em] rounded-full bg-cyan-200"
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </span>
  );
};
