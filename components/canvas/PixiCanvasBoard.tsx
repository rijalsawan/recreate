'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { usePixiCanvas } from '@/hooks/usePixiCanvas';
import type { PixiCanvasCallbacks } from '@/hooks/usePixiCanvas';
import type {
  CanvasImage,
  CanvasText,
  BrushStroke,
  ActiveTool,
  DrawMode,
} from '@/types/canvas';

// ── Props mirror page.tsx canvas state exactly ─────────────────────────────

export interface PixiCanvasBoardProps extends PixiCanvasCallbacks {
  // Data
  canvasImages: CanvasImage[];
  canvasTexts: CanvasText[];
  brushStrokes: BrushStroke[];

  // Selection
  selectedImageId: string | null;
  selectedTextId: string | null;
  selectedStrokeId: string | null;
  editingTextId: string | null;

  // Viewport (controlled by page.tsx, synced from PixiJS on interaction)
  zoom: number;
  panX: number;
  panY: number;

  // Tool state
  activeTool: ActiveTool;
  spaceHeld: boolean;
  drawMode: DrawMode;
  brushDrawColor: string;
  brushDrawSize: number;
  shapeFillEnabled: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────

// memo: page.tsx re-renders frequently (zoom/pan state etc.) — prevent cascading
// into PixiJS hooks on every re-render. Props use stable useCallback refs from page.tsx.
export const PixiCanvasBoard = memo(function PixiCanvasBoard(props: PixiCanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  // Text editing overlay state
  const [editingOverlay, setEditingOverlay] = useState<{
    id: string;
    screenX: number;
    screenY: number;
    screenW: number;
    screenH: number;
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: 'left' | 'center' | 'right';
    lineHeight: number;
    letterSpacing: number;
    opacity: number;
  } | null>(null);

  // Expose canvas element to hook after mount
  useEffect(() => {
    setCanvasEl(canvasRef.current);
  }, []);

  // ── Intercept text add request from hook ───────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number; clientX: number; clientY: number }>).detail;
      // Re-emit as a DOM event that page.tsx can listen to
      el.dispatchEvent(new CustomEvent('pixi:textadd', { detail, bubbles: true }));
    };
    el.addEventListener('pixi:addtext', handler);
    return () => el.removeEventListener('pixi:addtext', handler);
  }, []);

  // ── Text editing overlay management ───────────────────────────────────
  useEffect(() => {
    if (!props.editingTextId) {
      setEditingOverlay(null);
      return;
    }
    const txt = props.canvasTexts.find((t) => t.id === props.editingTextId);
    const el = canvasRef.current;
    if (!txt || !el) { setEditingOverlay(null); return; }

    const rect = el.getBoundingClientRect();
    const sx = txt.x * props.zoom + props.panX + rect.left;
    const sy = txt.y * props.zoom + props.panY + rect.top;
    const sw = txt.width * props.zoom;
    const sh = (txt.height ?? 40) * props.zoom;

    setEditingOverlay({
      id: txt.id,
      screenX: sx,
      screenY: sy,
      screenW: sw,
      screenH: sh,
      content: txt.content,
      fontFamily: txt.fontFamily,
      fontSize: txt.fontSize * props.zoom,
      fontWeight: txt.fontWeight,
      color: `#${txt.color}`,
      align: txt.align,
      lineHeight: txt.lineHeight,
      letterSpacing: txt.letterSpacing,
      opacity: txt.opacity / 100,
    });
  }, [props.editingTextId, props.canvasTexts, props.zoom, props.panX, props.panY]);

  // ── Pass all props + canvas element into hook ──────────────────────────
  usePixiCanvas({
    ...props,
    canvasEl,
  });

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editingOverlay) return;
      setEditingOverlay((prev) => prev ? { ...prev, content: e.target.value } : prev);
    },
    [editingOverlay],
  );

  const handleTextareaBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (!editingOverlay) return;
      const orig = props.canvasTexts.find((t) => t.id === editingOverlay.id)?.content ?? '';
      props.onEndEditText(editingOverlay.id, orig, e.currentTarget.value);
      setEditingOverlay(null);
    },
    [editingOverlay, props],
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape' && editingOverlay) {
        const orig = props.canvasTexts.find((t) => t.id === editingOverlay.id)?.content ?? '';
        props.onEndEditText(editingOverlay.id, orig, orig); // cancel — restore original
        setEditingOverlay(null);
      }
    },
    [editingOverlay, props],
  );

  return (
    <>
      {/* PixiJS canvas — fills the parent container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Text editing overlay — absolutely positioned over the canvas using screen coords */}
      {editingOverlay && (
        <textarea
          autoFocus
          value={editingOverlay.content}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          className="absolute z-50 bg-transparent border-none outline-none resize-none overflow-hidden pointer-events-auto"
          style={{
            left: editingOverlay.screenX,
            top: editingOverlay.screenY,
            width: editingOverlay.screenW,
            minHeight: editingOverlay.screenH,
            fontFamily: `'${editingOverlay.fontFamily}', sans-serif`,
            fontSize: editingOverlay.fontSize,
            fontWeight: editingOverlay.fontWeight,
            color: editingOverlay.color,
            textAlign: editingOverlay.align,
            lineHeight: editingOverlay.lineHeight,
            letterSpacing: editingOverlay.letterSpacing,
            opacity: editingOverlay.opacity,
            caretColor: editingOverlay.color,
          }}
        />
      )}
    </>
  );
});
