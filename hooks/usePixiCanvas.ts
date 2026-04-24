'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { getPixiApp, destroyPixiApp } from '@/lib/pixi';
import { clearTextureCache } from '@/lib/textureCache';
import { PixiImageNode } from '@/components/canvas/pixi/PixiImageNode';
import { PixiTextNode } from '@/components/canvas/pixi/PixiTextNode';
import { PixiStrokeNode } from '@/components/canvas/pixi/PixiStrokeNode';
import { createCuller } from '@/hooks/usePixiCulling';
import type { HandleId } from '@/components/canvas/pixi/SelectionHandles';
import type {
  CanvasImage,
  CanvasText,
  BrushStroke,
  ActiveTool,
  DrawMode,
  SnapLine,
} from '@/types/canvas';

// ── Zoom bounds ────────────────────────────────────────────────────────────
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const LOD_LEVELS = [0.15, 0.3, 0.6, 1.2, 2.5];

// ── Pan momentum ───────────────────────────────────────────────────────────
const FRICTION = 0.88;
const MIN_VELOCITY = 0.1;

// ── Reduced motion (read once — stable for the page lifetime) ──────────────
const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ── Types ──────────────────────────────────────────────────────────────────

interface DragImageState {
  id: string;
  origX: number;
  origY: number;
  startClientX: number;
  startClientY: number;
  startZoom: number;
  liveX: number;
  liveY: number;
}

interface DragTextState {
  id: string;
  origX: number;
  origY: number;
  startClientX: number;
  startClientY: number;
}

interface DragStrokeState {
  id: string;
  origOffsetX: number;
  origOffsetY: number;
  startClientX: number;
  startClientY: number;
}

interface ResizeState {
  kind: 'image' | 'text';
  id: string;
  handle: HandleId;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  startClientX: number;
  startClientY: number;
}

interface PanState {
  startClientX: number;
  startClientY: number;
  origPanX: number;
  origPanY: number;
  vx: number;
  vy: number;
  lastClientX: number;
  lastClientY: number;
  pointerType: string;
}

interface CurrentStroke {
  mode: DrawMode;
  points: { x: number; y: number }[];
  historyImageId: string | null;
}

export interface PixiCanvasCallbacks {
  onSelectImage: (id: string | null) => void;
  onSelectText: (id: string | null) => void;
  onSelectStroke: (id: string | null) => void;
  onDeselect: () => void;
  onHandleHoverChange?: (hovering: boolean, cursor?: string) => void;
  onImageMoved: (id: string, x: number, y: number) => void;
  onImageResized: (id: string, x: number, y: number, w: number, h: number) => void;
  onTextMoved: (id: string, x: number, y: number) => void;
  onTextResized: (id: string, x: number, y: number, w: number, h: number) => void;
  onStrokeMoved: (id: string, offsetX: number, offsetY: number) => void;
  onBrushStrokeAdded: (stroke: BrushStroke) => void;
  onBrushStrokesChanged: (strokes: BrushStroke[]) => void;
  onViewportChange: (zoom: number, panX: number, panY: number) => void;
  onStartEditText: (id: string) => void;
  onEndEditText: (id: string, oldContent: string, newContent: string) => void;
  computeSnap: (
    id: string,
    x: number,
    y: number,
  ) => { x: number; y: number; lines: SnapLine[] };
  pushHistory: (
    label: string,
    images?: CanvasImage[],
    selId?: string | null,
    texts?: CanvasText[],
    histImageId?: string | null,
    strokes?: BrushStroke[],
    strokeSelId?: string | null,
  ) => void;
}

