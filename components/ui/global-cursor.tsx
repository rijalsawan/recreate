"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export function GlobalCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [pressed, setPressed] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const flushCursorPosition = useCallback(() => {
    rafRef.current = null;
    const el = cursorRef.current;
    if (!el) return;
    const { x, y } = cursorPosRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }, []);

  const queueCursorPosition = useCallback((x: number, y: number) => {
    cursorPosRef.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushCursorPosition);
  }, [flushCursorPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(pointer: fine)');
    const update = () => setEnabled(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    document.body.classList.add('global-custom-cursor');
    return () => {
      document.body.classList.remove('global-custom-cursor');
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const updateSuppressed = () => {
      setSuppressed(document.body.dataset.cursorOverride === '1');
    };

    updateSuppressed();
    const observer = new MutationObserver(updateSuppressed);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-cursor-override'],
    });

    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onPointerMove = (e: PointerEvent) => {
      queueCursorPosition(e.clientX, e.clientY);
      setVisible((prev) => (prev ? prev : true));
    };

    const onPointerLeave = () => setVisible(false);
    const onPointerDown = () => setPressed(true);
    const onPointerUp = () => setPressed(false);
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') setVisible(false);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    window.addEventListener('pointerout', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('pointerout', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, queueCursorPosition]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (!enabled) return null;

  const shouldShow = visible && !suppressed;

  return (
    <div
      ref={cursorRef}
      className={`fixed left-0 top-0 pointer-events-none z-220 transition-opacity duration-100 ease-out ${shouldShow ? 'opacity-100' : 'opacity-0'}`}
      style={{ left: 0, top: 0, willChange: 'transform', transform: 'translate3d(0px, 0px, 0) translate(-50%, -50%)' }}
      aria-hidden="true"
    >
      <div
        className="relative h-7 w-7 rounded-full border border-white/55 bg-black/35 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.85)] transition-transform duration-100 ease-out"
        style={{ transform: pressed ? 'scale(0.88)' : 'scale(1)' }}
      >
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </div>
    </div>
  );
}
