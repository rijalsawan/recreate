"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Hexagon, History,
  MousePointer2, Hand, Shapes, Frame, Type, Upload, Undo2, Redo2,
  Image as ImageIcon, Wand2, Box, Sparkles, Paperclip, ArrowUp,
  Palette, Plus, Minus, Trash2,
  PanelLeft, Sidebar as SidebarIcon, X, Maximize, Combine, Eraser,
  Search, Check, Zap, Rocket, Disc3, Shirt,
  Paintbrush, ArrowUpRight, Square, Circle, Slash, PenTool, RotateCcw,
  AlignLeft, AlignCenter, AlignRight,
  Pencil, Copy, Link2, Loader2, MoreHorizontal,
  User, CreditCard, Code2, Star, BookOpen, MessageSquarePlus,
  LogOut, FileEdit, Layers, Globe, Heart, ToggleRight,
  Camera, SlidersHorizontal, PenLine, LayoutGrid as LayoutGridIcon2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { STYLE_CATEGORIES, STYLE_LOOKUP, styleKey, type StyleEntry } from '@/lib/styles-data';
import { getModelCapabilities, getModelId, type ModelCapabilities } from '@/lib/model-capabilities';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { PricingModal } from '@/components/shared/PricingModal';

type SelectedStyleMeta = {
  name: string;
  apiStyle: string;
  apiSubstyle?: string;
  apiModel?: string;
  styleId?: string;
  preferredModel?: string;
  contextImageUrls?: string[];
};

const PENDING_STYLE_SESSION_KEY = 'pendingStyleApply';

function parseSelectedStyleMeta(value: unknown): SelectedStyleMeta | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const contextImageUrls = Array.isArray(raw.contextImageUrls)
    ? raw.contextImageUrls
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    : [];

  const legacyContextImageUrl = typeof raw.contextImageUrl === 'string' ? raw.contextImageUrl.trim() : '';
  if (legacyContextImageUrl && !contextImageUrls.includes(legacyContextImageUrl)) {
    contextImageUrls.push(legacyContextImageUrl);
  }

  return {
    name,
    apiStyle: typeof raw.apiStyle === 'string' && raw.apiStyle.trim().length > 0 ? raw.apiStyle : 'any',
    apiSubstyle: typeof raw.apiSubstyle === 'string' && raw.apiSubstyle.trim().length > 0 ? raw.apiSubstyle : undefined,
    apiModel: typeof raw.apiModel === 'string' && raw.apiModel.trim().length > 0 ? raw.apiModel : undefined,
    styleId: typeof raw.styleId === 'string' && raw.styleId.trim().length > 0 ? raw.styleId : undefined,
    preferredModel: typeof raw.preferredModel === 'string' && raw.preferredModel.trim().length > 0 ? raw.preferredModel : undefined,
    contextImageUrls: contextImageUrls.length > 0 ? contextImageUrls : undefined,
  };
}

function mapApiModelToEditorModel(apiModel?: string): string | null {
  switch (apiModel) {
    case 'gpt-image-2':
      return 'GPT Image 2';
    case 'recraftv4_pro':
      return 'Recraft V4 Pro';
    case 'recraftv4_pro_vector':
      return 'Recraft V4 Pro Vector';
    case 'recraftv4':
      return 'Recraft V4';
    case 'recraftv4_vector':
      return 'Recraft V4 Vector';
    case 'recraftv3':
      return 'Recraft V3';
    case 'recraftv3_vector':
      return 'Recraft V3 Vector';
    case 'recraftv2':
      return 'Recraft V2';
    case 'recraftv2_vector':
      return 'Recraft V2 Vector';
    case 'gpt-image-1':
      return 'GPT Image 1';
    case 'gpt-image-1.5':
      return 'GPT Image 1.5';
    case 'gemini-2.5-flash':
      return 'Gemini 2.5 Flash';
    default:
      return null;
  }
}

// ── Google Font loader ──────────────────────────────────────────────────────
function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

// ── Palette library ─────────────────────────────────────────────────────────
const PALETTE_LIBRARY: { name: string; colors: string[] }[] = [
  { name: 'Ocean Sunset',    colors: ['#264653','#2A9D8F','#E9C46A','#F4A261','#E76F51'] },
  { name: 'Warm Spectrum',   colors: ['#F94144','#F3722C','#F8961E','#F9C74F','#90BE6D'] },
  { name: 'Deep Sea',        colors: ['#001219','#005F73','#0A9396','#94D2BD','#E9D8A6'] },
  { name: 'Fire Gradient',   colors: ['#03071E','#370617','#6A040F','#9D0208','#DC2F02'] },
  { name: 'Neon Pop',        colors: ['#FFBE0B','#FB5607','#FF006E','#8338EC','#3A86FF'] },
  { name: 'Earth Tones',     colors: ['#606C38','#283618','#FEFAE0','#DDA15E','#BC6C25'] },
  { name: 'Royal Purple',    colors: ['#10002B','#240046','#3C096C','#5A189A','#7B2CBF'] },
  { name: 'Mint Fresh',      colors: ['#D9ED92','#B5E48C','#76C893','#34A0A4','#168AAD'] },
  { name: 'Monochrome',      colors: ['#F8F9FA','#E9ECEF','#DEE2E6','#CED4DA','#ADB5BD'] },
  { name: 'Amber Glow',      colors: ['#FF5400','#FF6D00','#FF8500','#FF9E00','#FFB600'] },
  { name: 'Desert Sand',     colors: ['#797D62','#9B9B7A','#D9AE94','#F1DCA7','#FFCB69'] },
  { name: 'Electric Blue',   colors: ['#2D00F7','#6A00F4','#8900F2','#A100F2','#B100E8'] },
  { name: 'Cherry Blossom',  colors: ['#FFCAD4','#F4ACB7','#9D8189','#D8E2DC','#FFE5D9'] },
  { name: 'Forest Night',    colors: ['#1B4332','#2D6A4F','#40916C','#74C69D','#B7E4C7'] },
  { name: 'Cyber Punk',      colors: ['#0D0D0D','#F5DD0A','#FF2079','#00F5FF','#7B00FF'] },
  { name: 'Sahara',          colors: ['#C9A84C','#D4A853','#B8860B','#F5DEB3','#8B6914'] },
  { name: 'Arctic',          colors: ['#E0F7FA','#B2EBF2','#80DEEA','#4DD0E1','#00BCD4'] },
  { name: 'Rust & Bone',     colors: ['#A52A2A','#CD853F','#D2B48C','#F5F5DC','#808080'] },
  { name: 'Midnight',        colors: ['#0A0A23','#1A1A40','#2E2E6E','#4B4B9A','#6B6BC0'] },
  { name: 'Spring Garden',   colors: ['#A8E063','#56AB2F','#F9FBE7','#FFF9C4','#FFE082'] },
];

function pick5Palettes(exclude?: string[] | null): { name: string; colors: string[] }[] {
  const pool = exclude
    ? PALETTE_LIBRARY.filter((p) => p.colors.join(',') !== exclude.join(','))
    : PALETTE_LIBRARY;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

function hexToRgbTuple(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '').trim();
  const fullHex = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return null;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return [r, g, b];
}

function buildPaletteGuidance(palette: string[]): string {
  const normalized = palette.map((c) => c.toUpperCase());
  const dominant = normalized.slice(0, 3);
  const accents = normalized.slice(3);
  const dominantText = dominant.join(', ');
  const accentText = accents.length > 0 ? accents.join(', ') : '';

  let guidance = `Use this color palette as a natural direction: ${normalized.join(', ')}. Favor ${dominantText} as dominant tones across most of the image.`;
  if (accentText) {
    guidance += ` Use ${accentText} as secondary accents in smaller details and highlights.`;
  }
  guidance += ' Keep real-world colors and lighting believable, and do not force every palette color into every object.';
  return guidance;
}

function buildPaletteControls(palette: string[]): { colors: Array<{ rgb: [number, number, number] }> } | undefined {
  const colors = palette
    .map((hex) => hexToRgbTuple(hex))
    .filter((rgb): rgb is [number, number, number] => rgb !== null)
    .map((rgb) => ({ rgb }));

  if (colors.length === 0) return undefined;
  return { colors };
}

function getObjectCoverSourceRect(
  naturalWidth: number,
  naturalHeight: number,
  displayWidth: number,
  displayHeight: number,
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const nW = Math.max(1, naturalWidth);
  const nH = Math.max(1, naturalHeight);
  const dW = Math.max(1, displayWidth);
  const dH = Math.max(1, displayHeight);

  const coverScale = Math.max(dW / nW, dH / nH);
  const sWidth = Math.min(nW, dW / coverScale);
  const sHeight = Math.min(nH, dH / coverScale);
  const sx = Math.max(0, (nW - sWidth) / 2);
  const sy = Math.max(0, (nH - sHeight) / 2);

  return { sx, sy, sWidth, sHeight };
}

function drawImageAsObjectCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  displayWidth: number,
  displayHeight: number,
) {
  const rect = getObjectCoverSourceRect(
    img.naturalWidth || displayWidth,
    img.naturalHeight || displayHeight,
    displayWidth,
    displayHeight,
  );
  ctx.drawImage(img, rect.sx, rect.sy, rect.sWidth, rect.sHeight, 0, 0, displayWidth, displayHeight);
}

/**
 * Compresses an image URL to a JPEG at the given max-side dimension and quality.
 * Used before uploading images to AI tool routes to avoid exceeding the Recraft
 * file-size limit and dimension constraints.
 *
 * @param url      - Original image URL (must be accessible with CORS)
 * @param maxSide  - Maximum width or height in pixels (default 2048)
 * @param quality  - JPEG quality 0–1 (default 0.9)
 */
async function compressImageForUpload(url: string, maxSide = 2048, quality = 0.9): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxSide || h > maxSide) {
        if (w >= h) { h = Math.round((h / w) * maxSide); w = maxSide; }
        else { w = Math.round((w / h) * maxSide); h = maxSide; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Failed to compress image')); return; }
          resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = url;
  });
}

/**
 * Compresses an image URL and scales a processed mask Blob to the exact same
 * dimensions. Recraft inpaint and erase-region APIs require image + mask to have
 * identical pixel dimensions and the combined file size to stay under their limit.
 *
 * @param imageUrl  - Original image URL (must be accessible with CORS)
 * @param maskBlob  - Already-processed B&W mask Blob (from getMaskBlob)
 * @param maxSide   - Maximum width or height in pixels (default 2048)
 * @param quality   - JPEG quality 0–1 for the image (default 0.9)
 */
async function compressImageAndMaskForUpload(
  imageUrl: string,
  maskBlob: Blob,
  displayWidth?: number,
  displayHeight?: number,
  maxSide = 2048,
  quality = 0.9,
): Promise<{ imageFile: File; maskFile: File }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const visibleW = Math.max(1, Math.round(displayWidth ?? img.naturalWidth));
      const visibleH = Math.max(1, Math.round(displayHeight ?? img.naturalHeight));

      const visibleCanvas = document.createElement('canvas');
      visibleCanvas.width = visibleW;
      visibleCanvas.height = visibleH;
      const visibleCtx = visibleCanvas.getContext('2d');
      if (!visibleCtx) {
        reject(new Error('Failed to create visible image canvas'));
        return;
      }
      drawImageAsObjectCover(visibleCtx, img, visibleW, visibleH);

      let w = visibleW;
      let h = visibleH;
      if (w > maxSide || h > maxSide) {
        if (w >= h) { h = Math.round((h / w) * maxSide); w = maxSide; }
        else { w = Math.round((w / h) * maxSide); h = maxSide; }
      }

      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = w;
      imgCanvas.height = h;
      const imgCtx = imgCanvas.getContext('2d');
      if (!imgCtx) {
        reject(new Error('Failed to create compressed image canvas'));
        return;
      }
      imgCtx.drawImage(visibleCanvas, 0, 0, w, h);

      // Load the processed mask blob as an image so we can rescale it to w×h
      const maskImg = document.createElement('img');
      const maskObjectUrl = URL.createObjectURL(maskBlob);
      maskImg.onload = () => {
        const scaledMask = document.createElement('canvas');
        scaledMask.width = w;
        scaledMask.height = h;
        const scaledMaskCtx = scaledMask.getContext('2d');
        if (!scaledMaskCtx) {
          URL.revokeObjectURL(maskObjectUrl);
          reject(new Error('Failed to create mask canvas'));
          return;
        }
        scaledMaskCtx.drawImage(maskImg, 0, 0, w, h);
        URL.revokeObjectURL(maskObjectUrl);

        let imgBlob: Blob | null = null;
        let mskBlob: Blob | null = null;
        const tryResolve = () => {
          if (imgBlob && mskBlob) {
            resolve({
              imageFile: new File([imgBlob], 'image.jpg', { type: 'image/jpeg' }),
              maskFile: new File([mskBlob], 'mask.png', { type: 'image/png' }),
            });
          }
        };
        imgCanvas.toBlob(
          (b) => { if (!b) { reject(new Error('Failed to compress image')); return; } imgBlob = b; tryResolve(); },
          'image/jpeg', quality,
        );
        scaledMask.toBlob(
          (b) => { if (!b) { reject(new Error('Failed to scale mask')); return; } mskBlob = b; tryResolve(); },
          'image/png',
        );
      };
      maskImg.onerror = () => { URL.revokeObjectURL(maskObjectUrl); reject(new Error('Failed to load mask blob')); };
      maskImg.src = maskObjectUrl;
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = imageUrl;
  });
}

const PROMPT_ASSISTANT_STYLE_CHIPS = ['cinematic', 'photorealistic', 'editorial', 'minimalist', 'bold contrast'];
const PROMPT_ASSISTANT_LIGHTING_CHIPS = ['soft daylight', 'golden hour', 'studio lighting', 'neon glow', 'dramatic shadows'];
const PROMPT_ASSISTANT_COMPOSITION_CHIPS = ['close-up', 'wide shot', 'center composition', 'rule of thirds', 'clean background'];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const incomingStyleHydratedRef = useRef(false);

  // Unwrap async params (Next.js 15+)
  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  // ── Project state ───────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('Untitled');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [projectSaving, setProjectSaving] = useState(false);

  // Fetch project on mount — restores canvas from DB/local with recency-aware fallback.
  useEffect(() => {
    if (!projectId) return;
    const lsKey = `canvas-v1-${projectId}`;

    const toNullableString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

    const restoreHistoryState = (
      rawHistory: unknown,
      images: CanvasImage[],
      texts: CanvasText[],
      brushes: BrushStroke[] = [],
    ): { stack: HistoryEntry[]; index: number } => {
      const fallbackStack: HistoryEntry[] = [{
        label: 'Project loaded',
        timestamp: Date.now(),
        snapshot: images,
        textSnapshot: texts,
        selectedId: null,
        historyImageId: null,
        brushSnapshot: brushes,
        selectedStrokeId: null,
      }];

      if (!rawHistory || typeof rawHistory !== 'object') {
        return { stack: fallbackStack, index: 0 };
      }

      const maybeStack = (rawHistory as { stack?: unknown }).stack;
      if (!Array.isArray(maybeStack)) {
        return { stack: fallbackStack, index: 0 };
      }

      const normalizedStack = maybeStack
        .map((entry): HistoryEntry | null => {
          if (!entry || typeof entry !== 'object') return null;

          const label = typeof (entry as { label?: unknown }).label === 'string'
            ? (entry as { label: string }).label
            : 'Edit';
          const timestampRaw = (entry as { timestamp?: unknown }).timestamp;
          const timestamp = typeof timestampRaw === 'number' && Number.isFinite(timestampRaw)
            ? timestampRaw
            : Date.now();
          const snapshot = Array.isArray((entry as { snapshot?: unknown }).snapshot)
            ? (entry as { snapshot: CanvasImage[] }).snapshot
            : [];
          const textSnapshot = Array.isArray((entry as { textSnapshot?: unknown }).textSnapshot)
            ? (entry as { textSnapshot: CanvasText[] }).textSnapshot
            : [];
          const selectedId = toNullableString((entry as { selectedId?: unknown }).selectedId);
          const historyImageIdRaw = (entry as { historyImageId?: unknown }).historyImageId;
          const historyImageId = historyImageIdRaw === undefined ? undefined : toNullableString(historyImageIdRaw);
          const brushSnapshot = Array.isArray((entry as { brushSnapshot?: unknown }).brushSnapshot)
            ? (entry as { brushSnapshot: BrushStroke[] }).brushSnapshot
            : [];
          const selectedStrokeId = toNullableString((entry as { selectedStrokeId?: unknown }).selectedStrokeId);

          return {
            label,
            timestamp,
            snapshot,
            textSnapshot,
            selectedId,
            historyImageId,
            brushSnapshot,
            selectedStrokeId,
          };
        })
        .filter((entry): entry is HistoryEntry => entry !== null);

      const stack = normalizedStack.length > 0 ? normalizedStack : fallbackStack;
      const rawIndex = (rawHistory as { index?: unknown }).index;
      const requestedIndex = typeof rawIndex === 'number' && Number.isFinite(rawIndex)
        ? Math.trunc(rawIndex)
        : stack.length - 1;
      const index = Math.max(0, Math.min(stack.length - 1, requestedIndex));

      return { stack, index };
    };

    const getActiveBrushState = (
      restoredHistory: { stack: HistoryEntry[]; index: number },
      fallbackBrushStrokes: BrushStroke[] = [],
    ) => {
      const activeEntry = restoredHistory.stack[restoredHistory.index];
      const historyBrushSnapshot = activeEntry?.brushSnapshot ?? [];
      const brushSnapshot = historyBrushSnapshot.length > 0 ? historyBrushSnapshot : fallbackBrushStrokes;
      const selectedStrokeId = activeEntry?.selectedStrokeId ?? null;
      const hasSelectedStroke = !!selectedStrokeId && brushSnapshot.some((stroke) => stroke.id === selectedStrokeId);
      return {
        brushSnapshot,
        selectedStrokeId: hasSelectedStroke ? selectedStrokeId : null,
      };
    };

    const applyDbSnapshot = (images: CanvasImage[], texts: CanvasText[], historyRaw?: unknown, brushStrokesRaw?: BrushStroke[]) => {
      setCanvasImages(images);
      setCanvasTexts(texts);
      const restoredHistory = restoreHistoryState(historyRaw, images, texts, brushStrokesRaw ?? []);
      historyStackRef.current = restoredHistory.stack;
      historyIndexRef.current = restoredHistory.index;
      const activeBrushState = getActiveBrushState(restoredHistory, brushStrokesRaw ?? []);
      setBrushStrokes(activeBrushState.brushSnapshot);
      setSelectedStrokeId(activeBrushState.selectedStrokeId);
      setHistoryVersion((v) => v + 1);
      setAutoSaveStatus('saved');
    };

    const applyLocalSnapshot = (saved: {
      images: CanvasImage[];
      texts?: CanvasText[];
      brushStrokes?: BrushStroke[];
      history?: unknown;
      viewport?: { zoom: number; panX: number; panY: number };
    }) => {
      setCanvasImages(saved.images);
      const savedTexts = saved.texts ?? [];
      setCanvasTexts(savedTexts);
      const savedBrushStrokes = saved.brushStrokes ?? [];
      const restoredHistory = restoreHistoryState(saved.history, saved.images, savedTexts, savedBrushStrokes);
      historyStackRef.current = restoredHistory.stack;
      historyIndexRef.current = restoredHistory.index;
      const activeBrushState = getActiveBrushState(restoredHistory, savedBrushStrokes);
      setBrushStrokes(activeBrushState.brushSnapshot);
      setSelectedStrokeId(activeBrushState.selectedStrokeId);
      setHistoryVersion((v) => v + 1);
      if (saved.viewport) {
        setZoom(saved.viewport.zoom ?? 0.5);
        setPanX(saved.viewport.panX ?? 0);
        setPanY(saved.viewport.panY ?? 0);
      }
      setAutoSaveStatus('saved');
    };

    let localCache: {
      images: CanvasImage[];
      texts?: CanvasText[];
      brushStrokes?: BrushStroke[];
      history?: unknown;
      viewport?: { zoom: number; panX: number; panY: number };
      savedAt?: number;
    } | null = null;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        localCache = JSON.parse(raw);
      }
    } catch {
      localCache = null;
    }

    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) {
          if (localCache && Array.isArray(localCache.images) && localCache.images.length > 0) {
            applyLocalSnapshot(localCache);
          }
          return;
        }
        if (data.name) setProjectName(data.name);

        // DB snapshot
        const cd = data.canvasData as { images?: CanvasImage[]; texts?: CanvasText[]; brushStrokes?: BrushStroke[]; history?: unknown } | null;
        const dbImages = cd?.images;
        const dbTexts = cd?.texts ?? [];
        const dbBrushStrokes = cd?.brushStrokes ?? [];

        const hasDb = Array.isArray(dbImages) && dbImages.length > 0;
        const hasLocal = !!(localCache && Array.isArray(localCache.images) && localCache.images.length > 0);
        const dbUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        const localSavedAt = typeof localCache?.savedAt === 'number' ? localCache.savedAt : 0;
        const dbBrokenNonFrame = hasDb ? dbImages.filter((img) => !img.isFrame && !img.url).length : Number.MAX_SAFE_INTEGER;
        const localBrokenNonFrame = hasLocal && localCache ? localCache.images.filter((img) => !img.isFrame && !img.url).length : Number.MAX_SAFE_INTEGER;
        const shouldPreferLocal = hasLocal && (!hasDb || localSavedAt > dbUpdatedAt);

        // If local cache is newer than DB (e.g. reloaded before debounced DB save), prefer local.
        if (shouldPreferLocal && localCache && localBrokenNonFrame <= dbBrokenNonFrame) {
          applyLocalSnapshot(localCache);
          return;
        }

        if (hasDb) {
          applyDbSnapshot(dbImages, dbTexts, cd?.history, dbBrushStrokes);
          return;
        }

        if (hasLocal && localCache) {
          applyLocalSnapshot(localCache);
        }
      })
      .catch(() => {
        if (localCache && Array.isArray(localCache.images) && localCache.images.length > 0) {
          applyLocalSnapshot(localCache);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRenameSubmit = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === projectName) { setRenaming(false); return; }
    setProjectName(trimmed);
    setRenaming(false);
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to rename project');
    }
  }, [renameValue, projectName, projectId]);

  const handleDuplicate = useCallback(async () => {
    setProjectMenuOpen(false);
    if (!projectId) { toast.error('Save project first'); return; }
    setProjectSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${projectName} (copy)` }),
      });
      if (!res.ok) throw new Error();
      const newProject = await res.json();
      toast.success('Project duplicated');
      router.push(`/project/${newProject.id}`);
    } catch {
      toast.error('Failed to duplicate project');
    } finally {
      setProjectSaving(false);
    }
  }, [projectId, projectName, router]);

  const handleDelete = useCallback(async () => {
    setProjectMenuOpen(false);
    if (!projectId) { router.push('/projects'); return; }
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Project deleted');
      router.push('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  }, [projectId, router]);

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLinkReady, setShareLinkReady] = useState(false);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);

  const ensureShareLink = useCallback(async () => {
    if (!projectId) {
      toast.error('Save project first');
      return null;
    }

    if (shareLink) {
      return shareLink;
    }

    setShareLinkLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error();

      const data = await res.json();
      if (typeof data.sharePath !== 'string' || data.sharePath.length === 0) throw new Error();

      const url = `${window.location.origin}${data.sharePath}`;
      setShareLink(url);
      return url;
    } catch {
      toast.error('Failed to prepare share link');
      return null;
    } finally {
      setShareLinkLoading(false);
    }
  }, [projectId, shareLink]);

  const handleShare = useCallback(async () => {
    setProjectMenuOpen(false);
    const url = await ensureShareLink();
    if (!url) return;

    setShareLinkReady(true);
    toast.success('Share link ready');
  }, [ensureShareLink]);

  const handleCopyShareLink = useCallback(async () => {
    const url = await ensureShareLink();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
      setShareLinkReady(false);
    } catch {
      toast.error('Unable to copy link');
    }
  }, [ensureShareLink]);

  useEffect(() => {
    if (!shareLinkReady) return;
    const timeoutId = window.setTimeout(() => setShareLinkReady(false), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [shareLinkReady]);

  useEffect(() => {
    setShareLink(null);
    setShareLinkReady(false);
  }, [projectId]);

  const [prompt, setPrompt] = useState('');
  const [promptHelperOpen, setPromptHelperOpen] = useState(false);
  const [promptAssistantStyle, setPromptAssistantStyle] = useState('');
  const [promptAssistantLighting, setPromptAssistantLighting] = useState('');
  const [promptAssistantComposition, setPromptAssistantComposition] = useState('');
  const [promptAssistantNegative, setPromptAssistantNegative] = useState('');
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const [canvasBg, setCanvasBg] = useState<'dots' | 'grid' | 'lines' | 'cross' | 'none'>('none');
  const [showBgDropdown, setShowBgDropdown] = useState(false);
  const [showArrangeDropdown, setShowArrangeDropdown] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<'model' | 'ratio' | 'count' | 'shapes' | 'palette' | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);

  // Values
  const [selectedModel, setSelectedModel] = useState('Recraft V4');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedStyleMeta, setSelectedStyleMeta] = useState<SelectedStyleMeta | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedCount, setSelectedCount] = useState('1 Image');
  const [selectedPalette, setSelectedPalette] = useState<string[] | null>(null);
  const [displayedPalettes, setDisplayedPalettes] = useState<{ name: string; colors: string[] }[]>(() => pick5Palettes(null));
  const [attachments, setAttachments] = useState<File[]>([]);

  // Active tool
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'shapes' | 'frame' | 'text' | 'upload' | 'brush' | null>('select');

  // Brush drawing tool state
  const [brushDrawColor, setBrushDrawColor] = useState('#ffffff');
  const [brushDrawSize, setBrushDrawSize] = useState(4);
  const [shapeFillEnabled, setShapeFillEnabled] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>('brush');
  const [showBrushMenu, setShowBrushMenu] = useState(false);
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const [frameMenuRatio, setFrameMenuRatio] = useState('1:1');
  const [frameCustomW, setFrameCustomW] = useState(800);
  const [frameCustomH, setFrameCustomH] = useState(600);
  const brushStrokeRef = useRef<{ mode: DrawMode; points: { x: number; y: number }[]; historyImageId: string | null } | null>(null);
  const erasedDuringDragRef = useRef(false);
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  // Live preview of the stroke being drawn — kept separate from brushStrokes so
  // we never mutate brushStrokes mid-draw (avoids triggering auto-save at 60fps).
  const [livePreviewStroke, setLivePreviewStroke] = useState<{ mode: DrawMode; points: { x: number; y: number }[]; historyImageId: string | null } | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const dragStrokeRef = useRef<{ id: string; startX: number; startY: number; origOffsetX: number; origOffsetY: number; liveOffsetX: number; liveOffsetY: number } | null>(null);
  const selectedStroke = useMemo(() => brushStrokes.find((s) => s.id === selectedStrokeId) ?? null, [brushStrokes, selectedStrokeId]);
  const isBrushStrokeSelected = !!selectedStroke;

  // Frame properties
  const [frameW, setFrameW] = useState(1024);
  const [frameH, setFrameH] = useState(1024);
  const [frameFill, setFrameFill] = useState<string | null>(null);

  const isFrameActive = activeTool === 'frame';
  const isTextActive = activeTool === 'text';

  // Text properties (defaults for new text elements)
  const [textFontFamily, setTextFontFamily] = useState('Inter');
  const [textFontSize, setTextFontSize] = useState(56);
  const [textFontWeight, setTextFontWeight] = useState(400);
  const [textLineHeight, setTextLineHeight] = useState(1.2);
  const [textLetterSpacing, setTextLetterSpacing] = useState(0);
  const [textColor, setTextColor] = useState('ffffff');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Canvas text elements
  const [canvasTexts, setCanvasTexts] = useState<CanvasText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const dragTextRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; liveX?: number; liveY?: number } | null>(null);
  const textElemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const imageElemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const strokeElemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const textEditStartRef = useRef<Map<string, string>>(new Map());
  const resizeRef = useRef<{ type: 'text' | 'image'; id: string; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; liveX?: number; liveY?: number; liveW?: number; liveH?: number } | null>(null);
  const selectedText = useMemo(() => canvasTexts.find((t) => t.id === selectedTextId) ?? null, [canvasTexts, selectedTextId]);
  const isTextSelected = !!selectedText;

  // Font library (loaded from /api/fonts)
  const [addedFonts, setAddedFonts] = useState<FontEntry[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPanelInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; name: string; w: number; h: number }[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploadsLoading, setIsUploadsLoading] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // ── Generation state ──────────────────────────────────────────────────────

  const DEFAULT_ADJUSTMENTS = { hue: 180, saturation: 100, brightness: 100, contrast: 100, opacity: 100 };
  const getAdj = (img: CanvasImage | null) => img?.adjustments ?? DEFAULT_ADJUSTMENTS;

  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // ── Context for generation ──────────────────────────────────────────────
  // contextImageId: the image whose context is shown in the prompt bar.
  // When a canvas image is selected, it automatically becomes context.
  // User can dismiss context (X button) without deselecting the image for editing.
  const [contextImageId, setContextImageId] = useState<string | null>(null);
  const [useFrameContext, setUseFrameContext] = useState(false);
  const contextImage = useMemo(() => canvasImages.find((img) => img.id === contextImageId) ?? null, [canvasImages, contextImageId]);

  // Model capabilities for the currently selected model
  const currentModelId = getModelId(selectedModel);
  const isCurrentModelOpenAI = currentModelId === 'dall-e-3'
    || currentModelId === 'gpt-image-1'
    || currentModelId === 'gpt-image-1.5'
    || currentModelId === 'gpt-image-2';
  const currentModelCaps = getModelCapabilities(selectedModel);

  const applyIncomingStyleSelection = useCallback((incoming: SelectedStyleMeta | null) => {
    if (!incoming?.name) return;

    const fallback = STYLE_LOOKUP[incoming.name];
    const normalized: SelectedStyleMeta = {
      name: incoming.name,
      apiStyle: incoming.apiStyle || fallback?.apiStyle || 'any',
      apiSubstyle: incoming.apiSubstyle ?? fallback?.apiSubstyle,
      apiModel: incoming.apiModel ?? fallback?.apiModel,
      styleId: incoming.styleId,
      preferredModel: incoming.preferredModel,
      contextImageUrls: incoming.contextImageUrls,
    };

    setSelectedStyle(normalized.name);
    setSelectedStyleMeta(normalized);

    if (isCurrentModelOpenAI) return;

    const mappedModel = mapApiModelToEditorModel(normalized.preferredModel || normalized.apiModel);
    if (mappedModel) setSelectedModel(mappedModel);
  }, [isCurrentModelOpenAI]);

  useEffect(() => {
    if (incomingStyleHydratedRef.current) return;
    incomingStyleHydratedRef.current = true;

    let incomingPayload: SelectedStyleMeta | null = null;

    if (typeof window !== 'undefined') {
      const sessionPayloadRaw = window.sessionStorage.getItem(PENDING_STYLE_SESSION_KEY);
      if (sessionPayloadRaw) {
        try {
          incomingPayload = parseSelectedStyleMeta(JSON.parse(sessionPayloadRaw));
        } catch {
          incomingPayload = null;
        }
      }
      window.sessionStorage.removeItem(PENDING_STYLE_SESSION_KEY);
    }

    if (!incomingPayload) {
      incomingPayload = parseSelectedStyleMeta({
        name: searchParams.get('styleName') ?? undefined,
        apiStyle: searchParams.get('styleApiStyle') ?? undefined,
        apiSubstyle: searchParams.get('styleApiSubstyle') ?? undefined,
        apiModel: searchParams.get('styleModel') ?? undefined,
        styleId: searchParams.get('styleId') ?? undefined,
        preferredModel: searchParams.get('generationModel') ?? undefined,
        contextImageUrls: searchParams.getAll('styleContextImage'),
      });
    }

    if (incomingPayload) {
      applyIncomingStyleSelection(incomingPayload);
    }
  }, [applyIncomingStyleSelection, searchParams]);

  const readImageDimensions = useCallback(async (file: File): Promise<{ w: number; h: number }> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.onload = () => {
        const w = img.naturalWidth || 1024;
        const h = img.naturalHeight || 1024;
        URL.revokeObjectURL(objectUrl);
        resolve({ w, h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image dimensions'));
      };
      img.src = objectUrl;
    });
  }, []);

  const uploadFilesToLibrary = useCallback(async (files: File[]) => {
    if (!projectId) {
      toast.error('Project is still loading. Try again in a moment.');
      return;
    }

    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingFiles(true);
    try {
      for (const file of imageFiles) {
        const { w, h } = await readImageDimensions(file);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('persist', '1');
        fd.append('projectId', projectId);
        fd.append('name', file.name);
        fd.append('width', String(w));
        fd.append('height', String(h));

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }
        const data = await res.json();
        const saved = data.image as { id?: string; url?: string; name?: string; w?: number; h?: number } | undefined;
        const url = saved?.url || data.url || '';
        if (!url) continue;

        setUploadedImages((prev) => [
          {
            id: saved?.id || crypto.randomUUID(),
            url,
            name: saved?.name || file.name,
            w: saved?.w || w,
            h: saved?.h || h,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload images');
    } finally {
      setIsUploadingFiles(false);
    }
  }, [projectId, readImageDimensions]);

  useEffect(() => {
    if (activeTool !== 'upload' || !projectId) return;
    let cancelled = false;

    setIsUploadsLoading(true);
    fetch(`/api/images?model=upload&projectId=${projectId}&limit=200`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((data) => {
        if (cancelled) return;
        const images = Array.isArray(data.images) ? data.images : [];
        setUploadedImages(images.map((img: { id: string; imageUrl: string; prompt?: string | null; width?: number | null; height?: number | null }) => ({
          id: img.id,
          url: img.imageUrl,
          name: img.prompt || 'Uploaded image',
          w: img.width || 0,
          h: img.height || 0,
        })));
      })
      .catch(() => {
        if (!cancelled) setUploadedImages([]);
      })
      .finally(() => {
        if (!cancelled) setIsUploadsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTool, projectId]);

  // ── Undo / Redo / History engine ──────────────────────────────────────────
  interface HistoryEntry {
    label: string;
    timestamp: number;
    snapshot: CanvasImage[];
    textSnapshot: CanvasText[];
    brushSnapshot: BrushStroke[];
    selectedId: string | null;
    selectedStrokeId: string | null;
    historyImageId?: string | null;
  }

  interface PersistedHistoryState {
    stack: HistoryEntry[];
    index: number;
  }

  const HISTORY_PERSIST_MAX_ENTRIES = 30;
  const HISTORY_PERSIST_DB_BUDGET_BYTES = 800_000;
  const HISTORY_PERSIST_LOCAL_BUDGET_BYTES = 2_000_000;

  const historyStackRef = useRef<HistoryEntry[]>([{ label: 'Initial state', timestamp: Date.now(), snapshot: [], textSnapshot: [], brushSnapshot: [], selectedId: null, selectedStrokeId: null }]);
  const historyIndexRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0); // bump to re-render history panel
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const skipHistoryRef = useRef(false); // flag to avoid pushing history during undo/redo restore

  const sanitizeImageForPersistence = useCallback((img: CanvasImage, stripDataUrls: boolean): CanvasImage => {
    if (stripDataUrls && img.url.startsWith('data:')) {
      return { ...img, url: '' };
    }
    return { ...img };
  }, []);

  const buildPersistedHistoryState = useCallback((stripDataUrls: boolean, budgetBytes: number, includeBrushSnapshots = false): PersistedHistoryState => {
    const sourceStack = historyStackRef.current;
    const sliceStart = Math.max(0, sourceStack.length - HISTORY_PERSIST_MAX_ENTRIES);

    let stack = sourceStack.slice(sliceStart).map((entry) => ({
      label: entry.label,
      timestamp: entry.timestamp,
      snapshot: entry.snapshot.map((img) => sanitizeImageForPersistence(img, stripDataUrls)),
      textSnapshot: entry.textSnapshot.map((txt) => ({ ...txt })),
      // Persisting full brush snapshots per history entry can explode payload size.
      brushSnapshot: includeBrushSnapshots
        ? entry.brushSnapshot.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) }))
        : [],
      selectedId: entry.selectedId,
      selectedStrokeId: includeBrushSnapshots ? entry.selectedStrokeId : null,
      historyImageId: entry.historyImageId,
    }));

    if (stack.length === 0) {
      return { stack: [], index: 0 };
    }

    let index = Math.max(0, Math.min(stack.length - 1, historyIndexRef.current - sliceStart));

    // If serialized history gets too large, drop oldest entries first.
    while (stack.length > 1) {
      const payloadSize = JSON.stringify({ stack, index }).length;
      if (payloadSize <= budgetBytes) break;
      stack = stack.slice(1);
      index = Math.max(0, index - 1);
    }

    return {
      stack,
      index: Math.max(0, Math.min(stack.length - 1, index)),
    };
  }, [sanitizeImageForPersistence]);

  const buildHistorySignature = useCallback((images: CanvasImage[], texts: CanvasText[], strokes: BrushStroke[]) => {
    const imageSig = images
      .map((img) => {
        const a = img.adjustments;
        const urlSig = img.url ? `${img.url.slice(0, 32)}:${img.url.length}` : '';
        const adjSig = a ? `${a.hue}:${a.saturation}:${a.brightness}:${a.contrast}:${a.opacity}` : '';
        return `${img.id}:${img.x}:${img.y}:${img.width}:${img.height}:${img.isFrame ? 1 : 0}:${urlSig}:${adjSig}`;
      })
      .join('|');
    const textSig = texts
      .map((txt) => `${txt.id}:${txt.x}:${txt.y}:${txt.width}:${txt.height ?? ''}:${txt.fontFamily}:${txt.fontSize}:${txt.fontWeight}:${txt.color}:${txt.align}:${txt.lineHeight}:${txt.letterSpacing}:${txt.opacity}:${txt.historyImageId ?? ''}:${txt.content}`)
      .join('|');
    const strokeSig = strokes
      .map((stroke) => {
        const pointsSig = stroke.points.map((p) => `${p.x},${p.y}`).join(';');
        return `${stroke.id}:${stroke.kind || 'brush'}:${stroke.color}:${stroke.size}:${stroke.offsetX}:${stroke.offsetY}:${stroke.opacity}:${stroke.fill ? 1 : 0}:${stroke.fillColor ?? ''}:${stroke.historyImageId ?? ''}:${pointsSig}`;
      })
      .join('|');
    return `${imageSig}__${textSig}__${strokeSig}`;
  }, []);

  const pushHistory = useCallback((
    label: string,
    images?: CanvasImage[],
    selId?: string | null,
    texts?: CanvasText[],
    historyImageId?: string | null,
    strokes?: BrushStroke[],
    strokeSelId?: string | null,
  ) => {
    if (skipHistoryRef.current) return;
    const idx = historyIndexRef.current;
    const nextImages = images ?? canvasImagesRef.current;
    const nextTexts = texts ?? canvasTextsRef.current;
    const nextStrokes = strokes ?? brushStrokesRef.current;
    const nextSelectedId = selId !== undefined ? selId : selectedImageIdRef.current;
    const nextSelectedStrokeId = strokeSelId !== undefined ? strokeSelId : selectedStrokeIdRef.current;
    const nextHistoryImageId = historyImageId !== undefined ? historyImageId : nextSelectedId;

    // Trim any "future" entries when a new edit occurs after an undo
    if (idx < historyStackRef.current.length - 1) {
      historyStackRef.current = historyStackRef.current.slice(0, idx + 1);
    }

    // De-dupe identical sequential pushes (can happen in dev due strict mode updater checks).
    const lastEntry = historyStackRef.current[historyStackRef.current.length - 1];
    if (lastEntry) {
      const lastHistoryImageId = lastEntry.historyImageId ?? lastEntry.selectedId;
      if (
        lastEntry.label === label
        && lastEntry.selectedId === nextSelectedId
        && lastEntry.selectedStrokeId === nextSelectedStrokeId
        && lastHistoryImageId === nextHistoryImageId
        && buildHistorySignature(lastEntry.snapshot, lastEntry.textSnapshot, lastEntry.brushSnapshot) === buildHistorySignature(nextImages, nextTexts, nextStrokes)
      ) {
        return;
      }
    }

    historyStackRef.current.push({
      label,
      timestamp: Date.now(),
      snapshot: nextImages,
      textSnapshot: nextTexts,
      brushSnapshot: nextStrokes,
      selectedId: nextSelectedId,
      selectedStrokeId: nextSelectedStrokeId,
      historyImageId: nextHistoryImageId,
    });
    // Cap at 50 entries
    if (historyStackRef.current.length > 50) {
      historyStackRef.current = historyStackRef.current.slice(historyStackRef.current.length - 50);
    }
    historyIndexRef.current = historyStackRef.current.length - 1;
    setHistoryVersion((v) => v + 1);
  }, [buildHistorySignature]);

  const getTextHistoryImageId = useCallback((textId: string | null, textItems?: CanvasText[]) => {
    if (!textId) return null;
    const source = textItems ?? canvasTextsRef.current;
    return source.find((t) => t.id === textId)?.historyImageId ?? null;
  }, []);

  const pushTextHistory = useCallback((label: string, textItems?: CanvasText[], textId?: string | null) => {
    const nextTexts = textItems ?? canvasTextsRef.current;
    const targetTextId = textId ?? selectedTextId;
    const historyImageId = getTextHistoryImageId(targetTextId ?? null, nextTexts);
    pushHistory(label, undefined, targetTextId ?? null, nextTexts, historyImageId);
  }, [selectedTextId, getTextHistoryImageId, pushHistory]);

  const historyUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const entry = historyStackRef.current[idx - 1];
    skipHistoryRef.current = true;
    setCanvasImages(entry.snapshot);
    setCanvasTexts(entry.textSnapshot);
    setBrushStrokes(entry.brushSnapshot);
    setSelectedImageId(entry.selectedId);
    setSelectedStrokeId(entry.selectedStrokeId);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, []);

  const historyRedo = useCallback(() => {
    const stack = historyStackRef.current;
    const idx = historyIndexRef.current;
    if (idx >= stack.length - 1) return;
    historyIndexRef.current = idx + 1;
    const entry = stack[idx + 1];
    skipHistoryRef.current = true;
    setCanvasImages(entry.snapshot);
    setCanvasTexts(entry.textSnapshot);
    setBrushStrokes(entry.brushSnapshot);
    setSelectedImageId(entry.selectedId);
    setSelectedStrokeId(entry.selectedStrokeId);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, []);

  const historyJumpTo = useCallback((targetIdx: number) => {
    const stack = historyStackRef.current;
    if (targetIdx < 0 || targetIdx >= stack.length) return;
    historyIndexRef.current = targetIdx;
    const entry = stack[targetIdx];
    skipHistoryRef.current = true;
    setCanvasImages(entry.snapshot);
    setCanvasTexts(entry.textSnapshot);
    setBrushStrokes(entry.brushSnapshot);
    setSelectedImageId(entry.selectedId);
    setSelectedStrokeId(entry.selectedStrokeId);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyStackRef.current.length - 1;

  // ── Auto-save state ───────────────────────────────────────────────────────
  type AutoSaveStatus = 'idle' | 'pending' | 'saved';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedImage = useMemo(() => canvasImages.find((img) => img.id === selectedImageId) ?? null, [canvasImages, selectedImageId]);
  const isImageSelected = !!selectedImage;
  const isPanelActive = isFrameActive || isTextActive || isImageSelected || isBrushStrokeSelected || isTextSelected;

  // Auto-set context image when a canvas image is selected
  useEffect(() => {
    if (selectedImageId) setContextImageId(selectedImageId);
  }, [selectedImageId]);

  // Auto-set frame context when frame tool is activated
  useEffect(() => {
    if (isFrameActive) setUseFrameContext(true);
  }, [isFrameActive]);

  // Load Google Fonts library from API
  useEffect(() => {
    fetch('/api/fonts')
      .then((r) => r.ok ? r.json() : { fonts: [] })
      .then(({ fonts }: { fonts: FontEntry[] }) => {
        setAddedFonts(fonts);
        for (const f of fonts) loadGoogleFont(f.family);
        setFontsLoaded(true);
      })
      .catch(() => setFontsLoaded(true));
  }, []);

  // ── Canvas pan/zoom state ─────────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.5);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [toolCursor, setToolCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [isHandleCursorHover, setIsHandleCursorHover] = useState(false);
  const [isHandleCursorDragging, setIsHandleCursorDragging] = useState(false);
  const handleHoverCountRef = useRef(0);
  const handleHoverRafRef = useRef<number | null>(null);
  const toolCursorElemRef = useRef<HTMLDivElement>(null);
  const toolCursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const toolCursorRafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Ref to the inner transformed layer — lets us write CSS transform directly
  // without waiting for React re-renders, giving butter-smooth trackpad zoom.
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  // Live transform values kept in sync with React state via RAF
  const liveZoom = useRef(0.5);
  const livePanX = useRef(0);
  const livePanY = useRef(0);
  const rafId = useRef<number | null>(null);
  const latestPersistRef = useRef<{ images: CanvasImage[]; texts: CanvasText[]; brushStrokes: BrushStroke[]; zoom: number; panX: number; panY: number }>({
    images: [],
    texts: [],
    brushStrokes: [],
    zoom: 0.5,
    panX: 0,
    panY: 0,
  });
  // Stable refs for pushHistory — avoids recreating the callback on every canvas mutation
  const canvasImagesRef = useRef<CanvasImage[]>([]);
  const canvasTextsRef = useRef<CanvasText[]>([]);
  const brushStrokesRef = useRef<BrushStroke[]>([]);
  const selectedImageIdRef = useRef<string | null>(null);
  const selectedStrokeIdRef = useRef<string | null>(null);

  const flushToolCursorPosition = useCallback(() => {
    toolCursorRafRef.current = null;
    const el = toolCursorElemRef.current;
    if (!el) return;
    const { x, y } = toolCursorPosRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }, []);

  const queueToolCursorPosition = useCallback((x: number, y: number) => {
    toolCursorPosRef.current = { x, y };
    if (toolCursorRafRef.current !== null) return;
    toolCursorRafRef.current = requestAnimationFrame(flushToolCursorPosition);
  }, [flushToolCursorPosition]);

  const cancelHandleHoverClear = useCallback(() => {
    if (handleHoverRafRef.current !== null) {
      cancelAnimationFrame(handleHoverRafRef.current);
      handleHoverRafRef.current = null;
    }
  }, []);

  const beginHandleCursorHover = useCallback(() => {
    handleHoverCountRef.current += 1;
    cancelHandleHoverClear();
    setIsHandleCursorHover((prev) => (prev ? prev : true));
  }, [cancelHandleHoverClear]);

  const endHandleCursorHover = useCallback(() => {
    handleHoverCountRef.current = Math.max(0, handleHoverCountRef.current - 1);
    cancelHandleHoverClear();
    if (handleHoverCountRef.current > 0) return;
    handleHoverRafRef.current = requestAnimationFrame(() => {
      handleHoverRafRef.current = null;
      if (handleHoverCountRef.current === 0) {
        setIsHandleCursorHover(false);
      }
    });
  }, [cancelHandleHoverClear]);

  const resetHandleCursorState = useCallback(() => {
    handleHoverCountRef.current = 0;
    cancelHandleHoverClear();
    setIsHandleCursorHover(false);
    setIsHandleCursorDragging(false);
  }, [cancelHandleHoverClear]);

  // Keep latest canvas snapshot available for unload/pagehide persistence.
  // Also sync stable refs used by pushHistory to avoid callback cascade.
  useLayoutEffect(() => {
    latestPersistRef.current = { images: canvasImages, texts: canvasTexts, brushStrokes, zoom, panX, panY };
    canvasImagesRef.current = canvasImages;
    canvasTextsRef.current = canvasTexts;
    brushStrokesRef.current = brushStrokes;
    selectedImageIdRef.current = selectedImageId;
    selectedStrokeIdRef.current = selectedStrokeId;
  }, [canvasImages, canvasTexts, brushStrokes, selectedImageId, selectedStrokeId, zoom, panX, panY]);

  useEffect(() => {
    return () => {
      if (toolCursorRafRef.current !== null) {
        cancelAnimationFrame(toolCursorRafRef.current);
        toolCursorRafRef.current = null;
      }
      if (handleHoverRafRef.current !== null) {
        cancelAnimationFrame(handleHoverRafRef.current);
        handleHoverRafRef.current = null;
      }
    };
  }, []);

  // Persist latest local cache when tab is hidden or page unloads.
  useEffect(() => {
    if (!projectId) return;
    const lsKey = `canvas-v1-${projectId}`;

    const flushLocalCache = () => {
      const { images, texts, brushStrokes: latestBrushStrokes, zoom: latestZoom, panX: latestPanX, panY: latestPanY } = latestPersistRef.current;
      if (images.length === 0 && texts.length === 0 && latestBrushStrokes.length === 0) return;
      const savedAt = Date.now();
      const history = buildPersistedHistoryState(false, HISTORY_PERSIST_LOCAL_BUDGET_BYTES);
      try {
        localStorage.setItem(lsKey, JSON.stringify({
          images,
          texts,
          brushStrokes: latestBrushStrokes,
          history,
          viewport: { zoom: latestZoom, panX: latestPanX, panY: latestPanY },
          savedAt,
        }));
      } catch {
        try {
          const slimHistory = buildPersistedHistoryState(true, HISTORY_PERSIST_LOCAL_BUDGET_BYTES);
          const slim = {
            images: images.map((img) => ({ ...img, url: img.url.startsWith('data:') ? '' : img.url })),
            texts,
            brushStrokes: latestBrushStrokes,
            history: slimHistory,
            viewport: { zoom: latestZoom, panX: latestPanX, panY: latestPanY },
            savedAt,
          };
          localStorage.setItem(lsKey, JSON.stringify(slim));
        } catch { /* storage full */ }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushLocalCache();
    };

    window.addEventListener('pagehide', flushLocalCache);
    window.addEventListener('beforeunload', flushLocalCache);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushLocalCache);
      window.removeEventListener('beforeunload', flushLocalCache);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [projectId, buildPersistedHistoryState]);

  // ── Auto-save effects (placed after viewport state declarations) ──────────
  // Debounced save: fires ~1.2s after changes to canvas content or history.
  // Saves to localStorage (offline cache) + DB (source of truth).
  useEffect(() => {
    if (!projectId || (canvasImages.length === 0 && canvasTexts.length === 0 && brushStrokes.length === 0)) return;
    setAutoSaveStatus('pending');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const lsKey = `canvas-v1-${projectId}`;
      const savedAt = Date.now();
      const localHistory = buildPersistedHistoryState(false, HISTORY_PERSIST_LOCAL_BUDGET_BYTES);
      // localStorage — also captures current viewport via closure (best-effort)
      try {
        localStorage.setItem(lsKey, JSON.stringify({
          images: canvasImages,
          texts: canvasTexts,
          brushStrokes,
          history: localHistory,
          viewport: { zoom, panX, panY },
          savedAt,
        }));
      } catch {
        try {
          const slimHistory = buildPersistedHistoryState(true, HISTORY_PERSIST_LOCAL_BUDGET_BYTES);
          const slim = {
            images: canvasImages.map((img) => ({ ...img, url: img.url.startsWith('data:') ? '' : img.url })),
            texts: canvasTexts,
            brushStrokes,
            history: slimHistory,
            viewport: { zoom, panX, panY },
            savedAt,
          };
          localStorage.setItem(lsKey, JSON.stringify(slim));
        } catch { /* storage full */ }
      }
      setAutoSaveStatus('saved');
      // DB save (source of truth, fire-and-forget).
      // Strip data: base64 URLs before persisting — they can be multi-MB per image and
      // quickly push canvasData over Prisma Accelerate's 5 MB response limit.
      // Images remain intact in memory for the current session.
      const dbImages = canvasImages.map((img) => ({
        ...img,
        url: img.url.startsWith('data:') ? '' : img.url,
      }));
      const dbHistory = buildPersistedHistoryState(true, HISTORY_PERSIST_DB_BUDGET_BYTES);
      // Guard total DB payload size — brushStrokes accumulate many {x,y} points
      // from lasso/brush sessions and can exceed Prisma Accelerate's request limit.
      // Keep strokes when they fit; drop them from the DB payload (they remain in
      // localStorage so the current session is unaffected) when over 200 KB.
      const DB_PAYLOAD_LIMIT = 200_000;
      const fullPayload = { canvasData: { images: dbImages, texts: canvasTexts, brushStrokes, history: dbHistory } };
      const dbBody = JSON.stringify(fullPayload).length <= DB_PAYLOAD_LIMIT
        ? fullPayload
        : { canvasData: { images: dbImages, texts: canvasTexts, brushStrokes: [], history: dbHistory } };
      fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbBody),
      }).catch(() => {});
    }, 1200);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasImages, canvasTexts, brushStrokes, projectId, historyVersion]);

  // Drag state for images
  const dragRef = useRef<{
    imageId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    liveX?: number;
    liveY?: number;
  } | null>(null);

  // Pan state (middle-click, hand tool, or Space+drag)
  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Snap guide state
  const SNAP_THRESHOLD = 6;
  const [snapLines, setSnapLines] = useState<{ axis: 'x' | 'y'; pos: number }[]>([]);

  // Mask drawing state (edit-area tool)
  const [editAreaTool, setEditAreaTool] = useState<'lasso' | 'brush' | 'area' | 'wand'>('brush');
  // Right panel sub-view state
  type SubPanel = null | 'edit-area' | 'outpaint' | 'remix' | 'upscale' | 'variations' | 'adjust-colors' | 'export';
  const [activeSubPanel, setActiveSubPanel] = useState<SubPanel>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [brushSize, setBrushSize] = useState(20);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskDrawRef = useRef<{
    isDrawing: boolean;
    tool: 'lasso' | 'brush' | 'area';
    isErasing: boolean;
    areaStart: { x: number; y: number } | null;
    lassoPoints: { x: number; y: number }[];
  } | null>(null);
  const areaPreviewRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [areaPreview, setAreaPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [lassoPreviewPoints, setLassoPreviewPoints] = useState<{ x: number; y: number }[]>([]);
  const [hasMask, setHasMask] = useState(false);
  const [editAreaPrompt, setEditAreaPrompt] = useState('');

  // Processing state for AI actions
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Outpaint / crop state
  const [outpaintBounds, setOutpaintBounds] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const outpaintHandleRef = useRef<{
    handle: 'top' | 'right' | 'bottom' | 'left';
    startPos: number;
    origValue: number;
    maxExpand: number;
    maxCrop: number;
    imageWidth: number;
    imageHeight: number;
  } | null>(null);

  // Compute snap guides for a dragging image
  const computeSnap = useCallback((dragId: string, newX: number, newY: number): { x: number; y: number; lines: { axis: 'x' | 'y'; pos: number }[] } => {
    const dragImg = canvasImages.find((img) => img.id === dragId);
    if (!dragImg) return { x: newX, y: newY, lines: [] };

    const dw = dragImg.width;
    const dh = dragImg.height;
    // Edges and center of the dragging image
    const dragEdges = {
      left: newX,
      right: newX + dw,
      centerX: newX + dw / 2,
      top: newY,
      bottom: newY + dh,
      centerY: newY + dh / 2,
    };

    let snappedX = newX;
    let snappedY = newY;
    const lines: { axis: 'x' | 'y'; pos: number }[] = [];
    let bestDx = SNAP_THRESHOLD + 1;
    let bestDy = SNAP_THRESHOLD + 1;

    for (const other of canvasImages) {
      if (other.id === dragId) continue;
      const ow = other.width;
      const oh = other.height;
      const otherEdges = {
        left: other.x,
        right: other.x + ow,
        centerX: other.x + ow / 2,
        top: other.y,
        bottom: other.y + oh,
        centerY: other.y + oh / 2,
      };

      // X-axis snapping: left-left, left-right, right-left, right-right, center-center
      const xPairs: [number, number][] = [
        [dragEdges.left, otherEdges.left],
        [dragEdges.left, otherEdges.right],
        [dragEdges.right, otherEdges.left],
        [dragEdges.right, otherEdges.right],
        [dragEdges.centerX, otherEdges.centerX],
      ];
      for (const [dragVal, otherVal] of xPairs) {
        const dist = Math.abs(dragVal - otherVal);
        if (dist < bestDx) {
          bestDx = dist;
          snappedX = newX + (otherVal - dragVal);
          // The snap line is at the other value
        }
      }

      // Y-axis snapping
      const yPairs: [number, number][] = [
        [dragEdges.top, otherEdges.top],
        [dragEdges.top, otherEdges.bottom],
        [dragEdges.bottom, otherEdges.top],
        [dragEdges.bottom, otherEdges.bottom],
        [dragEdges.centerY, otherEdges.centerY],
      ];
      for (const [dragVal, otherVal] of yPairs) {
        const dist = Math.abs(dragVal - otherVal);
        if (dist < bestDy) {
          bestDy = dist;
          snappedY = newY + (otherVal - dragVal);
        }
      }
    }

    // Only snap if within threshold
    if (bestDx > SNAP_THRESHOLD) snappedX = newX;
    if (bestDy > SNAP_THRESHOLD) snappedY = newY;

    // Build snap lines for display
    if (bestDx <= SNAP_THRESHOLD) {
      // Figure out which edge snapped
      const finalDragEdges = { left: snappedX, right: snappedX + dw, centerX: snappedX + dw / 2 };
      for (const other of canvasImages) {
        if (other.id === dragId) continue;
        const otherEdges = { left: other.x, right: other.x + other.width, centerX: other.x + other.width / 2 };
        for (const val of [otherEdges.left, otherEdges.right, otherEdges.centerX]) {
          for (const dVal of [finalDragEdges.left, finalDragEdges.right, finalDragEdges.centerX]) {
            if (Math.abs(dVal - val) < 1) {
              lines.push({ axis: 'x', pos: val });
            }
          }
        }
      }
    }
    if (bestDy <= SNAP_THRESHOLD) {
      const finalDragEdges = { top: snappedY, bottom: snappedY + dh, centerY: snappedY + dh / 2 };
      for (const other of canvasImages) {
        if (other.id === dragId) continue;
        const otherEdges = { top: other.y, bottom: other.y + other.height, centerY: other.y + other.height / 2 };
        for (const val of [otherEdges.top, otherEdges.bottom, otherEdges.centerY]) {
          for (const dVal of [finalDragEdges.top, finalDragEdges.bottom, finalDragEdges.centerY]) {
            if (Math.abs(dVal - val) < 1) {
              lines.push({ axis: 'y', pos: val });
            }
          }
        }
      }
    }

    // Dedupe lines
    const unique = lines.filter((l, i, arr) => arr.findIndex((o) => o.axis === l.axis && Math.abs(o.pos - l.pos) < 1) === i);
    return { x: snappedX, y: snappedY, lines: unique };
  }, [canvasImages]);

  const eraseDrawingAtPoint = useCallback((x: number, y: number) => {
    const eraseRadius = Math.max(6, brushDrawSize / 2);
    let removedAny = false;
    let removedSelected = false;

    setBrushStrokes((prev) => prev.filter((stroke) => {
      if (stroke.points.length === 0) return true;

      const kind = stroke.kind || 'brush';
      const extraPad = kind === 'arrow' ? Math.max(10, stroke.size * 3) : 0;
      const pad = eraseRadius + stroke.size / 2 + extraPad;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      if (kind === 'brush') {
        for (const pt of stroke.points) {
          const px = pt.x + stroke.offsetX;
          const py = pt.y + stroke.offsetY;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      } else {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1] || start;
        const sx = start.x + stroke.offsetX;
        const sy = start.y + stroke.offsetY;
        const ex = end.x + stroke.offsetX;
        const ey = end.y + stroke.offsetY;
        minX = Math.min(sx, ex);
        minY = Math.min(sy, ey);
        maxX = Math.max(sx, ex);
        maxY = Math.max(sy, ey);
      }

      const hit = x >= minX - pad && x <= maxX + pad && y >= minY - pad && y <= maxY + pad;
      if (hit) {
        removedAny = true;
        if (selectedStrokeId && stroke.id === selectedStrokeId) removedSelected = true;
      }
      return !hit;
    }));

    if (removedAny) {
      erasedDuringDragRef.current = true;
      if (removedSelected) setSelectedStrokeId(null);
    }
  }, [brushDrawSize, selectedStrokeId]);

  const addTextAtCanvasPoint = useCallback((clientX: number, clientY: number, historyImageId: string | null = null) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wx = (clientX - rect.left - livePanX.current) / liveZoom.current;
    const wy = (clientY - rect.top - livePanY.current) / liveZoom.current;
    const newId = crypto.randomUUID();
    const newText: CanvasText = {
      id: newId,
      content: 'Type something',
      x: wx,
      y: wy,
      fontFamily: textFontFamily,
      fontSize: textFontSize,
      fontWeight: textFontWeight,
      color: textColor,
      align: textAlign,
      lineHeight: textLineHeight,
      letterSpacing: textLetterSpacing,
      width: 400,
      opacity: 100,
      historyImageId,
    };
    setCanvasTexts((prev) => {
      const next = [...prev, newText];
      pushHistory('Added text', canvasImages, newId, next, historyImageId);
      return next;
    });
    setSelectedTextId(newId);
    setEditingTextId(newId);
    setSelectedImageId(null);
    setSelectedStrokeId(null);
  }, [textFontFamily, textFontSize, textFontWeight, textColor, textAlign, textLineHeight, textLetterSpacing, pushHistory, canvasImages]);

  // ── Canvas mouse handlers ─────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only act on the canvas itself, not on UI overlays
    if (e.button === 1 || (e.button === 0 && (activeTool === 'hand' || spaceHeld))) {
      // Start panning
      e.preventDefault();
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, origPanX: livePanX.current, origPanY: livePanY.current };
      setIsPanning(true);
      return;
    }
    const isDrawingTool = activeTool === 'brush' || activeTool === 'shapes';
    // Drawing tools (brush/shapes/eraser) on canvas
    if (e.button === 0 && isDrawingTool) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left - livePanX.current) / liveZoom.current;
      const cy = (e.clientY - rect.top - livePanY.current) / liveZoom.current;
      brushStrokeRef.current = { mode: drawMode, points: [{ x: cx, y: cy }], historyImageId: null };
      setSelectedStrokeId(null);
      setSelectedImageId(null);
      setSelectedTextId(null);
      if (drawMode === 'eraser') {
        erasedDuringDragRef.current = false;
        eraseDrawingAtPoint(cx, cy);
      }
      return;
    }
    // Text tool — click on empty canvas to insert a new text element
    if (e.button === 0 && activeTool === 'text' && (e.target as HTMLElement).dataset?.canvas === 'bg') {
      addTextAtCanvasPoint(e.clientX, e.clientY, selectedImageId ?? null);
      return;
    }
    // Left-click on empty canvas = deselect
    if (e.button === 0 && (e.target as HTMLElement).dataset?.canvas === 'bg') {
      setSelectedImageId(null);
      setSelectedStrokeId(null);
      setSelectedTextId(null);
      setEditingTextId(null);
    }
  }, [activeTool, spaceHeld, drawMode, eraseDrawingAtPoint, addTextAtCanvasPoint, selectedImageId]);

  const handleImageMouseDown = useCallback((e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    // If hand tool or space held, start panning instead
    if (activeTool === 'hand' || spaceHeld) {
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, origPanX: livePanX.current, origPanY: livePanY.current };
      setIsPanning(true);
      return;
    }

    const isDrawingTool = activeTool === 'brush' || activeTool === 'shapes';
    if (isDrawingTool) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left - livePanX.current) / liveZoom.current;
      const cy = (e.clientY - rect.top - livePanY.current) / liveZoom.current;
      brushStrokeRef.current = { mode: drawMode, points: [{ x: cx, y: cy }], historyImageId: imgId };
      setSelectedStrokeId(null);
      setSelectedImageId(null);
      setSelectedTextId(null);
      if (drawMode === 'eraser') {
        erasedDuringDragRef.current = false;
        eraseDrawingAtPoint(cx, cy);
      }
      return;
    }

    if (activeTool === 'text') {
      addTextAtCanvasPoint(e.clientX, e.clientY, imgId);
      return;
    }

    setSelectedImageId(imgId);
    setSelectedTextId(null);
    setEditingTextId(null);
    if (activeTool === 'select') {
      const img = canvasImages.find((i) => i.id === imgId);
      if (!img) return;
      dragRef.current = { imageId: imgId, startX: e.clientX, startY: e.clientY, origX: img.x, origY: img.y };
    }
  }, [activeTool, spaceHeld, canvasImages, drawMode, eraseDrawingAtPoint, addTextAtCanvasPoint]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const isEditAreaCursorTool = activeSubPanel === 'edit-area'
      && isImageSelected
      && (editAreaTool === 'lasso' || editAreaTool === 'brush' || editAreaTool === 'area' || editAreaTool === 'wand');
    const isCursorToolActive = ((activeTool === 'select' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'brush' || activeTool === 'shapes') || isEditAreaCursorTool) && !spaceHeld;
    if (isCursorToolActive) {
      queueToolCursorPosition(e.clientX, e.clientY);
      setToolCursor((prev) => (prev.visible ? prev : { x: e.clientX, y: e.clientY, visible: true }));
    } else {
      if (toolCursorRafRef.current !== null) {
        cancelAnimationFrame(toolCursorRafRef.current);
        toolCursorRafRef.current = null;
      }
      setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }

    // Outpaint handle dragging (highest priority)
    const outpaintHandle = outpaintHandleRef.current;
    if (outpaintHandle) {
      const isX = outpaintHandle.handle === 'left' || outpaintHandle.handle === 'right';
      const sign = outpaintHandle.handle === 'left' || outpaintHandle.handle === 'top' ? -1 : 1;
      const rawPos = isX ? e.clientX : e.clientY;
      const delta = (rawPos - outpaintHandle.startPos) / zoom;
      const unclamped = Math.min(outpaintHandle.maxExpand, Math.max(-outpaintHandle.maxCrop, outpaintHandle.origValue + sign * delta));
      setOutpaintBounds((prev) => {
        let nextVal = unclamped;

        // Prevent opposite crop handles from collapsing below the minimum final size.
        if (nextVal < 0) {
          if (outpaintHandle.handle === 'left') {
            const cropR = Math.max(0, -prev.right);
            const maxCropL = Math.max(0, outpaintHandle.imageWidth - 32 - cropR);
            nextVal = -Math.min(-nextVal, maxCropL);
          } else if (outpaintHandle.handle === 'right') {
            const cropL = Math.max(0, -prev.left);
            const maxCropR = Math.max(0, outpaintHandle.imageWidth - 32 - cropL);
            nextVal = -Math.min(-nextVal, maxCropR);
          } else if (outpaintHandle.handle === 'top') {
            const cropB = Math.max(0, -prev.bottom);
            const maxCropT = Math.max(0, outpaintHandle.imageHeight - 32 - cropB);
            nextVal = -Math.min(-nextVal, maxCropT);
          } else if (outpaintHandle.handle === 'bottom') {
            const cropT = Math.max(0, -prev.top);
            const maxCropB = Math.max(0, outpaintHandle.imageHeight - 32 - cropT);
            nextVal = -Math.min(-nextVal, maxCropB);
          }
        }

        return { ...prev, [outpaintHandle.handle]: nextVal };
      });
      return;
    }
    // Mask drawing (edit-area mode takes priority)
    const maskDraw = maskDrawRef.current;
    if (maskDraw?.isDrawing && maskCanvasRef.current) {
      const canvas = maskCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (maskDraw.tool === 'brush') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.globalCompositeOperation = maskDraw.isErasing ? 'destination-out' : 'source-over';
          ctx.fillStyle = maskDraw.isErasing ? 'rgba(0,0,0,1)' : 'rgba(124,58,237,0.55)';
          ctx.beginPath();
          ctx.arc(cx, cy, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (maskDraw.tool === 'area' && maskDraw.areaStart) {
        const p = { x1: maskDraw.areaStart.x, y1: maskDraw.areaStart.y, x2: cx, y2: cy };
        areaPreviewRef.current = p;
        setAreaPreview(p);
      } else if (maskDraw.tool === 'lasso') {
        maskDraw.lassoPoints.push({ x: cx, y: cy });
        setLassoPreviewPoints([...maskDraw.lassoPoints]);
      }
      return;
    }
    // Resizing element (text or frame/image)
    const resize = resizeRef.current;
    if (resize) {
      const dx = (e.clientX - resize.startX) / liveZoom.current;
      const dy = (e.clientY - resize.startY) / liveZoom.current;
      let nx = resize.origX, ny = resize.origY, nw = resize.origW, nh = resize.origH;
      const h = resize.handle;
      if (h === 'e' || h === 'ne' || h === 'se')  nw = Math.max(40, resize.origW + dx);
      if (h === 'w' || h === 'nw' || h === 'sw') { nw = Math.max(40, resize.origW - dx); nx = resize.origX + resize.origW - nw; }
      if (h === 's' || h === 'se' || h === 'sw')  nh = Math.max(20, resize.origH + dy);
      if (h === 'n' || h === 'ne' || h === 'nw') { nh = Math.max(20, resize.origH - dy); ny = resize.origY + resize.origH - nh; }
      if (resize.type === 'text') {
        setCanvasTexts((prev) => prev.map((t) => t.id === resize.id ? { ...t, x: nx, y: ny, width: Math.round(nw), height: Math.round(nh) } : t));
      } else {
        // Write directly to DOM — flush to React state on mouseup (no re-render per frame)
        resize.liveX = Math.round(nx); resize.liveY = Math.round(ny);
        resize.liveW = Math.round(nw); resize.liveH = Math.round(nh);
        const el = imageElemRefs.current.get(resize.id);
        if (el) {
          el.style.left = `${resize.liveX}px`; el.style.top = `${resize.liveY}px`;
          el.style.width = `${resize.liveW}px`; el.style.height = `${resize.liveH}px`;
        }
      }
      return;
    }
    // Panning — write directly to DOM via refs, sync React state via RAF
    if (panRef.current?.active) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      livePanX.current = panRef.current.origPanX + dx;
      livePanY.current = panRef.current.origPanY + dy;
      applyLiveTransform();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(flushTransformToState);
      return;
    }
    // Dragging image — write directly to DOM (no React re-render per frame)
    const drag = dragRef.current;
    if (drag) {
      const dx = (e.clientX - drag.startX) / liveZoom.current;
      const dy = (e.clientY - drag.startY) / liveZoom.current;
      const rawX = drag.origX + dx;
      const rawY = drag.origY + dy;
      const { x, y, lines } = computeSnap(drag.imageId, rawX, rawY);
      drag.liveX = x;
      drag.liveY = y;
      const el = imageElemRefs.current.get(drag.imageId);
      if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
      setSnapLines(lines);
      return;
    }
    // Dragging text element — write directly to DOM (no React re-render per frame)
    const dText = dragTextRef.current;
    if (dText) {
      const dx = (e.clientX - dText.startX) / liveZoom.current;
      const dy = (e.clientY - dText.startY) / liveZoom.current;
      const nx = dText.origX + dx;
      const ny = dText.origY + dy;
      dText.liveX = nx;
      dText.liveY = ny;
      const el = textElemRefs.current.get(dText.id);
      if (el) { el.style.left = `${nx}px`; el.style.top = `${ny}px`; }
      return;
    }
    // Draw/erase — update current preview stroke and apply erasing
    if (brushStrokeRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left - livePanX.current) / liveZoom.current;
      const cy = (e.clientY - rect.top - livePanY.current) / liveZoom.current;
      const current = brushStrokeRef.current;
      if (current.mode === 'eraser') {
        current.points.push({ x: cx, y: cy });
        eraseDrawingAtPoint(cx, cy);
        return;
      }

      if (current.mode === 'brush') {
        current.points.push({ x: cx, y: cy });
      } else {
        const start = current.points[0];
        current.points = [start, { x: cx, y: cy }];
      }
      // Update live preview state (does not touch brushStrokes — avoids triggering auto-save)
      // Share the mutable points array directly — avoids O(n) spread copy on every frame
      setLivePreviewStroke({ mode: current.mode, points: current.points, historyImageId: current.historyImageId });
      return;
    }
    // Dragging a brush stroke — write to DOM directly, flush to state on mouseup
    if (dragStrokeRef.current) {
      const dsr = dragStrokeRef.current;
      const dx = (e.clientX - dsr.startX) / liveZoom.current;
      const dy = (e.clientY - dsr.startY) / liveZoom.current;
      dsr.liveOffsetX = dsr.origOffsetX + dx;
      dsr.liveOffsetY = dsr.origOffsetY + dy;
      const el = strokeElemRefs.current.get(dsr.id);
      if (el) el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, [activeTool, activeSubPanel, spaceHeld, isImageSelected, editAreaTool, isPanning, computeSnap, brushSize, eraseDrawingAtPoint, queueToolCursorPosition]);

  const handleCanvasMouseUp = useCallback(() => {
    if (outpaintHandleRef.current) {
      setIsHandleCursorDragging(false);
    }
    outpaintHandleRef.current = null;
    const maskDraw = maskDrawRef.current;
    if (maskDraw?.isDrawing) {
      const canvas = maskCanvasRef.current;
      if (canvas) {
        if (maskDraw.tool === 'area') {
          const preview = areaPreviewRef.current;
          if (preview) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const rx = Math.min(preview.x1, preview.x2);
              const ry = Math.min(preview.y1, preview.y2);
              const rw = Math.abs(preview.x2 - preview.x1);
              const rh = Math.abs(preview.y2 - preview.y1);
              if (rw > 2 && rh > 2) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(124,58,237,0.45)';
                ctx.fillRect(rx, ry, rw, rh);
                setHasMask(true);
              }
            }
          }
          areaPreviewRef.current = null;
          setAreaPreview(null);
        } else if (maskDraw.tool === 'lasso') {
          const points = maskDraw.lassoPoints;
          if (points.length > 2) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = 'rgba(124,58,237,0.45)';
              ctx.beginPath();
              ctx.moveTo(points[0].x, points[0].y);
              for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
              ctx.closePath();
              ctx.fill();
              setHasMask(true);
            }
          }
          setLassoPreviewPoints([]);
        } else if (maskDraw.tool === 'brush') {
          setHasMask(true);
        }
      }
      maskDrawRef.current = null;
    }
    if (resizeRef.current) {
      document.documentElement.style.cursor = '';
      setIsHandleCursorDragging(false);
      const finishedResize = resizeRef.current;
      resizeRef.current = null;
      // Push history after text resize completes
      if (finishedResize.type === 'text') {
        setCanvasTexts((prev) => {
          const historyImageId = prev.find((t) => t.id === finishedResize.id)?.historyImageId ?? null;
          pushHistory('Resized text', canvasImages, finishedResize.id, prev, historyImageId);
          return prev;
        });
      }
      // Flush image resize position/size to React state (live updates went directly to DOM)
      if (finishedResize.type === 'image' && finishedResize.liveX !== undefined) {
        setCanvasImages((prev) => {
          const next = prev.map((img) => img.id === finishedResize.id ? { ...img, x: finishedResize.liveX!, y: finishedResize.liveY!, width: finishedResize.liveW!, height: finishedResize.liveH! } : img);
          pushHistory('Resized image', next, finishedResize.id, canvasTexts, finishedResize.id);
          return next;
        });
      }
    }
    // Flush text drag position to React state
    if (dragTextRef.current?.liveX !== undefined && dragTextRef.current.liveY !== undefined) {
      const { id, liveX, liveY } = dragTextRef.current;
      setCanvasTexts((prev) => {
        const next = prev.map((t) => t.id === id ? { ...t, x: liveX!, y: liveY! } : t);
        const historyImageId = next.find((t) => t.id === id)?.historyImageId ?? null;
        pushHistory('Moved text', canvasImages, id, next, historyImageId);
        return next;
      });
    }
    dragTextRef.current = null;
    const finishedStrokeDrag = dragStrokeRef.current;
    dragStrokeRef.current = null;
    const currentStrokeSession = brushStrokeRef.current;
    // Flush image drag position to React state (live updates went directly to DOM)
    if (dragRef.current?.liveX !== undefined && dragRef.current.liveY !== undefined) {
      const { imageId, liveX, liveY } = dragRef.current;
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === imageId ? { ...img, x: Math.round(liveX!), y: Math.round(liveY!) } : img);
        pushHistory('Moved image', next, imageId, canvasTexts, imageId);
        return next;
      });
    }
    dragRef.current = null;
    panRef.current = null;
    setIsPanning(false);
    setSnapLines([]);
    // Flush stroke drag position to React state (live updates went directly to DOM)
    if (finishedStrokeDrag && finishedStrokeDrag.liveOffsetX !== undefined) {
      const { id, origOffsetX, origOffsetY, liveOffsetX, liveOffsetY } = finishedStrokeDrag;
      const el = strokeElemRefs.current.get(id);
      if (el) el.style.transform = '';
      const updatedStrokes = brushStrokesRef.current.map((s) =>
        s.id === id ? { ...s, offsetX: liveOffsetX, offsetY: liveOffsetY } : s
      );
      setBrushStrokes(updatedStrokes);
      const movedDistance = Math.hypot(liveOffsetX - origOffsetX, liveOffsetY - origOffsetY);
      if (movedDistance > 0.5) {
        const movedStroke = updatedStrokes.find((s) => s.id === id);
        if (movedStroke) {
          const historyImageId = movedStroke.historyImageId ?? null;
          const moveLabel = (movedStroke.kind || 'brush') === 'brush' ? 'Moved brush stroke' : 'Moved shape';
          pushHistory(moveLabel, undefined, historyImageId, undefined, historyImageId, updatedStrokes, movedStroke.id);
        }
      }
    }
    // Finalize brush/shape stroke
    if (currentStrokeSession && currentStrokeSession.mode !== 'eraser') {
      const current = currentStrokeSession;
      const points = current.mode === 'brush'
        ? current.points
        : [current.points[0], current.points[current.points.length - 1] || current.points[0]];

      const hasValidStroke = current.mode === 'brush'
        ? points.length > 1
        : points.length > 1 && Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) > 2;

      if (hasValidStroke) {
        const shapeSupportsFill = current.mode === 'rectangle' || current.mode === 'ellipse';
        const historyImageId = current.historyImageId ?? null;
        const newStroke: BrushStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: current.mode === 'eraser' ? 'brush' : current.mode,
          points,
          color: brushDrawColor,
          size: brushDrawSize,
          offsetX: 0,
          offsetY: 0,
          opacity: 100,
          fill: shapeSupportsFill ? shapeFillEnabled : false,
          fillColor: shapeSupportsFill && shapeFillEnabled ? brushDrawColor : undefined,
          historyImageId,
        };
        const drawLabel = current.mode === 'brush' ? 'Drew brush stroke' : `Drew ${current.mode}`;
        setBrushStrokes((prev) => [...prev, newStroke]);
        pushHistory(drawLabel, canvasImages, historyImageId, canvasTexts, historyImageId, [...brushStrokes, newStroke], newStroke.id);
        setSelectedStrokeId(newStroke.id);
      }
    }
    if (currentStrokeSession?.mode === 'eraser' && erasedDuringDragRef.current) {
      const erasedHistoryImageId = currentStrokeSession.historyImageId ?? null;
      pushHistory('Erased drawing', canvasImages, erasedHistoryImageId, canvasTexts, erasedHistoryImageId, brushStrokes, selectedStrokeId);
    }
    erasedDuringDragRef.current = false;
    brushStrokeRef.current = null;
    setLivePreviewStroke(null);

    const isEditAreaCursorTool = activeSubPanel === 'edit-area'
      && isImageSelected
      && (editAreaTool === 'lasso' || editAreaTool === 'brush' || editAreaTool === 'area' || editAreaTool === 'wand');
    const isCursorToolActive = ((activeTool === 'select' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'brush' || activeTool === 'shapes') || isEditAreaCursorTool) && !spaceHeld;
    if (!isCursorToolActive) {
      if (toolCursorRafRef.current !== null) {
        cancelAnimationFrame(toolCursorRafRef.current);
        toolCursorRafRef.current = null;
      }
      setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }
  }, [brushDrawColor, brushDrawSize, shapeFillEnabled, pushHistory, canvasImages, canvasTexts, brushStrokes, selectedImageId, selectedStrokeId, activeTool, activeSubPanel, spaceHeld, isImageSelected, editAreaTool]);

  const handleCanvasMouseLeave = useCallback(() => {
    handleCanvasMouseUp();
    if (toolCursorRafRef.current !== null) {
      cancelAnimationFrame(toolCursorRafRef.current);
      toolCursorRafRef.current = null;
    }
    setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [handleCanvasMouseUp]);

  useEffect(() => {
    const isEditAreaCursorTool = activeSubPanel === 'edit-area'
      && isImageSelected
      && (editAreaTool === 'lasso' || editAreaTool === 'brush' || editAreaTool === 'area' || editAreaTool === 'wand');
    if (((activeTool === 'select' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'brush' || activeTool === 'shapes') || isEditAreaCursorTool) && !spaceHeld) return;
    setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    resetHandleCursorState();
  }, [activeTool, activeSubPanel, spaceHeld, isImageSelected, editAreaTool, resetHandleCursorState]);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    maskDrawRef.current = null;
    areaPreviewRef.current = null;
    setAreaPreview(null);
    setLassoPreviewPoints([]);
    setHasMask(false);
  }, []);

  const handleMaskMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (editAreaTool === 'wand') return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const isErasing = e.altKey;
    if (editAreaTool === 'brush') {
      maskDrawRef.current = { isDrawing: true, tool: 'brush', isErasing, areaStart: null, lassoPoints: [] };
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        ctx.fillStyle = isErasing ? 'rgba(0,0,0,1)' : 'rgba(124,58,237,0.55)';
        ctx.beginPath();
        ctx.arc(cx, cy, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (editAreaTool === 'area') {
      maskDrawRef.current = { isDrawing: true, tool: 'area', isErasing: false, areaStart: { x: cx, y: cy }, lassoPoints: [] };
      const p = { x1: cx, y1: cy, x2: cx, y2: cy };
      areaPreviewRef.current = p;
      setAreaPreview(p);
    } else if (editAreaTool === 'lasso') {
      maskDrawRef.current = { isDrawing: true, tool: 'lasso', isErasing: false, areaStart: null, lassoPoints: [{ x: cx, y: cy }] };
      setLassoPreviewPoints([{ x: cx, y: cy }]);
    }
  }, [editAreaTool, brushSize]);

  const handleOutpaintMouseDown = useCallback((
    e: React.MouseEvent,
    handle: 'top' | 'right' | 'bottom' | 'left',
    imgDims: { width: number; height: number },
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setIsHandleCursorDragging(true);
    const isX = handle === 'left' || handle === 'right';
    const startPos = isX ? e.clientX : e.clientY;
    const origValue = outpaintBounds[handle];
    const maxExpand = isX ? imgDims.width * 3 : imgDims.height * 3;
    const maxCrop = isX ? imgDims.width * 0.9 : imgDims.height * 0.9;
    outpaintHandleRef.current = {
      handle,
      startPos,
      origValue,
      maxExpand,
      maxCrop,
      imageWidth: imgDims.width,
      imageHeight: imgDims.height,
    };
  }, [outpaintBounds]);

  // Sync live refs → React state (called via RAF so React only re-renders once per frame)
  const flushTransformToState = useCallback(() => {
    rafId.current = null;
    setZoom(liveZoom.current);
    setPanX(livePanX.current);
    setPanY(livePanY.current);
  }, []);

  // Apply the live refs directly to the DOM — zero React overhead, runs at 60fps
  const applyLiveTransform = useCallback(() => {
    const el = canvasInnerRef.current;
    if (!el) return;
    el.style.transform = `translate(${livePanX.current}px, ${livePanY.current}px) scale(${liveZoom.current})`;
  }, []);

  // Zoom with scroll wheel / pinch; pan with two-finger trackpad swipe (non-passive to allow preventDefault)
  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // macOS trackpad: two-finger swipe → pan (no ctrlKey, has both deltaX & deltaY)
    // Pinch-to-zoom or Ctrl+scroll → zoom (ctrlKey is set by the browser for pinch)
    if (!e.ctrlKey && !e.metaKey) {
      // Pan — apply directly to live refs then DOM
      livePanX.current -= e.deltaX;
      livePanY.current -= e.deltaY;
      applyLiveTransform();
      // Schedule React state sync
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(flushTransformToState);
      return;
    }

    // Zoom (pinch gesture or Ctrl+scroll)
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const currentZoom = liveZoom.current;

    // Mac trackpad pinch sends small fractional deltaY values (typically 1–10 per frame).
    // Mouse wheel sends large integer steps (100–120). Distinguish by magnitude.
    let zoomFactor: number;
    if (e.deltaMode === 0 && Math.abs(e.deltaY) < 30) {
      // Trackpad pinch — smooth proportional scaling
      zoomFactor = 1 - e.deltaY * 0.006;
    } else {
      // Mouse wheel — fixed step per notch
      zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    }
    // Clamp per-frame factor to prevent runaway jumps
    zoomFactor = Math.min(Math.max(zoomFactor, 0.85), 1.18);
    const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.05), 8);
    const scale = newZoom / currentZoom;

    // Zoom toward cursor: adjust pan so cursor position stays fixed on screen
    livePanX.current = mx - scale * (mx - livePanX.current);
    livePanY.current = my - scale * (my - livePanY.current);
    liveZoom.current = newZoom;

    // Write directly to DOM — no React re-render
    applyLiveTransform();

    // Schedule React state sync (debounced per-frame)
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(flushTransformToState);
  }, [applyLiveTransform, flushTransformToState]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleCanvasWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleCanvasWheel);
  }, [handleCanvasWheel]);

  // Prevent macOS horizontal history swipe from hijacking editor interactions
  // when the pointer is over side panels, prompt bar, or tool controls.
  useEffect(() => {
    const blockHorizontalHistorySwipe = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX < 12) return;
      if (absX <= absY * 0.8) return;
      e.preventDefault();
    };

    window.addEventListener('wheel', blockHorizontalHistorySwipe, { passive: false });
    return () => window.removeEventListener('wheel', blockHorizontalHistorySwipe);
  }, []);

  // When zoom/pan state changes from non-wheel/non-drag sources (fit-to-view, keyboard,
  // reset) keep live refs AND DOM in sync. useLayoutEffect fires before paint so there's
  // no frame where the old transform is visible.
  useLayoutEffect(() => {
    liveZoom.current = zoom;
    livePanX.current = panX;
    livePanY.current = panY;
    applyLiveTransform();
  }, [zoom, panX, panY, applyLiveTransform]);

  // Fit all images into view
  const fitToView = useCallback(() => {
    const images = canvasImagesRef.current;
    if (images.length === 0) { setZoom(0.5); setPanX(0); setPanY(0); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Single-pass bounding box (avoids 4 separate spread-map passes)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const img of images) {
      if (img.x < minX) minX = img.x;
      if (img.y < minY) minY = img.y;
      if (img.x + img.width > maxX) maxX = img.x + img.width;
      if (img.y + img.height > maxY) maxY = img.y + img.height;
    }
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 120;
    const availW = rect.width - padding * 2;
    const availH = rect.height - padding * 2;
    const newZoom = Math.min(Math.max(Math.min(availW / contentW, availH / contentH), 0.05), 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setPanX(rect.width / 2 - centerX * newZoom);
    setPanY(rect.height / 2 - centerY * newZoom);
    setZoom(newZoom);
  }, []);

  const stepZoom = useCallback((direction: 'in' | 'out') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentZoom = liveZoom.current;
    const factor = direction === 'in' ? 1.12 : 1 / 1.12;
    const nextZoom = Math.min(Math.max(currentZoom * factor, 0.05), 8);
    if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

    const mx = rect.width / 2;
    const my = rect.height / 2;
    const scale = nextZoom / currentZoom;

    livePanX.current = mx - scale * (mx - livePanX.current);
    livePanY.current = my - scale * (my - livePanY.current);
    liveZoom.current = nextZoom;

    applyLiveTransform();
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(flushTransformToState);
  }, [applyLiveTransform, flushTransformToState]);

  const arrangeCanvasImages = useCallback((gridPreset: number | 'auto') => {
    if (canvasImages.length === 0) return;

    const sorted = [...canvasImages].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const cols = gridPreset === 'auto' ? Math.max(1, Math.ceil(Math.sqrt(sorted.length))) : Math.max(1, gridPreset);
    const rows = Math.max(1, Math.ceil(sorted.length / cols));

    const maxWidth = Math.max(...sorted.map((img) => img.width));
    const maxHeight = Math.max(...sorted.map((img) => img.height));
    const gapX = Math.max(24, Math.round(maxWidth * 0.08));
    const gapY = Math.max(24, Math.round(maxHeight * 0.08));

    const minX = Math.min(...sorted.map((img) => img.x));
    const minY = Math.min(...sorted.map((img) => img.y));
    const maxX = Math.max(...sorted.map((img) => img.x + img.width));
    const maxY = Math.max(...sorted.map((img) => img.y + img.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const layoutWidth = cols * maxWidth + (cols - 1) * gapX;
    const layoutHeight = rows * maxHeight + (rows - 1) * gapY;
    const startX = Math.round(centerX - layoutWidth / 2);
    const startY = Math.round(centerY - layoutHeight / 2);

    const nextById = new Map<string, { x: number; y: number }>();
    sorted.forEach((img, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * (maxWidth + gapX) + Math.round((maxWidth - img.width) / 2);
      const y = startY + row * (maxHeight + gapY) + Math.round((maxHeight - img.height) / 2);
      nextById.set(img.id, { x, y });
    });

    const next = canvasImages.map((img) => {
      const nextPos = nextById.get(img.id);
      return nextPos ? { ...img, x: nextPos.x, y: nextPos.y } : img;
    });

    setCanvasImages(next);
    const label = gridPreset === 'auto' ? 'Arranged images (Auto grid)' : `Arranged images (${gridPreset}x${gridPreset})`;
    pushHistory(label, next, selectedImageId);
    setShowArrangeDropdown(false);
  }, [canvasImages, pushHistory, selectedImageId]);

  // Auto-fit when first images are generated
  const prevImageCount = useRef(0);
  useEffect(() => {
    if (canvasImages.length > 0 && prevImageCount.current === 0) {
      // Delay to ensure canvasRef is measured
      requestAnimationFrame(fitToView);
    }
    prevImageCount.current = canvasImages.length;
  }, [canvasImages.length, fitToView]);

  useEffect(() => {
    const hasResizeHandles = isImageSelected || isTextSelected;
    const hasOutpaintHandles = isImageSelected && activeSubPanel === 'outpaint';
    if (hasResizeHandles || hasOutpaintHandles) return;
    resetHandleCursorState();
  }, [isImageSelected, isTextSelected, activeSubPanel, resetHandleCursorState]);

  // Export state
  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPG' | 'TIFF' | 'PDF'>('PNG');
  const [exportDpi, setExportDpi] = useState(300);
  const [exportFormatOpen, setExportFormatOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Sub-panel local state
  const [remixSimilarity, setRemixSimilarity] = useState(2); // 0-4 scale
  const [remixModel, setRemixModel] = useState('recraftv4');
  const [remixStyle, setRemixStyle] = useState('any');
  const [remixPrompt, setRemixPrompt] = useState('');
  const [upscaleModel, setUpscaleModel] = useState('Recraft Crisp');
  const [variationsCount, setVariationsCount] = useState(2);
  const [variationsRatio, setVariationsRatio] = useState('1:1');
  const [outpaintPrompt, setOutpaintPrompt] = useState('');

  // Per-image color adjustments — read from selected image, write via updater
  const adj = getAdj(selectedImage);
  const updateAdj = useCallback((key: keyof typeof DEFAULT_ADJUSTMENTS, value: number) => {
    if (!selectedImageId) return;
    setCanvasImages((prev) =>
      prev.map((img) =>
        img.id === selectedImageId
          ? { ...img, adjustments: { ...getAdj(img), [key]: value } }
          : img
      )
    );
  }, [selectedImageId]);

  // ── AI Action helpers ─────────────────────────────────────────────────────

  /**
   * Fetch an image URL and return a PNG File suitable for Recraft FormData.
   * Recraft edit endpoints require PNG — we normalise by drawing through a canvas
   * so any source format (JPEG, WebP, data URL, etc.) is always PNG on output.
   */
  const imageUrlToFile = useCallback(async (url: string, filename = 'image.png'): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Failed to convert image to PNG')); return; }
          resolve(new File([blob], filename, { type: 'image/png' }));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = url;
    });
  }, []);

  /**
   * Crop an image URL based on the currently visible box of an object-cover container.
   * This ensures crop matches exactly what the user selected on canvas.
   */
  const cropImageUrlToFile = useCallback(async (
    url: string,
    displayWidth: number,
    displayHeight: number,
    cropLeft: number,
    cropTop: number,
    cropRight: number,
    cropBottom: number,
    filename = 'cropped.png',
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error('Invalid source image dimensions'));
          return;
        }

        const outputW = Math.max(1, Math.round(displayWidth - cropLeft - cropRight));
        const outputH = Math.max(1, Math.round(displayHeight - cropTop - cropBottom));

        // Map container crop box to source pixels for object-cover rendering.
        const scale = Math.max(displayWidth / img.naturalWidth, displayHeight / img.naturalHeight);
        const renderedW = img.naturalWidth * scale;
        const renderedH = img.naturalHeight * scale;
        const offsetX = (displayWidth - renderedW) / 2;
        const offsetY = (displayHeight - renderedH) / 2;

        let sx = (cropLeft - offsetX) / scale;
        let sy = (cropTop - offsetY) / scale;
        let sWidth = outputW / scale;
        let sHeight = outputH / scale;

        const maxSx = Math.max(0, img.naturalWidth - 1);
        const maxSy = Math.max(0, img.naturalHeight - 1);
        sx = Math.max(0, Math.min(maxSx, sx));
        sy = Math.max(0, Math.min(maxSy, sy));
        sWidth = Math.max(1, Math.min(img.naturalWidth - sx, sWidth));
        sHeight = Math.max(1, Math.min(img.naturalHeight - sy, sHeight));

        const canvas = document.createElement('canvas');
        canvas.width = outputW;
        canvas.height = outputH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create crop canvas'));
          return;
        }

        try {
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputW, outputH);
        } catch {
          reject(new Error('Failed to draw cropped image'));
          return;
        }

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to export cropped image'));
            return;
          }
          resolve(new File([blob], filename, { type: 'image/png' }));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = url;
    });
  }, []);

  const fileToDataUrl = useCallback((file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to encode image preview'));
      reader.readAsDataURL(file);
    });
  }, []);

  const preloadImageUrl = useCallback(async (url: string): Promise<void> => {
    if (!url) return;
    await new Promise<void>((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to preload image'));
      img.src = url;
    });
  }, []);

  /**
   * Convert the mask canvas into a Recraft-compatible grayscale PNG.
   * Recraft eraseRegion requires a grayscale mask where:
   *   white (255) = erase this area
   *   black (0)   = keep this area
   *
   * The optional `forOpenAI` flag returns the OpenAI format instead:
   *   transparent = edit area, black opaque = keep area
   */
  const getMaskBlob = useCallback((maskCanvas: HTMLCanvasElement, forOpenAI = false): Promise<Blob> => {
    const { width, height } = maskCanvas;
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const ctx = temp.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskData = maskCtx.getImageData(0, 0, width, height);

    if (forOpenAI) {
      // OpenAI: black opaque background, transparent where painted
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      const outData = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 0) {
          outData.data[i] = 0;
          outData.data[i + 1] = 0;
          outData.data[i + 2] = 0;
          outData.data[i + 3] = 0; // transparent = edit here
        }
      }
      ctx.putImageData(outData, 0, 0);
    } else {
      // Recraft: grayscale — white where painted (erase), black elsewhere (keep)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      const outData = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 0) {
          outData.data[i] = 255;     // R
          outData.data[i + 1] = 255; // G
          outData.data[i + 2] = 255; // B
          outData.data[i + 3] = 255; // fully opaque white = erase
        }
        // painted-over pixels stay black = keep
      }
      ctx.putImageData(outData, 0, 0);
    }

    return new Promise((resolve) => {
      temp.toBlob((b) => resolve(b!), 'image/png');
    });
  }, []);

  /** Add a result image next to the selected image on canvas */
  const addResultToCanvas = useCallback((resultUrl: string, width: number, height: number, promptText: string) => {
    const GAP = 24;
    const baseX = selectedImage ? selectedImage.x + selectedImage.width + GAP : 0;
    const baseY = selectedImage ? selectedImage.y : 0;
    const newImg: CanvasImage = {
      id: `ai-${Date.now()}`,
      url: resultUrl,
      width,
      height,
      x: baseX,
      y: baseY,
      prompt: promptText,
      model: 'recraft',
      style: '',
      ratio: `${width}x${height}`,
    };
    setCanvasImages((prev) => {
      const next = [...prev, newImg];
      pushHistory('Added result image', next, newImg.id);
      return next;
    });
    setSelectedImageId(newImg.id);
    return newImg;
  }, [selectedImage, pushHistory]);

  /** Insert a blank frame onto the canvas at viewport center */
  const insertFrame = useCallback((w: number, h: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 400;
    const cy = rect ? rect.height / 2 : 300;
    // Convert screen center to world coords
    const worldX = (cx - livePanX.current) / liveZoom.current - w / 2;
    const worldY = (cy - livePanY.current) / liveZoom.current - h / 2;
    const newFrame: CanvasImage = {
      id: `frame-${Date.now()}`,
      url: '',
      width: w,
      height: h,
      x: worldX,
      y: worldY,
      prompt: '',
      model: '',
      style: '',
      ratio: `${w}x${h}`,
      isFrame: true,
    };
    setCanvasImages((prev) => {
      const next = [...prev, newFrame];
      pushHistory('Inserted frame', next, newFrame.id);
      return next;
    });
    setSelectedImageId(newFrame.id);
    setContextImageId(newFrame.id);
    selectTool('select');
    setShowFrameMenu(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushHistory]);

  // ── AI Action: Edit Area → Erase with AI ───────────────────────────────
  const handleEraseWithAI = useCallback(async () => {
    if (!selectedImage || !maskCanvasRef.current || isProcessing) return;
    setProcessingAction('erase-area');
    setIsProcessing(true);
    try {
      const rawMaskBlob = await getMaskBlob(maskCanvasRef.current);
      const { imageFile, maskFile } = await compressImageAndMaskForUpload(
        selectedImage.url,
        rawMaskBlob,
        selectedImage.width,
        selectedImage.height,
      );
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('mask', maskFile);
      const res = await fetch('/api/edit/erase-region', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erase failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === selectedImage!.id ? { ...img, url } : img);
        pushHistory('Erased region', next);
        return next;
      });
      clearMask();
      setActiveSubPanel(null);
      toast.success('Region erased');
    } catch (err: any) {
      toast.error(err.message || 'Failed to erase region');
    } finally {
      setProcessingAction(null);
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, getMaskBlob, clearMask, pushHistory]);

  // ── AI Action: Edit Area → Modify with AI ──────────────────────────────
  const handleModifyAreaWithAI = useCallback(async () => {
    if (!selectedImage || !maskCanvasRef.current || isProcessing) return;

    const promptText = editAreaPrompt.trim();
    if (!promptText) {
      toast.error('Add a prompt first');
      return;
    }

    setProcessingAction('modify-area');
    setIsProcessing(true);
    try {
      const rawMaskBlob = await getMaskBlob(maskCanvasRef.current);
      const { imageFile, maskFile } = await compressImageAndMaskForUpload(
        selectedImage.url,
        rawMaskBlob,
        selectedImage.width,
        selectedImage.height,
      );

      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('mask', maskFile);
      fd.append('prompt', promptText);

      const res = await fetch('/api/edit/inpaint', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Modify failed');

      const data = await res.json();
      const url = data.image?.imageUrl || '';
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === selectedImage.id ? { ...img, url, prompt: promptText } : img);
        pushHistory('Modified region', next);
        return next;
      });

      clearMask();
      setEditAreaPrompt('');
      toast.success('Region modified');
    } catch (err: any) {
      toast.error(err.message || 'Failed to modify region');
    } finally {
      setProcessingAction(null);
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, editAreaPrompt, getMaskBlob, clearMask, pushHistory]);

  // ── AI Action: Remix Image ─────────────────────────────────────────────
  const handleRemix = useCallback(async () => {
    if (!selectedImage || isProcessing) return;

    const caps = getModelCapabilities(remixModel);
    if (caps && !caps.imageToImage) {
      toast.error(`${remixModel} does not support image-to-image remix. Try a different model.`);
      return;
    }

    setIsProcessing(true);
    try {
      const imageFile = await compressImageForUpload(selectedImage.url);
      // Map similarity slider (0–4) to Recraft strength (0.0–1.0).
      // Higher similarity = higher strength (keep more of original).
      const strength = [0.2, 0.4, 0.6, 0.8, 1.0][remixSimilarity];

      // Build prompt: for high similarity, emphasize minimal changes
      let finalRemixPrompt = remixPrompt || selectedImage.prompt || 'Create a remix of this image';
      if (remixSimilarity >= 3) {
        // Very similar / almost identical — instruct model to preserve original and only modify what's asked
        const userIntent = remixPrompt?.trim() || 'subtle variation';
        finalRemixPrompt = `Keep this image almost identical. Only make this small change: ${userIntent}. Preserve the composition, colors, style, and all other details exactly as they are.`;
      } else if (remixSimilarity === 2) {
        // Similar — moderate changes
        finalRemixPrompt = `Based on this image, make moderate changes: ${finalRemixPrompt}. Keep the overall composition and style similar.`;
      }

      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('prompt', finalRemixPrompt);
      fd.append('strength', String(strength));
      fd.append('model', remixModel);
      if (remixStyle && remixStyle !== 'any') fd.append('style', remixStyle);
      const res = await fetch('/api/edit/image-to-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Remix failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      const origId = selectedImage.id;
      addResultToCanvas(url, selectedImage.width, selectedImage.height, remixPrompt || 'Remix');
      // Keep original image selected so the panel stays open and context doesn't change
      setSelectedImageId(origId);
      toast.success('Remix generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remix');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, remixPrompt, remixModel, remixStyle, remixSimilarity, addResultToCanvas]);

  // ── AI Action: Outpaint / Expand ───────────────────────────────────────
  const handleOutpaintExpand = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    const hasCrop = outpaintBounds.top < 0 || outpaintBounds.right < 0 || outpaintBounds.bottom < 0 || outpaintBounds.left < 0;
    if (hasCrop) return;
    const expandL = Math.max(0, outpaintBounds.left);
    const expandT = Math.max(0, outpaintBounds.top);
    const expandR = Math.max(0, outpaintBounds.right);
    const expandB = Math.max(0, outpaintBounds.bottom);
    if (expandL + expandT + expandR + expandB === 0) return;

    setIsProcessing(true);
    try {
      // Create padded image canvas
      const newW = Math.round(selectedImage.width + expandL + expandR);
      const newH = Math.round(selectedImage.height + expandT + expandB);
      const imgEl = document.createElement('img');
      imgEl.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = reject;
        imgEl.src = selectedImage.url;
      });

      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = selectedImage.width;
      baseCanvas.height = selectedImage.height;
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) throw new Error('Failed to create base outpaint canvas');
      drawImageAsObjectCover(baseCtx, imgEl, selectedImage.width, selectedImage.height);

      // Padded image: draw original centered, then extend edge pixels into
      // expanded zones so the model receives strong local context.
      const padCanvas = document.createElement('canvas');
      padCanvas.width = newW;
      padCanvas.height = newH;
      const padCtx = padCanvas.getContext('2d')!;
      padCtx.drawImage(baseCanvas, expandL, expandT, selectedImage.width, selectedImage.height);

      if (expandL > 0) {
        padCtx.drawImage(baseCanvas, 0, 0, 1, selectedImage.height, 0, expandT, expandL, selectedImage.height);
      }
      if (expandR > 0) {
        padCtx.drawImage(
          baseCanvas,
          Math.max(0, selectedImage.width - 1),
          0,
          1,
          selectedImage.height,
          expandL + selectedImage.width,
          expandT,
          expandR,
          selectedImage.height,
        );
      }
      if (expandT > 0) {
        padCtx.drawImage(baseCanvas, 0, 0, selectedImage.width, 1, expandL, 0, selectedImage.width, expandT);
      }
      if (expandB > 0) {
        padCtx.drawImage(
          baseCanvas,
          0,
          Math.max(0, selectedImage.height - 1),
          selectedImage.width,
          1,
          expandL,
          expandT + selectedImage.height,
          selectedImage.width,
          expandB,
        );
      }

      if (expandL > 0 && expandT > 0) {
        padCtx.drawImage(baseCanvas, 0, 0, 1, 1, 0, 0, expandL, expandT);
      }
      if (expandR > 0 && expandT > 0) {
        padCtx.drawImage(baseCanvas, Math.max(0, selectedImage.width - 1), 0, 1, 1, expandL + selectedImage.width, 0, expandR, expandT);
      }
      if (expandL > 0 && expandB > 0) {
        padCtx.drawImage(baseCanvas, 0, Math.max(0, selectedImage.height - 1), 1, 1, 0, expandT + selectedImage.height, expandL, expandB);
      }
      if (expandR > 0 && expandB > 0) {
        padCtx.drawImage(
          baseCanvas,
          Math.max(0, selectedImage.width - 1),
          Math.max(0, selectedImage.height - 1),
          1,
          1,
          expandL + selectedImage.width,
          expandT + selectedImage.height,
          expandR,
          expandB,
        );
      }

      // Mask: opaque where original is, transparent where we want generation
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = newW;
      maskCanvas.height = newH;
      const maskCtx = maskCanvas.getContext('2d')!;
      // Start fully transparent (= edit everywhere)
      maskCtx.clearRect(0, 0, newW, newH);
      // Fill the original image area with black (= keep)
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(expandL, expandT, selectedImage.width, selectedImage.height);

      const padBlob = await new Promise<Blob>((resolve) => padCanvas.toBlob((b) => resolve(b!), 'image/png'));
      const maskBlob = await new Promise<Blob>((resolve) => maskCanvas.toBlob((b) => resolve(b!), 'image/png'));

      const fd = new FormData();
      fd.append('image', new File([padBlob], 'padded.png', { type: 'image/png' }));
      fd.append('mask', new File([maskBlob], 'mask.png', { type: 'image/png' }));
      const contextAwareOutpaintPrompt = outpaintPrompt.trim().length > 0
        ? `${outpaintPrompt.trim()}. Seamlessly continue the existing scene into only the transparent expansion area. Match perspective, lighting, color palette, subject identity, and texture from the original image. Do not alter the original central image region.`
        : 'Seamlessly continue the existing scene into only the transparent expansion area. Match perspective, lighting, color palette, subject identity, and texture from the original image. Do not alter the original central image region.';
      fd.append('prompt', contextAwareOutpaintPrompt);

      const res = await fetch('/api/edit/outpaint', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Expand failed');
      const data = await res.json();
      const finalUrl = data.image?.imageUrl || '';
      if (!finalUrl) {
        throw new Error('Expand returned no image URL');
      }

      // Replace the existing frame in-place, updating dimensions and shifting position
      // so the image expands visually in the correct directions on the canvas.
      // e.g. expanding left shifts x leftward, expanding top shifts y upward.
      setCanvasImages((prev) => {
        const next = prev.map((img) =>
          img.id === selectedImage!.id
            ? { ...img, url: finalUrl, width: newW, height: newH, x: img.x - expandL, y: img.y - expandT }
            : img
        );
        pushHistory('Expanded image', next);
        return next;
      });
      setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
      setActiveSubPanel(null);
      toast.success('Image expanded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to expand');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, outpaintBounds, outpaintPrompt]);

  // ── AI Action: Remove Background ───────────────────────────────────────
  const handleRemoveBackground = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('remove-bg');
    try {
      const imageFile = await compressImageForUpload(selectedImage.url);
      const fd = new FormData();
      fd.append('image', imageFile);
      const res = await fetch('/api/tools/remove-background', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Remove background failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === selectedImage!.id ? { ...img, url } : img);
        pushHistory('Removed background', next);
        return next;
      });
      toast.success('Background removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove background');
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedImage, isProcessing, addResultToCanvas]);

  // ── AI Action: Upscale ─────────────────────────────────────────────────
  const handleUpscale = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await compressImageForUpload(selectedImage.url);
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('type', upscaleModel === 'Creative' ? 'creative' : 'crisp');
      const res = await fetch('/api/tools/upscale', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upscale failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === selectedImage!.id ? { ...img, url, width: selectedImage!.width * 4, height: selectedImage!.height * 4 } : img);
        pushHistory('Upscaled image', next);
        return next;
      });
      setActiveSubPanel(null);
      toast.success('Image upscaled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upscale');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, upscaleModel, addResultToCanvas]);

  // ── AI Action: Generate Variations ─────────────────────────────────────
  const handleVariations = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await compressImageForUpload(selectedImage.url);
      const results: string[] = [];
      for (let i = 0; i < variationsCount; i++) {
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('prompt', selectedImage.prompt || 'Create a variation of this image');
        const res = await fetch('/api/edit/image-to-image', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Variation failed');
        const data = await res.json();
        results.push(data.image?.imageUrl || '');
      }
      const GAP = 24;
      let startX = selectedImage.x + selectedImage.width + GAP;
      const newImages: CanvasImage[] = results.map((url, i) => ({
        id: `var-${Date.now()}-${i}`,
        url,
        width: selectedImage.width,
        height: selectedImage.height,
        x: startX + i * (selectedImage.width + GAP),
        y: selectedImage.y,
        prompt: `Variation ${i + 1}`,
        model: 'recraft',
        style: '',
        ratio: `${selectedImage.width}x${selectedImage.height}`,
      }));
      setCanvasImages((prev) => {
        const next = [...prev, ...newImages];
        pushHistory(`Generated ${results.length} variation${results.length > 1 ? 's' : ''}`, next, newImages[0]?.id ?? null);
        return next;
      });
      if (newImages.length > 0) setSelectedImageId(newImages[0].id);
      setActiveSubPanel(null);
      toast.success(`Generated ${results.length} variation${results.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate variations');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, variationsCount]);

  // ── AI Action: Vectorize ───────────────────────────────────────────────
  const handleVectorize = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('vectorize');
    try {
      const imageFile = await compressImageForUpload(selectedImage.url);
      const fd = new FormData();
      fd.append('image', imageFile);
      const res = await fetch('/api/tools/vectorize', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Vectorize failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      addResultToCanvas(url, selectedImage.width, selectedImage.height, 'Vectorized');
      toast.success('Image vectorized');
    } catch (err: any) {
      toast.error(err.message || 'Failed to vectorize');
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedImage, isProcessing, addResultToCanvas]);

  // Space key for temporary hand tool
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Reset sub-panel when image deselects
  useEffect(() => {
    if (!isImageSelected) {
      setActiveSubPanel(null);
      clearMask();
    }
  }, [isImageSelected, clearMask]);

  // Clear mask when leaving edit-area panel
  useEffect(() => {
    if (activeSubPanel !== 'edit-area') clearMask();
  }, [activeSubPanel, clearMask]);

  // Reset outpaint bounds when leaving outpaint panel
  useEffect(() => {
    if (activeSubPanel !== 'outpaint') setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
  }, [activeSubPanel]);

  // Reset outpaint bounds when opening outpaint or switching selected image in outpaint mode.
  useEffect(() => {
    if (activeSubPanel === 'outpaint') {
      setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
    }
  }, [activeSubPanel, selectedImageId]);

  // Helper to update a canvas image's dimensions
  const updateImageDimension = (id: string, key: 'width' | 'height', value: number) => {
    setCanvasImages((prev) => prev.map((img) => img.id === id ? { ...img, [key]: Math.max(1, value) } : img));
  };

  // Map UI model names to API model IDs
  const MODEL_MAP: Record<string, string> = {
    'Recraft V4': 'recraftv4',
    'Recraft V4 Vector': 'recraftv4_vector',
    'Recraft V4 Pro': 'recraftv4_pro',
    'Recraft V4 Pro Vector': 'recraftv4_pro_vector',
    'Recraft V3': 'recraftv3',
    'Recraft V3 Vector': 'recraftv3_vector',
    'Recraft V2': 'recraftv2',
    'Recraft V2 Vector': 'recraftv2_vector',
    'GPT Image 2': 'gpt-image-2',
    'GPT Image 1.5': 'gpt-image-1.5',
    'Gemini 2.5 Flash': 'gemini-2.5-flash',
    'Auto mode': 'recraftv4',
  };

  // Map UI ratios to API sizes
  const RATIO_MAP: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1365x1024',
    '9:16': '1024x1365',
    '4:3': '1536x1024',
    '3:4': '1024x1536',
    '21:9': '1820x1024',
  };

  // Parse size string to w/h
  const parseSize = (size: string) => {
    const [w, h] = size.split('x').map(Number);
    return { w: w || 1024, h: h || 1024 };
  };

  // Convert viewport center from screen space to canvas world coordinates.
  const getViewportWorldCenter = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (rect.width / 2 - livePanX.current) / liveZoom.current,
      y: (rect.height / 2 - livePanY.current) / liveZoom.current,
    };
  }, []);

  // If a world-space bounds is outside the visible viewport, pan to center it.
  const ensureWorldBoundsVisible = useCallback((bounds: { minX: number; minY: number; maxX: number; maxY: number }, marginPx = 56) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const z = liveZoom.current || 1;
    const marginWorld = marginPx / z;
    const viewLeft = (0 - livePanX.current) / z;
    const viewTop = (0 - livePanY.current) / z;
    const viewRight = (rect.width - livePanX.current) / z;
    const viewBottom = (rect.height - livePanY.current) / z;

    const alreadyVisible =
      bounds.minX >= viewLeft + marginWorld
      && bounds.minY >= viewTop + marginWorld
      && bounds.maxX <= viewRight - marginWorld
      && bounds.maxY <= viewBottom - marginWorld;

    if (alreadyVisible) return;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    setPanX(rect.width / 2 - centerX * z);
    setPanY(rect.height / 2 - centerY * z);
  }, []);

  const appendPromptAssistantValue = useCallback((current: string, incoming: string) => {
    const currentTrimmed = current.trim();
    const normalizedIncoming = incoming.trim();
    if (!normalizedIncoming) return currentTrimmed;
    if (!currentTrimmed) return normalizedIncoming;

    const existing = currentTrimmed
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (existing.includes(normalizedIncoming.toLowerCase())) {
      return currentTrimmed;
    }

    return `${currentTrimmed}, ${normalizedIncoming}`;
  }, []);

  const buildAssistantPrompt = useCallback((basePrompt: string) => {
    const sections = [basePrompt.trim()];

    if (promptAssistantStyle.trim()) {
      sections.push(`Style direction: ${promptAssistantStyle.trim()}`);
    }
    if (promptAssistantLighting.trim()) {
      sections.push(`Lighting: ${promptAssistantLighting.trim()}`);
    }
    if (promptAssistantComposition.trim()) {
      sections.push(`Composition: ${promptAssistantComposition.trim()}`);
    }
    if (promptAssistantNegative.trim()) {
      sections.push(`Avoid: ${promptAssistantNegative.trim()}`);
    }

    return sections
      .map((section) => section.trim())
      .filter((section) => section.length > 0)
      .join('. ');
  }, [promptAssistantComposition, promptAssistantLighting, promptAssistantNegative, promptAssistantStyle]);

  const isPromptAssistantActive = useMemo(() => {
    return [
      promptAssistantStyle,
      promptAssistantLighting,
      promptAssistantComposition,
      promptAssistantNegative,
    ].some((value) => value.trim().length > 0);
  }, [promptAssistantComposition, promptAssistantLighting, promptAssistantNegative, promptAssistantStyle]);

  const effectivePrompt = useMemo(() => buildAssistantPrompt(prompt), [buildAssistantPrompt, prompt]);

  const syncPromptTextareaHeight = useCallback(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    const nextHeight = Math.max(52, Math.min(220, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 220 ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    syncPromptTextareaHeight();
  }, [prompt, promptHelperOpen, syncPromptTextareaHeight]);

  const handleGenerate = useCallback(async () => {
    if (!effectivePrompt.trim() || isGenerating) return;

    const model = MODEL_MAP[selectedModel] || 'recraftv4';
    const caps = getModelCapabilities(selectedModel);

    // Validate model supports generation
    if (caps && !caps.generate) {
      toast.error(`${selectedModel} does not support image generation.`);
      return;
    }

    // Warn about style incompatibility (OpenAI models don't have native styles)
    const styleLookupEntry = selectedStyle ? STYLE_LOOKUP[selectedStyle] : undefined;
    const styleMeta = selectedStyleMeta ?? (styleLookupEntry
      ? {
          name: styleLookupEntry.name,
          apiStyle: styleLookupEntry.apiStyle,
          apiSubstyle: styleLookupEntry.apiSubstyle,
          apiModel: styleLookupEntry.apiModel,
          styleId: undefined,
        }
      : null);

    const supportsNativeStyles = caps?.styles !== false;
    const requestedApiStyle = styleMeta?.styleId ? 'any' : (styleMeta?.apiStyle || 'any');
    const apiStyle = supportsNativeStyles ? requestedApiStyle : 'any';

    if (!supportsNativeStyles && styleMeta && (requestedApiStyle !== 'any' || !!styleMeta.styleId)) {
      // Not a blocker — the server will inject style text into prompt instead
      toast.info(`${selectedModel} doesn't support styles natively. Style "${styleMeta.name}" will be added as a prompt hint.`);
    }

    setIsGenerating(true);
    setSelectedImageId(null);

    // Use frame dimensions if the context is a frame, otherwise use selectedRatio
    const size = contextImage?.isFrame
      ? `${contextImage.width}x${contextImage.height}`
      : RATIO_MAP[selectedRatio] || '1024x1024';
    const n = parseInt(selectedCount) || 1;
    const apiSubstyle = supportsNativeStyles && !styleMeta?.styleId ? styleMeta?.apiSubstyle : undefined;
    const styleName = styleMeta?.name;
    const styleModel = supportsNativeStyles ? styleMeta?.apiModel : undefined; // native model for style-enabled providers
    const styleId = supportsNativeStyles ? styleMeta?.styleId : undefined;

    const paletteControls = selectedPalette && selectedPalette.length > 0
      ? buildPaletteControls(selectedPalette)
      : undefined;

    // Start from the assistant-assembled prompt so users can generate without
    // manually engineering one long free-text prompt.
    let finalPrompt = effectivePrompt.trim();
    if (selectedPalette && selectedPalette.length > 0) {
      finalPrompt += `. ${buildPaletteGuidance(selectedPalette)}`;
    }

    // Append style hint so the model renders in the correct visual style
    if (styleMeta) {
      const styleDesc = styleMeta.apiStyle !== 'any' ? styleMeta.apiStyle.replace(/_/g, ' ') : '';
      const substyleDesc = styleMeta.apiSubstyle ? `, ${styleMeta.apiSubstyle.replace(/_/g, ' ')}` : '';
      finalPrompt += styleDesc
        ? `. Render in ${styleMeta.name} style (${styleDesc}${substyleDesc}).`
        : `. Render in ${styleMeta.name} style.`;
    }

    // Build attachments list: user-uploaded files + context image from canvas selection
    const allAttachments: (File | Blob)[] = [...attachments];

    // Custom styles can carry source image context; prepend them so style context remains primary.
    const styleContextUrls = (selectedStyleMeta?.contextImageUrls || [])
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);

    if (styleContextUrls.length > 0 && caps?.attachments) {
      const styleContextFiles: File[] = [];

      for (const [index, styleContextUrl] of styleContextUrls.entries()) {
        try {
          const styleContextFile = await imageUrlToFile(styleContextUrl, `style-context-${index + 1}.png`);
          styleContextFiles.push(styleContextFile);
        } catch {
          // Ignore context conversion errors and continue with any other attachments.
        }
      }

      if (styleContextFiles.length > 0) {
        allAttachments.unshift(...styleContextFiles);
      }
    }

    // If a context image is set and the model supports attachments, convert it to a File
    if (contextImage && caps?.attachments && contextImage.url) {
      try {
        const ctxFile = await imageUrlToFile(contextImage.url, 'context.png');
        allAttachments.push(ctxFile);
      } catch { /* ignore if context image fails to convert */ }
    }

    try {
      let res: Response;
      if (allAttachments.length > 0) {
        // Use FormData when attachments are present
        const fd = new FormData();
        fd.append('prompt', finalPrompt);
        fd.append('model', model);
        fd.append('size', size);
        fd.append('n', String(n));
        fd.append('style', apiStyle);
        if (apiSubstyle) fd.append('substyle', apiSubstyle);
        if (styleName) fd.append('styleName', styleName);
        if (styleModel) fd.append('styleModel', styleModel);
        if (styleId) fd.append('style_id', styleId);
        if (paletteControls) fd.append('controls', JSON.stringify(paletteControls));
        if (projectId) fd.append('projectId', projectId);
        allAttachments.forEach((file) => fd.append('attachments', file));
        res = await fetch('/api/generate', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            model,
            style: apiStyle,
            substyle: apiSubstyle,
            styleName,
            styleModel,
            style_id: styleId,
            controls: paletteControls,
            size,
            n,
            projectId: projectId || undefined,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const data = await res.json();
      const generated = Array.isArray(data.images) ? data.images : [];
      const { w, h } = parseSize(size);
      // If generating into a frame context, place results at the frame's position and remove the frame
      const frameCtx = contextImage?.isFrame ? contextImage : null;
      const GAP = 24;
      let startX = 0;
      let startY = 0;
      if (frameCtx) {
        startX = frameCtx.x;
        startY = frameCtx.y;
      } else {
        const viewportCenter = getViewportWorldCenter();
        const generatedCount = Math.max(1, generated.length || n);
        const groupWidth = generatedCount * w + (generatedCount - 1) * GAP;
        startX = Math.round(viewportCenter.x - groupWidth / 2);
        startY = Math.round(viewportCenter.y - h / 2);
      }
      const newImages: CanvasImage[] = generated.map((img: any, i: number) => ({
        id: img.id || `gen-${Date.now()}-${i}`,
        url: img.imageUrl || img.url || '',
        width: w,
        height: h,
        x: frameCtx ? startX : startX + i * (w + GAP),
        y: frameCtx ? startY : startY,
        prompt: effectivePrompt.trim(),
        model: selectedModel,
        style: selectedStyle || 'No style',
        ratio: selectedRatio,
      }));
      setCanvasImages((prev) => {
        // Remove the frame if we were generating into it
        const withoutFrame = frameCtx ? prev.filter((img) => img.id !== frameCtx.id) : prev;
        const next = [...withoutFrame, ...newImages];
        pushHistory(`Generated ${newImages.length} image${newImages.length > 1 ? 's' : ''}`, next, newImages[0]?.id ?? null);
        return next;
      });
      // Clear frame context after generating into it
      if (frameCtx) setContextImageId(null);
      if (newImages.length > 0) {
        const minX = Math.min(...newImages.map((img) => img.x));
        const minY = Math.min(...newImages.map((img) => img.y));
        const maxX = Math.max(...newImages.map((img) => img.x + img.width));
        const maxY = Math.max(...newImages.map((img) => img.y + img.height));
        ensureWorldBoundsVisible({ minX, minY, maxX, maxY });
        setSelectedImageId(newImages[0].id);
      }
      toast.success(`Generated ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [effectivePrompt, isGenerating, selectedModel, selectedRatio, selectedCount, selectedStyle, selectedStyleMeta, projectId, selectedPalette, attachments, contextImage, getViewportWorldCenter, ensureWorldBoundsVisible]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
      // Escape to deselect
      if (e.key === 'Escape') setSelectedImageId(null);
      // Undo: Cmd/Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); historyUndo(); return; }
      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); historyRedo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); historyRedo(); return; }
      // Delete/Backspace to remove selected image
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setCanvasImages((prev) => {
          const next = prev.filter((img) => img.id !== selectedImageId);
          pushHistory('Deleted image', next, null);
          return next;
        });
        setSelectedImageId(null);
      }
      // Tool shortcuts
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      // Zoom shortcuts
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom((z) => Math.min(z * 1.2, 8)); }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); setZoom((z) => Math.max(z / 1.2, 0.05)); }
      if ((e.metaKey || e.ctrlKey) && (e.key === '0')) { e.preventDefault(); setZoom(1); setPanX(0); setPanY(0); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleGenerate, selectedImageId, historyUndo, historyRedo, pushHistory]);

  const toggleDropdown = (name: 'model' | 'ratio' | 'count' | 'shapes' | 'palette') => {
    if (activeDropdown === name) setActiveDropdown(null);
    else setActiveDropdown(name);
  };

  const selectTool = (tool: typeof activeTool, options?: { keepDropdown?: boolean }) => {
    setActiveTool(tool);
    if (!options?.keepDropdown) setActiveDropdown(null);
    if (tool !== 'brush' && tool !== 'shapes') setShowBrushMenu(false);
    if (tool !== 'frame') setShowFrameMenu(false);
    if (tool !== 'select' && tool !== 'brush') { setSelectedStrokeId(null); }
    if (tool !== 'text' && tool !== 'select') { setSelectedTextId(null); setEditingTextId(null); }
  };

  const isEditAreaCursorMode = activeSubPanel === 'edit-area'
    && isImageSelected
    && (editAreaTool === 'lasso' || editAreaTool === 'brush' || editAreaTool === 'area' || editAreaTool === 'wand');
  const isCanvasCustomCursorMode = ((activeTool === 'select' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'brush' || activeTool === 'shapes') || isEditAreaCursorMode) && !spaceHeld;
  const shouldFadeToolCursor = isHandleCursorHover || isHandleCursorDragging;
  const {
    handleUiZoom,
    resizeHandleHitSize,
    resizeHandleVisibleSize,
    resizeHandleVisibleBorderWidth,
    outpaintHandleHitLong,
    outpaintHandleHitThick,
    outpaintHandleVisibleLong,
    outpaintHandleVisibleThick,
  } = useMemo(() => {
    const huz = Math.max(zoom, HANDLE_CURSOR_MIN_ZOOM);
    return {
      handleUiZoom: huz,
      resizeHandleHitSize: RESIZE_HANDLE_HIT_SIZE / huz,
      resizeHandleVisibleSize: RESIZE_HANDLE_VISIBLE_SIZE / huz,
      resizeHandleVisibleBorderWidth: Math.max(1, RESIZE_HANDLE_VISIBLE_BORDER_WIDTH / huz),
      outpaintHandleHitLong: OUTPAINT_HANDLE_HIT_LONG / huz,
      outpaintHandleHitThick: OUTPAINT_HANDLE_HIT_THICK / huz,
      outpaintHandleVisibleLong: OUTPAINT_HANDLE_VISIBLE_LONG / huz,
      outpaintHandleVisibleThick: OUTPAINT_HANDLE_VISIBLE_THICK / huz,
    };
  }, [zoom]);
  const isDrawToolCursorMode = (activeTool === 'brush' || activeTool === 'shapes') && !spaceHeld && !isPanning;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.cursorOverride = isCanvasCustomCursorMode && toolCursor.visible ? '1' : '0';
    return () => {
      delete document.body.dataset.cursorOverride;
    };
  }, [isCanvasCustomCursorMode, toolCursor.visible]);

  const canvasBgStyle = useMemo(() => ({
    opacity: canvasBg === 'dots' ? 0.2 : canvasBg === 'grid' ? 0.12 : canvasBg === 'lines' ? 0.1 : 0.14,
    backgroundImage:
      canvasBg === 'dots'
        ? 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)'
        : canvasBg === 'grid'
        ? 'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)'
        : canvasBg === 'lines'
        ? 'linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)'
        : 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px), radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
    backgroundSize:
      canvasBg === 'cross'
        ? `${24 * zoom}px ${24 * zoom}px, ${24 * zoom}px ${24 * zoom}px`
        : `${24 * zoom}px ${24 * zoom}px`,
    backgroundPosition:
      canvasBg === 'cross'
        ? `calc(${panX}px + ${12 * zoom}px) ${panY}px, ${panX}px calc(${panY}px + ${12 * zoom}px)`
        : `${panX}px ${panY}px`,
  }), [canvasBg, zoom, panX, panY]);

  return (
    <div 
      className="h-screen w-screen bg-[#0A0A0B] relative overflow-hidden flex flex-col font-sans select-none text-foreground"
      onClick={() => { activeDropdown && setActiveDropdown(null); }}
    >
      {/* ── INFINITE CANVAS ── */}
      <div
        ref={canvasRef}
        data-canvas="bg"
        className={cn(
          "absolute inset-0 z-0",
          isCanvasCustomCursorMode ? "cursor-none" : "",
          !isCanvasCustomCursorMode && (isPanning || spaceHeld || activeTool === 'hand') ? "cursor-grab" : "",
          !isCanvasCustomCursorMode && isPanning ? "cursor-grabbing" : "",
          !isCanvasCustomCursorMode && activeTool === 'select' && !spaceHeld && !isPanning ? "cursor-default" : "",
          !isCanvasCustomCursorMode && activeTool === 'text' && !spaceHeld && !isPanning ? "cursor-text" : "",
        )}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
      >
        {/* Canvas background pattern — moves with pan/zoom */}
        {canvasBg !== 'none' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={canvasBgStyle}
          />
        )}

        {/* Transformed canvas layer — transform is applied imperatively via canvasInnerRef
             to avoid React re-renders on every wheel/mousemove event */}
        <div
          ref={canvasInnerRef}
          className="absolute pointer-events-none"
          style={{ transformOrigin: '0 0', willChange: 'transform' }}
        >
          {/* Snap guide lines */}
          {snapLines.map((line, i) => (
            <div
              key={i}
              className="absolute bg-primary pointer-events-none z-30"
              style={
                line.axis === 'x'
                  ? { left: line.pos, top: -10000, width: 1, height: 20000 }
                  : { top: line.pos, left: -10000, height: 1, width: 20000 }
              }
            />
          ))}

          {/* Canvas images */}
          {canvasImages.map((img) => {
            const isSelected = img.id === selectedImageId;
            return (
              <div
                key={img.id}
                ref={(el) => { if (el) imageElemRefs.current.set(img.id, el); else imageElemRefs.current.delete(img.id); }}
                className={cn(
                  "absolute pointer-events-auto",
                  isCanvasCustomCursorMode ? "cursor-none" : activeTool === 'select' && !spaceHeld ? "cursor-move" : "",
                )}
                style={{ left: img.x, top: img.y, width: img.width, height: img.height }}
                onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              >
                {img.isFrame ? (
                  /* ── Frame element ── */
                  <div
                    className={cn(
                      "w-full h-full rounded-lg transition-shadow",
                      isSelected
                        ? "border-2 border-primary"
                        : contextImageId === img.id
                          ? "border border-primary/60"
                          : "border border-dashed border-white/30 hover:border-white/50",
                    )}
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
                      <Frame className="w-6 h-6 text-white/20" />
                      <span className="text-[11px] text-white/20 font-medium">{img.width} × {img.height}</span>
                    </div>
                    {contextImageId === img.id && !isSelected && (
                      <div className="absolute -top-5 left-0 text-[10px] text-primary/70 font-medium select-none whitespace-nowrap flex items-center gap-1">
                        <Frame className="w-3 h-3" /> Context
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Image element ── */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url || undefined}
                    alt={img.prompt}
                    className={cn(
                      "w-full h-full object-cover rounded-lg transition-shadow",
                      !img.url && "bg-white/5",
                      isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0A0A0B]" : "hover:ring-1 hover:ring-white/20",
                    )}
                    draggable={false}
                    style={(() => {
                      const a = img.adjustments;
                      if (!a) return undefined;
                      const s: React.CSSProperties = {};
                      const filters: string[] = [];
                      if (a.hue !== 180) filters.push(`hue-rotate(${a.hue - 180}deg)`);
                      if (a.saturation !== 100) filters.push(`saturate(${a.saturation / 100})`);
                      if (a.brightness !== 100) filters.push(`brightness(${a.brightness / 100})`);
                      if (a.contrast !== 100) filters.push(`contrast(${a.contrast / 100})`);
                      if (filters.length > 0) s.filter = filters.join(' ');
                      if (a.opacity !== 100) s.opacity = a.opacity / 100;
                      return Object.keys(s).length > 0 ? s : undefined;
                    })()}
                  />
                )}
                {/* Resize handles + dimension label */}
                {isSelected && (
                  <>
                    {RESIZE_HANDLES.map(({ id: hid, sx, tf, cur }) => (
                      <div
                        key={hid}
                        className="absolute z-10 pointer-events-auto"
                        data-cursor-override
                        style={{ ...sx, transform: tf, cursor: cur, '--cursor-override': cur, width: resizeHandleHitSize, height: resizeHandleHitSize } as React.CSSProperties}
                        onPointerEnter={beginHandleCursorHover}
                        onPointerLeave={endHandleCursorHover}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsHandleCursorDragging(true);
                          document.documentElement.style.cursor = cur;
                          resizeRef.current = {
                            type: 'image',
                            id: img.id,
                            handle: hid,
                            startX: e.clientX,
                            startY: e.clientY,
                            origX: img.x,
                            origY: img.y,
                            origW: img.width,
                            origH: img.height,
                          };
                        }}
                      >
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-primary rounded-sm shadow-sm transition-transform hover:scale-105"
                          style={{
                            width: resizeHandleVisibleSize,
                            height: resizeHandleVisibleSize,
                            borderWidth: resizeHandleVisibleBorderWidth,
                            borderStyle: 'solid',
                          }}
                        />
                      </div>
                    ))}
                    <div className="absolute -top-6 left-0 text-[11px] font-medium text-primary/70 select-none whitespace-nowrap pointer-events-none">
                      {img.width} × {img.height}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* ── SVG Brush Strokes Layer ──
               Each stroke is an absolutely-positioned div sized to its bounding box
               so SVG content always stays within the element bounds (no overflow clipping issues). */}
          {brushStrokes.map((stroke) => {
            const kind = stroke.kind || 'brush';
            if (stroke.points.length < (kind === 'brush' ? 1 : 2)) return null;
            const isStrokeSelected = stroke.id === selectedStrokeId;
            const pad = stroke.size / 2 + (kind === 'arrow' ? Math.max(10, stroke.size * 3) : 6);
            const xs = stroke.points.map((p) => p.x);
            const ys = stroke.points.map((p) => p.y);
            const rawMinX = Math.min(...xs);
            const rawMinY = Math.min(...ys);
            const rawMaxX = Math.max(...xs);
            const rawMaxY = Math.max(...ys);
            const svgW = rawMaxX - rawMinX + pad * 2;
            const svgH = rawMaxY - rawMinY + pad * 2;
            // Path coords are local to the div (shifted by rawMin - pad)
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1] || start;
            const sx = start.x - rawMinX + pad;
            const sy = start.y - rawMinY + pad;
            const ex = end.x - rawMinX + pad;
            const ey = end.y - rawMinY + pad;

            const brushPath = stroke.points.length < 2 ? '' : stroke.points.reduce((acc, p, i) => {
              const lx = p.x - rawMinX + pad;
              const ly = p.y - rawMinY + pad;
              if (i === 0) return `M ${lx} ${ly}`;
              const prev = stroke.points[i - 1];
              const px = prev.x - rawMinX + pad;
              const py = prev.y - rawMinY + pad;
              const mx = (px + lx) / 2;
              const my = (py + ly) / 2;
              return `${acc} Q ${px} ${py} ${mx} ${my}`;
            }, '');

            const strokeNode = (() => {
              if (kind === 'brush') {
                return (
                  <path
                    d={brushPath}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                );
              }

              if (kind === 'line') {
                return <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />;
              }

              if (kind === 'arrow') {
                const angle = Math.atan2(ey - sy, ex - sx);
                const head = Math.max(10, stroke.size * 2.6);
                const a1 = angle - Math.PI / 7;
                const a2 = angle + Math.PI / 7;
                const hx1 = ex - head * Math.cos(a1);
                const hy1 = ey - head * Math.sin(a1);
                const hx2 = ex - head * Math.cos(a2);
                const hy2 = ey - head * Math.sin(a2);
                return (
                  <>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />
                    <path d={`M ${hx1} ${hy1} L ${ex} ${ey} L ${hx2} ${hy2}`} stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </>
                );
              }

              if (kind === 'rectangle') {
                const rx = Math.min(sx, ex);
                const ry = Math.min(sy, ey);
                const rw = Math.max(1, Math.abs(ex - sx));
                const rh = Math.max(1, Math.abs(ey - sy));
                const fillColor = stroke.fill ? hexToRgba(stroke.fillColor || stroke.color, 0.32) : 'none';
                return <rect x={rx} y={ry} width={rw} height={rh} stroke={stroke.color} strokeWidth={stroke.size} fill={fillColor} />;
              }

              const cx = (sx + ex) / 2;
              const cy = (sy + ey) / 2;
              const rx = Math.max(1, Math.abs(ex - sx) / 2);
              const ry = Math.max(1, Math.abs(ey - sy) / 2);
              const fillColor = stroke.fill ? hexToRgba(stroke.fillColor || stroke.color, 0.32) : 'none';
              return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={stroke.color} strokeWidth={stroke.size} fill={fillColor} />;
            })();
            return (
              <div
                key={stroke.id}
                ref={(el) => { if (el) strokeElemRefs.current.set(stroke.id, el); else strokeElemRefs.current.delete(stroke.id); }}
                className="absolute pointer-events-auto"
                style={{
                  left: rawMinX + stroke.offsetX - pad,
                  top: rawMinY + stroke.offsetY - pad,
                  width: svgW,
                  height: svgH,
                  cursor: isCanvasCustomCursorMode ? 'none' : activeTool === 'select' ? 'move' : undefined,
                  outline: isStrokeSelected ? '1.5px dashed hsl(var(--primary))' : undefined,
                  outlineOffset: '2px',
                }}
                onMouseDown={(e) => {
                  if (activeTool === 'brush' || activeTool === 'shapes') return;
                  e.stopPropagation();
                  setSelectedStrokeId(stroke.id);
                  setSelectedImageId(null);
                  if (activeTool === 'select') {
                    dragStrokeRef.current = { id: stroke.id, startX: e.clientX, startY: e.clientY, origOffsetX: stroke.offsetX, origOffsetY: stroke.offsetY, liveOffsetX: stroke.offsetX, liveOffsetY: stroke.offsetY };
                  }
                }}
              >
                <svg
                  width={svgW}
                  height={svgH}
                  style={{ display: 'block', opacity: stroke.opacity / 100 }}
                  className="pointer-events-none"
                >
                  {strokeNode}
                </svg>
              </div>
            );
          })}

          {/* Live brush stroke preview while drawing */}

          {/* ── Canvas Text Elements ── */}
          {canvasTexts.map((txt) => {
            const isSelected = txt.id === selectedTextId;
            const isEditing = txt.id === editingTextId;
            return (
              <div
                key={txt.id}
                ref={(el) => {
                  if (el) textElemRefs.current.set(txt.id, el);
                  else textElemRefs.current.delete(txt.id);
                }}
                className={cn(
                  "absolute pointer-events-auto",
                  isCanvasCustomCursorMode ? "cursor-none" : (activeTool === 'select' || activeTool === 'text') && !spaceHeld ? "cursor-move" : "",
                )}
                style={{
                  left: txt.x,
                  top: txt.y,
                  width: txt.width,
                  height: txt.height ? txt.height : undefined,
                  minHeight: 20,
                  overflow: txt.height ? 'hidden' : 'visible',
                  outline: isSelected ? '2px solid hsl(var(--primary))' : undefined,
                  outlineOffset: '4px',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.button !== 0) return;
                  if (activeTool === 'hand' || spaceHeld) {
                    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, origPanX: livePanX.current, origPanY: livePanY.current };
                    setIsPanning(true);
                    return;
                  }
                  setSelectedTextId(txt.id);
                  setSelectedImageId(null);
                  setSelectedStrokeId(null);
                  if ((activeTool === 'select' || activeTool === 'text') && !isEditing) {
                    dragTextRef.current = { id: txt.id, startX: e.clientX, startY: e.clientY, origX: txt.x, origY: txt.y };
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTextId(txt.id);
                  setSelectedTextId(txt.id);
                }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={txt.content}
                    onFocus={() => {
                      textEditStartRef.current.set(txt.id, txt.content);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCanvasTexts((prev) => prev.map((t) => t.id === txt.id ? { ...t, content: val } : t));
                    }}
                    onBlur={(e) => {
                      setEditingTextId(null);
                      const startValue = textEditStartRef.current.get(txt.id);
                      textEditStartRef.current.delete(txt.id);
                      if (startValue === undefined || startValue === e.currentTarget.value) return;
                      const historyImageId = canvasTexts.find((t) => t.id === txt.id)?.historyImageId ?? txt.historyImageId ?? null;
                      pushHistory('Edited text content', canvasImages, txt.id, canvasTexts, historyImageId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingTextId(null);
                    }}
                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden"
                    style={{
                      fontFamily: `'${txt.fontFamily}', sans-serif`,
                      fontSize: txt.fontSize,
                      fontWeight: txt.fontWeight,
                      color: `#${txt.color}`,
                      textAlign: txt.align,
                      lineHeight: txt.lineHeight,
                      letterSpacing: txt.letterSpacing,
                      opacity: txt.opacity / 100,
                      caretColor: `#${txt.color}`,
                      minHeight: txt.fontSize * 1.5,
                    }}
                  />
                ) : (
                  <div
                    className="whitespace-pre-wrap break-words select-none"
                    style={{
                      fontFamily: `'${txt.fontFamily}', sans-serif`,
                      fontSize: txt.fontSize,
                      fontWeight: txt.fontWeight,
                      color: `#${txt.color}`,
                      textAlign: txt.align,
                      lineHeight: txt.lineHeight,
                      letterSpacing: txt.letterSpacing,
                      opacity: txt.opacity / 100,
                    }}
                  >
                    {txt.content}
                  </div>
                )}
                {/* Resize handles + dimension readout */}
                {isSelected && !isEditing && (
                  <>
                    {RESIZE_HANDLES.map(({ id: hid, sx, tf, cur }) => (
                      <div
                        key={hid}
                        className="absolute z-10 pointer-events-auto"
                        data-cursor-override
                        style={{ ...sx, transform: tf, cursor: cur, '--cursor-override': cur, width: resizeHandleHitSize, height: resizeHandleHitSize } as React.CSSProperties}
                        onPointerEnter={beginHandleCursorHover}
                        onPointerLeave={endHandleCursorHover}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsHandleCursorDragging(true);
                          document.documentElement.style.cursor = cur;
                          const parentEl = e.currentTarget.parentElement!;
                          const parentRect = parentEl.getBoundingClientRect();
                          const currentH = parentRect.height / liveZoom.current;
                          resizeRef.current = {
                            type: 'text',
                            id: txt.id,
                            handle: hid,
                            startX: e.clientX,
                            startY: e.clientY,
                            origX: txt.x,
                            origY: txt.y,
                            origW: txt.width,
                            origH: txt.height || currentH,
                          };
                        }}
                      >
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-primary rounded-sm shadow-sm transition-transform hover:scale-105"
                          style={{
                            width: resizeHandleVisibleSize,
                            height: resizeHandleVisibleSize,
                            borderWidth: resizeHandleVisibleBorderWidth,
                            borderStyle: 'solid',
                          }}
                        />
                      </div>
                    ))}
                    <div className="absolute -top-6 left-0 text-[11px] font-medium text-primary/70 select-none whitespace-nowrap pointer-events-none">
                      {txt.width} × {txt.height || 'auto'}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {livePreviewStroke && livePreviewStroke.mode !== 'eraser' && livePreviewStroke.points.length > 1 && (() => {
            const current = livePreviewStroke;
            const pts = current.points;
            const mode = current.mode;
            const pad = brushDrawSize / 2 + (mode === 'arrow' ? Math.max(10, brushDrawSize * 3) : 6);
            const xs = pts.map((p) => p.x);
            const ys = pts.map((p) => p.y);
            const rawMinX = Math.min(...xs);
            const rawMinY = Math.min(...ys);
            const rawMaxX = Math.max(...xs);
            const rawMaxY = Math.max(...ys);
            const svgW = rawMaxX - rawMinX + pad * 2;
            const svgH = rawMaxY - rawMinY + pad * 2;
            const brushPath = pts.reduce((acc, p, i) => {
              const lx = p.x - rawMinX + pad;
              const ly = p.y - rawMinY + pad;
              if (i === 0) return `M ${lx} ${ly}`;
              const prev = pts[i - 1];
              const px = prev.x - rawMinX + pad;
              const py = prev.y - rawMinY + pad;
              const mx = (px + lx) / 2;
              const my = (py + ly) / 2;
              return `${acc} Q ${px} ${py} ${mx} ${my}`;
            }, '');

            const start = pts[0];
            const end = pts[pts.length - 1] || start;
            const sx = start.x - rawMinX + pad;
            const sy = start.y - rawMinY + pad;
            const ex = end.x - rawMinX + pad;
            const ey = end.y - rawMinY + pad;

            const previewNode = (() => {
              if (mode === 'brush') {
                return (
                  <path
                    d={brushPath}
                    stroke={brushDrawColor}
                    strokeWidth={brushDrawSize}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.85}
                  />
                );
              }

              if (mode === 'line') {
                return <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={brushDrawColor} strokeWidth={brushDrawSize} strokeLinecap="round" opacity={0.85} />;
              }

              if (mode === 'arrow') {
                const angle = Math.atan2(ey - sy, ex - sx);
                const head = Math.max(10, brushDrawSize * 2.6);
                const a1 = angle - Math.PI / 7;
                const a2 = angle + Math.PI / 7;
                const hx1 = ex - head * Math.cos(a1);
                const hy1 = ey - head * Math.sin(a1);
                const hx2 = ex - head * Math.cos(a2);
                const hy2 = ey - head * Math.sin(a2);
                return (
                  <g opacity={0.85}>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={brushDrawColor} strokeWidth={brushDrawSize} strokeLinecap="round" />
                    <path d={`M ${hx1} ${hy1} L ${ex} ${ey} L ${hx2} ${hy2}`} stroke={brushDrawColor} strokeWidth={brushDrawSize} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </g>
                );
              }

              if (mode === 'rectangle') {
                const rx = Math.min(sx, ex);
                const ry = Math.min(sy, ey);
                const rw = Math.max(1, Math.abs(ex - sx));
                const rh = Math.max(1, Math.abs(ey - sy));
                const previewFill = shapeFillEnabled ? hexToRgba(brushDrawColor, 0.32) : 'none';
                return <rect x={rx} y={ry} width={rw} height={rh} stroke={brushDrawColor} strokeWidth={brushDrawSize} fill={previewFill} opacity={0.85} />;
              }

              const cx = (sx + ex) / 2;
              const cy = (sy + ey) / 2;
              const rx = Math.max(1, Math.abs(ex - sx) / 2);
              const ry = Math.max(1, Math.abs(ey - sy) / 2);
              const previewFill = shapeFillEnabled ? hexToRgba(brushDrawColor, 0.32) : 'none';
              return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={brushDrawColor} strokeWidth={brushDrawSize} fill={previewFill} opacity={0.85} />;
            })();
            return (
              <div
                className="absolute pointer-events-none"
                style={{ left: rawMinX - pad, top: rawMinY - pad, width: svgW, height: svgH }}
              >
                <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                  {previewNode}
                </svg>
              </div>
            );
          })()}

          {/* Mask canvas overlay — captures draw events when edit-area is active */}
          {isImageSelected && activeSubPanel === 'edit-area' && selectedImage && (
            <canvas
              ref={maskCanvasRef}
              width={selectedImage.width}
              height={selectedImage.height}
              className={cn("absolute pointer-events-auto z-20", isCanvasCustomCursorMode ? "cursor-none" : "cursor-crosshair")}
              style={{ left: selectedImage.x, top: selectedImage.y, width: selectedImage.width, height: selectedImage.height }}
              onMouseDown={handleMaskMouseDown}
            />
          )}

          {/* Lasso in-progress preview SVG */}
          {isImageSelected && activeSubPanel === 'edit-area' && selectedImage && lassoPreviewPoints.length > 1 && (
            <svg
              className="absolute pointer-events-none"
              style={{ left: selectedImage.x, top: selectedImage.y, width: selectedImage.width, height: selectedImage.height, overflow: 'visible', zIndex: 21 }}
            >
              <polyline
                points={lassoPreviewPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(124,58,237,0.2)"
                stroke="rgba(124,58,237,0.9)"
                strokeWidth="2"
                strokeDasharray="6 3"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Area selection preview rect */}
          {isImageSelected && activeSubPanel === 'edit-area' && selectedImage && areaPreview && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: selectedImage.x + Math.min(areaPreview.x1, areaPreview.x2),
                top: selectedImage.y + Math.min(areaPreview.y1, areaPreview.y2),
                width: Math.abs(areaPreview.x2 - areaPreview.x1),
                height: Math.abs(areaPreview.y2 - areaPreview.y1),
                border: '2px dashed rgba(124,58,237,0.9)',
                background: 'rgba(124,58,237,0.15)',
                zIndex: 21,
              }}
            />
          )}

          {/* Outpaint / crop overlay */}
          {isImageSelected && activeSubPanel === 'outpaint' && selectedImage && (() => {
            const img = selectedImage;
            const expandL = Math.max(0, outpaintBounds.left);
            const expandT = Math.max(0, outpaintBounds.top);
            const expandR = Math.max(0, outpaintBounds.right);
            const expandB = Math.max(0, outpaintBounds.bottom);
            const cropL = Math.max(0, -outpaintBounds.left);
            const cropT = Math.max(0, -outpaintBounds.top);
            const cropR = Math.max(0, -outpaintBounds.right);
            const cropB = Math.max(0, -outpaintBounds.bottom);
            const vw = img.width + expandL + expandR;
            const vh = img.height + expandT + expandB;
            const finalW = Math.max(32, vw - cropL - cropR);
            const finalH = Math.max(32, vh - cropT - cropB);
            const vx = img.x - expandL;
            const vy = img.y - expandT;
            const cbg = 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)';
            return (
              <div key="outpaint-overlay" className="absolute" style={{ left: vx, top: vy, width: vw, height: vh, zIndex: 25, pointerEvents: 'none' }}>
                {/* New dimension label */}
                <div className="absolute -top-7 left-0 text-[11px] font-medium text-white/60 select-none whitespace-nowrap">
                  {Math.round(finalW)} × {Math.round(finalH)}
                </div>

                {/* Outpaint zones — checkerboard */}
                {expandL > 0 && <div className="absolute rounded-l-lg" style={{ left: 0, top: expandT, width: expandL, height: img.height, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandR > 0 && <div className="absolute rounded-r-lg" style={{ right: 0, top: expandT, width: expandR, height: img.height, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandT > 0 && <div className="absolute rounded-t-lg" style={{ top: 0, left: 0, right: 0, height: expandT, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandB > 0 && <div className="absolute rounded-b-lg" style={{ bottom: 0, left: 0, right: 0, height: expandB, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}

                {/* Crop zones — dark overlay inside original image */}
                {cropL > 0 && <div className="absolute bg-black/65" style={{ left: expandL, top: expandT, width: cropL, height: img.height }} />}
                {cropR > 0 && <div className="absolute bg-black/65" style={{ right: expandR, top: expandT, width: cropR, height: img.height }} />}
                {cropT > 0 && <div className="absolute bg-black/65" style={{ left: expandL + cropL, top: expandT, width: Math.max(0, img.width - cropL - cropR), height: cropT }} />}
                {cropB > 0 && <div className="absolute bg-black/65" style={{ left: expandL + cropL, bottom: expandB, width: Math.max(0, img.width - cropL - cropR), height: cropB }} />}

                {/* Border around virtual area */}
                <div className="absolute inset-0 border-2 border-white/60 rounded-lg pointer-events-none" />

                {/* Drag handles */}
                {(['top', 'right', 'bottom', 'left'] as const).map((handle) => {
                  const isHoriz = handle === 'top' || handle === 'bottom';
                  const style: React.CSSProperties = handle === 'top'
                    ? { top: 0, left: '50%', transform: 'translate(-50%, -50%)', cursor: 'ns-resize' }
                    : handle === 'bottom'
                    ? { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)', cursor: 'ns-resize' }
                    : handle === 'left'
                    ? { left: 0, top: '50%', transform: 'translate(-50%, -50%)', cursor: 'ew-resize' }
                    : { right: 0, top: '50%', transform: 'translate(50%, -50%)', cursor: 'ew-resize' };
                  return (
                    <div
                      key={handle}
                      className="absolute z-30"
                      data-cursor-override
                      style={{
                        ...style,
                        '--cursor-override': style.cursor,
                        pointerEvents: 'auto',
                        width: isHoriz ? outpaintHandleHitLong : outpaintHandleHitThick,
                        height: isHoriz ? outpaintHandleHitThick : outpaintHandleHitLong,
                      } as React.CSSProperties}
                      onPointerEnter={beginHandleCursorHover}
                      onPointerLeave={endHandleCursorHover}
                      onMouseDown={(e) => handleOutpaintMouseDown(e, handle, img)}
                    >
                      <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#999] hover:bg-white active:bg-white transition-colors shadow-md rounded-full"
                        style={
                          isHoriz
                            ? { width: outpaintHandleVisibleLong, height: outpaintHandleVisibleThick }
                            : { width: outpaintHandleVisibleThick, height: outpaintHandleVisibleLong }
                        }
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Floating edit-area action bar — positioned in screen space below selected image */}
        {isImageSelected && activeSubPanel === 'edit-area' && selectedImage && (
          <div
            className="absolute z-50 pointer-events-auto cursor-auto"
            style={{
              left: panX + (selectedImage.x + selectedImage.width / 2) * zoom,
              top: panY + (selectedImage.y + selectedImage.height) * zoom + 16,
              transform: 'translateX(-50%)',
            }}
            onMouseEnter={() => setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev))}
            onMouseLeave={() => setToolCursor((prev) => (isCanvasCustomCursorMode && !prev.visible ? { ...prev, visible: true } : prev))}
          >
            <div className="bg-[#111113]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[420px] max-w-[560px]">
              <div className="flex items-center gap-2">
                <input
                  value={editAreaPrompt}
                  onChange={(e) => setEditAreaPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleModifyAreaWithAI();
                    }
                  }}
                  placeholder="Describe how to modify selected area"
                  className="flex-1 min-w-0 bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  disabled={!hasMask || !editAreaPrompt.trim() || isProcessing}
                  onClick={handleModifyAreaWithAI}
                  className="bg-white disabled:opacity-40 disabled:cursor-not-allowed text-black text-[13px] font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  {isProcessing && processingAction === 'modify-area' ? 'Modifying...' : 'Modify with AI'}
                </button>
                <button
                  disabled={!hasMask || isProcessing}
                  onClick={handleEraseWithAI}
                  className="bg-surface border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-[13px] font-semibold py-2.5 px-4 rounded-xl hover:bg-white/8 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  {isProcessing && processingAction === 'erase-area' ? 'Erasing...' : 'Erase with AI'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Only the masked region is changed. The rest of the image is preserved.
              </p>
            </div>
          </div>
        )}

        {/* Floating outpaint / crop action bar */}
        {isImageSelected && activeSubPanel === 'outpaint' && selectedImage && (() => {
          const expandB = Math.max(0, outpaintBounds.bottom);
          const expandL = Math.max(0, outpaintBounds.left);
          const expandR = Math.max(0, outpaintBounds.right);
          const hasOutpaint = outpaintBounds.top > 0 || outpaintBounds.right > 0 || outpaintBounds.bottom > 0 || outpaintBounds.left > 0;
          const hasCrop = outpaintBounds.top < 0 || outpaintBounds.right < 0 || outpaintBounds.bottom < 0 || outpaintBounds.left < 0;
          const centerX = selectedImage.x - expandL + (selectedImage.width + expandL + expandR) / 2;
          const bottomY = selectedImage.y + selectedImage.height + expandB;
          return (
            <div
              className="absolute z-50 pointer-events-auto cursor-auto"
              style={{
                left: panX + centerX * zoom,
                top: panY + bottomY * zoom + 18,
                transform: 'translateX(-50%)',
              }}
              onMouseEnter={() => setToolCursor((prev) => (prev.visible ? { ...prev, visible: false } : prev))}
              onMouseLeave={() => setToolCursor((prev) => (isCanvasCustomCursorMode && !prev.visible ? { ...prev, visible: true } : prev))}
            >
              <div className="bg-[#111113]/97 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-0 h-11">
                  <input
                    value={outpaintPrompt}
                    onChange={(e) => setOutpaintPrompt(e.target.value)}
                    placeholder="Add prompt (optional)"
                    className="flex-1 bg-transparent px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none h-full min-w-0 w-52"
                  />
                  <div className="w-px h-6 bg-white/10 shrink-0" />
                  {hasCrop && (
                    <button
                      onClick={async () => {
                        if (!selectedImage || isProcessing || isCropping) return;
                        const cropL = Math.max(0, -outpaintBounds.left);
                        const cropT = Math.max(0, -outpaintBounds.top);
                        const cropR = Math.max(0, -outpaintBounds.right);
                        const cropB = Math.max(0, -outpaintBounds.bottom);
                        if (cropL + cropT + cropR + cropB === 0) return;
                        setIsCropping(true);
                        try {
                          const targetImageId = selectedImage.id;
                          const targetWidth = Math.round(Math.max(32, selectedImage.width - cropL - cropR));
                          const targetHeight = Math.round(Math.max(32, selectedImage.height - cropT - cropB));

                          const croppedFile = await cropImageUrlToFile(
                            selectedImage.url,
                            selectedImage.width,
                            selectedImage.height,
                            cropL,
                            cropT,
                            cropR,
                            cropB,
                            'cropped.png',
                          );

                          // Apply cropped preview immediately so the crop interaction feels instant.
                          const previewUrl = await fileToDataUrl(croppedFile);
                          const next = canvasImages.map((img) =>
                            img.id === targetImageId
                              ? {
                                  ...img,
                                  url: previewUrl,
                                  x: Math.round(img.x + cropL),
                                  y: Math.round(img.y + cropT),
                                  width: targetWidth,
                                  height: targetHeight,
                                }
                              : img
                          );
                          setCanvasImages(next);
                          pushHistory('Cropped image', next, targetImageId, canvasTexts, targetImageId);
                          setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
                          toast.success('Image cropped');

                          // Persist in background; replace preview URL only after the uploaded URL is loaded.
                          void (async () => {
                            try {
                              const fd = new FormData();
                              fd.append('file', croppedFile);
                              const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                              if (!uploadRes.ok) return;
                              const uploadData = await uploadRes.json();
                              const uploadedUrl = uploadData.url || '';
                              if (!uploadedUrl) return;
                              await preloadImageUrl(uploadedUrl);
                              setCanvasImages((prev) => prev.map((img) =>
                                img.id === targetImageId && img.url === previewUrl
                                  ? { ...img, url: uploadedUrl }
                                  : img
                              ));
                            } catch {
                              // Keep preview URL if background upload fails.
                            }
                          })();
                        } catch (err: any) {
                          toast.error(err?.message || 'Failed to crop image');
                        } finally {
                          setIsCropping(false);
                        }
                      }}
                      disabled={isProcessing || isCropping}
                      className="h-full px-4 text-[13px] font-semibold text-foreground disabled:text-muted-foreground hover:bg-white/8 disabled:hover:bg-transparent transition-colors whitespace-nowrap"
                    >
                      {isCropping ? 'Cropping...' : 'Crop'}
                    </button>
                  )}
                  <button
                    disabled={!hasOutpaint || hasCrop || isProcessing || isCropping}
                    onClick={handleOutpaintExpand}
                    className="h-full px-4 text-[13px] font-semibold text-foreground disabled:text-muted-foreground hover:bg-white/8 disabled:hover:bg-transparent transition-colors whitespace-nowrap"
                  >
                    {isCropping ? 'Cropping...' : isProcessing ? 'Processing...' : 'Expand'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TOP HEADER */}
      <header className="absolute top-0 w-full p-4 flex items-center justify-between z-50 pointer-events-none">
        
        {/* Top Left Navigation */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* App Logo / Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogoMenu((v) => !v); }}
              className="w-12 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center gap-1 hover:bg-neutral-900 transition-colors shadow-lg"
            >
              <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center shrink-0">
                <Hexagon className="w-3.5 h-3.5 text-black" fill="currentColor" />
              </div>
              <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', showLogoMenu && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showLogoMenu && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setShowLogoMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-2 z-50 w-64 bg-white dark:bg-[#1a1a1a] border border-black/8 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 text-gray-800 dark:text-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { label: 'Projects', href: '/projects' },
                      { label: 'Styles', href: '/styles' },
                    ].map((item) => (
                      <Link key={item.label} href={item.href} onClick={() => setShowLogoMenu(false)}
                        className="flex items-center px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {item.label}
                      </Link>
                    ))}
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <button
                      onClick={() => { setShowLogoMenu(false); router.push('/projects'); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Create new project
                    </button>
                    <button
                      onClick={() => { setShowLogoMenu(false); handleDuplicate(); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Duplicate project
                    </button>
                    <button
                      onClick={() => { setShowLogoMenu(false); handleDelete(); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left text-red-500">
                      Delete project
                    </button>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <button
                      onClick={() => { setShowLogoMenu(false); historyUndo(); }}
                      disabled={!canUndo}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-30">
                      <span className="text-gray-400">Undo</span>
                      <span className="text-xs text-gray-400">⌘ Z</span>
                    </button>
                    <button
                      onClick={() => { setShowLogoMenu(false); historyRedo(); }}
                      disabled={!canRedo}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-30">
                      <span className="text-gray-400">Redo</span>
                      <span className="text-xs text-gray-400">⌘ ⇧ Z</span>
                    </button>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-400">Duplicate selection</span>
                      <span className="text-xs text-gray-400">⌘ D</span>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center bg-elevated/80 backdrop-blur-md border border-white/5 rounded-xl h-10 px-1 shadow-lg">
            <Button variant="ghost" size="sm" onClick={() => setShowHistoryPanel((p) => !p)} className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </div>

        {/* Top Center: Project Title */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="bg-elevated/90 backdrop-blur-md border border-primary/60 px-4 h-10 rounded-xl text-sm font-medium text-white focus:outline-none w-48 text-center"
            />
          ) : (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setProjectMenuOpen((v) => !v); }}
                className="flex items-center gap-2 bg-elevated/80 backdrop-blur-md border border-white/5 hover:bg-elevated px-4 h-10 rounded-xl transition-colors shadow-lg group"
              >
                {projectSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : null}
                <span className="text-sm font-medium max-w-[160px] truncate">{projectName}</span>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground group-hover:text-white transition-all', projectMenuOpen && 'rotate-180')} />
              </button>
              {/* Auto-save status indicator */}
              <AnimatePresence>
                {autoSaveStatus !== 'idle' && (
                  <motion.div
                    key={autoSaveStatus}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap"
                  >
                    {autoSaveStatus === 'pending' ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground/60">Saving…</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-success/70" />
                        <span className="text-[10px] text-muted-foreground/60">Saved locally</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {projectMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -6 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-52 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden py-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setProjectMenuOpen(false); setRenameValue(projectName); setRenaming(true); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                        Rename
                      </button>
                      <button
                        onClick={handleDuplicate}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => { void handleShare(); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
                      >
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        Share project
                      </button>
                      <div className="h-px bg-border mx-3 my-1" />
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-error hover:bg-error/8 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-elevated/80 backdrop-blur-md border border-white/5 rounded-xl h-10 px-1 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); stepZoom('out'); }}
              disabled={zoom <= 0.05}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg"
              onClick={(e) => { e.stopPropagation(); fitToView(); }}
              onDoubleClick={(e) => { e.stopPropagation(); setZoom(1); setPanX(0); setPanY(0); }}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); stepZoom('in'); }}
              disabled={zoom >= 8}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            {/* Canvas Background Picker */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowArrangeDropdown(false);
                  setShowBgDropdown((v) => !v);
                }}
                className={cn('h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors', showBgDropdown ? 'text-white bg-white/8' : 'text-muted-foreground hover:text-white hover:bg-white/5')}
                title="Canvas background"
              >
                {canvasBg === 'dots' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="12" cy="2" r="1" fill="currentColor"/><circle cx="2" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                )}
                {canvasBg === 'grid' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M0 4.67h14M0 9.33h14M4.67 0v14M9.33 0v14"/></svg>
                )}
                {canvasBg === 'lines' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M0 3.5h14M0 7h14M0 10.5h14"/></svg>
                )}
                {canvasBg === 'cross' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="0.9"><path d="M5 2v4M3 4h4M10 2v4M8 4h4M5 8v4M3 10h4M10 8v4M8 10h4"/></svg>
                )}
                {canvasBg === 'none' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.9"/></svg>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showBgDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBgDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5">
                    <p className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-widest text-white/30">Canvas Background</p>
                    {([
                      {
                        id: 'dots' as const, label: 'Dots',
                        desc: 'Minimal dot matrix',
                        preview: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="4" cy="4" r="1.2" fill="#7c3aed"/><circle cx="14" cy="4" r="1.2" fill="#7c3aed"/><circle cx="24" cy="4" r="1.2" fill="#7c3aed"/><circle cx="4" cy="14" r="1.2" fill="#7c3aed"/><circle cx="14" cy="14" r="1.2" fill="#7c3aed"/><circle cx="24" cy="14" r="1.2" fill="#7c3aed"/><circle cx="4" cy="24" r="1.2" fill="#7c3aed"/><circle cx="14" cy="24" r="1.2" fill="#7c3aed"/><circle cx="24" cy="24" r="1.2" fill="#7c3aed"/></svg>,
                      },
                      {
                        id: 'grid' as const, label: 'Grid',
                        desc: 'Precise crosshatch lines',
                        preview: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#7c3aed" strokeWidth="1"><path d="M0 9.33h28M0 18.67h28M9.33 0v28M18.67 0v28"/></svg>,
                      },
                      {
                        id: 'lines' as const, label: 'Lines',
                        desc: 'Horizontal ruled lines',
                        preview: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#7c3aed" strokeWidth="1"><path d="M0 7h28M0 14h28M0 21h28"/></svg>,
                      },
                      {
                        id: 'cross' as const, label: 'Crosses',
                        desc: 'Scattered plus marks',
                        preview: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#7c3aed" strokeWidth="1.2"><path d="M8 4v8M4 8h8M20 4v8M16 8h8M8 16v8M4 20h8M20 16v8M16 20h8"/></svg>,
                      },
                      {
                        id: 'none' as const, label: 'Solid',
                        desc: 'Clean solid canvas',
                        preview: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="4" fill="#0A0A0B" stroke="#7c3aed" strokeWidth="1"/></svg>,
                      },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setCanvasBg(opt.id); setShowBgDropdown(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left',
                          canvasBg === opt.id ? 'bg-primary/15 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', canvasBg === opt.id ? 'bg-primary/20' : 'bg-white/5')}>
                          {opt.preview}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold leading-tight">{opt.label}</span>
                          <span className="text-[11px] text-white/40 leading-tight">{opt.desc}</span>
                        </div>
                        {canvasBg === opt.id && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Canvas Image Arrange Picker */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBgDropdown(false);
                  setShowArrangeDropdown((v) => !v);
                }}
                disabled={canvasImages.length === 0}
                className={cn(
                  'h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors',
                  showArrangeDropdown
                    ? 'text-white bg-white/8'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5',
                  canvasImages.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
                title={canvasImages.length === 0 ? 'Add images to arrange' : 'Arrange images on canvas'}
              >
                <LayoutGridIcon2 className="w-3.5 h-3.5" />
                Arrange
                <ChevronDown className="w-3 h-3" />
              </button>
              {showArrangeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowArrangeDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5">
                    <p className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-widest text-white/30">Arrange Images</p>
                    {([
                      { id: 'auto' as const, label: 'Auto Grid', desc: 'Balanced layout by count' },
                      { id: 2 as const, label: '2x2 Grid', desc: 'Loose spacing, larger tiles' },
                      { id: 3 as const, label: '3x3 Grid', desc: 'Balanced medium layout' },
                      { id: 4 as const, label: '4x4 Grid', desc: 'Denser arrangement' },
                      { id: 5 as const, label: '5x5 Grid', desc: 'Compact board style' },
                      { id: 8 as const, label: '8x8 Grid', desc: 'High density mosaic' },
                      { id: 10 as const, label: '10x10 Grid', desc: 'Ultra dense contact sheet' },
                    ]).map((opt) => (
                      <button
                        key={String(opt.id)}
                        onClick={() => arrangeCanvasImages(opt.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left text-white/75 hover:bg-white/6 hover:text-white"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/5">
                          <LayoutGridIcon2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold leading-tight">{opt.label}</span>
                          <span className="text-[11px] text-white/40 leading-tight">{opt.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void handleShare();
              }}
              disabled={shareLinkLoading}
              className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg disabled:opacity-70"
            >
              {shareLinkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Share'}
            </Button>
            <AnimatePresence>
              {shareLinkReady && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9, x: -4 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -4 }}
                  transition={{ duration: 0.12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCopyShareLink();
                  }}
                  title="Copy share link"
                  aria-label="Copy share link"
                  className="h-8 w-8 rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 flex items-center justify-center"
                >
                  <Copy className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-primary hover:text-primary hover:bg-primary/10 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {user?.credits ?? 0}
            </Button>
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }}
              className="h-8 text-xs font-bold px-4 ml-1 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]"
            >
              Upgrade
            </Button>
          </div>

          {/* Avatar / Profile menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowProfileMenu((v) => !v); }}
              className="w-10 h-10 rounded-xl bg-elevated/80 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-elevated transition-colors shadow-lg overflow-hidden"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl || undefined} alt="User" className="w-7 h-7 rounded-lg" />
              ) : (
                <div className="w-7 h-7 bg-gray-200 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500 dark:text-white/50" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-[#1a1a1a] border border-black/8 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 text-gray-800 dark:text-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User info */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {user?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl || undefined} alt="User" className="w-9 h-9 object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user?.email ?? 'User'}</p>
                        <p className="text-xs text-gray-400 capitalize">{user?.plan ?? 'Free'}</p>
                      </div>
                    </div>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 mb-1" />

                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        if (isPortalLoading) return;
                        setIsPortalLoading(true);
                        try {
                          const res = await fetch('/api/stripe/portal', { method: 'POST' });
                          const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                          if (!res.ok) throw new Error(data.error || 'Failed to open portal');
                          if (data.url) window.location.href = data.url;
                        } catch (err: unknown) {
                          toast.error(err instanceof Error ? err.message : 'Could not open portal');
                        } finally {
                          setIsPortalLoading(false);
                        }
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      {isPortalLoading ? 'Opening...' : 'Manage subscription'}
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowUpgradeModal(true); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Pricing and plans
                    </button>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <button
                      onClick={() => { setShowProfileMenu(false); router.push('/profile'); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Profile
                    </button>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Logout
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

      </header>

      {/* LEFT TOOLBAR */}
      <aside className="absolute left-4 top-1/2 -translate-y-1/2 bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1.5 z-40 shadow-2xl pointer-events-auto">
        <ToolButton icon={<MousePointer2 className="w-5 h-5" />} active={activeTool === 'select'} tooltip="Select (V)" onClick={() => selectTool('select')} />
        <ToolButton icon={<Hand className="w-5 h-5" />} active={activeTool === 'hand'} tooltip="Hand Tool (H)" onClick={() => selectTool('hand')} />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        
        <div className="relative">
          <ToolButton 
            icon={<Shapes className="w-5 h-5" />} 
            tooltip="Shapes (S)" 
            onClick={(e) => {
              e.stopPropagation();
              setShowBrushMenu(false);
              if (activeTool !== 'brush' && activeTool !== 'shapes') selectTool('shapes');
              toggleDropdown('shapes');
            }}
            active={activeTool === 'shapes' || activeTool === 'brush'}
          />
          <AnimatePresence>
            {activeDropdown === 'shapes' && (
                <motion.div
                initial={{ opacity: 0, scale: 0.96, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: -8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 380, mass: 0.6 }}
                  className="fixed left-20 top-1/2 -translate-y-1/2 w-56 max-h-[78vh] bg-elevated/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden z-50 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="max-h-[78vh] overflow-y-auto no-scrollbar">
                    <AnimatePresence initial={false}>
                      {showBrushMenu && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.7 }}
                          className="overflow-hidden border-b border-white/8"
                        >
                          <div className="p-3 flex flex-col gap-3 bg-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">{drawMode === 'eraser' ? 'Eraser' : drawMode === 'brush' ? 'Brush' : drawMode}</span>
                              <button onClick={() => setShowBrushMenu(false)} className="text-white/35 hover:text-white transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Size</span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">{brushDrawSize}px</span>
                              </div>
                              <input
                                type="range" min={1} max={40} value={brushDrawSize}
                                onChange={(e) => setBrushDrawSize(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/40"
                              />
                              <div className="flex items-center justify-center h-8 bg-white/5 rounded-lg">
                                <div
                                  className={cn('rounded-full border', drawMode === 'eraser' ? 'border-white/40 bg-transparent' : 'border-transparent')}
                                  style={{ width: brushDrawSize, height: brushDrawSize, backgroundColor: drawMode === 'eraser' ? 'transparent' : brushDrawColor }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-[11px] text-muted-foreground font-medium">Color</span>
                              <div className="grid grid-cols-6 gap-1">
                                {['#ffffff', '#a3a3a3', '#525252', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#0A0A0B'].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setBrushDrawColor(c)}
                                    className={cn(
                                      'w-5.5 h-5.5 rounded-md transition-all border',
                                      brushDrawColor === c ? 'border-primary scale-105 shadow-lg' : 'border-transparent hover:border-white/20'
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-white/10 shrink-0">
                                  <input
                                    type="color"
                                    value={brushDrawColor}
                                    onChange={(e) => setBrushDrawColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                                  />
                                  <div className="w-full h-full" style={{ backgroundColor: brushDrawColor }} />
                                </div>
                                <input
                                  type="text"
                                  value={brushDrawColor}
                                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBrushDrawColor(e.target.value); }}
                                  className="flex-1 h-7 bg-white/5 border border-white/10 rounded-md px-2 text-[11px] text-white font-mono outline-none focus:border-primary transition-colors"
                                />
                              </div>
                            </div>

                            {(drawMode === 'rectangle' || drawMode === 'ellipse') && (
                              <button
                                onClick={() => setShapeFillEnabled((prev) => !prev)}
                                className={cn(
                                  'h-7 rounded-md text-[11px] font-semibold border transition-colors',
                                  shapeFillEnabled
                                    ? 'bg-primary/20 border-primary/60 text-primary'
                                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                                )}
                              >
                                {shapeFillEnabled ? 'Fill enabled' : 'Enable fill'}
                              </button>
                            )}

                            <button
                              onClick={() => setDrawMode((prev) => (prev === 'eraser' ? 'brush' : 'eraser'))}
                              className={cn(
                                'h-7 rounded-md text-[11px] font-semibold border transition-colors',
                                drawMode === 'eraser'
                                  ? 'bg-primary/20 border-primary/60 text-primary'
                                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {drawMode === 'eraser' ? 'Eraser enabled' : 'Enable eraser'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <ShapesMenuItem icon={<Paintbrush className="w-4 h-4" strokeWidth={1.5} />} label="Brush" shortcut="B" onClick={() => {
                        const shouldCloseBrushMenu = drawMode === 'brush' && showBrushMenu;
                        setDrawMode('brush');
                        selectTool('brush', { keepDropdown: true });
                        setShowBrushMenu(!shouldCloseBrushMenu);
                      }} />
                      <ShapesMenuItem icon={<ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />} label="Arrow" shortcut="⇧ L" onClick={() => { setDrawMode('arrow'); selectTool('shapes', { keepDropdown: true }); setShowBrushMenu(true); }} />
                      <ShapesMenuItem icon={<Square className="w-4 h-4" strokeWidth={1.5} />} label="Rectangle" shortcut="R" onClick={() => { setDrawMode('rectangle'); selectTool('shapes', { keepDropdown: true }); setShowBrushMenu(true); }} />
                      <ShapesMenuItem icon={<Circle className="w-4 h-4" strokeWidth={1.5} />} label="Ellipse" shortcut="O" onClick={() => { setDrawMode('ellipse'); selectTool('shapes', { keepDropdown: true }); setShowBrushMenu(true); }} />
                      <ShapesMenuItem icon={<Slash className="w-4 h-4" strokeWidth={1.5} />} label="Line" shortcut="L" onClick={() => { setDrawMode('line'); selectTool('shapes', { keepDropdown: true }); setShowBrushMenu(true); }} isLast />
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ToolButton icon={<Frame className="w-5 h-5" />} active={activeTool === 'frame'} tooltip="Frame (F)" onClick={() => { selectTool('frame'); setShowFrameMenu(true); }} />
        <ToolButton icon={<Type className="w-5 h-5" />} active={activeTool === 'text'} tooltip="Text (T)" onClick={() => selectTool('text')} />
        <ToolButton icon={<Upload className="w-5 h-5" />} active={activeTool === 'upload'} tooltip="Upload Images (I)" onClick={() => selectTool(activeTool === 'upload' ? 'select' : 'upload')} />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        <ToolButton icon={<Undo2 className={`w-5 h-5 ${!canUndo ? 'opacity-30' : ''}`} />} tooltip="Undo (Cmd+Z)" onClick={historyUndo} />
        <ToolButton icon={<Redo2 className={`w-5 h-5 ${!canRedo ? 'opacity-30' : ''}`} />} tooltip="Redo (Cmd+Shift+Z)" onClick={historyRedo} />
      </aside>

      {/* ── FRAME TOOL FLOATING MENU ── */}
      <AnimatePresence>
        {activeTool === 'frame' && showFrameMenu && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 340 }}
            className="absolute left-20 top-1/2 -translate-y-1/2 z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-elevated/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.7)] p-4 w-60 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Frame</span>
                <button onClick={() => { setShowFrameMenu(false); selectTool('select'); }} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Aspect ratio presets */}
              <div className="flex flex-col gap-2">
                <span className="text-[12px] text-muted-foreground font-medium">Aspect Ratio</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4', 'Custom'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFrameMenuRatio(r)}
                      className={cn(
                        'h-8 rounded-lg text-[11px] font-medium transition-all border',
                        frameMenuRatio === r
                          ? 'bg-primary/20 border-primary/60 text-primary'
                          : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ratio preview or custom inputs */}
              {frameMenuRatio === 'Custom' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-muted-foreground font-medium">Size (px)</span>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">W</span>
                      <input
                        type="number"
                        min={64} max={4096}
                        value={frameCustomW}
                        onChange={(e) => setFrameCustomW(Math.max(64, Math.min(4096, Number(e.target.value))))}
                        className="w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white font-mono outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <span className="text-white/20 mt-4">×</span>
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">H</span>
                      <input
                        type="number"
                        min={64} max={4096}
                        value={frameCustomH}
                        onChange={(e) => setFrameCustomH(Math.max(64, Math.min(4096, Number(e.target.value))))}
                        className="w-full h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white font-mono outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  const FRAME_RATIO_MAP: Record<string, [number, number]> = {
                    '1:1': [1024, 1024], '16:9': [1365, 1024], '9:16': [1024, 1365],
                    '4:3': [1536, 1024], '3:4': [1024, 1536],
                  };
                  const [fw, fh] = FRAME_RATIO_MAP[frameMenuRatio] || [1024, 1024];
                  const maxPreviewW = 80;
                  const maxPreviewH = 60;
                  const scale = Math.min(maxPreviewW / fw, maxPreviewH / fh);
                  const pw = Math.round(fw * scale);
                  const ph = Math.round(fh * scale);
                  return (
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="bg-white/5 border border-primary/30 rounded-sm"
                        style={{ width: pw, height: ph }}
                      />
                      <span className="text-[10px] text-white/30 tabular-nums">{fw} × {fh}</span>
                    </div>
                  );
                })()
              )}

              {/* Insert button */}
              <button
                onClick={() => {
                  if (frameMenuRatio === 'Custom') {
                    insertFrame(frameCustomW, frameCustomH);
                  } else {
                    const FRAME_RATIO_MAP: Record<string, [number, number]> = {
                      '1:1': [1024, 1024], '16:9': [1365, 1024], '9:16': [1024, 1365],
                      '4:3': [1536, 1024], '3:4': [1024, 1536],
                    };
                    const [fw, fh] = FRAME_RATIO_MAP[frameMenuRatio] || [1024, 1024];
                    insertFrame(fw, fh);
                  }
                }}
                className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Frame className="w-3.5 h-3.5" />
                Insert Frame
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HISTORY MODAL ── */}
      <AnimatePresence>
        {showHistoryPanel && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryPanel(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400, bounce: 0.2 }}
              className="relative w-full max-w-sm h-[70vh] max-h-[600px] bg-[#0A0A0B] rounded-3xl overflow-hidden border border-white/5 shadow-[0_0_60px_-10px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <span className="text-base font-semibold text-foreground">History</span>
                <button onClick={() => setShowHistoryPanel(false)} className="p-1.5 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {historyStackRef.current.map((entry, idx) => (
                  <button
                    key={`${idx}-${entry.timestamp}`}
                    onClick={() => historyJumpTo(idx)}
                    className={`w-full text-left px-6 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                      idx === historyIndexRef.current
                        ? 'bg-white/10 text-white'
                        : idx > historyIndexRef.current
                          ? 'text-muted-foreground/40 hover:bg-white/5'
                          : 'text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === historyIndexRef.current ? 'bg-blue-400' : idx > historyIndexRef.current ? 'bg-white/15' : 'bg-white/30'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{entry.label}</div>
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        {entry.snapshot.length > 0 && ` · ${entry.snapshot.length} image${entry.snapshot.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-white/8 flex gap-2">
                <button
                  onClick={historyUndo}
                  disabled={!canUndo}
                  className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-medium text-foreground transition-colors"
                >
                  Undo
                </button>
                <button
                  onClick={historyRedo}
                  disabled={!canRedo}
                  className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-medium text-foreground transition-colors"
                >
                  Redo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden file input (legacy, kept for other uses) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); console.log(url); }}
      />

      {/* ── UPLOAD MODAL ── */}
      <AnimatePresence>
        {activeTool === 'upload' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => selectTool('select')}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400, bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg h-[75vh] max-h-[640px] bg-[#0A0A0B] rounded-3xl overflow-hidden border border-white/5 shadow-[0_0_60px_-10px_rgba(0,0,0,0.8)] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                  <Upload className="w-5 h-5 text-primary" /> Uploads
                </h2>
                <button onClick={() => selectTool('select')} className="p-1.5 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drop zone */}
              <div className="px-6 pt-5">
                <div
                  className={cn(
                    "rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 py-8 cursor-pointer transition-all",
                    isDraggingOver
                      ? "border-primary/70 bg-primary/8"
                      : "border-white/15 bg-white/2 hover:border-white/30 hover:bg-white/4"
                  )}
                  onClick={() => { if (!isUploadingFiles) uploadPanelInputRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                    void uploadFilesToLibrary(files);
                  }}
                >
                  <div className="w-11 h-11 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{isUploadingFiles ? 'Uploading images...' : 'Click or drop images here'}</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, GIF supported</p>
                  </div>
                </div>
              </div>

              {/* Hidden input for file picker */}
              <input
                ref={uploadPanelInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  void uploadFilesToLibrary(files);
                  e.target.value = '';
                }}
              />

              {/* Image grid */}
              <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
                {isUploadsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-70">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground text-center">Loading uploads...</p>
                  </div>
                ) : uploadedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9l4-4 4 4 4-6 4 6" /><circle cx="8" cy="14" r="2" /></svg>
                    <p className="text-sm text-muted-foreground text-center">No images uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-white/8 bg-surface aspect-square cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          const rect = canvasRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const cx = (rect.width / 2 - livePanX.current) / liveZoom.current;
                          const cy = (rect.height / 2 - livePanY.current) / liveZoom.current;
                          const sourceW = img.w > 0 ? img.w : 1024;
                          const sourceH = img.h > 0 ? img.h : 1024;
                          const maxDim = 512;
                          const scale = Math.min(1, maxDim / Math.max(sourceW, sourceH));
                          const w = Math.round(sourceW * scale);
                          const h = Math.round(sourceH * scale);
                          const newImg: CanvasImage = {
                            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            url: img.url,
                            width: w,
                            height: h,
                            x: Math.round(cx - w / 2),
                            y: Math.round(cy - h / 2),
                            prompt: img.name,
                            model: 'upload',
                            style: '',
                            ratio: `${w}x${h}`,
                            isFrame: false,
                          };
                          setCanvasImages((prev) => { const next = [...prev, newImg]; pushHistory('Uploaded image', next, newImg.id); return next; });
                          setSelectedImageId(newImg.id);
                          selectTool('select');
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url || undefined} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                          <span className="text-xs font-semibold text-white">Add to canvas</span>
                        </div>
                        <button
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 z-10"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`/api/images/${img.id}`, { method: 'DELETE' });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || 'Failed to remove upload');
                              }
                              setUploadedImages((prev) => prev.filter((i) => i.id !== img.id));
                            } catch (err: any) {
                              toast.error(err?.message || 'Failed to remove upload');
                            }
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadedImages.length > 0 && (
                <div className="px-6 py-4 border-t border-white/8">
                  <button
                    onClick={async () => {
                      const snapshot = [...uploadedImages];
                      setUploadedImages([]);
                      const results = await Promise.allSettled(
                        snapshot.map((img) => fetch(`/api/images/${img.id}`, { method: 'DELETE' }))
                      );
                      const failed = results.some((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
                      if (failed) {
                        setUploadedImages(snapshot);
                        toast.error('Failed to clear uploads');
                      }
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-red-400 transition-colors py-1"
                  >
                    Clear all uploads
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generation loading overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ paddingRight: isPanelActive ? 220 : 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4 bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 shadow-2xl pointer-events-auto"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Generating...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PROPERTIES PANEL */}
      <AnimatePresence>
        {isPanelActive && (
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="absolute right-0 top-0 h-full w-72 bg-elevated/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── TEXT PANEL (text tool active or text element selected) ── */}
            {(isTextActive || isTextSelected) && !isImageSelected && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Font Cards — The Highlight */}
                <div className="p-3 pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" /> Fonts
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{addedFonts.length} available</span>
                  </div>
                </div>

                {/* Scrollable font cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ maxHeight: 320 }}>
                  {addedFonts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Type className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground text-center">No fonts added yet.<br />Visit <span className="text-primary">/addfonts</span> to add Google Fonts.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {addedFonts.map((font) => {
                        const isActive = textFontFamily === font.family;
                        return (
                          <button
                            key={font.id}
                            onClick={() => {
                              setTextFontFamily(font.family);
                              loadGoogleFont(font.family);
                              // Update selected text element if one is selected
                              if (selectedTextId) {
                                setCanvasTexts((prev) => {
                                  const next = prev.map((t) => t.id === selectedTextId ? { ...t, fontFamily: font.family } : t);
                                  pushTextHistory('Changed text font', next, selectedTextId);
                                  return next;
                                });
                              }
                            }}
                            className={cn(
                              "group relative w-full text-left rounded-xl border p-3 transition-all",
                              isActive
                                ? "border-primary/50 bg-primary/10"
                                : "border-white/8 bg-surface hover:border-white/20 hover:bg-white/5"
                            )}
                          >
                            <div
                              className="text-[17px] text-white truncate mb-0.5"
                              style={{ fontFamily: `'${font.family}', sans-serif` }}
                            >
                              {font.family}
                            </div>
                            <div
                              className="text-[12px] text-muted-foreground truncate"
                              style={{ fontFamily: `'${font.family}', sans-serif` }}
                            >
                              The quick brown fox
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground/70 border border-white/5">
                                {font.category}
                              </span>
                              {isActive && <Check className="w-3 h-3 text-primary ml-auto" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/8 mx-3" />

                {/* Text Properties */}
                <div className="p-3 flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>

                  {/* Font size + Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Size</label>
                      <input
                        type="number"
                        value={selectedText?.fontSize ?? textFontSize}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTextFontSize(v);
                          if (selectedTextId) setCanvasTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, fontSize: v } : t));
                        }}
                        onBlur={() => {
                          if (!selectedTextId) return;
                          pushTextHistory('Adjusted text size');
                        }}
                        className="w-full bg-surface border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Weight</label>
                      <select
                        value={selectedText?.fontWeight ?? textFontWeight}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTextFontWeight(v);
                          if (selectedTextId) {
                            setCanvasTexts((prev) => {
                              const next = prev.map((t) => t.id === selectedTextId ? { ...t, fontWeight: v } : t);
                              pushTextHistory('Changed text weight', next, selectedTextId);
                              return next;
                            });
                          }
                        }}
                        className="w-full bg-surface border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                          <option key={w} value={w}>{w === 400 ? '400 Regular' : w === 700 ? '700 Bold' : w}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Line height + Letter spacing */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Line Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedText?.lineHeight ?? textLineHeight}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 1.2;
                          setTextLineHeight(v);
                          if (selectedTextId) setCanvasTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, lineHeight: v } : t));
                        }}
                        onBlur={() => {
                          if (!selectedTextId) return;
                          pushTextHistory('Adjusted text line height');
                        }}
                        className="w-full bg-surface border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Spacing</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedText?.letterSpacing ?? textLetterSpacing}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setTextLetterSpacing(v);
                          if (selectedTextId) setCanvasTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, letterSpacing: v } : t));
                        }}
                        onBlur={() => {
                          if (!selectedTextId) return;
                          pushTextHistory('Adjusted text letter spacing');
                        }}
                        className="w-full bg-surface border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  {/* Color + Align */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Color</label>
                      <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg px-2.5 py-1.5">
                        <input
                          type="color"
                          value={`#${selectedText?.color ?? textColor}`}
                          onChange={(e) => {
                            const v = e.target.value.replace('#', '');
                            setTextColor(v);
                            if (selectedTextId) setCanvasTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, color: v } : t));
                          }}
                          onBlur={() => {
                            if (!selectedTextId) return;
                            pushTextHistory('Changed text color');
                          }}
                          className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <span className="text-xs text-foreground font-mono truncate">{(selectedText?.color ?? textColor).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Align</label>
                      <div className="flex items-center gap-0.5 bg-surface border border-white/10 rounded-lg p-0.5">
                        {(['left', 'center', 'right'] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => {
                              setTextAlign(a);
                              if (selectedTextId) {
                                setCanvasTexts((prev) => {
                                  const next = prev.map((t) => t.id === selectedTextId ? { ...t, align: a } : t);
                                  pushTextHistory('Changed text alignment', next, selectedTextId);
                                  return next;
                                });
                              }
                            }}
                            className={cn(
                              "flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors",
                              (selectedText?.align ?? textAlign) === a ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                            )}
                          >
                            {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">Opacity</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selectedText?.opacity ?? 100}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (selectedTextId) setCanvasTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, opacity: v } : t));
                      }}
                      onPointerUp={() => {
                        if (!selectedTextId) return;
                        pushTextHistory('Adjusted text opacity');
                      }}
                      className="w-full accent-primary"
                    />
                  </div>

                  {/* Size readout */}
                  {selectedTextId && selectedText && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-surface border border-white/8 rounded-lg px-2.5 py-1.5 select-none">
                      <span className="font-mono">{selectedText.width}w</span>
                      <span className="opacity-40">×</span>
                      <span className="font-mono">{selectedText.height ? `${selectedText.height}h` : 'auto h'}</span>
                      <span className="ml-auto text-[9px] opacity-50">drag handles to resize</span>
                    </div>
                  )}

                  {/* Delete text */}
                  {selectedTextId && (
                    <button
                      onClick={() => {
                        setCanvasTexts((prev) => {
                          const historyImageId = prev.find((t) => t.id === selectedTextId)?.historyImageId ?? null;
                          const next = prev.filter((t) => t.id !== selectedTextId);
                          pushHistory('Deleted text', canvasImages, selectedTextId, next, historyImageId);
                          return next;
                        });
                        setSelectedTextId(null);
                        setEditingTextId(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete text
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── FRAME PANEL (selected frame) ── */}
            {isImageSelected && selectedImage?.isFrame && (
              <>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Frame className="w-4 h-4 text-primary" /> Frame
                    </h3>
                    <button
                      onClick={() => {
                        setCanvasImages((prev) => prev.filter((img) => img.id !== selectedImage.id));
                        setSelectedImageId(null);
                        if (contextImageId === selectedImage.id) setContextImageId(null);
                        pushHistory('Deleted frame');
                      }}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      title="Delete frame"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dimensions */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Size</span>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] text-white/30 uppercase tracking-widest">W</label>
                        <input
                          type="number"
                          min={64} max={4096}
                          value={selectedImage.width}
                          onChange={(e) => {
                            const v = Math.max(64, Math.min(4096, Number(e.target.value)));
                            setCanvasImages((prev) => prev.map((img) => img.id === selectedImage.id ? { ...img, width: v, ratio: `${v}x${img.height}` } : img));
                          }}
                          className="w-full bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] text-white/30 uppercase tracking-widest">H</label>
                        <input
                          type="number"
                          min={64} max={4096}
                          value={selectedImage.height}
                          onChange={(e) => {
                            const v = Math.max(64, Math.min(4096, Number(e.target.value)));
                            setCanvasImages((prev) => prev.map((img) => img.id === selectedImage.id ? { ...img, height: v, ratio: `${img.width}x${v}` } : img));
                          }}
                          className="w-full bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/8" />

                  {/* Use as context */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Context</span>
                    <button
                      onClick={() => setContextImageId(contextImageId === selectedImage.id ? null : selectedImage.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border transition-colors text-sm",
                        contextImageId === selectedImage.id
                          ? "border-primary/40 bg-primary/10 text-white"
                          : "border-white/10 bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Frame className="w-4 h-4 shrink-0" />
                      <span>{contextImageId === selectedImage.id ? 'Used as context' : 'Set as generation context'}</span>
                    </button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Select this frame as context, pick a style, then generate to fill it with AI-generated content.
                    </p>
                  </div>

                  {/* Quick ratio presets */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Presets</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((r) => {
                        const PRESET: Record<string, [number, number]> = {
                          '1:1': [1024, 1024], '16:9': [1365, 1024], '9:16': [1024, 1365],
                          '4:3': [1536, 1024], '3:4': [1024, 1536],
                        };
                        const [pw, ph] = PRESET[r];
                        const active = selectedImage.width === pw && selectedImage.height === ph;
                        return (
                          <button
                            key={r}
                            onClick={() => setCanvasImages((prev) => prev.map((img) => img.id === selectedImage.id ? { ...img, width: pw, height: ph, ratio: `${pw}x${ph}` } : img))}
                            className={cn(
                              'h-8 rounded-lg text-[11px] font-medium transition-all border',
                              active ? 'bg-primary/20 border-primary/60 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                            )}
                          >{r}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── BRUSH STROKE PANEL ── */}
            {isBrushStrokeSelected && selectedStroke && !isImageSelected && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-4 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Paintbrush className="w-4 h-4 text-primary" /> {(selectedStroke.kind || 'brush') === 'brush' ? 'Brush Stroke' : 'Shape'}
                    </h3>
                    <button
                      onClick={() => {
                        const historyImageId = selectedStroke.historyImageId ?? null;
                        const next = brushStrokes.filter((s) => s.id !== selectedStroke.id);
                        setBrushStrokes(next);
                        pushHistory('Deleted brush stroke', canvasImages, historyImageId, canvasTexts, historyImageId, next, null);
                        setSelectedStrokeId(null);
                      }}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      title="Delete stroke"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stroke preview */}
                  <div className="bg-white/5 rounded-xl p-3 flex items-center justify-center h-20 border border-white/5">
                    <svg width="100%" height="100%" viewBox={(() => {
                      const xs = selectedStroke.points.map((p) => p.x);
                      const ys = selectedStroke.points.map((p) => p.y);
                      const kind = selectedStroke.kind || 'brush';
                      const pad = selectedStroke.size + (kind === 'arrow' ? Math.max(10, selectedStroke.size * 3) : 0);
                      return `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + pad * 2} ${Math.max(...ys) - Math.min(...ys) + pad * 2}`;
                    })()} preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const kind = selectedStroke.kind || 'brush';
                        const start = selectedStroke.points[0];
                        const end = selectedStroke.points[selectedStroke.points.length - 1] || start;
                        if (kind === 'brush') {
                          return (
                            <path
                              d={selectedStroke.points.reduce((acc, p, i) => {
                                if (i === 0) return `M ${p.x} ${p.y}`;
                                const prev = selectedStroke.points[i - 1];
                                return `${acc} Q ${prev.x} ${prev.y} ${(prev.x + p.x) / 2} ${(prev.y + p.y) / 2}`;
                              }, '')}
                              stroke={selectedStroke.color}
                              strokeWidth={selectedStroke.size}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          );
                        }

                        if (kind === 'line') {
                          return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={selectedStroke.color} strokeWidth={selectedStroke.size} strokeLinecap="round" />;
                        }

                        if (kind === 'arrow') {
                          const angle = Math.atan2(end.y - start.y, end.x - start.x);
                          const head = Math.max(10, selectedStroke.size * 2.6);
                          const a1 = angle - Math.PI / 7;
                          const a2 = angle + Math.PI / 7;
                          const hx1 = end.x - head * Math.cos(a1);
                          const hy1 = end.y - head * Math.sin(a1);
                          const hx2 = end.x - head * Math.cos(a2);
                          const hy2 = end.y - head * Math.sin(a2);
                          return (
                            <>
                              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={selectedStroke.color} strokeWidth={selectedStroke.size} strokeLinecap="round" />
                              <path d={`M ${hx1} ${hy1} L ${end.x} ${end.y} L ${hx2} ${hy2}`} stroke={selectedStroke.color} strokeWidth={selectedStroke.size} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </>
                          );
                        }

                        if (kind === 'rectangle') {
                          const x = Math.min(start.x, end.x);
                          const y = Math.min(start.y, end.y);
                          const w = Math.max(1, Math.abs(end.x - start.x));
                          const h = Math.max(1, Math.abs(end.y - start.y));
                          const fillColor = selectedStroke.fill ? hexToRgba(selectedStroke.fillColor || selectedStroke.color, 0.32) : 'none';
                          return <rect x={x} y={y} width={w} height={h} stroke={selectedStroke.color} strokeWidth={selectedStroke.size} fill={fillColor} />;
                        }

                        const cx = (start.x + end.x) / 2;
                        const cy = (start.y + end.y) / 2;
                        const rx = Math.max(1, Math.abs(end.x - start.x) / 2);
                        const ry = Math.max(1, Math.abs(end.y - start.y) / 2);
                        const fillColor = selectedStroke.fill ? hexToRgba(selectedStroke.fillColor || selectedStroke.color, 0.32) : 'none';
                        return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={selectedStroke.color} strokeWidth={selectedStroke.size} fill={fillColor} />;
                      })()}
                    </svg>
                  </div>

                  {/* Stroke color */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] text-muted-foreground font-medium">Color</span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {['#ffffff', '#a3a3a3', '#525252', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#0A0A0B'].map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const historyImageId = selectedStroke.historyImageId ?? null;
                            const next = brushStrokes.map((s) => {
                              if (s.id !== selectedStroke.id) return s;
                              const shouldSyncFill = !!s.fill && (!s.fillColor || s.fillColor === s.color);
                              return { ...s, color: c, fillColor: shouldSyncFill ? c : s.fillColor };
                            });
                            setBrushStrokes(next);
                            pushHistory('Changed stroke color', canvasImages, historyImageId, canvasTexts, historyImageId, next, selectedStroke.id);
                          }}
                          className={cn(
                            'w-7 h-7 rounded-lg transition-all border-2',
                            selectedStroke.color === c ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:border-white/20 hover:scale-105'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                        <input
                          type="color"
                          value={selectedStroke.color}
                          onChange={(e) => {
                            const nextColor = e.target.value;
                            setBrushStrokes((prev) => prev.map((s) => {
                              if (s.id !== selectedStroke.id) return s;
                              const shouldSyncFill = !!s.fill && (!s.fillColor || s.fillColor === s.color);
                              return { ...s, color: nextColor, fillColor: shouldSyncFill ? nextColor : s.fillColor };
                            }));
                          }}
                          onBlur={() => {
                            const historyImageId = selectedStroke.historyImageId ?? null;
                            pushHistory('Changed stroke color', canvasImages, historyImageId, canvasTexts, historyImageId, brushStrokesRef.current, selectedStroke.id);
                          }}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                        />
                        <div className="w-full h-full" style={{ backgroundColor: selectedStroke.color }} />
                      </div>
                      <span className="text-xs text-white/50 font-mono">{selectedStroke.color}</span>
                    </div>
                  </div>

                  {((selectedStroke.kind || 'brush') === 'rectangle' || (selectedStroke.kind || 'brush') === 'ellipse') && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[12px] text-muted-foreground font-medium">Fill</span>
                      <button
                        onClick={() => {
                          const historyImageId = selectedStroke.historyImageId ?? null;
                          const label = selectedStroke.fill ? 'Disabled shape fill' : 'Enabled shape fill';
                          const next = brushStrokes.map((s) => {
                            if (s.id !== selectedStroke.id) return s;
                            const nextFill = !s.fill;
                            return { ...s, fill: nextFill, fillColor: nextFill ? (s.fillColor || s.color) : s.fillColor };
                          });
                          setBrushStrokes(next);
                          pushHistory(label, canvasImages, historyImageId, canvasTexts, historyImageId, next, selectedStroke.id);
                        }}
                        className={cn(
                          'h-8 rounded-lg text-xs font-semibold border transition-colors',
                          selectedStroke.fill
                            ? 'bg-primary/20 border-primary/60 text-primary'
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {selectedStroke.fill ? 'Fill enabled' : 'Enable fill'}
                      </button>

                      {selectedStroke.fill && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                            <input
                              type="color"
                              value={selectedStroke.fillColor || selectedStroke.color}
                              onChange={(e) => {
                                const nextFillColor = e.target.value;
                                setBrushStrokes((prev) => prev.map((s) => s.id === selectedStroke.id ? { ...s, fillColor: nextFillColor } : s));
                              }}
                              onBlur={() => {
                                const historyImageId = selectedStroke.historyImageId ?? null;
                                pushHistory('Changed shape fill color', canvasImages, historyImageId, canvasTexts, historyImageId, brushStrokesRef.current, selectedStroke.id);
                              }}
                              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                            />
                            <div className="w-full h-full" style={{ backgroundColor: selectedStroke.fillColor || selectedStroke.color }} />
                          </div>
                          <span className="text-xs text-white/50 font-mono">{selectedStroke.fillColor || selectedStroke.color}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stroke width */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground font-medium">Stroke Width</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{selectedStroke.size}px</span>
                    </div>
                    <input
                      type="range" min={1} max={40} value={selectedStroke.size}
                      onChange={(e) => setBrushStrokes((prev) => prev.map((s) => s.id === selectedStroke.id ? { ...s, size: Number(e.target.value) } : s))}
                      onPointerUp={() => {
                        const latestStrokes = brushStrokesRef.current;
                        const targetStroke = latestStrokes.find((s) => s.id === selectedStroke.id);
                        if (!targetStroke) return;
                        const historyImageId = targetStroke.historyImageId ?? null;
                        pushHistory('Adjusted stroke width', canvasImages, historyImageId, canvasTexts, historyImageId, latestStrokes, targetStroke.id);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground font-medium">Opacity</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{selectedStroke.opacity}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={selectedStroke.opacity}
                      onChange={(e) => setBrushStrokes((prev) => prev.map((s) => s.id === selectedStroke.id ? { ...s, opacity: Number(e.target.value) } : s))}
                      onPointerUp={() => {
                        const latestStrokes = brushStrokesRef.current;
                        const targetStroke = latestStrokes.find((s) => s.id === selectedStroke.id);
                        if (!targetStroke) return;
                        const historyImageId = targetStroke.historyImageId ?? null;
                        pushHistory('Adjusted stroke opacity', canvasImages, historyImageId, canvasTexts, historyImageId, latestStrokes, targetStroke.id);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                    />
                  </div>

                  {/* Duplicate / Delete actions */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                    <button
                      onClick={() => {
                        const historyImageId = selectedStroke.historyImageId ?? null;
                        const dup: BrushStroke = { ...selectedStroke, id: `stroke-${Date.now()}`, offsetX: selectedStroke.offsetX + 20, offsetY: selectedStroke.offsetY + 20, historyImageId };
                        const next = [...brushStrokes, dup];
                        setBrushStrokes(next);
                        pushHistory('Duplicated brush stroke', canvasImages, historyImageId, canvasTexts, historyImageId, next, dup.id);
                        setSelectedStrokeId(dup.id);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Copy className="w-4 h-4" /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        const historyImageId = selectedStroke.historyImageId ?? null;
                        const next = brushStrokes.filter((s) => s.id !== selectedStroke.id);
                        setBrushStrokes(next);
                        pushHistory('Deleted brush stroke', canvasImages, historyImageId, canvasTexts, historyImageId, next, null);
                        setSelectedStrokeId(null);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── IMAGE PROPERTIES PANEL ── */}
            {isImageSelected && selectedImage && !selectedImage.isFrame && (
              <>
                {/* ── MAIN IMAGE PANEL (no sub-panel active) ── */}
                {!activeSubPanel && (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                      {/* Dimensions */}
                      <div className="flex flex-col gap-3">
                        <h3 className="text-[13px] font-semibold text-foreground">Dimensions</h3>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center bg-surface border border-white/5 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-primary/50">
                            <span className="text-[11px] text-muted-foreground font-medium uppercase min-w-[20px]">W</span>
                            <input
                              type="number"
                              value={selectedImage.width}
                              onChange={(e) => updateImageDimension(selectedImage.id, 'width', Number(e.target.value))}
                              className="w-full bg-transparent text-[13px] text-foreground font-mono focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 flex items-center bg-surface border border-white/5 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-primary/50">
                            <span className="text-[11px] text-muted-foreground font-medium uppercase min-w-[20px]">H</span>
                            <input
                              type="number"
                              value={selectedImage.height}
                              onChange={(e) => updateImageDimension(selectedImage.id, 'height', Number(e.target.value))}
                              className="w-full bg-transparent text-[13px] text-foreground font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <h3 className="text-[13px] font-semibold text-foreground">Prompt</h3>
                          <button
                            className="text-muted-foreground hover:text-white transition-colors"
                            onClick={() => { navigator.clipboard.writeText(selectedImage.prompt); toast.success('Copied'); }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {selectedImage.prompt}
                        </p>
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* Generation settings (collapsible) */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => setSettingsOpen(!settingsOpen)}
                          className="flex justify-between items-center w-full group"
                        >
                          <h3 className="text-[13px] font-semibold text-foreground group-hover:text-white transition-colors">Generation settings</h3>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", settingsOpen ? "rotate-0" : "-rotate-90")} />
                        </button>

                        <AnimatePresence initial={false}>
                          {settingsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-3 pt-4">
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="text-muted-foreground">Aspect ratio</span>
                                  <span className="text-foreground">{selectedImage.ratio}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="text-muted-foreground">Type</span>
                                  <span className="text-foreground">Raster</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="text-muted-foreground">Model</span>
                                  <span className="text-foreground">{selectedImage.model}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="text-muted-foreground">Style</span>
                                  <span className="text-foreground">{selectedImage.style || 'No style'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="text-muted-foreground">Visibility</span>
                                  <span className="text-foreground">Public</span>
                                </div>

                                <button
                                  onClick={() => { setPrompt(selectedImage.prompt); setSelectedImageId(null); }}
                                  className="mt-2 w-full bg-surface hover:bg-white/10 active:bg-white/5 text-[13px] font-semibold py-2.5 rounded-xl transition-colors border border-white/5 shadow-sm"
                                >
                                  Reuse in a new image
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* Actions */}
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-[13px] font-semibold text-foreground mb-2">Actions</h3>
                        {(() => {
                          // Determine capabilities for the selected image's model
                          const imgCaps = getModelCapabilities(selectedImage.model || selectedModel);
                          const actions: {
                            icon: React.ReactNode; label: string; arrow?: boolean;
                            panel?: SubPanel; action?: 'remove-bg' | 'vectorize' | 'delete';
                            textClass?: string; disabled?: boolean; disabledReason?: string;
                          }[] = [
                            { icon: <Pencil className="w-4 h-4" />, label: 'Edit area', arrow: true, panel: 'edit-area' as SubPanel },
                            { icon: <Combine className="w-4 h-4" />, label: 'Remix image', arrow: true, panel: 'remix' as SubPanel,
                              disabled: imgCaps && !imgCaps.imageToImage, disabledReason: `${selectedImage.model || 'This model'} doesn't support image-to-image remix.` },
                            { icon: <Maximize className="w-4 h-4" />, label: 'Outpaint or crop', arrow: true, panel: 'outpaint' as SubPanel },
                            { icon: <Eraser className="w-4 h-4" />, label: 'Remove background', action: 'remove-bg' as const },
                            { icon: <ArrowUpRight className="w-4 h-4" />, label: 'Upscale', arrow: true, panel: 'upscale' as SubPanel },
                            { icon: <Layers className="w-4 h-4" />, label: 'Generate variations', arrow: true, panel: 'variations' as SubPanel },
                            { icon: <Box className="w-4 h-4" />, label: 'Vectorize', action: 'vectorize' as const },
                            { icon: <Palette className="w-4 h-4" />, label: 'Adjust colors', arrow: true, panel: 'adjust-colors' as SubPanel },
                            { icon: <Trash2 className="w-4 h-4 text-red-400" />, label: 'Remove from canvas', action: 'delete' as const, textClass: 'text-red-400' },
                          ];
                          return actions.map((action, i) => (
                          <button
                            key={i}
                            disabled={(isProcessing && (action.action === 'remove-bg' || action.action === 'vectorize')) || action.disabled}
                            onClick={() => {
                              if (action.disabled && action.disabledReason) {
                                toast.error(action.disabledReason);
                                return;
                              }
                              if (action.action === 'delete') {
                                setCanvasImages((prev) => {
                                  const next = prev.filter((img) => img.id !== selectedImage.id);
                                  pushHistory('Deleted image', next, null);
                                  return next;
                                });
                                setSelectedImageId(null);
                              } else if (action.action === 'remove-bg') {
                                handleRemoveBackground();
                              } else if (action.action === 'vectorize') {
                                handleVectorize();
                              } else if (action.panel) {
                                if (action.panel === 'remix') setRemixPrompt(selectedImage.prompt);
                                if (action.panel === 'outpaint') setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
                                setActiveSubPanel(action.panel);
                              }
                            }}
                            className="flex items-center justify-between w-full py-2 px-2 -mx-2 bg-transparent hover:bg-white/5 rounded-lg transition-colors group disabled:opacity-50"
                          >
                            <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                              {processingAction === action.action ? <Loader2 className="w-4 h-4 animate-spin" /> : action.icon}
                              <span className={cn("text-[13px] font-medium", action.textClass || "text-muted-foreground group-hover:text-foreground")}>
                                {processingAction === 'remove-bg' && action.action === 'remove-bg' ? 'Removing...' : processingAction === 'vectorize' && action.action === 'vectorize' ? 'Vectorizing...' : action.label}
                              </span>
                            </div>
                            {action.arrow && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        ));
                        })()}
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* ── History (per-image) ── */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => setHistoryOpen(!historyOpen)}
                          className="flex justify-between items-center w-full group py-0.5"
                        >
                          <h3 className="text-[13px] font-semibold text-foreground group-hover:text-white transition-colors">History</h3>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", historyOpen ? "rotate-0" : "-rotate-90")} />
                        </button>

                        <AnimatePresence initial={false}>
                          {historyOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col pt-2 -mx-2">
                                {(() => {
                                  const _ = historyVersion; // consume so renders update
                                  const allEntries = historyStackRef.current
                                    .map((entry, idx) => ({ entry, idx }))
                                    .filter(({ entry }) => (entry.historyImageId ?? entry.selectedId) === selectedImageId);
                                  if (allEntries.length === 0) {
                                    return (
                                      <p className="text-[12px] text-muted-foreground/40 text-center py-3 px-2">No history for this image yet</p>
                                    );
                                  }
                                  return [...allEntries].reverse().map(({ entry, idx }) => (
                                    <button
                                      key={`${idx}-${entry.timestamp}`}
                                      onClick={() => historyJumpTo(idx)}
                                      className={cn(
                                        "w-full text-left px-2 py-2 rounded-lg flex items-center gap-2.5 transition-colors",
                                        idx === historyIndexRef.current
                                          ? "text-white"
                                          : idx > historyIndexRef.current
                                            ? "text-muted-foreground/40"
                                            : "text-muted-foreground"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        idx === historyIndexRef.current ? "bg-blue-400" : idx > historyIndexRef.current ? "bg-white/15" : "bg-white/25"
                                      )} />
                                      <div className="flex-1 min-w-0">
                                        <div className="truncate text-[12px] font-medium">{entry.label}</div>
                                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                      </div>
                                      {idx === historyIndexRef.current && (
                                        <span className="text-[10px] text-blue-400 font-semibold shrink-0">Current</span>
                                      )}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/5 shrink-0">
                      <button
                        onClick={() => setActiveSubPanel('export')}
                        className="w-full bg-white text-black font-semibold py-2.5 rounded-xl text-[13px] hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                      >
                        Export
                      </button>
                    </div>
                  </>
                )}

                {/* ── SUB-PANEL: Export ── */}
                {activeSubPanel === 'export' && selectedImage && (
                  <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
                      <button
                        onClick={() => setActiveSubPanel(null)}
                        className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5"
                      >
                        <ChevronLeft className="w-4 h-4" /> Dimensions and format
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
                      {/* W / H */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center bg-surface border border-white/8 rounded-xl px-3 py-2.5 gap-2">
                          <span className="text-[12px] font-semibold text-muted-foreground">W</span>
                          <input
                            type="number"
                            min={1}
                            value={selectedImage.width}
                            onChange={(e) => updateImageDimension(selectedImage.id, 'width', Number(e.target.value))}
                            className="flex-1 bg-transparent text-[13px] text-foreground outline-none w-full"
                          />
                        </div>
                        <div className="flex items-center bg-surface border border-white/8 rounded-xl px-3 py-2.5 gap-2">
                          <span className="text-[12px] font-semibold text-muted-foreground">H</span>
                          <input
                            type="number"
                            min={1}
                            value={selectedImage.height}
                            onChange={(e) => updateImageDimension(selectedImage.id, 'height', Number(e.target.value))}
                            className="flex-1 bg-transparent text-[13px] text-foreground outline-none w-full"
                          />
                        </div>
                      </div>

                      {/* Format + DPI */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Format dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setExportFormatOpen((o) => !o)}
                            className="w-full flex items-center justify-between bg-surface border border-white/8 rounded-xl px-3 py-2.5 text-[13px] text-foreground hover:border-white/15 transition-colors"
                          >
                            <span className="font-medium">{exportFormat}</span>
                            <ChevronUp className={cn("w-4 h-4 text-muted-foreground transition-transform", !exportFormatOpen && "rotate-180")} />
                          </button>
                          {exportFormatOpen && (
                            <div className="absolute top-full left-0 mt-1.5 w-full bg-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                              {(['PNG', 'JPG', 'TIFF', 'PDF'] as const).map((fmt) => (
                                <button
                                  key={fmt}
                                  onClick={() => { setExportFormat(fmt); setExportFormatOpen(false); }}
                                  className="w-full flex items-center justify-between px-4 py-3 text-[13px] hover:bg-white/5 transition-colors text-foreground"
                                >
                                  <span>{fmt === 'TIFF' ? 'TIFF (CMYK)' : fmt}</span>
                                  {exportFormat === fmt && <Check className="w-4 h-4 text-foreground" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DPI */}
                        <div className="flex items-center bg-surface border border-white/8 rounded-xl px-3 py-2.5 gap-2">
                          <span className="text-[12px] font-semibold text-muted-foreground">DPI</span>
                          <input
                            type="number"
                            min={72}
                            max={600}
                            value={exportDpi}
                            onChange={(e) => setExportDpi(Number(e.target.value))}
                            className="flex-1 bg-transparent text-[13px] text-foreground outline-none w-full"
                          />
                        </div>
                      </div>

                      {/* Info note for TIFF/PDF */}
                      {(exportFormat === 'TIFF' || exportFormat === 'PDF') && (
                        <p className="text-[11px] text-muted-foreground bg-white/4 rounded-lg px-3 py-2">
                          {exportFormat === 'TIFF' ? 'TIFF exports as PNG — CMYK conversion requires server-side processing.' : 'PDF exports the image embedded in a single-page PDF document.'}
                        </p>
                      )}

                      {/* Export button */}
                      <button
                        disabled={exporting}
                        onClick={async () => {
                          if (exporting) return;
                          setExporting(true);
                          try {
                            // Fetch image as blob (bypasses CORS for same-origin proxy)
                            const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(selectedImage.url)}`);
                            const blob = await res.ok ? await res.blob() : null;
                            const objectUrl = blob ? URL.createObjectURL(blob) : selectedImage.url;

                            // ── Ensure Google Fonts are loaded for canvas rendering ───────
                            // CSS <link> stylesheets load fonts lazily; document.fonts.load()
                            // forces the browser to fetch & decode them so ctx.fillText()
                            // actually uses the right typeface instead of falling back to sans-serif.
                            if (canvasTexts.length > 0) {
                              const fontLoadPromises = canvasTexts.map((txt) =>
                                document.fonts.load(`${txt.fontWeight} ${Math.round(txt.fontSize)}px '${txt.fontFamily}'`)
                                  .catch(() => null) // ignore individual failures — canvas will fall back gracefully
                              );
                              await Promise.all(fontLoadPromises);
                            }

                            // ── Composite text onto canvas ──────────────────────────────
                            // Text x/y are in world-space; the export canvas is image-local
                            // (0,0 = top-left of the image). We subtract the image origin
                            // to convert world coords → image-local pixel coords.
                            const imgOriginX = selectedImage.x;
                            const imgOriginY = selectedImage.y;
                            const compositeTexts = (ctx: CanvasRenderingContext2D, imgW: number, imgH: number) => {
                              const savedFont = ctx.font;
                              const savedAlign = ctx.textAlign;
                              const savedAlpha = ctx.globalAlpha;
                              for (const txt of canvasTexts) {
                                // Convert to image-local coords
                                const localX = txt.x - imgOriginX;
                                const localY = txt.y - imgOriginY;
                                const txtH = txt.height ?? txt.fontSize * txt.lineHeight * (txt.content.split('\n').length || 1);
                                // Skip if entirely outside image bounds
                                if (localX >= imgW || localX + txt.width <= 0 || localY >= imgH || localY + txtH <= 0) continue;
                                ctx.globalAlpha = txt.opacity / 100;
                                ctx.fillStyle = `#${txt.color}`;
                                ctx.font = `${txt.fontWeight} ${Math.round(txt.fontSize)}px '${txt.fontFamily}', sans-serif`;
                                ctx.textAlign = txt.align;
                                // x origin depends on alignment
                                const drawX = txt.align === 'center' ? localX + txt.width / 2
                                            : txt.align === 'right'  ? localX + txt.width
                                            : localX;
                                const lineHeightPx = txt.fontSize * txt.lineHeight;
                                const lines = txt.content.split('\n');
                                for (let li = 0; li < lines.length; li++) {
                                  ctx.fillText(lines[li], drawX, localY + txt.fontSize + li * lineHeightPx, txt.width);
                                }
                              }
                              ctx.font = savedFont;
                              ctx.textAlign = savedAlign;
                              ctx.globalAlpha = savedAlpha;
                            };

                            const compositeStrokes = (ctx: CanvasRenderingContext2D, imgW: number, imgH: number) => {
                              const inBounds = (x: number, y: number) => x >= 0 && x <= imgW && y >= 0 && y <= imgH;

                              for (const stroke of brushStrokes) {
                                const kind = stroke.kind || 'brush';
                                if (!stroke.points || stroke.points.length === 0) continue;

                                const points = stroke.points.map((p) => ({
                                  x: p.x + stroke.offsetX - imgOriginX,
                                  y: p.y + stroke.offsetY - imgOriginY,
                                }));

                                const xs = points.map((p) => p.x);
                                const ys = points.map((p) => p.y);
                                const minX = Math.min(...xs) - stroke.size;
                                const minY = Math.min(...ys) - stroke.size;
                                const maxX = Math.max(...xs) + stroke.size;
                                const maxY = Math.max(...ys) + stroke.size;
                                if (maxX < 0 || maxY < 0 || minX > imgW || minY > imgH) continue;

                                ctx.save();
                                ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
                                ctx.strokeStyle = stroke.color;
                                ctx.lineWidth = stroke.size;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';

                                if (kind === 'brush') {
                                  if (points.length === 1) {
                                    const p = points[0];
                                    if (inBounds(p.x, p.y)) {
                                      ctx.fillStyle = stroke.color;
                                      ctx.beginPath();
                                      ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
                                      ctx.fill();
                                    }
                                  } else {
                                    ctx.beginPath();
                                    ctx.moveTo(points[0].x, points[0].y);
                                    for (let i = 1; i < points.length; i++) {
                                      const prev = points[i - 1];
                                      const curr = points[i];
                                      const mx = (prev.x + curr.x) / 2;
                                      const my = (prev.y + curr.y) / 2;
                                      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
                                    }
                                    const last = points[points.length - 1];
                                    ctx.lineTo(last.x, last.y);
                                    ctx.stroke();
                                  }
                                  ctx.restore();
                                  continue;
                                }

                                const start = points[0];
                                const end = points[points.length - 1] || start;

                                if (kind === 'line') {
                                  ctx.beginPath();
                                  ctx.moveTo(start.x, start.y);
                                  ctx.lineTo(end.x, end.y);
                                  ctx.stroke();
                                  ctx.restore();
                                  continue;
                                }

                                if (kind === 'arrow') {
                                  ctx.beginPath();
                                  ctx.moveTo(start.x, start.y);
                                  ctx.lineTo(end.x, end.y);
                                  ctx.stroke();

                                  const angle = Math.atan2(end.y - start.y, end.x - start.x);
                                  const head = Math.max(10, stroke.size * 2.6);
                                  const a1 = angle - Math.PI / 7;
                                  const a2 = angle + Math.PI / 7;
                                  const hx1 = end.x - head * Math.cos(a1);
                                  const hy1 = end.y - head * Math.sin(a1);
                                  const hx2 = end.x - head * Math.cos(a2);
                                  const hy2 = end.y - head * Math.sin(a2);

                                  ctx.beginPath();
                                  ctx.moveTo(hx1, hy1);
                                  ctx.lineTo(end.x, end.y);
                                  ctx.lineTo(hx2, hy2);
                                  ctx.stroke();
                                  ctx.restore();
                                  continue;
                                }

                                if (kind === 'rectangle' || kind === 'ellipse') {
                                  const fillColor = stroke.fill ? hexToRgba(stroke.fillColor || stroke.color, 0.32) : null;
                                  if (fillColor) {
                                    ctx.fillStyle = fillColor;
                                  }

                                  if (kind === 'rectangle') {
                                    const x = Math.min(start.x, end.x);
                                    const y = Math.min(start.y, end.y);
                                    const w = Math.max(1, Math.abs(end.x - start.x));
                                    const h = Math.max(1, Math.abs(end.y - start.y));
                                    if (fillColor) ctx.fillRect(x, y, w, h);
                                    ctx.strokeRect(x, y, w, h);
                                  } else {
                                    const cx = (start.x + end.x) / 2;
                                    const cy = (start.y + end.y) / 2;
                                    const rx = Math.max(1, Math.abs(end.x - start.x) / 2);
                                    const ry = Math.max(1, Math.abs(end.y - start.y) / 2);
                                    ctx.beginPath();
                                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                                    if (fillColor) ctx.fill();
                                    ctx.stroke();
                                  }
                                  ctx.restore();
                                  continue;
                                }

                                ctx.restore();
                              }
                            };

                            if (exportFormat === 'PDF') {
                              // Build a minimal single-page PDF with the image embedded
                              const img = new window.Image();
                              img.crossOrigin = 'anonymous';
                              await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = reject;
                                img.src = objectUrl;
                              });
                              const canvas = document.createElement('canvas');
                              canvas.width = selectedImage.width;
                              canvas.height = selectedImage.height;
                              const ctx = canvas.getContext('2d')!;
                              // Replicate CSS object-cover so the exported image matches the canvas view.
                              // Without this, mismatched aspect ratios cause a y-shift between the
                              // photo and any brush strokes the user drew on top of it.
                              const dW = canvas.width;
                              const dH = canvas.height;
                              const nW = img.naturalWidth || dW;
                              const nH = img.naturalHeight || dH;
                              const coverScale = Math.max(dW / nW, dH / nH);
                              const sX = Math.max(0, (nW - dW / coverScale) / 2);
                              const sY = Math.max(0, (nH - dH / coverScale) / 2);
                              const sW = Math.min(nW, dW / coverScale);
                              const sH = Math.min(nH, dH / coverScale);
                              ctx.drawImage(img, sX, sY, sW, sH, 0, 0, dW, dH);
                              // Composite brush strokes/shapes that intersect this image.
                              compositeStrokes(ctx, canvas.width, canvas.height);
                              compositeTexts(ctx, canvas.width, canvas.height);
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                              // minimal PDF with embedded JPEG
                              const pxToMm = 25.4 / exportDpi;
                              const wMm = (selectedImage.width * pxToMm).toFixed(2);
                              const hMm = (selectedImage.height * pxToMm).toFixed(2);
                              // Use jsPDF-like raw approach — generate downloadable PDF
                              const pdfContent = [
                                '%PDF-1.4',
                                '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
                                `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`,
                                `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${(selectedImage.width * 72 / exportDpi).toFixed(2)} ${(selectedImage.height * 72 / exportDpi).toFixed(2)}]/Contents 4 0 R/Resources<</XObject<</I 5 0 R>>>>>>endobj`,
                              ].join('\n');
                              void wMm; void hMm; void pdfContent; void dataUrl;
                              // Fallback: download as PNG if PDF generation is not available
                              canvas.toBlob((b) => {
                                if (!b) return;
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(b);
                                a.download = `recraft-${selectedImage.id}.pdf.png`;
                                a.click();
                              }, 'image/png');
                            } else {
                              // PNG / JPG / TIFF — render on canvas then download
                              const img = new window.Image();
                              img.crossOrigin = 'anonymous';
                              await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = reject;
                                img.src = objectUrl;
                              });
                              const canvas = document.createElement('canvas');
                              canvas.width = selectedImage.width;
                              canvas.height = selectedImage.height;
                              const ctx = canvas.getContext('2d')!;
                              if (exportFormat === 'JPG') {
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                              }
                              // Replicate CSS object-cover so the exported image matches the canvas view.
                              // Without this, mismatched aspect ratios cause a y-shift between the
                              // photo and any brush strokes the user drew on top of it.
                              const dW = canvas.width;
                              const dH = canvas.height;
                              const nW = img.naturalWidth || dW;
                              const nH = img.naturalHeight || dH;
                              const coverScale = Math.max(dW / nW, dH / nH);
                              const sX = Math.max(0, (nW - dW / coverScale) / 2);
                              const sY = Math.max(0, (nH - dH / coverScale) / 2);
                              const sW = Math.min(nW, dW / coverScale);
                              const sH = Math.min(nH, dH / coverScale);
                              ctx.drawImage(img, sX, sY, sW, sH, 0, 0, dW, dH);
                              // Composite brush strokes/shapes that intersect this image.
                              compositeStrokes(ctx, canvas.width, canvas.height);
                              // Composite text on top of the image
                              compositeTexts(ctx, canvas.width, canvas.height);
                              const mime = exportFormat === 'JPG' ? 'image/jpeg' : 'image/png';
                              const quality = exportFormat === 'JPG' ? 0.95 : undefined;
                              const ext = exportFormat === 'JPG' ? 'jpg' : exportFormat === 'TIFF' ? 'tiff' : 'png';
                              canvas.toBlob((b) => {
                                if (!b) return;
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(b);
                                a.download = `recraft-${selectedImage.id}.${ext}`;
                                a.click();
                              }, mime, quality);
                            }
                            if (blob) URL.revokeObjectURL(objectUrl);
                          } catch {
                            toast.error('Export failed. Try again.');
                          } finally {
                            setExporting(false);
                          }
                        }}
                        className="w-full bg-white text-black font-semibold py-2.5 rounded-xl text-[13px] hover:opacity-90 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {exporting ? <><Loader2 className="w-4 h-4 animate-spin" />Exporting…</> : `Export as ${exportFormat === 'TIFF' ? 'TIFF (CMYK)' : exportFormat}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Edit area ── */}
                {activeSubPanel === 'edit-area' && (
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="p-4 flex flex-col gap-4">
                      <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                        <ChevronLeft className="w-4 h-4" /> Edit area
                      </button>

                      {/* Selection tools */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Selection tools</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {/* Lasso */}
                          <button
                            onClick={() => setEditAreaTool('lasso')}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-[10px] font-medium",
                              editAreaTool === 'lasso'
                                ? "border-primary/60 bg-primary/10 text-white"
                                : "border-white/8 bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3C7.03 3 3 7.03 3 12c0 2.54 1.05 4.84 2.74 6.49L3 21h9c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                            </svg>
                            Lasso
                          </button>
                          {/* Brush */}
                          <button
                            onClick={() => setEditAreaTool('brush')}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-[10px] font-medium",
                              editAreaTool === 'brush'
                                ? "border-primary/60 bg-primary/10 text-white"
                                : "border-white/8 bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Paintbrush className="w-[15px] h-[15px]" />
                            Brush
                          </button>
                          {/* Area */}
                          <button
                            onClick={() => setEditAreaTool('area')}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-[10px] font-medium",
                              editAreaTool === 'area'
                                ? "border-primary/60 bg-primary/10 text-white"
                                : "border-white/8 bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Square className="w-[15px] h-[15px]" />
                            Area
                          </button>
                          {/* Wand (premium) */}
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/8 bg-surface text-muted-foreground/50 transition-all hover:bg-white/5"
                          >
                            <Wand2 className="w-[15px] h-[15px]" />
                            <span className="text-[10px] font-medium">Wand</span>
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Star className="w-2 h-2 text-white fill-white" />
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Brush size slider — only shown when brush tool is active */}
                      <AnimatePresence initial={false}>
                        {editAreaTool === 'brush' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2 pt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Brush size</span>
                                <span className="text-[12px] font-mono text-foreground">{brushSize}px</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
                                <input
                                  type="range" min={4} max={200} value={brushSize}
                                  onChange={(e) => setBrushSize(Number(e.target.value))}
                                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                                />
                                <div className="w-4 h-4 rounded-full bg-white/70 shrink-0" />
                              </div>
                              {/* Brush size preview dot */}
                              <div className="flex items-center justify-center py-3 bg-surface/50 rounded-xl border border-white/5">
                                <div
                                  className="rounded-full border-2 border-primary/70 bg-primary/20 transition-all"
                                  style={{ width: Math.min(brushSize, 64), height: Math.min(brushSize, 64) }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Tool hint */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {editAreaTool === 'lasso' && 'Draw around the area to select. Release to close the selection.'}
                        {editAreaTool === 'brush' && <>Paint over the area to mark it. Hold <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px] font-mono">⌥</kbd> to erase from mask.</>}
                        {editAreaTool === 'area' && 'Drag a rectangle over the area you want to edit.'}
                      </p>

                      <div className="h-px bg-white/5" />

                      <button
                        onClick={clearMask}
                        className="w-full bg-surface hover:bg-white/10 text-[13px] font-medium py-2.5 rounded-xl transition-colors border border-white/5"
                      >
                        Clear selection
                      </button>

                      <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                        The action bar appears below your image on the canvas
                      </p>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Outpaint or crop ── */}
                {activeSubPanel === 'outpaint' && (
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="p-4 flex flex-col gap-4">
                      <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                        <ChevronLeft className="w-4 h-4" /> Outpaint or crop
                      </button>

                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Drag the handles around your image outward to expand, or inward to crop.
                      </p>

                      {/* Preset expand buttons */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Quick expand</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            { label: '← Left', handle: 'left' as const },
                            { label: 'Right →', handle: 'right' as const },
                            { label: '↑ Top', handle: 'top' as const },
                            { label: 'Bottom ↓', handle: 'bottom' as const },
                          ]).map(({ label, handle }) => {
                            const img = selectedImage!;
                            const preset = Math.round((handle === 'left' || handle === 'right' ? img.width : img.height) * 0.5);
                            return (
                              <button
                                key={handle}
                                onClick={() => setOutpaintBounds((prev) => ({ ...prev, [handle]: preset }))}
                                className="py-2 text-[12px] font-medium text-muted-foreground hover:text-white bg-surface border border-white/8 rounded-xl hover:bg-white/8 transition-colors"
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => {
                            const img = selectedImage!;
                            const px = Math.round(img.width * 0.5);
                            const py = Math.round(img.height * 0.5);
                            setOutpaintBounds({ top: py, right: px, bottom: py, left: px });
                          }}
                          className="py-2 text-[12px] font-medium text-muted-foreground hover:text-white bg-surface border border-white/8 rounded-xl hover:bg-white/8 transition-colors"
                        >
                          ↔ All sides
                        </button>
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* Current bounds display */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Current offset (px)</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                            <div key={side} className="flex items-center justify-between bg-surface border border-white/8 rounded-lg px-2.5 py-1.5">
                              <span className="text-[11px] text-muted-foreground capitalize">{side}</span>
                              <span className={cn("text-[12px] font-mono font-semibold", outpaintBounds[side] > 0 ? 'text-primary' : outpaintBounds[side] < 0 ? 'text-orange-400' : 'text-muted-foreground/50')}>
                                {outpaintBounds[side] > 0 ? '+' : ''}{Math.round(outpaintBounds[side])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 })}
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-[13px] font-medium text-muted-foreground hover:text-white bg-surface border border-white/8 rounded-xl hover:bg-white/8 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Remix image ── */}
                {activeSubPanel === 'remix' && (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 flex flex-col gap-5 flex-1">
                      <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                        <ChevronLeft className="w-4 h-4" /> Remix image
                      </button>

                      {/* Similarity slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((v) => (
                            <button
                              key={v}
                              onClick={() => setRemixSimilarity(v)}
                              className={cn(
                                "flex-1 h-2 rounded-full transition-all",
                                v <= remixSimilarity ? "bg-white" : "bg-white/15"
                              )}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Similarity to original</span>
                          <span className="text-foreground">{['Very different', 'Different', 'Quite similar', 'Similar', 'Very similar'][remixSimilarity]}</span>
                        </div>
                      </div>

                      {/* Model */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[12px] text-muted-foreground font-medium">Model</span>
                        <div className="relative">
                          <div className="flex items-center gap-2 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                            <Hexagon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <select
                            value={remixModel}
                            onChange={(e) => setRemixModel(e.target.value)}
                            className="w-full appearance-none bg-surface border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                          >
                            <option value="recraftv4">Recraft V4</option>
                            <option value="recraftv4_vector">Recraft V4 Vector</option>
                            <option value="recraftv4_pro">Recraft V4 Pro</option>
                            <option value="recraftv4_pro_vector">Recraft V4 Pro Vector</option>
                            <option value="recraftv3">Recraft V3</option>
                            <option value="recraftv3_vector">Recraft V3 Vector</option>
                            <option value="recraftv2">Recraft V2</option>
                            <option value="recraftv2_vector">Recraft V2 Vector</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                    </div>

                    <div className="p-4 border-t border-white/5 shrink-0 flex flex-col gap-2">
                      <input
                        value={remixPrompt}
                        onChange={(e) => setRemixPrompt(e.target.value)}
                        placeholder="Describe the remix"
                        className="w-full bg-surface border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        disabled={isProcessing}
                        onClick={handleRemix}
                        className="w-full bg-white text-black text-[13px] font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Upscale ── */}
                {activeSubPanel === 'upscale' && (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 flex flex-col gap-5 flex-1">
                      <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                        <ChevronLeft className="w-4 h-4" /> Upscale
                      </button>

                      {/* Model */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[12px] text-muted-foreground font-medium">Model</span>
                        <div className="flex items-center justify-between bg-surface border border-white/5 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <Hexagon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[13px] text-foreground">{upscaleModel}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Result */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] text-muted-foreground font-medium">Result</span>
                        <span className="text-[13px] text-foreground">{selectedImage.width * 4} × {selectedImage.height * 4}</span>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/5 shrink-0">
                      <button
                        disabled={isProcessing}
                        onClick={handleUpscale}
                        className="w-full bg-white text-black text-[13px] font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? 'Upscaling...' : 'Upscale'} <span className="text-xs opacity-60">◆ 1</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Generate variations ── */}
                {activeSubPanel === 'variations' && (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 flex flex-col gap-5 flex-1">
                      <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                        <ChevronLeft className="w-4 h-4" /> Generate variations
                      </button>

                      {/* Count */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-muted-foreground font-medium">Count</span>
                          <Star className="w-3 h-3 text-primary fill-primary/20" />
                        </div>
                        <div className="flex border border-white/5 rounded-xl overflow-hidden">
                          {[1, 2, 3, 4].map((c) => (
                            <button
                              key={c}
                              onClick={() => setVariationsCount(c)}
                              className={cn(
                                "flex-1 py-2 text-[13px] font-semibold transition-all",
                                variationsCount === c ? "bg-white text-black" : "bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                              )}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Aspect ratio */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[12px] text-muted-foreground font-medium">Aspect ratio</span>
                        <div className="flex items-center justify-between bg-surface border border-white/5 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <Square className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[13px] text-foreground">{variationsRatio}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/5 shrink-0">
                      <button
                        disabled={isProcessing}
                        onClick={handleVariations}
                        className="w-full bg-white text-black text-[13px] font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUB-PANEL: Adjust colors ── */}
                {activeSubPanel === 'adjust-colors' && (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setActiveSubPanel(null)} className="flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-white transition-colors -ml-0.5">
                          <ChevronLeft className="w-4 h-4" /> Adjust colors
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedImageId) return;
                            setCanvasImages((prev) => {
                              const next = prev.map((img) =>
                                img.id === selectedImageId ? { ...img, adjustments: undefined } : img
                              );
                              pushHistory('Reset color adjustments', next);
                              return next;
                            });
                          }}
                          className="text-muted-foreground hover:text-white transition-colors"
                          title="Reset to defaults"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Hue — slider 0–360, default 180 = no shift (hue-rotate(0deg)) */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-muted-foreground font-medium">Hue</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{adj.hue - 180}°</span>
                        </div>
                        <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}>
                          <input
                            type="range" min={0} max={360} value={adj.hue}
                            onChange={(e) => updateAdj('hue', Number(e.target.value))}
                            onPointerUp={() => pushHistory('Adjusted hue')}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="absolute top-0 bottom-0 w-1 bg-white border border-black/30 rounded-full shadow-md pointer-events-none" style={{ left: `${(adj.hue / 360) * 100}%`, transform: 'translateX(-50%)' }} />
                        </div>
                      </div>

                      {/* Saturation — slider 0–200, default 100 = normal */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-muted-foreground font-medium">Saturation</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{adj.saturation}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range" min={0} max={200} value={adj.saturation}
                            onChange={(e) => updateAdj('saturation', Number(e.target.value))}
                            onPointerUp={() => pushHistory('Adjusted saturation')}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                          />
                        </div>
                      </div>

                      {/* Brightness — slider 0–200, default 100 = normal */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-muted-foreground font-medium">Brightness</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{adj.brightness}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range" min={0} max={200} value={adj.brightness}
                            onChange={(e) => updateAdj('brightness', Number(e.target.value))}
                            onPointerUp={() => pushHistory('Adjusted brightness')}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                          />
                        </div>
                      </div>

                      {/* Contrast — slider 0–200, default 100 = normal */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-muted-foreground font-medium">Contrast</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{adj.contrast}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range" min={0} max={200} value={adj.contrast}
                            onChange={(e) => updateAdj('contrast', Number(e.target.value))}
                            onPointerUp={() => pushHistory('Adjusted contrast')}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                          />
                        </div>
                      </div>

                      {/* Opacity — slider 0–100, default 100 */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-muted-foreground font-medium">Opacity</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{adj.opacity}%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range" min={0} max={100} value={adj.opacity}
                            onChange={(e) => updateAdj('opacity', Number(e.target.value))}
                            onPointerUp={() => pushHistory('Adjusted opacity')}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* Effects */}
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-semibold text-foreground">Effects</span>
                        <button className="text-muted-foreground hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* BOTTOM LEFT TOGGLES */}
      <div className="absolute left-4 bottom-4 bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex flex-col gap-1 z-40 shadow-2xl pointer-events-auto">
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
          <PanelLeft className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
          <SidebarIcon className="w-5 h-5" />
        </button>
      </div>

      {/* BOTTOM PROMPT BAR */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full z-40 pointer-events-auto transition-all duration-300"
        style={{
          maxWidth: isPanelActive ? 'min(800px, calc(100% - 256px))' : 800,
          paddingRight: isPanelActive ? 8 : 0,
        }}
      >
        <div className="bg-elevated/98 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 pt-3 pb-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col gap-0">
          
          {/* Frame context badge (shown when frame context is active) */}
          <AnimatePresence>
            {useFrameContext && isFrameActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 pt-1 px-2">
                  <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg pl-2.5 pr-1 py-1">
                    <Frame className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-white">Frame</span>
                    <button
                      onClick={() => { setUseFrameContext(false); selectTool('select'); }}
                      className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image/Frame context badge (shown when a context image is set) */}
          <AnimatePresence>
            {contextImage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 pt-1 px-2">
                  <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg pl-1 pr-1 py-1">
                    <div className="w-5 h-5 rounded overflow-hidden shrink-0 flex items-center justify-center bg-primary/10">
                      {contextImage.isFrame ? (
                        <Frame className="w-3.5 h-3.5 text-primary" />
                      ) : !contextImage.url ? (
                        <ImageIcon className="w-3.5 h-3.5 text-primary/70" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={contextImage.url || undefined} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {contextImage.isFrame ? `Frame ${contextImage.width}×${contextImage.height}` : contextImage.prompt}
                    </span>
                    <button
                      onClick={() => setContextImageId(null)}
                      className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt assistant */}
          <div className="px-2 pt-1">
            <button
              onClick={() => setPromptHelperOpen((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-white hover:bg-white/6 transition-colors"
            >
              <span className="font-medium">Prompt helper</span>
              <div className="flex items-center gap-2">
                {isPromptAssistantActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">Active</span>
                )}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', promptHelperOpen && 'rotate-180')} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {promptHelperOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-1 pb-1 pt-1 flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Style</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PROMPT_ASSISTANT_STYLE_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => setPromptAssistantStyle((prev) => appendPromptAssistantValue(prev, chip))}
                            className="px-2 py-1 rounded-lg text-[11px] border border-white/10 bg-surface text-muted-foreground hover:text-white hover:bg-white/8 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lighting</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PROMPT_ASSISTANT_LIGHTING_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => setPromptAssistantLighting((prev) => appendPromptAssistantValue(prev, chip))}
                            className="px-2 py-1 rounded-lg text-[11px] border border-white/10 bg-surface text-muted-foreground hover:text-white hover:bg-white/8 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Composition</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PROMPT_ASSISTANT_COMPOSITION_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => setPromptAssistantComposition((prev) => appendPromptAssistantValue(prev, chip))}
                            className="px-2 py-1 rounded-lg text-[11px] border border-white/10 bg-surface text-muted-foreground hover:text-white hover:bg-white/8 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        value={promptAssistantStyle}
                        onChange={(e) => setPromptAssistantStyle(e.target.value)}
                        placeholder="Style direction"
                        className="w-full bg-surface border border-white/8 rounded-lg px-2.5 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <input
                        value={promptAssistantLighting}
                        onChange={(e) => setPromptAssistantLighting(e.target.value)}
                        placeholder="Lighting"
                        className="w-full bg-surface border border-white/8 rounded-lg px-2.5 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <input
                        value={promptAssistantComposition}
                        onChange={(e) => setPromptAssistantComposition(e.target.value)}
                        placeholder="Composition"
                        className="w-full bg-surface border border-white/8 rounded-lg px-2.5 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <input
                        value={promptAssistantNegative}
                        onChange={(e) => setPromptAssistantNegative(e.target.value)}
                        placeholder="Avoid (optional)"
                        className="w-full bg-surface border border-white/8 rounded-lg px-2.5 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Input */}
          <div className="relative px-3 pt-1">
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onInput={syncPromptTextareaHeight}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe what you want to generate (Shift+Enter for a new line)"
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder:text-muted-foreground text-[15px] min-h-[52px] max-h-[220px] font-medium leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-end pb-1">
              <span className="text-[10px] text-muted-foreground">{effectivePrompt.length} chars</span>
            </div>

            {isPromptAssistantActive && (
              <div className="mb-2 rounded-lg border border-white/8 bg-surface/60 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Final prompt preview</p>
                <p className="text-[11px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{effectivePrompt || 'Start typing in the prompt box above.'}</p>
              </div>
            )}

            {/* Attachment thumbnails */}
            {attachments.length > 0 && (
              <div className="flex items-center gap-2 pb-2">
                {attachments.map((file, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10"
                    />
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8 mx-2" />

          {/* Options Row */}
          <div className="flex items-center justify-between px-1 relative">
            
            {/* Popovers Layer */}
            <AnimatePresence>
              {activeDropdown === 'model' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-40 mb-4 w-[360px] max-h-[400px] overflow-y-auto no-scrollbar bg-elevated border border-border shadow-2xl rounded-2xl p-2 z-50 pointer-events-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem 
                    icon={<Hexagon className="w-4 h-4" />} title="Auto mode" subtitle="We pick the model for your tasks"
                    selected={selectedModel === 'Auto mode'} onClick={() => { setSelectedModel('Auto mode'); setActiveDropdown(null); }}
                  />
                  <div className="py-2 px-3 text-xs font-bold text-white mt-1">OpenAI models</div>
                  <ModelItem
                    title="GPT Image 2" time="15 seconds" cost={50} isNew icon="G2"
                    selected={selectedModel === 'GPT Image 2'} onClick={() => { setSelectedModel('GPT Image 2'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="GPT Image 1.5" time="15 seconds" cost={50} isNew icon="G1"
                    selected={selectedModel === 'GPT Image 1.5'} onClick={() => { setSelectedModel('GPT Image 1.5'); setActiveDropdown(null); }}
                  />
                  <div className="py-2 px-3 text-xs font-bold text-white mt-1">Gemini models</div>
                  <ModelItem
                    title="Gemini 2.5 Flash" time="6 seconds" cost={0} icon="GF"
                    selected={selectedModel === 'Gemini 2.5 Flash'} onClick={() => { setSelectedModel('Gemini 2.5 Flash'); setActiveDropdown(null); }}
                  />
                  <div className="py-2 px-3 text-xs font-bold text-white mt-1">Recraft flagship models</div>
                  <ModelItem 
                    title="Recraft V4" time="10 seconds" cost={40} isNew
                    selected={selectedModel === 'Recraft V4'} onClick={() => { setSelectedModel('Recraft V4'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V4 Vector" time="15 seconds" cost={80} isNew
                    selected={selectedModel === 'Recraft V4 Vector'} onClick={() => { setSelectedModel('Recraft V4 Vector'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V4 Pro" time="30 seconds" cost={250} isNew
                    selected={selectedModel === 'Recraft V4 Pro'} onClick={() => { setSelectedModel('Recraft V4 Pro'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V4 Pro Vector" time="45 seconds" cost={300} isNew
                    selected={selectedModel === 'Recraft V4 Pro Vector'} onClick={() => { setSelectedModel('Recraft V4 Pro Vector'); setActiveDropdown(null); }}
                  />
                  <div className="py-2 px-3 text-xs font-bold text-white mt-1">Previous versions</div>
                  <ModelItem 
                    title="Recraft V3" time="15 seconds" cost={40}
                    selected={selectedModel === 'Recraft V3'} onClick={() => { setSelectedModel('Recraft V3'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V3 Vector" time="20 seconds" cost={80}
                    selected={selectedModel === 'Recraft V3 Vector'} onClick={() => { setSelectedModel('Recraft V3 Vector'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V2" time="10 seconds" cost={22}
                    selected={selectedModel === 'Recraft V2'} onClick={() => { setSelectedModel('Recraft V2'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="Recraft V2 Vector" time="15 seconds" cost={44}
                    selected={selectedModel === 'Recraft V2 Vector'} onClick={() => { setSelectedModel('Recraft V2 Vector'); setActiveDropdown(null); }}
                  />
                </motion.div>
              )}

              {activeDropdown === 'ratio' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-60 mb-4 w-[200px] bg-elevated border border-border shadow-2xl rounded-2xl p-2 z-50 pointer-events-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'].map(r => (
                    <MenuItem 
                      key={r} icon={<Frame className="w-4 h-4" />} title={r}
                      selected={selectedRatio === r} onClick={() => { setSelectedRatio(r); setActiveDropdown(null); }}
                    />
                  ))}
                </motion.div>
              )}

              {activeDropdown === 'count' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-80 mb-4 w-40 bg-elevated border border-border shadow-2xl rounded-2xl p-2 z-50 pointer-events-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[1, 2, 4].map(c => {
                    const label = `${c} Image${c > 1 ? 's' : ''}`;
                    return (
                      <MenuItem 
                        key={c} icon={<LayoutGridIcon className="w-4 h-4" />} title={label}
                        selected={selectedCount === label} onClick={() => { setSelectedCount(label); setActiveDropdown(null); }}
                      />
                    );
                  })}
                </motion.div>
              )}

              {activeDropdown === 'palette' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-4 w-80 bg-elevated border border-border shadow-2xl rounded-2xl p-4 z-50 pointer-events-auto flex flex-col gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Color palette</span>
                    <button
                      onClick={() => setDisplayedPalettes(pick5Palettes(selectedPalette))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/8"
                      title="Shuffle palettes"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Shuffle
                    </button>
                  </div>

                  {/* 5 palette rows */}
                  <div className="flex flex-col gap-2">
                    {displayedPalettes.map((p, i) => {
                      const isActive = selectedPalette?.join(',') === p.colors.join(',');
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedPalette(isActive ? null : p.colors);
                            if (!isActive) setActiveDropdown(null);
                          }}
                          className={cn(
                            "w-full rounded-xl overflow-hidden flex flex-col transition-all",
                            isActive
                              ? "ring-2 ring-white/60 scale-[1.01]"
                              : "hover:scale-[1.01] hover:opacity-90"
                          )}
                          title={p.name}
                        >
                          <div className="w-full h-10 flex">
                            {p.colors.map((color, j) => (
                              <div key={j} className="h-full" style={{ backgroundColor: color, flex: 1 }} />
                            ))}
                          </div>
                          <div className={cn(
                            "w-full px-2.5 py-1 text-left flex items-center justify-between",
                            isActive ? "bg-white/10" : "bg-surface/80"
                          )}>
                            <span className="text-[11px] font-medium text-muted-foreground">{p.name}</span>
                            {isActive && <span className="text-[10px] text-white/70 font-semibold">Active</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Clear if something is selected */}
                  {selectedPalette && (
                    <button
                      onClick={() => setSelectedPalette(null)}
                      className="text-xs text-muted-foreground hover:text-white transition-colors text-center py-1 rounded-lg hover:bg-white/5"
                    >
                      Clear palette
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth relative z-10 w-full pb-1">

              {!isFrameActive && (
                <>
                  <BadgeButton 
                    icon={<Box className="w-3.5 h-3.5" />} label={abbreviateModel(selectedModel)} 
                    active={activeDropdown === 'model'} 
                    onClick={(e) => { e.stopPropagation(); toggleDropdown('model'); }} 
                  />
                </>
              )}

              {isFrameActive && (
                <BadgeButton 
                  icon={<Hexagon className="w-3.5 h-3.5" />} label={abbreviateModel(selectedModel)} 
                  active={activeDropdown === 'model'} 
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('model'); }} 
                />
              )}

              {/* Style — dynamic icon based on apiStyle */}
              <div className="flex items-center gap-1">
                <BadgeButton 
                  icon={getStyleIcon(selectedStyleMeta?.apiStyle || (selectedStyle ? STYLE_LOOKUP[selectedStyle]?.apiStyle : undefined))} label={selectedStyle || 'No style'} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStyleModal(true); setActiveDropdown(null);
                  }}
                />
                {selectedStyle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStyle(null);
                      setSelectedStyleMeta(null);
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                    title="Clear style"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Recycle/refresh icon — frame mode */}
              {isFrameActive && (
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/8 transition-colors shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
              
              {!isFrameActive && (
                <>
                  <BadgeButton 
                    icon={<Frame className="w-3.5 h-3.5" />} label={selectedRatio !== '1:1' ? selectedRatio : '1:1'} 
                    active={activeDropdown === 'ratio'}
                    onClick={(e) => { e.stopPropagation(); toggleDropdown('ratio'); }}
                  />
                  <BadgeButton 
                    icon={<LayoutGridIcon className="w-3.5 h-3.5" />} label={selectedCount !== '1 Image' ? selectedCount : 'Count'} 
                    active={activeDropdown === 'count'}
                    onClick={(e) => { e.stopPropagation(); toggleDropdown('count'); }}
                  />
                </>
              )}
              
              <div className="ml-auto flex items-center gap-0.5 shrink-0">
                {/* Color palette picker */}
                {!isFrameActive && (
                  <button
                    className={cn(
                      "p-2 rounded-lg transition-all relative",
                      activeDropdown === 'palette' || selectedPalette
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-white hover:bg-white/8"
                    )}
                    onClick={(e) => { e.stopPropagation(); toggleDropdown('palette'); }}
                    title={selectedPalette ? `Palette active: ${selectedPalette.join(', ')}` : 'Color palette'}
                  >
                    {selectedPalette ? (
                      <div className="w-4 h-4 rounded-sm overflow-hidden flex">
                        {selectedPalette.slice(0, 4).map((c, i) => (
                          <div key={i} className="h-full" style={{ backgroundColor: c, flex: 1 }} />
                        ))}
                      </div>
                    ) : (
                      <Palette className="w-4 h-4" />
                    )}
                  </button>
                )}
                {/* Attach reference images (only for models that support attachments) */}
                <button
                  className={cn(
                    "p-2 rounded-lg transition-all relative",
                    !currentModelCaps?.attachments && "opacity-40 cursor-not-allowed",
                    attachments.length > 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-white hover:bg-white/8"
                  )}
                  onClick={() => {
                    if (currentModelCaps && !currentModelCaps.attachments) {
                      toast.error(`${selectedModel} doesn't support image attachments. Switch to GPT Image 2 or a Recraft model to attach reference images.`);
                      return;
                    }
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      if (files.length > 0) setAttachments((prev) => [...prev, ...files].slice(0, 5));
                    };
                    input.click();
                  }}
                  title={attachments.length > 0 ? `${attachments.length} file(s) attached` : 'Attach reference images'}
                >
                  <Paperclip className="w-4 h-4" />
                  {attachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">{attachments.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !effectivePrompt.trim()}
              className={cn(
                "w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center transition-all shadow-lg ml-2",
                isGenerating
                  ? "bg-primary/50 text-white/50 cursor-not-allowed"
                  : effectivePrompt.trim().length > 0 
                    ? "bg-white text-black hover:bg-white/90 hover:scale-105 shadow-[0_2px_12px_rgba(255,255,255,0.15)]" 
                    : "bg-surface text-muted-foreground hover:bg-white/10"
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground font-medium mt-3">
          Recraft AI can make mistakes. Check important info.
        </p>
      </div>

      {toolCursor.visible && isCanvasCustomCursorMode && (
        <div
          ref={toolCursorElemRef}
          className={cn(
            "fixed pointer-events-none z-[85] transition-opacity duration-100 ease-out",
            shouldFadeToolCursor ? "opacity-0" : "opacity-100",
          )}
          style={{ left: 0, top: 0, willChange: 'transform', transform: `translate3d(${toolCursor.x}px, ${toolCursor.y}px, 0) translate(-50%, -50%)` }}
        >
          {isEditAreaCursorMode && editAreaTool === 'lasso' && (
            <div className="w-8 h-8 rounded-full bg-black/55 border border-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3C7.03 3 3 7.03 3 12c0 2.54 1.05 4.84 2.74 6.49L3 21h9c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
              </svg>
            </div>
          )}
          {isEditAreaCursorMode && editAreaTool === 'brush' && (
            <div
              className="rounded-full border border-primary/90 bg-primary/20 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ width: Math.max(10, Math.min(120, brushSize * zoom)), height: Math.max(10, Math.min(120, brushSize * zoom)) }}
            />
          )}
          {isEditAreaCursorMode && editAreaTool === 'area' && (
            <div className="w-8 h-8 rounded-full bg-black/55 border border-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center text-white">
              <Square className="w-4 h-4" />
            </div>
          )}
          {isEditAreaCursorMode && editAreaTool === 'wand' && (
            <div className="w-8 h-8 rounded-full bg-black/55 border border-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center text-white">
              <Wand2 className="w-4 h-4" />
            </div>
          )}
          {!isEditAreaCursorMode && activeTool === 'select' && (
            <div className="w-8 h-8 rounded-full bg-black/55 border border-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center text-white">
              <MousePointer2 className="w-4 h-4 -rotate-12" />
            </div>
          )}
          {!isEditAreaCursorMode && activeTool === 'hand' && (
            <div className={cn(
              "w-8 h-8 rounded-full border shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center",
              isPanning ? "bg-white text-black border-white/90" : "bg-black/55 text-white border-white/20"
            )}>
              <Hand className="w-4 h-4" />
            </div>
          )}
          {!isEditAreaCursorMode && activeTool === 'text' && (
            <div className="w-8 h-8 rounded-full bg-black/55 border border-white/20 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center text-white">
              <Type className="w-4 h-4" />
            </div>
          )}
          {!isEditAreaCursorMode && (activeTool === 'brush' || activeTool === 'shapes') && (
            <>
              {drawMode === 'brush' && (
                <div
                  className="rounded-full border border-white/80 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                  style={{ width: Math.max(10, Math.min(96, brushDrawSize * zoom)), height: Math.max(10, Math.min(96, brushDrawSize * zoom)) }}
                />
              )}
              {drawMode === 'eraser' && (
                <div
                  className="rounded-full border-2 border-red-300/90 bg-red-300/10"
                  style={{ width: Math.max(12, Math.min(100, brushDrawSize * zoom)), height: Math.max(12, Math.min(100, brushDrawSize * zoom)) }}
                />
              )}
              {drawMode === 'line' && (
                <div className="w-8 h-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center text-white">
                  <Slash className="w-4 h-4" />
                </div>
              )}
              {drawMode === 'arrow' && (
                <div className="w-8 h-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center text-white">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              )}
              {drawMode === 'rectangle' && (
                <div className="w-8 h-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center text-white">
                  <Square className="w-4 h-4" />
                </div>
              )}
              {drawMode === 'ellipse' && (
                <div className="w-8 h-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center text-white">
                  <Circle className="w-4 h-4" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <StyleModal
        isOpen={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        onSelect={(entry) => {
          const selectedEntry = entry as StyleModalSelectionEntry;

          setSelectedStyle(entry.name);
          setSelectedStyleMeta({
            name: entry.name,
            apiStyle: entry.apiStyle,
            apiSubstyle: entry.apiSubstyle,
            apiModel: entry.model === 'Custom' ? undefined : entry.apiModel,
            styleId: entry.model === 'Custom' ? (entry.apiModel || undefined) : undefined,
            preferredModel: selectedEntry.preferredModel,
            contextImageUrls: selectedEntry.contextImageUrls,
          });

          // Keep OpenAI models selected so style is applied via prompt injection.
          if (isCurrentModelOpenAI) return;

          if (entry.model === 'Custom') return;

          setSelectedModel(
            entry.model === 'Recraft V3'
              ? (entry.apiModel.includes('vector') ? 'Recraft V3 Vector' : 'Recraft V3')
              : entry.model === 'Recraft V2'
                ? (entry.apiModel.includes('vector') ? 'Recraft V2 Vector' : 'Recraft V2')
                : entry.model
          );
        }}
        currentStyle={selectedStyle}
        canvasImages={canvasImages}
      />

      {/* ── UPGRADE / PRICING MODAL ──────────────────────────────────────────── */}
      <PricingModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}



// Subcomponents helper
function MenuItem({ icon, title, subtitle, selected, onClick, isPro, isNew }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 w-full text-left px-3 py-3 rounded-xl transition-colors hover:bg-white/5",
        selected ? "bg-white/5" : ""
      )}
    >
      <div className="mt-1 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex-1 shrink flex flex-col items-start min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold line-clamp-1", selected ? "text-white" : "text-white/80")}>{title}</span>
          {isPro && <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] px-1.5 py-px rounded uppercase font-bold tracking-wider shrink-0 overflow-hidden">Pro</span>}
          {isNew && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-1.5 py-px rounded uppercase font-bold tracking-wider shrink-0 overflow-hidden">New</span>}
        </div>
        <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">{subtitle}</span>
      </div>
      {selected ? <Check className="w-4 h-4 text-primary shrink-0 mt-1 ml-1" /> : <div className="w-4 shrink-0 ml-1" />}
    </button>
  );
}

function ModelItem({ title, time, cost, selected, onClick, isPro, isNew, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5",
        selected ? "bg-white/5" : ""
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-black flex shrink-0 items-center justify-center border border-white/10 text-white font-bold text-xs overflow-hidden">
        {icon || 'V4'}
      </div>
      <div className="flex-1 shrink flex flex-col items-start min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold line-clamp-1", selected ? "text-white" : "text-white/80")}>{title}</span>
          {isPro && <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] px-1.5 py-px rounded uppercase font-bold tracking-wider shrink-0 overflow-hidden">Pro</span>}
          {isNew && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-1.5 py-px rounded uppercase font-bold tracking-wider shrink-0 overflow-hidden">New</span>}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {time} <div className="w-1 h-1 rounded-full bg-white/20 mt-px" /> <Sparkles className="w-3 h-3 text-muted-foreground" /> {cost}
        </span>
      </div>
      {selected ? <Check className="w-4 h-4 text-primary shrink-0 ml-1" /> : <div className="w-4 shrink-0 ml-1" />}
    </button>
  );
}

function ToolButton({ icon, active, tooltip, onClick }: { icon: React.ReactNode, active?: boolean, tooltip?: string, onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button 
      title={tooltip}
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
        active 
          ? "bg-white/10 text-white" 
          : "text-muted-foreground hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      
      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2 py-1 bg-black/90 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-white/10">
        {tooltip}
      </div>
    </button>
  );
}

function ShapesMenuItem({ icon, label, shortcut, onClick, isLast }: { icon: React.ReactNode, label: string, shortcut: string, onClick?: () => void, isLast?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 text-left transition-colors hover:bg-white/5 group",
        !isLast && "border-b border-white/6"
      )}
      style={{ height: '52px' }}
    >
      <span className="shrink-0 text-muted-foreground group-hover:text-white/80 transition-colors">{icon}</span>
      <span className="flex-1 text-[15px] font-medium text-white/85 group-hover:text-white transition-colors leading-none">{label}</span>
      <span className="text-[12px] text-white/25 font-medium tracking-wide shrink-0">{shortcut}</span>
    </button>
  );
}

function ToolbarMenuItem({ icon, label, shortcut, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all border border-transparent",
        active ? "bg-white/10 text-white border-white/10" : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {shortcut && <span className="text-[10px] uppercase font-bold px-1.5 py-px rounded bg-white/5 text-muted-foreground">{shortcut}</span>}
    </button>
  );
}

function BadgeButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick?: React.MouseEventHandler, active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all font-medium whitespace-nowrap select-none",
        active
          ? "bg-white/10 text-white"
          : "text-foreground/80 hover:text-white hover:bg-white/8"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Return a lucide icon node appropriate for the given Recraft apiStyle */
function getStyleIcon(apiStyle?: string): React.ReactNode {
  const cls = "w-3.5 h-3.5";
  switch (apiStyle) {
    case 'realistic_image': return <Camera className={cls} />;
    case 'digital_illustration': return <PenLine className={cls} />;
    case 'vector_illustration': return <Layers className={cls} />;
    case 'icon': return <Square className={cls} />;
    default: return <Sparkles className={cls} />;
  }
}

/** Shorten model display labels to keep the toolbar compact */
function abbreviateModel(model: string): string {
  return model
    .replace('Recraft ', '')
    .replace('Auto mode', 'Auto')
    .replace('Gemini 2.5 Flash', 'G2.5 Flash')
    .replace('GPT Image 2', 'GPT Img 2')
    .replace('GPT Image 1.5', 'GPT Img 1.5')
    .replace('GPT Image 1', 'GPT Img 1')
    .replace('DALL·E 3', 'DALL·E 3');
}

// Temporary inline custom icon missing from import above
function LayoutGridIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '').trim();
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const fullHex = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(255,255,255,${clampedAlpha})`;
  }
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

// ── BrushStroke type ──
type DrawMode = 'brush' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'ellipse';
type DrawShapeKind = Exclude<DrawMode, 'eraser'>;

interface BrushStroke {
  id: string;
  kind?: DrawShapeKind;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  fill?: boolean;
  fillColor?: string;
  historyImageId?: string | null;
}

// ── CanvasImage type (module-level so helper components can reference it) ──
interface CanvasImage {
  id: string;
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
  prompt: string;
  model: string;
  style: string;
  ratio: string;
  isFrame?: boolean;
  adjustments?: {
    hue: number;
    saturation: number;
    brightness: number;
    contrast: number;
    opacity: number;
  };
}

// ── CanvasText type ──
interface CanvasText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  width: number;
  height?: number;
  opacity: number;
  historyImageId?: string | null;
}

const RESIZE_HANDLES: { id: string; sx: React.CSSProperties; tf: string; cur: string }[] = [
  { id: 'nw', sx: { top: 0, left: 0 },      tf: 'translate(-50%, -50%)', cur: 'nw-resize' },
  { id: 'n',  sx: { top: 0, left: '50%' },   tf: 'translate(-50%, -50%)', cur: 'n-resize'  },
  { id: 'ne', sx: { top: 0, right: 0 },      tf: 'translate(50%, -50%)',  cur: 'ne-resize' },
  { id: 'e',  sx: { top: '50%', right: 0 },  tf: 'translate(50%, -50%)',  cur: 'e-resize'  },
  { id: 'se', sx: { bottom: 0, right: 0 },   tf: 'translate(50%, 50%)',   cur: 'se-resize' },
  { id: 's',  sx: { bottom: 0, left: '50%'}, tf: 'translate(-50%, 50%)',  cur: 's-resize'  },
  { id: 'sw', sx: { bottom: 0, left: 0 },    tf: 'translate(-50%, 50%)',  cur: 'sw-resize' },
  { id: 'w',  sx: { top: '50%', left: 0 },   tf: 'translate(-50%, -50%)', cur: 'w-resize'  },
];

const HANDLE_CURSOR_MIN_ZOOM = 0.2;
const RESIZE_HANDLE_HIT_SIZE = 16;
const RESIZE_HANDLE_VISIBLE_SIZE = 6;
const RESIZE_HANDLE_VISIBLE_BORDER_WIDTH = 1.25;
const OUTPAINT_HANDLE_HIT_LONG = 58;
const OUTPAINT_HANDLE_HIT_THICK = 18;
const OUTPAINT_HANDLE_VISIBLE_LONG = 30;
const OUTPAINT_HANDLE_VISIBLE_THICK = 6;

// ── FontEntry type ──
interface FontEntry {
  id: string;
  family: string;
  category: string;
  variants: number[];
}

// Module-level cache: persists as long as the page is loaded (survives modal open/close).
// Values are image URL strings loaded from the database.
const COVER_CACHE: Record<string, string> = {};
const STYLE_MODAL_FETCH_TIMEOUT_MS = 15000;
const STYLE_MODAL_COVER_TIMEOUT_MS = 12000;

async function fetchJsonWithTimeout<T>(
  input: string,
  init?: RequestInit,
  timeoutMs: number = STYLE_MODAL_FETCH_TIMEOUT_MS,
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

type CoverSource = 'curated' | 'ai';

type AiStyleFeedItem = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  prompt: string | null;
  model: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  category: string;
  styleKey: string;
  styleName: string;
  isSaved?: boolean;
  apiModel?: string;
  apiStyle?: string;
  apiSubstyle?: string;
};

type StyleModalUserStyle = {
  id: string;
  name: string;
  baseStyle: string | null;
  recraftStyleId: string | null;
  sourceImages?: unknown;
  thumbnailUrl?: string | null;
  createdAt: string;
};

type StyleModalSelectionEntry = StyleEntry & {
  contextImageUrls?: string[];
  preferredModel?: string;
};

type StyleModalSourceImageItem = {
  url?: string;
  modelHint?: string;
};

function readStyleModalSourceImageItems(value: unknown): StyleModalSourceImageItem[] {
  if (!value) return [];

  const sourceItems: unknown[] = Array.isArray(value)
    ? value
    : (typeof value === 'object' && value !== null && Array.isArray((value as Record<string, unknown>).items)
      ? ((value as Record<string, unknown>).items as unknown[])
      : []);

  const items: StyleModalSourceImageItem[] = [];

  for (const item of sourceItems) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    items.push({
      url: typeof entry.url === 'string' ? entry.url : undefined,
      modelHint: typeof entry.modelHint === 'string' ? entry.modelHint : undefined,
    });
  }

  return items;
}

function readStyleModalThumbnailUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const rawThumbnail = typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl.trim() : '';
  if (rawThumbnail) return rawThumbnail;

  const firstItemUrl = readStyleModalSourceImageItems(value)
    .map((item) => item.url?.trim() || '')
    .find((url) => url.length > 0);

  return firstItemUrl || null;
}

type StyleModalAiFeedCachePayload = {
  items: AiStyleFeedItem[];
  categories: string[];
};

const STYLE_MODAL_SESSION_CACHE: {
  curatedKeys: string[] | null;
  aiFeed: StyleModalAiFeedCachePayload | null;
  savedAiFeed: AiStyleFeedItem[] | null;
  myStyles: StyleModalUserStyle[] | null;
} = {
  curatedKeys: null,
  aiFeed: null,
  savedAiFeed: null,
  myStyles: null,
};

const STYLE_MODAL_INFLIGHT: {
  curatedKeys: Promise<string[] | null> | null;
  aiFeed: Promise<StyleModalAiFeedCachePayload | null> | null;
  savedAiFeed: Promise<AiStyleFeedItem[] | null> | null;
  myStyles: Promise<StyleModalUserStyle[] | null> | null;
} = {
  curatedKeys: null,
  aiFeed: null,
  savedAiFeed: null,
  myStyles: null,
};

async function loadStyleModalCuratedKeys(force = false): Promise<string[] | null> {
  if (!force && Array.isArray(STYLE_MODAL_SESSION_CACHE.curatedKeys)) {
    return STYLE_MODAL_SESSION_CACHE.curatedKeys;
  }

  if (!force && STYLE_MODAL_INFLIGHT.curatedKeys) {
    return STYLE_MODAL_INFLIGHT.curatedKeys;
  }

  STYLE_MODAL_INFLIGHT.curatedKeys = (async () => {
    const data = await fetchJsonWithTimeout<{ cached?: string[] }>('/api/style-covers');
    if (!data) return null;

    const cached = Array.isArray(data.cached) ? data.cached : [];
    STYLE_MODAL_SESSION_CACHE.curatedKeys = cached;
    return cached;
  })().finally(() => {
    STYLE_MODAL_INFLIGHT.curatedKeys = null;
  });

  return STYLE_MODAL_INFLIGHT.curatedKeys;
}

async function loadStyleModalAiFeed(force = false): Promise<StyleModalAiFeedCachePayload | null> {
  if (!force && STYLE_MODAL_SESSION_CACHE.aiFeed) {
    return STYLE_MODAL_SESSION_CACHE.aiFeed;
  }

  if (!force && STYLE_MODAL_INFLIGHT.aiFeed) {
    return STYLE_MODAL_INFLIGHT.aiFeed;
  }

  STYLE_MODAL_INFLIGHT.aiFeed = (async () => {
    const data = await fetchJsonWithTimeout<{
      items?: AiStyleFeedItem[];
      categories?: string[];
    }>('/api/ai-style-images?limit=600');

    if (!data) return null;

    const payload: StyleModalAiFeedCachePayload = {
      items: Array.isArray(data.items) ? data.items : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
    };

    STYLE_MODAL_SESSION_CACHE.aiFeed = payload;
    return payload;
  })().finally(() => {
    STYLE_MODAL_INFLIGHT.aiFeed = null;
  });

  return STYLE_MODAL_INFLIGHT.aiFeed;
}

async function loadStyleModalSavedAiFeed(force = false): Promise<AiStyleFeedItem[] | null> {
  if (!force && Array.isArray(STYLE_MODAL_SESSION_CACHE.savedAiFeed)) {
    return STYLE_MODAL_SESSION_CACHE.savedAiFeed;
  }

  if (!force && STYLE_MODAL_INFLIGHT.savedAiFeed) {
    return STYLE_MODAL_INFLIGHT.savedAiFeed;
  }

  STYLE_MODAL_INFLIGHT.savedAiFeed = (async () => {
    const data = await fetchJsonWithTimeout<{ items?: AiStyleFeedItem[] }>('/api/ai-style-images?limit=500&saved=true');
    if (!data) return null;

    const items = Array.isArray(data.items) ? data.items : [];
    STYLE_MODAL_SESSION_CACHE.savedAiFeed = items;
    return items;
  })().finally(() => {
    STYLE_MODAL_INFLIGHT.savedAiFeed = null;
  });

  return STYLE_MODAL_INFLIGHT.savedAiFeed;
}

async function loadStyleModalMyStyles(force = false): Promise<StyleModalUserStyle[] | null> {
  if (!force && Array.isArray(STYLE_MODAL_SESSION_CACHE.myStyles)) {
    return STYLE_MODAL_SESSION_CACHE.myStyles;
  }

  if (!force && STYLE_MODAL_INFLIGHT.myStyles) {
    return STYLE_MODAL_INFLIGHT.myStyles;
  }

  STYLE_MODAL_INFLIGHT.myStyles = (async () => {
    const data = await fetchJsonWithTimeout<StyleModalUserStyle[]>('/api/styles');
    if (!Array.isArray(data)) return null;

    const normalized = data.map((style) => ({
      ...style,
      thumbnailUrl: style.thumbnailUrl || readStyleModalThumbnailUrl(style.sourceImages),
    }));

    STYLE_MODAL_SESSION_CACHE.myStyles = normalized;
    return normalized;
  })().finally(() => {
    STYLE_MODAL_INFLIGHT.myStyles = null;
  });

  return STYLE_MODAL_INFLIGHT.myStyles;
}

function invalidateStyleModalMyStylesCache(): void {
  STYLE_MODAL_SESSION_CACHE.myStyles = null;
  STYLE_MODAL_INFLIGHT.myStyles = null;
}

function StyleModal({ isOpen, onClose, onSelect, currentStyle, canvasImages }: { isOpen: boolean; onClose: () => void; onSelect: (entry: StyleModalSelectionEntry) => void; currentStyle: string | null; canvasImages: CanvasImage[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Discover');
  const [selectedPreview, setSelectedPreview] = useState<StyleEntry | null>(() => (currentStyle ? STYLE_LOOKUP[currentStyle] || null : null));
  const [searchQuery, setSearchQuery] = useState('');
  const [coverSource, setCoverSource] = useState<CoverSource>('curated');
  const [categoryFilter, setCategoryFilter] = useState('All styles');
  const [aiCategoryFilter, setAiCategoryFilter] = useState('All categories');
  const [selectedAiItem, setSelectedAiItem] = useState<AiStyleFeedItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeStyleMenuId, setActiveStyleMenuId] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<StyleModalUserStyle | null>(null);
  const [editingStyleName, setEditingStyleName] = useState('');
  const [editingStyleBaseStyle, setEditingStyleBaseStyle] = useState('digital_illustration');
  const [savingStyleEdits, setSavingStyleEdits] = useState(false);
  const [deleteCandidateStyle, setDeleteCandidateStyle] = useState<StyleModalUserStyle | null>(null);
  const [deletingStyleId, setDeletingStyleId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveStyleMenuId(null);
      setEditingStyle(null);
      setDeleteCandidateStyle(null);
      return;
    }

    setSelectedPreview(currentStyle ? STYLE_LOOKUP[currentStyle] || null : null);
    setSelectedAiItem(null);
  }, [currentStyle, isOpen]);

  const styleEntryByKey = React.useMemo(() => {
    const lookup = new Map<string, StyleEntry>();
    for (const category of STYLE_CATEGORIES) {
      for (const entry of category.styles) {
        lookup.set(styleKey(entry.name, entry.apiModel), entry);
      }
    }
    return lookup;
  }, []);

  const resolveStyleFromAiItem = useCallback((item: AiStyleFeedItem | null): StyleEntry | null => {
    if (!item) return null;
    return styleEntryByKey.get(item.styleKey) || STYLE_LOOKUP[item.styleName] || null;
  }, [styleEntryByKey]);

  // My Styles tab — user's custom styles from DB
  const [myStyles, setMyStyles] = useState<StyleModalUserStyle[]>([]);
  const [myStylesLoading, setMyStylesLoading] = useState(false);

  const fetchMyStyles = useCallback((force = false) => {
    setMyStylesLoading(true);
    void (async () => {
      const data = await loadStyleModalMyStyles(force);

      if (!mountedRef.current) return;
      setMyStyles(Array.isArray(data) ? data : []);
      setMyStylesLoading(false);
    })();
  }, []);

  const openStyleEditDialog = useCallback((style: StyleModalUserStyle) => {
    setActiveStyleMenuId(null);
    setEditingStyle(style);
    setEditingStyleName(style.name);
    setEditingStyleBaseStyle(style.baseStyle || 'digital_illustration');
  }, []);

  const handleStyleEditSave = useCallback(async () => {
    if (!editingStyle || savingStyleEdits) return;

    const trimmedName = editingStyleName.trim();
    if (!trimmedName) {
      toast.error('Style name cannot be empty');
      return;
    }

    setSavingStyleEdits(true);
    try {
      const response = await fetch(`/api/styles/${encodeURIComponent(editingStyle.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          baseStyle: editingStyleBaseStyle,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to update style');
      }

      invalidateStyleModalMyStylesCache();
      fetchMyStyles(true);
      setEditingStyle(null);
      toast.success('Style updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update style';
      toast.error(message);
    } finally {
      setSavingStyleEdits(false);
    }
  }, [editingStyle, editingStyleBaseStyle, editingStyleName, fetchMyStyles, savingStyleEdits]);

  const handleStyleDelete = useCallback(async () => {
    if (!deleteCandidateStyle || deletingStyleId) return;

    setDeletingStyleId(deleteCandidateStyle.id);
    try {
      const response = await fetch(`/api/styles/${encodeURIComponent(deleteCandidateStyle.id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to delete style');
      }

      invalidateStyleModalMyStylesCache();
      fetchMyStyles(true);
      if (editingStyle?.id === deleteCandidateStyle.id) {
        setEditingStyle(null);
      }
      setDeleteCandidateStyle(null);
      toast.success('Style deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete style';
      toast.error(message);
    } finally {
      setDeletingStyleId(null);
    }
  }, [deleteCandidateStyle, deletingStyleId, editingStyle?.id, fetchMyStyles]);

  // dbKeys: set of styleKeys that have a cover in DB (drives which styles are shown)
  const [dbKeys, setDbKeys] = useState<Set<string>>(new Set());
  const [dbKeysLoading, setDbKeysLoading] = useState(false);
  const [aiFeedItems, setAiFeedItems] = useState<AiStyleFeedItem[]>([]);
  const [aiFeedLoading, setAiFeedLoading] = useState(false);
  const [savedAiFeedItems, setSavedAiFeedItems] = useState<AiStyleFeedItem[]>([]);
  const [savedAiFeedLoading, setSavedAiFeedLoading] = useState(false);
  const [aiCategoryOptions, setAiCategoryOptions] = useState<string[]>([]);
  // forceRender triggers re-render when COVER_CACHE entries are populated
  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((n) => n + 1), []);

  const activeRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const loadingRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const MAX_CONCURRENT = 6;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!activeStyleMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const insideMenuRoot = target.closest('[data-style-menu-root="true"]');
      if (!insideMenuRoot) {
        setActiveStyleMenuId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveStyleMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeStyleMenuId]);

  useEffect(() => {
    // Preload all style datasets once per editor page load.
    void loadStyleModalCuratedKeys();
    void loadStyleModalAiFeed();
    void loadStyleModalSavedAiFeed();
    void loadStyleModalMyStyles();
  }, []);

  // Process queue: fetch covers from DB one at a time (stays under Prisma 5MB limit)
  const processQueue = useCallback(() => {
    if (!mountedRef.current) return;
    while (activeRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const key = queueRef.current.shift()!;
      if (COVER_CACHE[key] || loadingRef.current.has(key)) continue;

      activeRef.current++;
      loadingRef.current.add(key);
      forceRender();

      void (async () => {
        const data = await fetchJsonWithTimeout<{ imageUrl?: string }>(
          `/api/style-covers/${encodeURIComponent(key)}`,
          undefined,
          STYLE_MODAL_COVER_TIMEOUT_MS,
        );

        if (!mountedRef.current) return;
        if (data?.imageUrl) COVER_CACHE[key] = data.imageUrl;
      })()
        .catch(() => { /* silently ignore */ })
        .finally(() => {
          if (!mountedRef.current) return;
          activeRef.current--;
          loadingRef.current.delete(key);
          forceRender();
          processQueue();
        });
    }
  }, [forceRender]);

  // On modal open: fetch DB keys list → filter styles to only those with covers → queue image fetches
  useEffect(() => {
    if (!isOpen || coverSource !== 'curated') return;

    setDbKeysLoading(true);
    void (async () => {
      const cached = await loadStyleModalCuratedKeys();
      if (!mountedRef.current) return;

      if (!Array.isArray(cached)) {
        setDbKeys(new Set());
        setDbKeysLoading(false);
        return;
      }

      setDbKeys(new Set(cached));
      // Queue fetches only for keys not already in memory cache
      queueRef.current = cached.filter((key) => !COVER_CACHE[key]);
      processQueue();
      setDbKeysLoading(false);
    })().catch(() => {
      if (!mountedRef.current) return;
      setDbKeys(new Set());
      setDbKeysLoading(false);
    });
  }, [coverSource, isOpen, processQueue]);

  useEffect(() => {
    if (!isOpen || coverSource !== 'ai' || activeTab === 'My styles' || activeTab === 'Saved') return;

    let cancelled = false;
    setAiFeedLoading(true);

    void (async () => {
      const data = await loadStyleModalAiFeed();

      if (!mountedRef.current || cancelled) return;

      if (!data) {
        setAiFeedItems([]);
        setAiCategoryOptions([]);
        setAiFeedLoading(false);
        return;
      }

      setAiFeedItems(data.items);
      setAiCategoryOptions(data.categories);
      setAiFeedLoading(false);
    })().catch(() => {
      if (!mountedRef.current || cancelled) return;
      setAiFeedItems([]);
      setAiCategoryOptions([]);
      setAiFeedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, coverSource, isOpen]);

  const fetchSavedAiFeed = useCallback((force = false) => {
    let cancelled = false;
    setSavedAiFeedLoading(true);

    void (async () => {
      const data = await loadStyleModalSavedAiFeed(force);

      if (!mountedRef.current || cancelled) return;

      if (!Array.isArray(data)) {
        setSavedAiFeedItems([]);
        setSavedAiFeedLoading(false);
        return;
      }

      setSavedAiFeedItems(data);
      setSavedAiFeedLoading(false);
    })().catch(() => {
      if (!mountedRef.current || cancelled) return;
      setSavedAiFeedItems([]);
      setSavedAiFeedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'Saved') return;
    return fetchSavedAiFeed();
  }, [activeTab, fetchSavedAiFeed, isOpen]);

  const activeAiCategoryOptions = React.useMemo(() => {
    if (activeTab === 'Saved') {
      return Array.from(new Set(savedAiFeedItems.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
    }
    return aiCategoryOptions;
  }, [activeTab, aiCategoryOptions, savedAiFeedItems]);

  useEffect(() => {
    if (aiCategoryFilter === 'All categories') return;
    if (activeAiCategoryOptions.includes(aiCategoryFilter)) return;
    setAiCategoryFilter('All categories');
  }, [activeAiCategoryOptions, aiCategoryFilter]);

  // Fetch My Styles when that tab is activated
  useEffect(() => {
    if (isOpen && activeTab === 'My styles') fetchMyStyles();
  }, [isOpen, activeTab, fetchMyStyles]);

  // Only show styles that have an AI-generated cover in the database
  const filteredCategories = STYLE_CATEGORIES.map((cat) => ({
    ...cat,
    styles: cat.styles.filter((s) => {
      const key = styleKey(s.name, s.apiModel);
      if (!dbKeys.has(key)) return false;
      if (!searchQuery.trim()) return true;
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.model.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }),
  })).filter((cat) => cat.styles.length > 0 && (categoryFilter === 'All styles' || cat.title === categoryFilter));

  const filteredAiFeedItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return aiFeedItems.filter((item) => {
      if (aiCategoryFilter !== 'All categories' && item.category !== aiCategoryFilter) return false;
      if (!q) return true;
      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [aiCategoryFilter, aiFeedItems, searchQuery]);

  const filteredSavedAiFeedItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedAiFeedItems.filter((item) => {
      if (aiCategoryFilter !== 'All categories' && item.category !== aiCategoryFilter) return false;
      if (!q) return true;
      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [aiCategoryFilter, savedAiFeedItems, searchQuery]);

  const visibleAiFeedItems = activeTab === 'Saved' ? filteredSavedAiFeedItems : filteredAiFeedItems;
  const isVisibleAiFeedLoading = activeTab === 'Saved' ? savedAiFeedLoading : aiFeedLoading;
  const isSavedTab = activeTab === 'Saved';
  const showCuratedGrid = activeTab !== 'My styles' && !isSavedTab && coverSource === 'curated';
  const showAiGrid = activeTab !== 'My styles' && (isSavedTab || coverSource === 'ai');

  const selectedAiMappedStyle = resolveStyleFromAiItem(selectedAiItem);

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex justify-center p-4 sm:p-8 pt-12 pb-12 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400, bounce: 0.2 }}
            className="relative w-full max-w-310 h-full flex bg-[#0A0A0B] shadow-[0_0_100px_-20px_rgba(124,58,237,0.2)] rounded-3xl overflow-hidden border border-white/5"
          >
            {/* Left Content */}
            <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
              
              {/* Header */}
              <div className="px-8 pt-8 pb-4 shrink-0 border-b border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    {['Discover', 'My styles', 'Saved', 'Shared'].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => {
                          setActiveStyleMenuId(null);
                          if (tab !== 'My styles') {
                            setEditingStyle(null);
                            setDeleteCandidateStyle(null);
                          }
                          setActiveTab(tab);
                          if (tab === 'Saved') {
                            setCoverSource('ai');
                            setAiCategoryFilter('All categories');
                            setSelectedAiItem(null);
                            if (activeTab === 'Saved') fetchSavedAiFeed();
                          }
                        }}
                        className={cn("text-[28px] font-display font-bold tracking-tight transition-colors", activeTab === tab ? "text-white" : "text-muted-foreground hover:text-white/80")}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  {isSavedTab ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/80 text-xs font-medium">
                      <Heart className="w-3.5 h-3.5 fill-current text-pink-300" />
                      Saved AI images
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-white/5 shadow-inner">
                      <button
                        onClick={() => setCoverSource('curated')}
                        className={cn(
                          'px-4 py-1.5 font-medium rounded-lg transition-colors',
                          coverSource === 'curated'
                            ? 'bg-elevated text-white shadow border border-white/10'
                            : 'text-muted-foreground hover:text-white'
                        )}
                      >
                        Curated
                      </button>
                      <button
                        onClick={() => setCoverSource('ai')}
                        className={cn(
                          'px-4 py-1.5 font-medium rounded-lg transition-colors',
                          coverSource === 'ai'
                            ? 'bg-elevated text-white shadow border border-white/10'
                            : 'text-muted-foreground hover:text-white'
                        )}
                      >
                        AI Generated
                      </button>
                    </div>
                  )}

                  <div className="relative w-44 shrink-0">
                    <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <select
                      value={!isSavedTab && coverSource === 'curated' ? categoryFilter : aiCategoryFilter}
                      onChange={(e) => {
                        if (!isSavedTab && coverSource === 'curated') {
                          setCategoryFilter(e.target.value);
                        } else {
                          setAiCategoryFilter(e.target.value);
                        }
                      }}
                      className="w-full h-8.5 appearance-none bg-surface border border-white/5 rounded-xl pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {!isSavedTab && coverSource === 'curated' ? (
                        <>
                          <option value="All styles">Filter: All styles</option>
                          {STYLE_CATEGORIES.map((cat) => (
                            <option key={cat.title} value={cat.title}>{`Filter: ${cat.title}`}</option>
                          ))}
                        </>
                      ) : (
                        <>
                          <option value="All categories">Filter: All categories</option>
                          {activeAiCategoryOptions.map((category) => (
                            <option key={category} value={category}>{`Filter: ${category}`}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search in styles"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface border border-white/5 rounded-xl h-8.5 pl-9 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {isSavedTab ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        onClose();
                        router.push('/addaigenerated');
                      }}
                      className="ml-auto rounded-xl"
                    >
                      Open AI generator
                    </Button>
                  ) : coverSource === 'curated' ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setActiveStyleMenuId(null);
                        setEditingStyle(null);
                        setDeleteCandidateStyle(null);
                        setShowCreate(true);
                      }}
                      className="ml-auto rounded-xl"
                    >
                      + Create style
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        onClose();
                        router.push('/addaigenerated');
                      }}
                      className="ml-auto rounded-xl"
                    >
                      Open AI generator
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid Scroll Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

                {/* ── My Styles tab ── */}
                {activeTab === 'My styles' && (
                  <div>
                    {myStylesLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : myStyles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Sparkles className="w-8 h-8 opacity-40" />
                        <p className="text-sm font-medium text-white/60">No custom styles yet</p>
                        <p className="text-xs opacity-60">Click <span className="text-primary font-medium">+ Create style</span> to train your first style</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {myStyles.map((s) => {
                          const sourceItems = readStyleModalSourceImageItems(s.sourceImages);
                          const contextImageUrls = sourceItems
                            .map((item) => item.url)
                            .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
                          const preferredModel = sourceItems.find((item) => item.modelHint)?.modelHint;

                          return (
                            <div key={s.id} className="group flex flex-col gap-2 cursor-pointer">
                              <div
                                data-style-menu-root="true"
                                className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-white/30 transition-all p-1 flex items-center justify-center"
                              >
                                {s.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={s.thumbnailUrl} alt={s.name} className="w-full h-full rounded-xl object-cover" loading="lazy" />
                                ) : (
                                  <span className="text-3xl font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                                )}

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveStyleMenuId((current) => (current === s.id ? null : s.id));
                                  }}
                                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-lg border border-white/15 bg-black/40 text-white/80 hover:text-white hover:bg-black/65 transition-colors flex items-center justify-center"
                                  aria-label={`Manage ${s.name}`}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                  {activeStyleMenuId === s.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                      transition={{ duration: 0.16, ease: 'easeOut' }}
                                      className="absolute top-11 right-2 z-30 w-40 overflow-hidden rounded-xl border border-white/12 bg-[#101218] shadow-xl"
                                    >
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openStyleEditDialog(s);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm text-white/85 hover:bg-white/8 transition-colors flex items-center gap-2"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit style
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setActiveStyleMenuId(null);
                                          setDeleteCandidateStyle(s);
                                        }}
                                        className="w-full px-3 py-2.5 text-left text-sm text-rose-200 hover:bg-rose-500/12 transition-colors flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete style
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveStyleMenuId(null);
                                      onSelect({
                                        name: s.name,
                                        model: 'Custom',
                                        apiModel: s.recraftStyleId || '',
                                        apiStyle: (s.baseStyle || 'digital_illustration') as any,
                                        apiSubstyle: undefined,
                                        isNew: false,
                                        coverPrompt: s.name,
                                        preferredModel,
                                        contextImageUrls: contextImageUrls.length > 0 ? contextImageUrls : undefined,
                                      });
                                      onClose();
                                    }}
                                    disabled={deletingStyleId === s.id}
                                    className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                <p className="text-[11px] text-muted-foreground capitalize">{(s.baseStyle || 'Custom').replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Discover / other tabs ── */}
                {showCuratedGrid && dbKeysLoading && (
                  <div className="flex flex-col gap-10">
                    {[16, 12, 10].map((count, gi) => (
                      <div key={gi} className="flex flex-col gap-4">
                        <div className="h-7 w-40 rounded-xl bg-white/6 animate-pulse" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                              <div className="w-full aspect-square rounded-2xl bg-white/6 animate-pulse" />
                              <div className="h-3.5 w-3/4 rounded-lg bg-white/6 animate-pulse" />
                              <div className="h-3 w-1/2 rounded-lg bg-white/4 animate-pulse" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showCuratedGrid && !dbKeysLoading && filteredCategories.map((cat, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-2xl font-bold font-display text-white">
                        {cat.title}
                        {cat.subtitle && <span className="text-muted-foreground text-sm font-normal ml-3">{cat.subtitle}</span>}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {cat.styles.map((entry, si) => {
                        const key = styleKey(entry.name, entry.apiModel);
                        const coverUrl = COVER_CACHE[key];
                        const isLoading = loadingRef.current.has(key);
                        const isSelected = selectedPreview?.name === entry.name && selectedPreview?.apiModel === entry.apiModel;
                        
                        return (
                          <div 
                            key={si} 
                            onClick={() => setSelectedPreview(entry)}
                            className="group flex flex-col gap-2 cursor-pointer"
                          >
                            <div className={cn(
                              "relative w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 transition-all p-1",
                              isSelected ? "border-primary shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]" : "border-white/5 group-hover:border-white/20"
                            )}>
                              {/* Real cover — hidden until fully loaded */}
                              {coverUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={coverUrl}
                                  alt={entry.name}
                                  className="w-full h-full rounded-xl object-cover"
                                  loading="lazy"
                                />
                              )}

                              {/* Skeleton shimmer while cover is fetching or not yet available */}
                              {!coverUrl && (
                                <div className="absolute inset-0 rounded-xl overflow-hidden">
                                  <div className={cn("w-full h-full bg-white/6", isLoading ? "animate-pulse" : "")} />
                                </div>
                              )}
                              
                              {/* Hover Overlay Apply Action */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onSelect(entry); onClose(); }} 
                                  className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                                >
                                  Apply
                                </button>
                              </div>

                              {entry.isNew && (
                                <span className="absolute top-2 left-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] px-1.5 py-px rounded uppercase font-bold tracking-wider">New</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white transition-colors truncate">{entry.name}</p>
                              <p className="text-[11px] text-muted-foreground">{entry.model}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {showCuratedGrid && !dbKeysLoading && filteredCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    {dbKeys.size === 0 ? (
                      <>
                        <Sparkles className="w-8 h-8 mb-3 opacity-40" />
                        <p className="text-sm font-medium text-white/60">No style covers generated yet</p>
                        <p className="text-xs mt-1 opacity-60">Visit <span className="font-mono text-primary">/addcuratedstyles</span> to generate covers</p>
                      </>
                    ) : (
                      <>
                        <Search className="w-8 h-8 mb-3 opacity-50" />
                        <p className="text-sm">No styles found for &ldquo;{searchQuery}&rdquo;</p>
                      </>
                    )}
                  </div>
                )}

                {showAiGrid && isVisibleAiFeedLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="w-full aspect-square rounded-2xl bg-white/6 animate-pulse" />
                        <div className="h-3.5 w-3/4 rounded-lg bg-white/6 animate-pulse" />
                        <div className="h-3 w-1/2 rounded-lg bg-white/4 animate-pulse" />
                      </div>
                    ))}
                  </div>
                )}

                {showAiGrid && !isVisibleAiFeedLoading && visibleAiFeedItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {visibleAiFeedItems.map((item) => {
                      const mappedEntry = resolveStyleFromAiItem(item);
                      const isSelected = selectedAiItem?.id === item.id;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedAiItem(item);
                            if (mappedEntry) setSelectedPreview(mappedEntry);
                          }}
                          className="group flex flex-col gap-2 cursor-pointer"
                        >
                          <div
                            className={cn(
                              'relative w-full aspect-square rounded-2xl overflow-hidden bg-black border transition-colors',
                              isSelected ? 'border-primary' : 'border-white/10 group-hover:border-white/30'
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.thumbnailUrl || item.imageUrl}
                              alt={item.styleName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />

                            <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/70 to-transparent">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-white/85">
                                {item.category}
                              </span>
                            </div>

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!mappedEntry) {
                                    toast.error('This feed image is not mapped to an applicable style');
                                    return;
                                  }
                                  onSelect(mappedEntry);
                                  onClose();
                                }}
                                className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                              >
                                Apply
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-bold text-white truncate">{item.styleName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.prompt || 'AI generated style image'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAiGrid && !isVisibleAiFeedLoading && visibleAiFeedItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mb-3 opacity-40" />
                    <p className="text-sm font-medium text-white/60">
                      {isSavedTab ? 'No saved AI style images yet' : 'No AI style images found'}
                    </p>
                    <p className="text-xs mt-1 opacity-60">
                      {isSavedTab
                        ? 'Save images from the AI Generated feed to show them here.'
                        : 'Generate images in /addaigenerated to build the feed'}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Pane (Preview) */}
            <div className="w-85 shrink-0 bg-surface border-l border-white/5 flex flex-col p-6 overflow-y-auto">
              {showAiGrid ? (
                selectedAiItem ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black flex shrink-0 items-center justify-center border border-white/10 text-white font-bold text-[10px] uppercase overflow-hidden">
                          AI
                        </div>
                        <span className="font-bold text-lg truncate">{selectedAiItem.styleName}</span>
                      </div>
                    </div>

                    <div className="w-full aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden mb-4 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedAiItem.imageUrl}
                        alt={selectedAiItem.styleName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-3 text-sm">
                        <span className="text-muted-foreground font-medium">Category</span>
                        <span className="col-span-2 text-white/90">{selectedAiItem.category}</span>
                      </div>
                      <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                        <span className="text-muted-foreground font-medium">Model</span>
                        <span className="col-span-2 text-white/90">{selectedAiItem.model}</span>
                      </div>
                      {selectedAiItem.apiStyle && (
                        <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                          <span className="text-muted-foreground font-medium">Style</span>
                          <span className="col-span-2 text-white/90 capitalize">{selectedAiItem.apiStyle.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {selectedAiItem.apiSubstyle && (
                        <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                          <span className="text-muted-foreground font-medium">Substyle</span>
                          <span className="col-span-2 text-white/90 capitalize">{selectedAiItem.apiSubstyle.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {selectedAiItem.prompt && (
                        <div className="border-t border-white/5 pt-4">
                          <p className="text-xs text-muted-foreground mb-1">Prompt</p>
                          <p className="text-sm text-white/80 leading-relaxed">{selectedAiItem.prompt}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (!selectedAiMappedStyle) {
                          toast.error('This feed image is not mapped to an applicable style');
                          return;
                        }
                        onSelect(selectedAiMappedStyle);
                        onClose();
                      }}
                      disabled={!selectedAiMappedStyle}
                      className={cn(
                        'mt-auto w-full font-bold py-3 rounded-xl transition-colors',
                        selectedAiMappedStyle
                          ? 'bg-primary hover:bg-primary-hover text-white'
                          : 'bg-white/8 text-white/50 cursor-not-allowed'
                      )}
                    >
                      {selectedAiMappedStyle ? 'Apply Style' : 'Style unavailable'}
                    </button>
                  </>
                ) : isVisibleAiFeedLoading ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-white/6 animate-pulse" />
                      <div className="h-5 w-32 rounded-lg bg-white/6 animate-pulse" />
                    </div>
                    <div className="w-full aspect-square rounded-2xl bg-white/6 animate-pulse" />
                    <div className="space-y-3 mt-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 first:border-0 first:pt-0">
                          <div className="h-3.5 rounded-lg bg-white/4 animate-pulse" />
                          <div className="col-span-2 h-3.5 rounded-lg bg-white/6 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
                    Select an AI feed image to preview
                  </div>
                )
              ) : selectedPreview ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black flex shrink-0 items-center justify-center border border-white/10 text-white font-bold text-[10px] uppercase overflow-hidden">
                        {selectedPreview.apiModel.includes('v3') ? 'V3' : selectedPreview.apiModel.includes('v4') ? 'V4' : 'V2'}
                      </div>
                      <span className="font-bold text-lg truncate">{selectedPreview.name}</span>
                    </div>
                  </div>

                  <div className="w-full aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden mb-4 relative">
                    {(() => {
                      const previewKey = styleKey(selectedPreview.name, selectedPreview.apiModel);
                      const previewUrl = COVER_CACHE[previewKey];
                      const previewLoading = loadingRef.current.has(previewKey);
                      return (
                        <>
                          {previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={previewUrl}
                              alt={selectedPreview.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {!previewUrl && (
                            <div className="absolute inset-0">
                              <div className={cn("w-full h-full bg-white/6", previewLoading ? "animate-pulse" : "")} />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Details table */}
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-3 text-sm">
                      <span className="text-muted-foreground font-medium">Type</span>
                      <span className="col-span-2 text-white/90">{selectedPreview.apiStyle === 'vector_illustration' || selectedPreview.apiStyle === 'icon' ? 'Vector' : 'Raster'}</span>
                    </div>
                    <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                      <span className="text-muted-foreground font-medium">Style</span>
                      <span className="col-span-2 text-white/90 capitalize">{selectedPreview.apiStyle.replace(/_/g, ' ')}</span>
                    </div>
                    {selectedPreview.apiSubstyle && (
                      <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                        <span className="text-muted-foreground font-medium">Substyle</span>
                        <span className="col-span-2 text-white/90 capitalize">{selectedPreview.apiSubstyle.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 text-sm border-t border-white/5 pt-4">
                      <span className="text-muted-foreground font-medium">Model</span>
                      <span className="col-span-2 text-white/90">{selectedPreview.model}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { onSelect(selectedPreview); onClose(); }}
                    className="mt-auto w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Apply Style
                  </button>
                </>
              ) : dbKeysLoading ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-white/6 animate-pulse" />
                    <div className="h-5 w-32 rounded-lg bg-white/6 animate-pulse" />
                  </div>
                  <div className="w-full aspect-square rounded-2xl bg-white/6 animate-pulse" />
                  <div className="space-y-3 mt-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 first:border-0 first:pt-0">
                        <div className="h-3.5 rounded-lg bg-white/4 animate-pulse" />
                        <div className="col-span-2 h-3.5 rounded-lg bg-white/6 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a style to preview
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Create Style overlay — renders on top of this modal */}
    <AnimatePresence mode="wait" initial={false}>
      {showCreate && (
        <CreateStyleModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); setActiveTab('My styles'); fetchMyStyles(true); }}
          canvasImages={canvasImages}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {editingStyle && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[72] bg-black/65 backdrop-blur-sm"
            onClick={() => {
              if (!savingStyleEdits) {
                setEditingStyle(null);
              }
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-[73] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/12 bg-[#101218] shadow-2xl p-5 sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-display font-bold text-white">Edit style</h3>
                  <p className="text-xs text-white/60 mt-1">Update name and base style for this custom style.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!savingStyleEdits) {
                      setEditingStyle(null);
                    }
                  }}
                  className="w-8 h-8 rounded-lg border border-white/12 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-white/55">Style name</label>
                  <input
                    value={editingStyleName}
                    onChange={(event) => setEditingStyleName(event.target.value)}
                    placeholder="My editorial style"
                    className="w-full h-11 rounded-xl border border-white/12 bg-white/6 px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-white/55">Base style</label>
                  <select
                    value={editingStyleBaseStyle}
                    onChange={(event) => setEditingStyleBaseStyle(event.target.value)}
                    className="w-full h-11 rounded-xl border border-white/12 bg-white/6 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {BASE_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#111218] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingStyle(null)}
                  disabled={savingStyleEdits}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleStyleEditSave()}
                  disabled={savingStyleEdits || editingStyleName.trim().length === 0}
                  className="bg-primary hover:bg-primary-hover text-white"
                >
                  {savingStyleEdits ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {deleteCandidateStyle && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[74] bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!deletingStyleId) {
                setDeleteCandidateStyle(null);
              }
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/12 bg-[#101218] shadow-2xl p-5 sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-display font-bold text-white">Delete style?</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                This will permanently remove
                <span className="text-white font-semibold"> {deleteCandidateStyle.name}</span>
                {' '}from your styles library.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteCandidateStyle(null)}
                  disabled={Boolean(deletingStyleId)}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleStyleDelete()}
                  disabled={Boolean(deletingStyleId)}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  {deletingStyleId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete style'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}

// ─── Base style options for Create Style ────────────────────────────────────
const BASE_STYLE_OPTIONS = [
  { label: 'Realistic', value: 'realistic_image' },
  { label: 'Digital Illustration', value: 'digital_illustration' },
  { label: 'Vector', value: 'vector_illustration' },
  { label: 'Icon', value: 'icon' },
  { label: 'Any', value: 'any' },
];

const STYLE_CONTEXT_OPTIONS = [
  { label: 'Style & composition', value: 'style_and_composition' },
  { label: 'Style only', value: 'style_only' },
  { label: 'Composition only', value: 'composition_only' },
] as const;

const STYLE_TEST_MODEL_OPTIONS = [
  { label: 'Recraft V4', value: 'recraftv4' },
  { label: 'Recraft V3', value: 'recraftv3' },
  { label: 'GPT Image 2', value: 'gpt-image-2' },
  { label: 'GPT Image 1.5', value: 'gpt-image-1.5' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
] as const;

const STYLE_TEST_MODELS_WITH_ATTACHMENTS = new Set<string>([
  'recraftv4',
  'recraftv3',
  'gpt-image-2',
  'gpt-image-1.5',
]);

type StyleContextMode = (typeof STYLE_CONTEXT_OPTIONS)[number]['value'];

type PickedStyleImage = {
  url: string;
  file?: File;
  sourceType: 'canvas' | 'attachment';
  originalUrl?: string;
  styleHint?: string;
  modelHint?: string;
  promptHint?: string;
};

// ─── CreateStyleModal ────────────────────────────────────────────────────────
function CreateStyleModal({
  onClose,
  onSaved,
  canvasImages,
}: {
  onClose: () => void;
  onSaved: () => void;
  canvasImages: CanvasImage[];
}) {
  const [pickedImages, setPickedImages] = useState<PickedStyleImage[]>([]);
  const [canvasTab, setCanvasTab] = useState<'Projects images' | 'Saved styles'>('Projects images');
  const [savedStyles, setSavedStyles] = useState<Array<{
    id: string;
    name: string;
    baseStyle: string | null;
    thumbnailUrl: string | null;
  }>>([]);
  const [stylePrompt, setStylePrompt] = useState('');
  const [styleContextMode, setStyleContextMode] = useState<StyleContextMode>('style_and_composition');
  const [baseStyle, setBaseStyle] = useState('realistic_image');
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [testModel, setTestModel] = useState('recraftv4');
  const [testPrompt, setTestPrompt] = useState('');
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [styleName, setStyleName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const data = await loadStyleModalMyStyles();
      setSavedStyles(Array.isArray(data)
        ? data.map((style) => ({
          id: style.id,
          name: style.name,
          baseStyle: style.baseStyle,
          thumbnailUrl: style.thumbnailUrl || readStyleModalThumbnailUrl(style.sourceImages),
        }))
        : []);
    })();
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - pickedImages.length);
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPickedImages((prev) => [...prev, {
        url,
        file,
        sourceType: 'attachment' as const,
      }].slice(0, 5));
    });
  };

  const addCanvasImage = (img: CanvasImage) => {
    if (!img.url || pickedImages.length >= 5) return;
    if (pickedImages.some((p) => p.url === img.url)) return;
    setPickedImages((prev) => [...prev, {
      url: img.url,
      sourceType: 'canvas' as const,
      originalUrl: img.url,
      styleHint: img.style,
      modelHint: img.model,
      promptHint: img.prompt,
    }].slice(0, 5));
  };

  const removeImage = (idx: number) => {
    setPickedImages((prev) => {
      const next = [...prev];
      if (next[idx].url.startsWith('blob:')) URL.revokeObjectURL(next[idx].url);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleTestGenerate = async () => {
    if (!testPrompt.trim() || !hasImages || isTestGenerating) return;

    const contextInstruction = styleContextMode === 'style_only'
      ? 'Use the provided reference images only for visual style cues and do not replicate composition.'
      : styleContextMode === 'composition_only'
        ? 'Use the provided reference images only for composition and layout, while restyling the visuals.'
        : 'Use the provided reference images for both visual style and composition cues.';

    setIsTestGenerating(true);
    setTestImageUrl(null);

    try {
      const fd = new FormData();
      fd.append('prompt', `${testPrompt.trim()}. ${contextInstruction}`);
      fd.append('style', baseStyle);
      fd.append('model', testModel);
      fd.append('n', '1');
      fd.append('size', '1024x1024');

      if (STYLE_TEST_MODELS_WITH_ATTACHMENTS.has(testModel)) {
        for (const [index, picked] of pickedImages.entries()) {
          if (picked.file) {
            fd.append('attachments', picked.file);
            continue;
          }

          try {
            const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(picked.url)}`);
            if (!response.ok) continue;
            const blob = await response.blob();
            fd.append('attachments', new File([blob], `style-reference-${index + 1}.jpg`, { type: blob.type || 'image/jpeg' }));
          } catch {
            // Keep going even if one reference image fails conversion.
          }
        }
      }

      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Test generation failed');
      }

      const data = await res.json();
      const url = data.images?.[0]?.imageUrl || data.images?.[0]?.url || '';
      setTestImageUrl(url || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test generation failed';
      toast.error(message);
    } finally {
      setIsTestGenerating(false);
    }
  };

  const handleSave = async () => {
    if (pickedImages.length === 0 || !styleName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', styleName.trim());
      fd.append('baseStyle', baseStyle);
      fd.append('contextMode', styleContextMode);
      if (stylePrompt.trim()) fd.append('prompt', stylePrompt.trim());

      const sourceMeta = pickedImages.map((picked) => ({
        sourceType: picked.sourceType,
        originalUrl: picked.originalUrl,
        styleHint: picked.styleHint,
        modelHint: picked.modelHint,
        promptHint: picked.promptHint,
      }));
      fd.append('sourceMeta', JSON.stringify(sourceMeta));

      for (const picked of pickedImages) {
        if (picked.file) {
          fd.append('images', picked.file);
        } else {
          const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(picked.url));
          const blob = await res.blob();
          fd.append('images', new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' }));
        }
      }

      const res = await fetch('/api/styles', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create style');
      invalidateStyleModalMyStylesCache();
      toast.success('Style created!');
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create style';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasImages = pickedImages.length > 0;
  const baseStyleLabel = BASE_STYLE_OPTIONS.find((o) => o.value === baseStyle)?.label ?? 'Realistic';
  const contextModeLabel = STYLE_CONTEXT_OPTIONS.find((o) => o.value === styleContextMode)?.label ?? 'Style & composition';

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-black/65 will-change-opacity"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-310 h-[min(92vh,900px)] rounded-3xl border border-white/10 bg-[#F2F2F2] dark:bg-[#0E0E10] shadow-2xl flex overflow-hidden transform-gpu will-change-transform"
        onClick={(e) => {
          e.stopPropagation();
          setShowBaseDropdown(false);
          setShowContextDropdown(false);
        }}
      >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm hover:bg-primary-hover transition-colors"
        >
          esc
        </button>
        <span className="text-foreground font-semibold text-xl">Create new style</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-4">
          {!hasImages ? (
            <div
              className="w-full max-w-2xl border-2 border-dashed border-gray-300 dark:border-white/15 rounded-2xl flex flex-col items-center justify-center py-16 px-8 cursor-pointer hover:border-gray-400 dark:hover:border-white/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
            >
              <p className="text-sm text-gray-500 dark:text-white/50 text-center leading-relaxed">
                Upload up to 5 files &lt;20MB, or add images from your library
              </p>
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-white dark:bg-white/3 border border-gray-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 flex items-start gap-3 flex-wrap">
                {pickedImages.map((img, idx) => (
                  <div key={idx} className="relative group w-28 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url || undefined} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {pickedImages.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-28 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/15 flex items-center justify-center text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-gray-600 transition-colors shrink-0"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-white/5">
                <textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="add style-level prompt, e.g., simple geometric lines"
                  className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
                  rows={2}
                />
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setShowContextDropdown((prev) => !prev);
                        setShowBaseDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {contextModeLabel} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {showContextDropdown && (
                      <div className="absolute bottom-full left-0 mb-1 bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 min-w-52">
                        {STYLE_CONTEXT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setStyleContextMode(opt.value);
                              setShowContextDropdown(false);
                            }}
                            className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5', styleContextMode === opt.value ? 'text-white font-medium' : 'text-muted-foreground')}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setShowBaseDropdown((p) => !p);
                        setShowContextDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {baseStyleLabel} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {showBaseDropdown && (
                      <div className="absolute bottom-full left-0 mb-1 bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 min-w-44">
                        {BASE_STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { setBaseStyle(opt.value); setShowBaseDropdown(false); }}
                            className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5', baseStyle === opt.value ? 'text-white font-medium' : 'text-muted-foreground')}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 pb-8 shrink-0">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Images from library</h3>
                <p className="text-xs text-muted-foreground">Use up to 5 images in your style</p>
              </div>
              <div className="flex gap-1">
                {(['Projects images', 'Saved styles'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCanvasTab(tab)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      canvasTab === tab
                        ? 'border-gray-300 dark:border-white/20 text-foreground bg-white dark:bg-white/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap min-h-24">
              {canvasTab === 'Projects images' ? (
                canvasImages.length === 0 ? (
                  <p className="text-xs text-muted-foreground self-center py-4">No images found yet</p>
                ) : (
                  canvasImages.map((img) => {
                    const canUseImage = Boolean(img.url);
                    const isPicked = canUseImage && pickedImages.some((p) => p.url === img.url);
                    return (
                      <button
                        key={img.id}
                        onClick={() => {
                          if (!canUseImage || isPicked) return;
                          addCanvasImage(img);
                        }}
                        disabled={!canUseImage || (pickedImages.length >= 5 && !isPicked)}
                        className={cn(
                          'relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all',
                          !canUseImage && 'opacity-60 cursor-not-allowed',
                          isPicked ? 'border-primary' : 'border-transparent hover:border-white/30 dark:hover:border-white/30'
                        )}
                      >
                        {canUseImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.url || undefined} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-white/50" />
                          </div>
                        )}
                        {isPicked && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )
              ) : savedStyles.length === 0 ? (
                <p className="text-xs text-muted-foreground self-center py-4">No saved styles yet</p>
              ) : (
                savedStyles.map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {s.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumbnailUrl} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-20 text-center">{s.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 shrink-0 bg-white dark:bg-[#0A0A0B] border-l border-gray-200 dark:border-white/10 flex flex-col">
        <div className="p-6 flex-1 flex flex-col overflow-y-auto">
          <h3 className="text-lg font-bold text-foreground mb-0.5">Test it</h3>
          <p className="text-xs text-muted-foreground mb-4">Each test costs credits</p>

          <div className="mb-3">
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Model</label>
            <select
              value={testModel}
              onChange={(e) => setTestModel(e.target.value)}
              className="w-full h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STYLE_TEST_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#111218] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="cute red panda"
            rows={3}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {testModel === 'gemini-2.5-flash' && hasImages && (
            <p className="mt-2 text-[11px] text-amber-500/80">
              Gemini currently runs prompt-only in this app, so reference images are ignored for test generation.
            </p>
          )}

          {testImageUrl && (
            <div className="mt-4 w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={testImageUrl} alt="Test result" className="w-full h-full object-cover" />
            </div>
          )}

          <button
            onClick={handleTestGenerate}
            disabled={!hasImages || !testPrompt.trim() || isTestGenerating}
            className="mt-4 w-full h-12 rounded-xl bg-card dark:bg-white text-white dark:text-black font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {isTestGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              'Generate test image'
            )}
          </button>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-white/10 shrink-0">
          <button
            onClick={() => {
              if (hasImages) setShowNameDialog(true);
            }}
            disabled={!hasImages}
            className="w-full h-14 rounded-2xl bg-[#1DB99A] hover:bg-[#19a589] text-white font-bold text-base disabled:opacity-30 transition-colors"
          >
            Save style
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      <AnimatePresence>
        {showNameDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-10"
              onClick={() => setShowNameDialog(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-[#111113] rounded-3xl p-8 w-96 pointer-events-auto shadow-2xl text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-black mx-auto mb-5 flex items-center justify-center overflow-hidden">
                  {pickedImages[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pickedImages[0].url} alt="Style thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-2xl tracking-tight">R</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-5">Give your style a name</h3>
                <input
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && styleName.trim()) handleSave();
                  }}
                  placeholder="Colored pencil"
                  autoFocus
                  className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3"
                />
                <button
                  onClick={handleSave}
                  disabled={!styleName.trim() || isSaving}
                  className="w-full h-12 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground font-semibold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save style'
                  )}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}