export interface PixiCanvasProps extends PixiCanvasCallbacks {
  canvasEl: HTMLCanvasElement | null;
  canvasImages: CanvasImage[];
  canvasTexts: CanvasText[];
  brushStrokes: BrushStroke[];
  selectedImageId: string | null;
  selectedTextId: string | null;
  selectedStrokeId: string | null;
  editingTextId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  activeTool: ActiveTool;
  spaceHeld: boolean;
  drawMode: DrawMode;
  brushDrawColor: string;
  brushDrawSize: number;
  shapeFillEnabled: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function usePixiCanvas(props: PixiCanvasProps) {
  const appRef = useRef<Application | null>(null);
  const boardRef = useRef<Container | null>(null);
  const snapOverlayRef = useRef<Container | null>(null);
  const previewGRef = useRef<Graphics | null>(null);

  // Node maps
  const imageNodesRef = useRef(new Map<string, PixiImageNode>());
  const textNodesRef = useRef(new Map<string, PixiTextNode>());
  const strokeNodesRef = useRef(new Map<string, PixiStrokeNode>());

  // Viewport live refs (write directly, then sync React state via RAF)
  const liveZoom = useRef(props.zoom);
  const livePanX = useRef(props.panX);
  const livePanY = useRef(props.panY);
  const viewportRafRef = useRef<number | null>(null);

  // LOD level
  const currentLodLevelRef = useRef(-1);

  // Interaction state refs
  const dragImageRef = useRef<DragImageState | null>(null);
  const dragTextRef = useRef<DragTextState | null>(null);
  const dragStrokeRef = useRef<DragStrokeState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const brushStrokeRef = useRef<CurrentStroke | null>(null);
  const momentumRafRef = useRef<number | null>(null);

  // Pinch-to-zoom: track active pointers by id
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchPrevDistRef = useRef<number | null>(null);

  // Culling: created after PixiJS init, holds eviction timers
  const cullerRef = useRef<ReturnType<typeof createCuller> | null>(null);

  // Debounced viewport flush for wheel events (React state only updated on idle)
  const wheelFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous zoom to avoid running updateHandles on every pan
  const prevZoomRef = useRef(props.zoom);

  // Props mirror refs (so event handlers always have fresh values without re-registering)
  const propsRef = useRef(props);
  propsRef.current = props;

  // ── Viewport helpers ────────────────────────────────────────────────────

  const applyBoardTransform = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    board.scale.set(liveZoom.current);
    board.position.set(livePanX.current, livePanY.current);
  }, []);

  // Flush viewport to React state once after a wheel gesture settles (150 ms idle).
  // Using a timeout instead of RAF so we don't flush on every wheel tick.
  const scheduleWheelFlush = useCallback(() => {
    if (wheelFlushRef.current !== null) clearTimeout(wheelFlushRef.current);
    wheelFlushRef.current = setTimeout(() => {
      wheelFlushRef.current = null;
      propsRef.current.onViewportChange(liveZoom.current, livePanX.current, livePanY.current);
    }, 150);
  }, []);

  // Flush viewport to React state at next frame — used on gesture END, not during.
  const scheduleViewportFlush = useCallback(() => {
    if (viewportRafRef.current !== null) cancelAnimationFrame(viewportRafRef.current);
    viewportRafRef.current = requestAnimationFrame(() => {
      viewportRafRef.current = null;
      propsRef.current.onViewportChange(
        liveZoom.current,
        livePanX.current,
        livePanY.current,
      );
    });
  }, []);

  // ── LOD ─────────────────────────────────────────────────────────────────

  const checkLodSwap = useCallback((zoom: number) => {
    const level = LOD_LEVELS.findIndex((l) => zoom < l);
    if (level === currentLodLevelRef.current) return;
    currentLodLevelRef.current = level;
    for (const node of imageNodesRef.current.values()) {
      node.swapLodTexture(zoom);
    }
  }, []);

  // ── Snap lines overlay ──────────────────────────────────────────────────

  const drawSnapLines = useCallback((lines: SnapLine[]) => {
    const overlay = snapOverlayRef.current;
    if (!overlay) return;
    const g = overlay.getChildAt(0) as Graphics;
    g.clear();
    if (lines.length === 0) return;
    const z = liveZoom.current;
    const px = livePanX.current;
    const py = livePanY.current;
    const app = appRef.current;
    if (!app) return;
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;

    for (const line of lines) {
      if (line.axis === 'x') {
        const sx = line.pos * z + px;
        g.moveTo(sx, 0).lineTo(sx, sh);
      } else {
        const sy = line.pos * z + py;
        g.moveTo(0, sy).lineTo(sw, sy);
      }
    }
    g.stroke({ color: 0x7c3aed, width: 1 });
  }, []);

  // ── Canvas coordinate helpers ───────────────────────────────────────────

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const el = propsRef.current.canvasEl;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const safeZoom = liveZoom.current > 0 ? liveZoom.current : 1;
    return {
      x: (clientX - rect.left - livePanX.current) / safeZoom,
      y: (clientY - rect.top - livePanY.current) / safeZoom,
    };
  }, []);

  // ── Image syncing ────────────────────────────────────────────────────────

  const syncImages = useCallback(
    (images: CanvasImage[], selectedId: string | null, zoom: number) => {
      const board = boardRef.current;
      if (!board) return;
      const existing = imageNodesRef.current;

      // Remove stale
      for (const [id, node] of existing) {
        if (!images.find((img) => img.id === id)) {
          node.destroy();
          board.removeChild(node.container);
          existing.delete(id);
        }
      }

      // Add / update, maintaining z-order
      images.forEach((img, idx) => {
        let node = existing.get(img.id);
        if (!node) {
          node = new PixiImageNode(img.id, img, (handleId, e) => {
            handleResizeDown(handleId, e, 'image', img.id);
          }, (hovering, cursor) => propsRef.current.onHandleHoverChange?.(hovering, cursor));
          node.container.on('pointerdown', (ev) =>
            handleImagePointerDown(ev.nativeEvent as PointerEvent, img.id),
          );
          board.addChildAt(node.container, Math.min(idx, board.children.length));
          existing.set(img.id, node);
          node.scheduleTextureLoad(img.url, zoom);
        } else {
          // Skip position/size reset if this image is actively being dragged or resized —
          // the live node position is ahead of React state and must not be overwritten.
          const isBeingDragged = dragImageRef.current?.id === img.id;
          const isBeingResized = resizeRef.current?.id === img.id && resizeRef.current?.kind === 'image';
          if (isBeingDragged || isBeingResized) {
            node.data = img; // keep data current (e.g. adjustments) without calling applyTransform
          } else {
            node.sync(img, zoom);
          }
        }
        node.setSelected(img.id === selectedId, zoom);
      });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Text syncing ─────────────────────────────────────────────────────────

  const syncTexts = useCallback(
    (texts: CanvasText[], selectedId: string | null, zoom: number) => {
      const board = boardRef.current;
      if (!board) return;
      const existing = textNodesRef.current;

      for (const [id, node] of existing) {
        if (!texts.find((t) => t.id === id)) {
          node.destroy();
          board.removeChild(node.container);
          existing.delete(id);
        }
      }

      texts.forEach((txt) => {
        let node = existing.get(txt.id);
        if (!node) {
          node = new PixiTextNode(txt.id, txt, (handleId, e) => {
            handleResizeDown(handleId, e, 'text', txt.id);
          }, (hovering, cursor) => propsRef.current.onHandleHoverChange?.(hovering, cursor));
          node.container.on('pointerdown', (ev) =>
            handleTextPointerDown(ev.nativeEvent as PointerEvent, txt.id),
          );
          node.container.on('pointerdblclick', () => {
            propsRef.current.onStartEditText(txt.id);
          });
          board.addChild(node.container);
          existing.set(txt.id, node);
        } else {
          const isBeingDragged = dragTextRef.current?.id === txt.id;
          const isBeingResized = resizeRef.current?.id === txt.id && resizeRef.current?.kind === 'text';
          if (isBeingDragged || isBeingResized) {
            // Keep style/content updates, but don't reset transform while gesture is live.
            // The node's visual position/size is driven imperatively during drag/resize.
            node.data = txt;
          } else {
            node.sync(txt, zoom);
          }
        }
        node.setSelected(txt.id === selectedId, zoom);
      });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Stroke syncing ───────────────────────────────────────────────────────

  const syncStrokes = useCallback(
    (strokes: BrushStroke[], selectedId: string | null, zoom: number) => {
      const board = boardRef.current;
      if (!board) return;
      const existing = strokeNodesRef.current;

      for (const [id, node] of existing) {
        if (!strokes.find((s) => s.id === id)) {
          node.destroy();
          board.removeChild(node.container);
          existing.delete(id);
        }
      }

      strokes.forEach((s) => {
        let node = existing.get(s.id);
        if (!node) {
          node = new PixiStrokeNode(s.id, s);
          node.container.on('pointerdown', (ev) =>
            handleStrokePointerDown(ev.nativeEvent as PointerEvent, s.id),
          );
          board.addChild(node.container);
          existing.set(s.id, node);
        } else {
          node.sync(s, zoom);
        }
        const bounds = node.getBounds();
        const bw = bounds ? bounds.maxX - bounds.minX : 0;
        const bh = bounds ? bounds.maxY - bounds.minY : 0;
        node.setSelected(s.id === selectedId, bw, bh, zoom);
      });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Interaction: Image ───────────────────────────────────────────────────

  function capturePointer(pointerId: number) {
    const el = propsRef.current.canvasEl;
    if (!el) return;
    try {
      if (!el.hasPointerCapture(pointerId)) el.setPointerCapture(pointerId);
    } catch {
      // Ignore capture errors (e.g. invalid pointer id/lifecycle race)
    }
  }

  function releasePointer(pointerId: number) {
    const el = propsRef.current.canvasEl;
    if (!el) return;
    try {
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      // Ignore release errors
    }
  }

  function resetMousePointerTracking(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return;
    activePointersRef.current.clear();
    pinchPrevDistRef.current = null;
  }

  function handleImagePointerDown(e: PointerEvent, imgId: string) {
    if (e.button !== 0) return; // Let non-left-clicks reach onPointerDown (e.g. middle-click pan)
    resetMousePointerTracking(e);
    capturePointer(e.pointerId);
    e.preventDefault();
    e.stopImmediatePropagation(); // Prevent onPointerDown from also firing on the canvas element
    // Cancel any in-flight pan momentum so the board doesn't jump while dragging a node.
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    panStateRef.current = null;
    const p = propsRef.current;

    if (p.activeTool === 'hand' || p.spaceHeld) {
      startPan(e);
      return;
    }

    if (p.activeTool === 'brush' || p.activeTool === 'shapes') {
      startBrushStroke(e, null);
      return;
    }

    if (p.activeTool === 'text') {
      const { x, y } = clientToWorld(e.clientX, e.clientY);
      propsRef.current.canvasEl?.dispatchEvent(
        new CustomEvent('pixi:addtext', {
          detail: { x, y, clientX: e.clientX, clientY: e.clientY, historyImageId: imgId },
        }),
      );
      return;
    }

    if (p.activeTool === 'select') {
      const img = p.canvasImages.find((i) => i.id === imgId);
      if (!img) return;
      p.onSelectImage(imgId);
      const node = imageNodesRef.current.get(imgId);
      const liveX = node ? node.container.x : img.x;
      const liveY = node ? node.container.y : img.y;
      dragImageRef.current = {
        id: imgId,
        origX: liveX,
        origY: liveY,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startZoom: liveZoom.current,
        liveX,
        liveY,
      };
    }
  }

  function handleTextPointerDown(e: PointerEvent, txtId: string) {
    if (e.button !== 0) return;
    resetMousePointerTracking(e);
    capturePointer(e.pointerId);
    e.preventDefault();
    e.stopImmediatePropagation();
    // Cancel any in-flight pan momentum so the board doesn't jump while dragging a node.
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    panStateRef.current = null;
    const p = propsRef.current;

    if (p.activeTool === 'hand' || p.spaceHeld) { startPan(e); return; }

    const txt = p.canvasTexts.find((t) => t.id === txtId);
    if (!txt) return;

    // Text tool should enter inline editing on click (no drag gesture required).
    if (p.activeTool === 'text') {
      p.onSelectText(txtId);
      p.onStartEditText(txtId);
      return;
    }

    if (p.activeTool === 'select') {
      p.onSelectText(txtId);
      dragTextRef.current = {
        id: txtId,
        origX: txt.x,
        origY: txt.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };
    }
  }

  function handleStrokePointerDown(e: PointerEvent, strokeId: string) {
    if (e.button !== 0) return;
    resetMousePointerTracking(e);
    capturePointer(e.pointerId);
    e.preventDefault();
    e.stopImmediatePropagation();
    // Cancel any in-flight pan momentum so the board doesn't jump while dragging a node.
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    panStateRef.current = null;
    const p = propsRef.current;
    if (p.activeTool === 'brush' || p.activeTool === 'shapes') return;
    if (p.activeTool === 'hand' || p.spaceHeld) { startPan(e); return; }

    const stroke = p.brushStrokes.find((s) => s.id === strokeId);
    if (!stroke) return;
    p.onSelectStroke(strokeId);
    dragStrokeRef.current = {
      id: strokeId,
      origOffsetX: stroke.offsetX,
      origOffsetY: stroke.offsetY,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
  }

  function handleResizeDown(handleId: HandleId, e: PointerEvent, kind: 'image' | 'text', nodeId: string) {
    if (e.button !== 0) return;
    resetMousePointerTracking(e);
    capturePointer(e.pointerId);
    e.preventDefault();
    e.stopImmediatePropagation(); // Prevent onPointerDown deselect from destroying handles on click
    // Cancel momentum so the board doesn't move during resize.
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    panStateRef.current = null;
    const p = propsRef.current;
    if (kind === 'image') {
      const img = p.canvasImages.find((i) => i.id === nodeId);
      if (!img) return;
      resizeRef.current = {
        kind: 'image', id: nodeId, handle: handleId,
        origX: img.x, origY: img.y, origW: img.width, origH: img.height,
        startClientX: e.clientX, startClientY: e.clientY,
      };
    } else {
      const txt = p.canvasTexts.find((t) => t.id === nodeId);
      if (!txt) return;
      resizeRef.current = {
        kind: 'text', id: nodeId, handle: handleId,
        origX: txt.x, origY: txt.y, origW: txt.width, origH: txt.height ?? 40,
        startClientX: e.clientX, startClientY: e.clientY,
      };
    }
  }

  // ── Interaction: Pan ─────────────────────────────────────────────────────

  function startPan(e: PointerEvent) {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    panStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      origPanX: livePanX.current,
      origPanY: livePanY.current,
      vx: 0,
      vy: 0,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      pointerType: e.pointerType,
    };
  }

  function applyMomentum() {
    const pan = panStateRef.current;
    if (!pan) return;
    const { vx, vy } = pan;
    if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
      panStateRef.current = null;
      scheduleViewportFlush(); // sync once when momentum settles
      return;
    }
    livePanX.current += vx;
    livePanY.current += vy;
    pan.vx *= FRICTION;
    pan.vy *= FRICTION;
    applyBoardTransform();
    // No React flush per frame — state syncs when momentum ends.
    momentumRafRef.current = requestAnimationFrame(applyMomentum);
  }

  // ── Brush stroke ─────────────────────────────────────────────────────────

  function startBrushStroke(e: PointerEvent, histImageId: string | null) {
    const { x, y } = clientToWorld(e.clientX, e.clientY);
    const mode = propsRef.current.drawMode;
    brushStrokeRef.current = { mode, points: [{ x, y }], historyImageId: histImageId };
    if (mode === 'eraser') eraseAtPoint(x, y);
  }

  function eraseAtPoint(wx: number, wy: number) {
    const p = propsRef.current;
    const radius = Math.max(6, p.brushDrawSize / 2);
    const r2 = radius * radius;

    const updated = p.brushStrokes.filter((s) => {
      // Fast reject: bounding box
      const bb = strokeNodesRef.current.get(s.id)?.getBounds();
      if (!bb) return true;
      if (
        wx + radius <= bb.minX || wx - radius >= bb.maxX ||
        wy + radius <= bb.minY || wy - radius >= bb.maxY
      ) return true;

      // Precise: check proximity to any stroke point (with offset applied)
      const ox = s.offsetX;
      const oy = s.offsetY;
      for (const pt of s.points) {
        const dx = (pt.x + ox) - wx;
        const dy = (pt.y + oy) - wy;
        if (dx * dx + dy * dy <= r2) return false; // erase
      }
      return true; // keep
    });

    if (updated.length !== p.brushStrokes.length) {
      p.onBrushStrokesChanged(updated);
    }
  }

  function updatePreviewStroke(pts: { x: number; y: number }[], mode: DrawMode) {
    const g = previewGRef.current;
    if (!g) return;
    const p = propsRef.current;
    const color = hexToNumber(p.brushDrawColor);
    g.clear();

    if (pts.length < 2) return;

    const sx = pts[0].x, sy = pts[0].y;
    const ex = pts[pts.length - 1].x, ey = pts[pts.length - 1].y;

    if (mode === 'brush') {
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ color, width: p.brushDrawSize, cap: 'round', join: 'round', alpha: 0.85 });
      return;
    }
    if (mode === 'line') {
      g.moveTo(sx, sy).lineTo(ex, ey);
      g.stroke({ color, width: p.brushDrawSize, cap: 'round', alpha: 0.85 });
      return;
    }
    if (mode === 'arrow') {
      const angle = Math.atan2(ey - sy, ex - sx);
      const head = Math.max(10, p.brushDrawSize * 2.6);
      const a1 = angle - Math.PI / 7, a2 = angle + Math.PI / 7;
      g.moveTo(sx, sy).lineTo(ex, ey);
      g.stroke({ color, width: p.brushDrawSize, cap: 'round', alpha: 0.85 });
      g.moveTo(ex - head * Math.cos(a1), ey - head * Math.sin(a1))
        .lineTo(ex, ey)
        .lineTo(ex - head * Math.cos(a2), ey - head * Math.sin(a2));
      g.stroke({ color, width: p.brushDrawSize, cap: 'round', join: 'round', alpha: 0.85 });
      return;
    }
    if (mode === 'rectangle') {
      const rx = Math.min(sx, ex), ry = Math.min(sy, ey);
      const rw = Math.abs(ex - sx), rh = Math.abs(ey - sy);
      g.rect(rx, ry, rw, rh);
      if (p.shapeFillEnabled) g.fill({ color, alpha: 0.32 });
      g.stroke({ color, width: p.brushDrawSize, alpha: 0.85 });
      return;
    }
    if (mode === 'ellipse') {
      const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
      const rx = Math.abs(ex - sx) / 2, ry = Math.abs(ey - sy) / 2;
      g.ellipse(cx, cy, rx, ry);
      if (p.shapeFillEnabled) g.fill({ color, alpha: 0.32 });
      g.stroke({ color, width: p.brushDrawSize, alpha: 0.85 });
    }
  }

  // ── Raw pointer event handlers attached to canvas element ────────────────

  function onPointerDown(e: PointerEvent) {
    // Node-level handlers (image/text/stroke/resize) call preventDefault on the
    // native event. Skip canvas-level handling to avoid competing gesture state.
    if (e.defaultPrevented) return;

    const p = propsRef.current;

    // Mouse pointers cannot be multi-touch; clear stale pointer bookkeeping to
    // avoid accidental pinch state from prior interactions.
    if (e.pointerType === 'mouse') {
      activePointersRef.current.clear();
      pinchPrevDistRef.current = null;
    }

    capturePointer(e.pointerId);

    // Track pointer for pinch detection
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two active pointers → enter pinch mode (cancel current drag/pan)
    if (activePointersRef.current.size === 2) {
      dragImageRef.current = null;
      dragTextRef.current = null;
      dragStrokeRef.current = null;
      panStateRef.current = null;
      const pts = [...activePointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchPrevDistRef.current = Math.sqrt(dx * dx + dy * dy);
      return;
    }

    // Middle-click or hand tool or space → pan
    if (e.button === 1 || p.activeTool === 'hand' || p.spaceHeld) {
      e.preventDefault();
      startPan(e);
      return;
    }

    // Left-click on empty canvas
    if (e.button === 0) {
      if (p.activeTool === 'brush' || p.activeTool === 'shapes') {
        startBrushStroke(e, null);
        return;
      }
      if (p.activeTool === 'text') {
        const { x, y } = clientToWorld(e.clientX, e.clientY);
        // Trigger text add via callback — page.tsx handles it
        // (Text tool click is handled only on empty canvas via data-canvas check;
        //  PixiJS version: this fires when click target is the canvas element itself)
        // We signal it via a custom event so page.tsx can call addTextAtCanvasPoint
        propsRef.current.canvasEl?.dispatchEvent(
          new CustomEvent('pixi:addtext', { detail: { x, y, clientX: e.clientX, clientY: e.clientY } }),
        );
        return;
      }
      // Deselect on empty canvas click
      p.onDeselect();
    }
  }

  function onPointerMove(e: PointerEvent) {
    // Update pointer position for pinch tracking
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom (two active pointers)
    if (activePointersRef.current.size === 2 && pinchPrevDistRef.current !== null) {
      const pts = [...activePointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const prevDist = pinchPrevDistRef.current;
      pinchPrevDistRef.current = newDist;

      if (prevDist > 0) {
        const el = propsRef.current.canvasEl;
        const rect = el?.getBoundingClientRect();
        if (rect) {
          const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
          const my = (pts[0].y + pts[1].y) / 2 - rect.top;
          const rawFactor = newDist / prevDist;
          const factor = Math.min(Math.max(rawFactor, 0.85), 1.18);
          const currentZoom = liveZoom.current;
          const newZoom = Math.min(Math.max(currentZoom * factor, MIN_ZOOM), MAX_ZOOM);
          const scale = newZoom / currentZoom;
          livePanX.current = mx - scale * (mx - livePanX.current);
          livePanY.current = my - scale * (my - livePanY.current);
          liveZoom.current = newZoom;
          applyBoardTransform();
          checkLodSwap(newZoom);
          // No per-frame React flush — sync on pinch end (pointerup)
          for (const node of imageNodesRef.current.values()) node.updateHandles(newZoom);
          for (const node of textNodesRef.current.values()) node.updateHandles(newZoom);
        }
      }
      return;
    }

    // Resize
    const resize = resizeRef.current;
    if (resize) {
      const dx = (e.clientX - resize.startClientX) / liveZoom.current;
      const dy = (e.clientY - resize.startClientY) / liveZoom.current;
      let nx = resize.origX, ny = resize.origY, nw = resize.origW, nh = resize.origH;
      const h = resize.handle;
      if (h === 'e' || h === 'ne' || h === 'se') nw = Math.max(40, resize.origW + dx);
      if (h === 'w' || h === 'nw' || h === 'sw') { nw = Math.max(40, resize.origW - dx); nx = resize.origX + resize.origW - nw; }
      if (h === 's' || h === 'se' || h === 'sw') nh = Math.max(20, resize.origH + dy);
      if (h === 'n' || h === 'ne' || h === 'nw') { nh = Math.max(20, resize.origH - dy); ny = resize.origY + resize.origH - nh; }

      nx = Math.round(nx); ny = Math.round(ny);
      nw = Math.round(nw); nh = Math.round(nh);

      if (resize.kind === 'image') {
        const node = imageNodesRef.current.get(resize.id);
        if (node) {
          node.data = { ...node.data, x: nx, y: ny, width: nw, height: nh };
          node.applyTransform();
          node.updateHandles(liveZoom.current);
        }
      } else {
        const node = textNodesRef.current.get(resize.id);
        if (node) {
          // Keep text layout in sync with frame size during drag (word-wrap width changes).
          node.sync({ ...node.data, x: nx, y: ny, width: nw, height: nh }, liveZoom.current);
        }
      }
      return;
    }

    // Pan
    const pan = panStateRef.current;
    if (pan && !dragImageRef.current && !dragTextRef.current && !dragStrokeRef.current && !brushStrokeRef.current) {
      const dx = e.clientX - pan.startClientX;
      const dy = e.clientY - pan.startClientY;
      pan.vx = e.clientX - pan.lastClientX;
      pan.vy = e.clientY - pan.lastClientY;
      pan.lastClientX = e.clientX;
      pan.lastClientY = e.clientY;
      livePanX.current = pan.origPanX + dx;
      livePanY.current = pan.origPanY + dy;
      applyBoardTransform();
      // No React state flush here — board is moved imperatively at 60fps.
      // State syncs once on pointerup / momentum end.
      return;
    }

    // Image drag
    const drag = dragImageRef.current;
    if (drag) {
      // Use client-space delta anchored to the zoom at drag-start.
      // This is identical to the text/stroke drag approach and is immune to
      // pan-state changes between pointer-down and pointer-move (which could
      // cause a jump when using the world-space clientToWorld approach).
      const dx = (e.clientX - drag.startClientX) / drag.startZoom;
      const dy = (e.clientY - drag.startClientY) / drag.startZoom;
      const rawX = drag.origX + dx;
      const rawY = drag.origY + dy;
      const { x, y, lines } = propsRef.current.computeSnap(drag.id, rawX, rawY);
      drag.liveX = x;
      drag.liveY = y;
      const node = imageNodesRef.current.get(drag.id);
      if (node) {
        node.container.position.set(x, y);
        node.updateHandles(liveZoom.current);
      }
      drawSnapLines(lines);
      return;
    }

    // Text drag
    const dText = dragTextRef.current;
    if (dText) {
      const dx = (e.clientX - dText.startClientX) / liveZoom.current;
      const dy = (e.clientY - dText.startClientY) / liveZoom.current;
      const nx = dText.origX + dx;
      const ny = dText.origY + dy;
      const node = textNodesRef.current.get(dText.id);
      if (node) node.container.position.set(nx, ny);
      return;
    }

    // Stroke drag
    const dStroke = dragStrokeRef.current;
    if (dStroke) {
      const dx = (e.clientX - dStroke.startClientX) / liveZoom.current;
      const dy = (e.clientY - dStroke.startClientY) / liveZoom.current;
      const node = strokeNodesRef.current.get(dStroke.id);
      if (node) {
        node.container.position.set(
          dStroke.origOffsetX + dx,
          dStroke.origOffsetY + dy,
        );
      }
      return;
    }

    // Brush stroke accumulation
    const stroke = brushStrokeRef.current;
    if (stroke) {
      const { x, y } = clientToWorld(e.clientX, e.clientY);
      if (stroke.mode === 'eraser') {
        stroke.points.push({ x, y });
        eraseAtPoint(x, y);
        return;
      }
      if (stroke.mode === 'brush') {
        stroke.points.push({ x, y });
      } else {
        // Shape: only keep start + current endpoint
        stroke.points = [stroke.points[0], { x, y }];
      }
      updatePreviewStroke(stroke.points, stroke.mode);
    }
  }

  function onPointerUp(e: PointerEvent) {
    const p = propsRef.current;

    // Clean up pointer tracking; exit pinch when fewer than 2 active
    activePointersRef.current.delete(e.pointerId);
    releasePointer(e.pointerId);
    const wasPinching = pinchPrevDistRef.current !== null;
    if (activePointersRef.current.size < 2) {
      pinchPrevDistRef.current = null;
      if (wasPinching) scheduleViewportFlush(); // sync once when pinch ends
    }

    // Resize commit
    const resize = resizeRef.current;
    if (resize) {
      const node = resize.kind === 'image'
        ? imageNodesRef.current.get(resize.id)
        : textNodesRef.current.get(resize.id);
      if (node) {
        const d = node.data as CanvasImage & CanvasText;
        const w = 'width' in d ? d.width : resize.origW;
        const h = 'height' in d ? (d.height ?? resize.origH) : resize.origH;
        if (resize.kind === 'image') {
          p.onImageResized(resize.id, d.x, d.y, w, h);
        } else {
          p.onTextResized(resize.id, d.x, d.y, w, h);
        }
      }
      p.onHandleHoverChange?.(false);
      resizeRef.current = null;
      return;
    }

    // Pan commit
    const pan = panStateRef.current;
    if (pan && !dragImageRef.current && !dragTextRef.current && !dragStrokeRef.current && !brushStrokeRef.current) {
      // Momentum (skipped when user prefers reduced motion)
      const { vx, vy } = pan;
      // Keep mouse/pen panning precise; only touch drags get inertial momentum.
      const shouldApplyMomentum =
        pan.pointerType === 'touch'
        && !PREFERS_REDUCED_MOTION
        && (Math.abs(vx) > MIN_VELOCITY || Math.abs(vy) > MIN_VELOCITY);

      if (shouldApplyMomentum) {
        pan.origPanX = livePanX.current;
        pan.origPanY = livePanY.current;
        pan.startClientX = 0; pan.startClientY = 0;
        momentumRafRef.current = requestAnimationFrame(applyMomentum);
        // Viewport flush happens when momentum settles (inside applyMomentum)
      } else {
        panStateRef.current = null;
        scheduleViewportFlush(); // sync React state once on clean pan end
      }
      return;
    }

    // Image drag commit
    const drag = dragImageRef.current;
    if (drag) {
      drawSnapLines([]);
      const distance = Math.hypot(drag.liveX - drag.origX, drag.liveY - drag.origY);
      if (distance > 0.5) {
        p.onImageMoved(drag.id, drag.liveX, drag.liveY);
      }
      dragImageRef.current = null;
      return;
    }

    // Text drag commit
    const dText = dragTextRef.current;
    if (dText) {
      const node = textNodesRef.current.get(dText.id);
      if (node) {
        const nx = Math.round(node.container.x);
        const ny = Math.round(node.container.y);
        const dx = nx - dText.origX, dy = ny - dText.origY;
        if (Math.hypot(dx, dy) > 0.5) p.onTextMoved(dText.id, nx, ny);
      }
      dragTextRef.current = null;
      return;
    }

    // Stroke drag commit
    const dStroke = dragStrokeRef.current;
    if (dStroke) {
      const node = strokeNodesRef.current.get(dStroke.id);
      if (node) {
        const dx = Math.round(node.container.x - dStroke.origOffsetX);
        const dy = Math.round(node.container.y - dStroke.origOffsetY);
        if (Math.hypot(dx, dy) > 0.5) {
          p.onStrokeMoved(dStroke.id, Math.round(node.container.x), Math.round(node.container.y));
        }
      }
      dragStrokeRef.current = null;
      return;
    }

    // Brush stroke finalize
    const currentStroke = brushStrokeRef.current;
    if (currentStroke) {
      const g = previewGRef.current;
      if (g) g.clear();

      if (currentStroke.mode !== 'eraser') {
        const pts = currentStroke.mode === 'brush'
          ? currentStroke.points
          : [currentStroke.points[0], currentStroke.points[currentStroke.points.length - 1] ?? currentStroke.points[0]];

        const isValid = currentStroke.mode === 'brush'
          ? pts.length > 1
          : pts.length > 1 && Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) > 2;

        if (isValid) {
          const supportsFill = currentStroke.mode === 'rectangle' || currentStroke.mode === 'ellipse';
          const newStroke: BrushStroke = {
            id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: currentStroke.mode,
            points: pts,
            color: p.brushDrawColor,
            size: p.brushDrawSize,
            offsetX: 0,
            offsetY: 0,
            opacity: 100,
            fill: supportsFill ? p.shapeFillEnabled : false,
            fillColor: supportsFill && p.shapeFillEnabled ? p.brushDrawColor : undefined,
            historyImageId: currentStroke.historyImageId,
          };
          p.onBrushStrokeAdded(newStroke);
        }
      } else {
        // Eraser finished — page.tsx handles history push via onBrushStrokesChanged
      }

      brushStrokeRef.current = null;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const el = propsRef.current.canvasEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const currentZoom = liveZoom.current;

    if (!e.ctrlKey && !e.metaKey) {
      // Two-finger trackpad pan
      livePanX.current -= e.deltaX;
      livePanY.current -= e.deltaY;
      applyBoardTransform();
      scheduleWheelFlush(); // debounced — no per-event React re-render
      return;
    }

    // Zoom (pinch or Ctrl+scroll)
    let factor: number;
    if (e.deltaMode === 0 && Math.abs(e.deltaY) < 30) {
      factor = 1 - e.deltaY * 0.006;
    } else {
      factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    }
    factor = Math.min(Math.max(factor, 0.85), 1.18);
    const newZoom = Math.min(Math.max(currentZoom * factor, MIN_ZOOM), MAX_ZOOM);
    const scale = newZoom / currentZoom;

    livePanX.current = mx - scale * (mx - livePanX.current);
    livePanY.current = my - scale * (my - livePanY.current);
    liveZoom.current = newZoom;

    applyBoardTransform();
    checkLodSwap(newZoom);
    scheduleWheelFlush(); // debounced — React state syncs 150ms after scroll settles

    // Update handle sizes so they stay at constant screen size while zooming
    for (const node of imageNodesRef.current.values()) node.updateHandles(newZoom);
    for (const node of textNodesRef.current.values()) node.updateHandles(newZoom);
  }

  // ── PixiJS app lifecycle ─────────────────────────────────────────────────

  useEffect(() => {
    const el = props.canvasEl;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let onWindowResize: (() => void) | null = null;

    const resizeRendererToCanvas = () => {
      const currentApp = appRef.current;
      if (!currentApp) return;
      const bounds = el.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(bounds.width));
      const nextH = Math.max(1, Math.round(bounds.height));
      const currentW = Math.max(1, Math.round(currentApp.renderer.width / currentApp.renderer.resolution));
      const currentH = Math.max(1, Math.round(currentApp.renderer.height / currentApp.renderer.resolution));
      if (currentW === nextW && currentH === nextH) return;

      currentApp.renderer.resize(nextW, nextH);
      currentApp.stage.hitArea = currentApp.screen;

      const culler = cullerRef.current;
      if (culler) {
        culler.cull({
          panX: livePanX.current,
          panY: livePanY.current,
          zoom: liveZoom.current,
          canvasWidth: nextW,
          canvasHeight: nextH,
        });
      }
    };

    destroyPixiApp();

    getPixiApp(el, rect.width || 800, rect.height || 600).then((app) => {
      if (cancelled) { destroyPixiApp(); return; }
      appRef.current = app;

      // ── Stage setup: enable interactive hit-testing and cursor management ──
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      // ── Board container (world space)
      const board = new Container();
      board.label = 'board';
      app.stage.addChild(board);
      boardRef.current = board;

      // ── Snap lines overlay (screen space, above board)
      const snapOverlay = new Container();
      snapOverlay.label = 'snap-overlay';
      const snapG = new Graphics();
      snapOverlay.addChild(snapG);
      app.stage.addChild(snapOverlay);
      snapOverlayRef.current = snapOverlay;

      // ── Live brush preview (world space, on top of strokes)
      const previewG = new Graphics();
      previewG.label = 'stroke-preview';
      board.addChild(previewG);
      previewGRef.current = previewG;

      // Sync live viewport refs from current props — the API data may have arrived
      // and triggered setZoom/setPanX/setPanY while Pixi was still initialising.
      // The viewport useEffect skips when boardRef is null, so liveZoom/Pan would
      // be stuck at their initial (0.5 / 0,0) values. Read propsRef.current so we
      // always apply the latest viewport, not the stale closure values.
      liveZoom.current = propsRef.current.zoom;
      livePanX.current = propsRef.current.panX;
      livePanY.current = propsRef.current.panY;

      // Apply initial viewport
      board.scale.set(liveZoom.current);
      board.position.set(livePanX.current, livePanY.current);

      // Initial sync — use propsRef.current for the same reason: canvasImages / texts
      // may have loaded from the API while Pixi was initialising and the syncImages
      // useEffect skipped because boardRef was null at that point.
      syncImages(propsRef.current.canvasImages, propsRef.current.selectedImageId, liveZoom.current);
      syncTexts(propsRef.current.canvasTexts, propsRef.current.selectedTextId, liveZoom.current);
      syncStrokes(propsRef.current.brushStrokes, propsRef.current.selectedStrokeId, liveZoom.current);

      // ── Culler (created after nodes are populated)
      cullerRef.current = createCuller(imageNodesRef.current, textNodesRef.current, strokeNodesRef.current);

      // Run culling every PixiJS frame so it is ALWAYS in sync with the rendered
      // board position. This eliminates the timing gap that caused images to
      // vanish during fast panning with the previous setTimeout approach.
      // Early-exit when viewport hasn't changed to skip AABB checks on idle frames.
      let lastCullPanX = NaN, lastCullPanY = NaN, lastCullZoom = NaN;
      app.ticker.add(() => {
        const culler = cullerRef.current;
        if (!culler) return;
        const px = livePanX.current, py = livePanY.current, z = liveZoom.current;
        if (px === lastCullPanX && py === lastCullPanY && z === lastCullZoom) return;
        lastCullPanX = px; lastCullPanY = py; lastCullZoom = z;
        culler.cull({
          panX:        px,
          panY:        py,
          zoom:        z,
          canvasWidth: app.renderer.width  / app.renderer.resolution,
          canvasHeight: app.renderer.height / app.renderer.resolution,
        });
      });

      // Attach raw DOM events (not React synthetic events per Rule 5)
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove, { passive: true });
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
      el.addEventListener('lostpointercapture', onPointerUp);
      el.addEventListener('wheel', onWheel, { passive: false });

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => resizeRendererToCanvas());
        resizeObserver.observe(el);
      }
      onWindowResize = () => resizeRendererToCanvas();
      window.addEventListener('resize', onWindowResize);
      resizeRendererToCanvas();
    });

    return () => {
      cancelled = true;
      const el2 = props.canvasEl;
      if (el2) {
        for (const pointerId of activePointersRef.current.keys()) {
          releasePointer(pointerId);
        }
        el2.removeEventListener('pointerdown', onPointerDown);
        el2.removeEventListener('pointermove', onPointerMove);
        el2.removeEventListener('pointerup', onPointerUp);
        el2.removeEventListener('pointercancel', onPointerUp);
        el2.removeEventListener('lostpointercapture', onPointerUp);
        el2.removeEventListener('wheel', onWheel);
      }
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (onWindowResize) {
        window.removeEventListener('resize', onWindowResize);
        onWindowResize = null;
      }
      if (viewportRafRef.current !== null) cancelAnimationFrame(viewportRafRef.current);
      if (momentumRafRef.current !== null) cancelAnimationFrame(momentumRafRef.current);
      if (wheelFlushRef.current !== null) clearTimeout(wheelFlushRef.current);
      cullerRef.current?.dispose();
      cullerRef.current = null;
      activePointersRef.current.clear();
      pinchPrevDistRef.current = null;
      clearTextureCache();
      destroyPixiApp();
      appRef.current = null;
      boardRef.current = null;
      imageNodesRef.current.clear();
      textNodesRef.current.clear();
      strokeNodesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.canvasEl]);

  // ── Sync display list when React state changes ──────────────────────────

  useEffect(() => {
    if (!boardRef.current) return;
    syncImages(props.canvasImages, props.selectedImageId, liveZoom.current);
  }, [props.canvasImages, props.selectedImageId, syncImages]);

  useEffect(() => {
    if (!boardRef.current) return;
    syncTexts(props.canvasTexts, props.selectedTextId, liveZoom.current);
  }, [props.canvasTexts, props.selectedTextId, syncTexts]);

  // ── Hide PixiJS text node while textarea overlay is active ───────────────
  // Prevents the "double text" artifact where both the PixiJS Text and the
  // React textarea overlay are simultaneously visible during inline editing.
  useEffect(() => {
    for (const [id, node] of textNodesRef.current) {
      node.setEditing(id === props.editingTextId);
    }
  }, [props.editingTextId]);

  useEffect(() => {
    if (!boardRef.current) return;
    syncStrokes(props.brushStrokes, props.selectedStrokeId, liveZoom.current);
  }, [props.brushStrokes, props.selectedStrokeId, syncStrokes]);

  // ── Sync viewport from React state (external changes: fit-to-view, undo) ─
  // This effect fires when page.tsx calls setZoom/setPanX/setPanY.
  // During active pan/zoom gestures we DON'T update React state, so this
  // only runs on gesture END or for external viewport changes.

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const zoomChanged = Math.abs(props.zoom - prevZoomRef.current) > 1e-6;
    prevZoomRef.current = props.zoom;

    liveZoom.current = props.zoom;
    livePanX.current = props.panX;
    livePanY.current = props.panY;
    board.scale.set(props.zoom);
    board.position.set(props.panX, props.panY);

    // updateHandles only when zoom changes (handle size is zoom-dependent).
    // Skipping this on pure pan saves Graphics redraws.
    if (zoomChanged) {
      for (const node of imageNodesRef.current.values()) node.updateHandles(props.zoom);
      for (const node of textNodesRef.current.values()) node.updateHandles(props.zoom);
    }
    // Culling is handled by the PixiJS ticker every frame — no manual call needed.
  }, [props.zoom, props.panX, props.panY]);

  // dev-mode GPU memory stats
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const id = setInterval(() => {
      const renderer = appRef.current?.renderer as unknown as { texture?: { managedTextures?: unknown[] } };
      if (renderer?.texture?.managedTextures) {
        console.debug('[Pixi] Textures:', renderer.texture.managedTextures.length);
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);
}
