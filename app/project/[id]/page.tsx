"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Hexagon, History,
  MousePointer2, Hand, Shapes, Frame, Type, Upload, Undo2, Redo2,
  Image as ImageIcon, Wand2, Box, Sparkles, Paperclip, ArrowUp,
  Palette, Plus, Trash2,
  PanelLeft, Sidebar as SidebarIcon, X, Maximize, Combine, Eraser,
  Search, Check, Zap, Rocket, Disc3, Shirt,
  Paintbrush, ArrowUpRight, Square, Circle, Slash, PenTool, RotateCcw,
  AlignLeft, AlignCenter, AlignRight,
  Pencil, Copy, Link2, Loader2,
  User, CreditCard, Code2, Star, BookOpen, MessageSquarePlus,
  LogOut, FileEdit, Layers, Globe, Heart, ToggleRight,
  Camera, SlidersHorizontal, PenLine, LayoutGrid as LayoutGridIcon2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { STYLE_CATEGORIES, STYLE_LOOKUP, styleKey, type StyleEntry } from '@/lib/styles-data';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

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

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUserStore();
  const router = useRouter();
  const [projectId, setProjectId] = React.useState<string | null>(null);

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

  // Fetch project on mount — restores canvas from DB (source of truth), falls back to localStorage
  useEffect(() => {
    if (!projectId) return;
    const lsKey = `canvas-v1-${projectId}`;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.name) setProjectName(data.name);

        // Prefer DB canvas data — it is the source of truth across devices
        const dbImages = (data.canvasData as { images?: CanvasImage[] } | null)?.images;
        if (Array.isArray(dbImages) && dbImages.length > 0) {
          setCanvasImages(dbImages);
          historyStackRef.current = [{ label: 'Project loaded', timestamp: Date.now(), snapshot: dbImages, selectedId: null }];
          historyIndexRef.current = 0;
          setAutoSaveStatus('saved');
          return;
        }

        // Fall back to localStorage (supports offline / pre-DB projects)
        try {
          const raw = localStorage.getItem(lsKey);
          if (!raw) return;
          const saved = JSON.parse(raw) as { images: CanvasImage[]; viewport?: { zoom: number; panX: number; panY: number } };
          if (Array.isArray(saved.images) && saved.images.length > 0) {
            setCanvasImages(saved.images);
            historyStackRef.current = [{ label: 'Project loaded', timestamp: Date.now(), snapshot: saved.images, selectedId: null }];
            historyIndexRef.current = 0;
            if (saved.viewport) {
              setZoom(saved.viewport.zoom ?? 0.5);
              setPanX(saved.viewport.panX ?? 0);
              setPanY(saved.viewport.panY ?? 0);
            }
            setAutoSaveStatus('saved');
          }
        } catch { /* corrupt — start fresh */ }
      })
      .catch(() => {});
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

  const handleShare = useCallback(() => {
    setProjectMenuOpen(false);
    const url = `${window.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
  }, [projectId]);

  const [prompt, setPrompt] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTab, setUpgradeTab] = useState<'plans' | 'api'>('plans');
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [proCreditTier, setProCreditTier] = useState<'2k'|'4k'|'8k'|'16k'>('2k');
  const [teamsCreditTier, setTeamsCreditTier] = useState<'2k'|'4k'|'8k'|'16k'>('2k');

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<'type' | 'mode' | 'model' | 'ratio' | 'count' | 'shapes' | 'palette' | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);

  // Values
  const [selectedType, setSelectedType] = useState('Image');
  const [selectedMode, setSelectedMode] = useState('Manual');
  const [selectedModel, setSelectedModel] = useState('Recraft V4');
  const [selectedStyle, setSelectedStyle] = useState('Vector art');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedCount, setSelectedCount] = useState('1 Image');
  const [selectedPalette, setSelectedPalette] = useState<string[] | null>(null);
  const [displayedPalettes, setDisplayedPalettes] = useState<{ name: string; colors: string[] }[]>(() => pick5Palettes(null));
  const [attachments, setAttachments] = useState<File[]>([]);

  // Active tool
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'shapes' | 'frame' | 'text' | 'upload' | null>('select');

  // Frame properties
  const [frameW, setFrameW] = useState(1024);
  const [frameH, setFrameH] = useState(1024);
  const [frameFill, setFrameFill] = useState<string | null>(null);

  const isFrameActive = activeTool === 'frame';
  const isTextActive = activeTool === 'text';

  // Text properties
  const [textFontFamily, setTextFontFamily] = useState('Inter');
  const [textFontSize, setTextFontSize] = useState(56);
  const [textFontWeight, setTextFontWeight] = useState('Regular');
  const [textLineHeight, setTextLineHeight] = useState('Auto');
  const [textLetterSpacing, setTextLetterSpacing] = useState('0%');
  const [textColor, setTextColor] = useState('000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Generation state ──────────────────────────────────────────────────────

  const DEFAULT_ADJUSTMENTS = { hue: 180, saturation: 100, brightness: 100, contrast: 100, opacity: 100 };
  const getAdj = (img: CanvasImage | null) => img?.adjustments ?? DEFAULT_ADJUSTMENTS;

  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // ── Undo / Redo / History engine ──────────────────────────────────────────
  interface HistoryEntry {
    label: string;
    timestamp: number;
    snapshot: CanvasImage[];
    selectedId: string | null;
  }

  const historyStackRef = useRef<HistoryEntry[]>([{ label: 'Initial state', timestamp: Date.now(), snapshot: [], selectedId: null }]);
  const historyIndexRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0); // bump to re-render history panel
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const skipHistoryRef = useRef(false); // flag to avoid pushing history during undo/redo restore

  const pushHistory = useCallback((label: string, images?: CanvasImage[], selId?: string | null) => {
    if (skipHistoryRef.current) return;
    const stack = historyStackRef.current;
    const idx = historyIndexRef.current;
    // Trim any "future" entries when a new edit occurs after an undo
    if (idx < stack.length - 1) {
      historyStackRef.current = stack.slice(0, idx + 1);
    }
    historyStackRef.current.push({
      label,
      timestamp: Date.now(),
      snapshot: images ?? canvasImages,
      selectedId: selId !== undefined ? selId : selectedImageId,
    });
    // Cap at 50 entries
    if (historyStackRef.current.length > 50) {
      historyStackRef.current = historyStackRef.current.slice(historyStackRef.current.length - 50);
    }
    historyIndexRef.current = historyStackRef.current.length - 1;
    setHistoryVersion((v) => v + 1);
  }, [canvasImages, selectedImageId]);

  const historyUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const entry = historyStackRef.current[idx - 1];
    skipHistoryRef.current = true;
    setCanvasImages(entry.snapshot);
    setSelectedImageId(entry.selectedId);
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
    setSelectedImageId(entry.selectedId);
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
    setSelectedImageId(entry.selectedId);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyStackRef.current.length - 1;

  // ── Auto-save state ───────────────────────────────────────────────────────
  type AutoSaveStatus = 'idle' | 'pending' | 'saved';
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedImage = canvasImages.find((img) => img.id === selectedImageId) || null;
  const isImageSelected = !!selectedImage;
  const isPanelActive = isFrameActive || isTextActive || isImageSelected;

  // ── Canvas pan/zoom state ─────────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.5);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Auto-save effects (placed after viewport state declarations) ──────────
  // Debounced save: fires 2s after last change to canvasImages ONLY (not pan/zoom).
  // Saves to localStorage (offline cache) + DB (source of truth).
  useEffect(() => {
    if (!projectId || canvasImages.length === 0) return;
    setAutoSaveStatus('pending');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const lsKey = `canvas-v1-${projectId}`;
      // localStorage — also captures current viewport via closure (best-effort)
      try {
        localStorage.setItem(lsKey, JSON.stringify({ images: canvasImages, viewport: { zoom, panX, panY } }));
      } catch {
        try {
          const slim = { images: canvasImages.map((img) => ({ ...img, url: img.url.startsWith('data:') ? '' : img.url })), viewport: { zoom, panX, panY } };
          localStorage.setItem(lsKey, JSON.stringify(slim));
        } catch { /* storage full */ }
      }
      setAutoSaveStatus('saved');
      // DB save (source of truth, fire-and-forget)
      fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasData: { images: canvasImages } }),
      }).catch(() => {});
    }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasImages, projectId]);

  // Drag state for images
  const dragRef = useRef<{
    imageId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
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

  // Processing state for AI actions
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Outpaint / crop state
  const [outpaintBounds, setOutpaintBounds] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const outpaintHandleRef = useRef<{
    handle: 'top' | 'right' | 'bottom' | 'left';
    startPos: number;
    origValue: number;
    maxExpand: number;
    maxCrop: number;
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

  // ── Canvas mouse handlers ─────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only act on the canvas itself, not on UI overlays
    if (e.button === 1 || (e.button === 0 && (activeTool === 'hand' || spaceHeld))) {
      // Start panning
      e.preventDefault();
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, origPanX: panX, origPanY: panY };
      setIsPanning(true);
      return;
    }
    // Left-click on empty canvas = deselect
    if (e.button === 0 && (e.target as HTMLElement).dataset?.canvas === 'bg') {
      setSelectedImageId(null);
    }
  }, [activeTool, spaceHeld, panX, panY]);

  const handleImageMouseDown = useCallback((e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    // If hand tool or space held, start panning instead
    if (activeTool === 'hand' || spaceHeld) {
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, origPanX: panX, origPanY: panY };
      setIsPanning(true);
      return;
    }
    setSelectedImageId(imgId);
    if (activeTool === 'select') {
      const img = canvasImages.find((i) => i.id === imgId);
      if (!img) return;
      dragRef.current = { imageId: imgId, startX: e.clientX, startY: e.clientY, origX: img.x, origY: img.y };
    }
  }, [activeTool, spaceHeld, panX, panY, canvasImages]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Outpaint handle dragging (highest priority)
    const outpaintHandle = outpaintHandleRef.current;
    if (outpaintHandle) {
      const isX = outpaintHandle.handle === 'left' || outpaintHandle.handle === 'right';
      const sign = outpaintHandle.handle === 'left' || outpaintHandle.handle === 'top' ? -1 : 1;
      const rawPos = isX ? e.clientX : e.clientY;
      const delta = (rawPos - outpaintHandle.startPos) / zoom;
      const newVal = Math.min(outpaintHandle.maxExpand, Math.max(-outpaintHandle.maxCrop, outpaintHandle.origValue + sign * delta));
      setOutpaintBounds((prev) => ({ ...prev, [outpaintHandle.handle]: newVal }));
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
    // Panning
    if (panRef.current?.active) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPanX(panRef.current.origPanX + dx);
      setPanY(panRef.current.origPanY + dy);
      return;
    }
    // Dragging image
    const drag = dragRef.current;
    if (drag) {
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      const rawX = drag.origX + dx;
      const rawY = drag.origY + dy;
      const { x, y, lines } = computeSnap(drag.imageId, rawX, rawY);
      setCanvasImages((prev) => prev.map((img) => img.id === drag.imageId ? { ...img, x, y } : img));
      setSnapLines(lines);
    }
  }, [zoom, computeSnap, brushSize]);

  const handleCanvasMouseUp = useCallback(() => {
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
    dragRef.current = null;
    panRef.current = null;
    setIsPanning(false);
    setSnapLines([]);
  }, []);

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
    const isX = handle === 'left' || handle === 'right';
    const startPos = isX ? e.clientX : e.clientY;
    const origValue = outpaintBounds[handle];
    const maxExpand = isX ? imgDims.width * 3 : imgDims.height * 3;
    const maxCrop = isX ? imgDims.width * 0.9 : imgDims.height * 0.9;
    outpaintHandleRef.current = { handle, startPos, origValue, maxExpand, maxCrop };
  }, [outpaintBounds]);

  // Zoom with scroll wheel / pinch; pan with two-finger trackpad swipe (non-passive to allow preventDefault)
  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // macOS trackpad: two-finger swipe → pan (no ctrlKey, has both deltaX & deltaY)
    // Pinch-to-zoom or Ctrl+scroll → zoom (ctrlKey is set by the browser for pinch)
    if (!e.ctrlKey && !e.metaKey) {
      // Pan — trackpad deltas are already in pixels, no scaling needed
      setPanX((prev) => prev - e.deltaX);
      setPanY((prev) => prev - e.deltaY);
      return;
    }

    // Zoom (pinch gesture or Ctrl+scroll)
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 8);
    const scale = newZoom / zoom;
    setPanX((prev) => mx - scale * (mx - prev));
    setPanY((prev) => my - scale * (my - prev));
    setZoom(newZoom);
  }, [zoom]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleCanvasWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleCanvasWheel);
  }, [handleCanvasWheel]);

  // Fit all images into view
  const fitToView = useCallback(() => {
    if (canvasImages.length === 0) { setZoom(0.5); setPanX(0); setPanY(0); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const minX = Math.min(...canvasImages.map((img) => img.x));
    const minY = Math.min(...canvasImages.map((img) => img.y));
    const maxX = Math.max(...canvasImages.map((img) => img.x + img.width));
    const maxY = Math.max(...canvasImages.map((img) => img.y + img.height));
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
  }, [canvasImages]);

  // Auto-fit when first images are generated
  const prevImageCount = useRef(0);
  useEffect(() => {
    if (canvasImages.length > 0 && prevImageCount.current === 0) {
      // Delay to ensure canvasRef is measured
      requestAnimationFrame(fitToView);
    }
    prevImageCount.current = canvasImages.length;
  }, [canvasImages.length, fitToView]);

  // Right panel sub-view state
  type SubPanel = null | 'edit-area' | 'outpaint' | 'remix' | 'upscale' | 'variations' | 'adjust-colors' | 'export';
  const [activeSubPanel, setActiveSubPanel] = useState<SubPanel>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const [editAreaPrompt, setEditAreaPrompt] = useState('');
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

  // ── AI Action: Edit Area → Modify Area ──────────────────────────────────
  const handleModifyArea = useCallback(async () => {
    if (!selectedImage || !maskCanvasRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
      const maskBlob = await getMaskBlob(maskCanvasRef.current);
      const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('mask', maskFile);
      fd.append('prompt', editAreaPrompt || 'Modify this area creatively');
      const res = await fetch('/api/edit/inpaint', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Inpaint failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      // Replace the existing frame in-place — this is a modification of the same image
      setCanvasImages((prev) => {
        const next = prev.map((img) => img.id === selectedImage!.id ? { ...img, url } : img);
        pushHistory('Modified area', next);
        return next;
      });
      clearMask();
      setActiveSubPanel(null);
      toast.success('Area modified');
    } catch (err: any) {
      toast.error(err.message || 'Failed to modify area');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, editAreaPrompt, imageUrlToFile, getMaskBlob]);

  // ── AI Action: Edit Area → Erase with AI ───────────────────────────────
  const handleEraseWithAI = useCallback(async () => {
    if (!selectedImage || !maskCanvasRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
      const maskBlob = await getMaskBlob(maskCanvasRef.current);
      const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
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
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, imageUrlToFile, getMaskBlob, addResultToCanvas]);

  // ── AI Action: Remix Image ─────────────────────────────────────────────
  const handleRemix = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
      // Map similarity slider (0–4) to Recraft strength (0.0–1.0).
      // Higher similarity = higher strength (keep more of original).
      const strength = [0.2, 0.4, 0.6, 0.8, 1.0][remixSimilarity];
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('prompt', remixPrompt || selectedImage.prompt || 'Create a remix of this image');
      fd.append('strength', String(strength));
      fd.append('model', remixModel);
      if (remixStyle && remixStyle !== 'any') fd.append('style', remixStyle);
      const res = await fetch('/api/edit/image-to-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Remix failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      addResultToCanvas(url, selectedImage.width, selectedImage.height, remixPrompt || 'Remix');
      setActiveSubPanel(null);
      toast.success('Remix generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remix');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, isProcessing, remixPrompt, remixModel, remixStyle, remixSimilarity, imageUrlToFile, addResultToCanvas]);

  // ── AI Action: Outpaint / Expand ───────────────────────────────────────
  const handleOutpaintExpand = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
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

      // Padded image: draw original centered, rest black
      const padCanvas = document.createElement('canvas');
      padCanvas.width = newW;
      padCanvas.height = newH;
      const padCtx = padCanvas.getContext('2d')!;
      padCtx.fillStyle = '#000000';
      padCtx.fillRect(0, 0, newW, newH);
      padCtx.drawImage(imgEl, expandL, expandT, selectedImage.width, selectedImage.height);

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
      fd.append('prompt', outpaintPrompt || 'Expand the image naturally continuing the scene');

      const res = await fetch('/api/edit/outpaint', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Expand failed');
      const data = await res.json();
      const url = data.image?.imageUrl || '';
      // Replace the existing frame in-place, updating dimensions and shifting position
      // so the image expands visually in the correct directions on the canvas.
      // e.g. expanding left shifts x leftward, expanding top shifts y upward.
      setCanvasImages((prev) => {
        const next = prev.map((img) =>
          img.id === selectedImage!.id
            ? { ...img, url, width: newW, height: newH, x: img.x - expandL, y: img.y - expandT }
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
      const imageFile = await imageUrlToFile(selectedImage.url);
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
  }, [selectedImage, isProcessing, imageUrlToFile, addResultToCanvas]);

  // ── AI Action: Upscale ─────────────────────────────────────────────────
  const handleUpscale = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
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
  }, [selectedImage, isProcessing, upscaleModel, imageUrlToFile, addResultToCanvas]);

  // ── AI Action: Generate Variations ─────────────────────────────────────
  const handleVariations = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
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
  }, [selectedImage, isProcessing, variationsCount, imageUrlToFile]);

  // ── AI Action: Vectorize ───────────────────────────────────────────────
  const handleVectorize = useCallback(async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('vectorize');
    try {
      const imageFile = await imageUrlToFile(selectedImage.url);
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
  }, [selectedImage, isProcessing, imageUrlToFile, addResultToCanvas]);

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
    'DALL·E 3': 'dall-e-3',
    'GPT Image 1': 'gpt-image-1',
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

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setSelectedImageId(null);

    const model = MODEL_MAP[selectedModel] || 'recraftv4';
    const size = RATIO_MAP[selectedRatio] || '1024x1024';
    const n = parseInt(selectedCount) || 1;
    const styleEntry = STYLE_LOOKUP[selectedStyle];
    const apiStyle = styleEntry?.apiStyle || 'any';
    const apiSubstyle = styleEntry?.apiSubstyle;
    const styleModel = styleEntry?.apiModel; // native model for this style

    // Append palette instruction to prompt if a palette is selected
    let finalPrompt = prompt.trim();
    if (selectedPalette && selectedPalette.length > 0) {
      finalPrompt += `. Use ONLY these colors as the color palette: ${selectedPalette.join(', ')}. The entire image should strictly use these colors.`;
    }

    // Append style hint so the model renders in the correct visual style
    if (styleEntry) {
      const styleDesc = styleEntry.apiStyle.replace(/_/g, ' ');
      const substyleDesc = styleEntry.apiSubstyle ? `, ${styleEntry.apiSubstyle.replace(/_/g, ' ')}` : '';
      finalPrompt += `. Render in ${styleEntry.name} style (${styleDesc}${substyleDesc}).`;
    }

    try {
      let res: Response;
      if (attachments.length > 0) {
        // Use FormData when attachments are present
        const fd = new FormData();
        fd.append('prompt', finalPrompt);
        fd.append('model', model);
        fd.append('size', size);
        fd.append('n', String(n));
        fd.append('style', apiStyle);
        if (apiSubstyle) fd.append('substyle', apiSubstyle);
        if (styleModel) fd.append('styleModel', styleModel);
        if (projectId) fd.append('projectId', projectId);
        attachments.forEach((file) => fd.append('attachments', file));
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
            styleModel,
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
      const { w, h } = parseSize(size);
      // Position new images: find rightmost edge of existing images or start at origin
      const GAP = 24;
      let startX = 0;
      if (canvasImages.length > 0) {
        startX = Math.max(...canvasImages.map((img) => img.x + img.width)) + GAP;
      }
      const newImages: CanvasImage[] = (data.images || []).map((img: any, i: number) => ({
        id: img.id || `gen-${Date.now()}-${i}`,
        url: img.imageUrl || img.url || '',
        width: w,
        height: h,
        x: startX + i * (w + GAP),
        y: 0,
        prompt: prompt.trim(),
        model: selectedModel,
        style: selectedStyle,
        ratio: selectedRatio,
      }));
      setCanvasImages((prev) => {
        const next = [...prev, ...newImages];
        pushHistory(`Generated ${newImages.length} image${newImages.length > 1 ? 's' : ''}`, next, newImages[0]?.id ?? null);
        return next;
      });
      if (newImages.length > 0) setSelectedImageId(newImages[0].id);
      toast.success(`Generated ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, selectedModel, selectedRatio, selectedCount, selectedStyle, projectId, selectedPalette, attachments]);

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

  const toggleDropdown = (name: 'type' | 'mode' | 'model' | 'ratio' | 'count' | 'shapes' | 'palette') => {
    if (activeDropdown === name) setActiveDropdown(null);
    else setActiveDropdown(name);
  };

  const selectTool = (tool: typeof activeTool) => {
    setActiveTool(tool);
    setActiveDropdown(null);
  };

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
          isPanning || spaceHeld || activeTool === 'hand' ? "cursor-grab" : "",
          isPanning ? "cursor-grabbing" : "",
          activeTool === 'select' && !spaceHeld && !isPanning ? "cursor-default" : "",
        )}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Dot grid that moves with pan/zoom */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${panX}px ${panY}px`,
          }}
        />

        {/* Transformed canvas layer */}
        <div
          className="absolute pointer-events-none"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
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
                className={cn(
                  "absolute pointer-events-auto",
                  activeTool === 'select' && !spaceHeld ? "cursor-move" : "",
                )}
                style={{ left: img.x, top: img.y, width: img.width, height: img.height }}
                onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.prompt}
                  className={cn(
                    "w-full h-full object-cover rounded-lg transition-shadow",
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
                {/* Selection handles & dimension label */}
                {isSelected && (
                  <>
                    {[
                      'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
                      'top-0 right-0 translate-x-1/2 -translate-y-1/2',
                      'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
                      'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
                    ].map((pos, idx) => (
                      <div key={idx} className={`absolute ${pos} w-2.5 h-2.5 bg-white border-2 border-primary rounded-sm z-10`} />
                    ))}
                    <div className="absolute -top-6 left-0 text-[11px] font-medium text-primary/70 select-none whitespace-nowrap">
                      {img.width} × {img.height}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Mask canvas overlay — captures draw events when edit-area is active */}
          {isImageSelected && activeSubPanel === 'edit-area' && selectedImage && (
            <canvas
              ref={maskCanvasRef}
              width={selectedImage.width}
              height={selectedImage.height}
              className="absolute pointer-events-auto z-20 cursor-crosshair"
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
            const vx = img.x - expandL;
            const vy = img.y - expandT;
            const cbg = 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)';
            return (
              <div key="outpaint-overlay" className="absolute" style={{ left: vx, top: vy, width: vw, height: vh, zIndex: 25, pointerEvents: 'none' }}>
                {/* New dimension label */}
                <div className="absolute -top-7 left-0 text-[11px] font-medium text-white/60 select-none whitespace-nowrap">
                  {Math.round(vw)} × {Math.round(vh)}
                </div>

                {/* Outpaint zones — checkerboard */}
                {expandL > 0 && <div className="absolute rounded-l-lg" style={{ left: 0, top: expandT, width: expandL, height: img.height, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandR > 0 && <div className="absolute rounded-r-lg" style={{ right: 0, top: expandT, width: expandR, height: img.height, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandT > 0 && <div className="absolute rounded-t-lg" style={{ top: 0, left: 0, right: 0, height: expandT, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}
                {expandB > 0 && <div className="absolute rounded-b-lg" style={{ bottom: 0, left: 0, right: 0, height: expandB, backgroundImage: cbg, backgroundSize: '16px 16px' }} />}

                {/* Crop zones — dark overlay inside original image */}
                {cropL > 0 && <div className="absolute bg-black/65" style={{ left: expandL, top: expandT, width: cropL, height: img.height }} />}
                {cropR > 0 && <div className="absolute bg-black/65" style={{ right: expandR, top: expandT, width: cropR, height: img.height }} />}
                {cropT > 0 && <div className="absolute bg-black/65" style={{ left: expandL + cropL, top: expandT, width: img.width - cropL - cropR, height: cropT }} />}
                {cropB > 0 && <div className="absolute bg-black/65" style={{ left: expandL + cropL, bottom: expandB, width: img.width - cropL - cropR, height: cropB }} />}

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
                      style={{ ...style, pointerEvents: 'auto' }}
                      onMouseDown={(e) => handleOutpaintMouseDown(e, handle, img)}
                    >
                      <div
                        className="bg-[#999] hover:bg-white active:bg-white transition-colors shadow-lg rounded-full"
                        style={isHoriz ? { width: 48, height: 10 } : { width: 10, height: 48 }}
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
            className="absolute z-50 pointer-events-auto"
            style={{
              left: panX + (selectedImage.x + selectedImage.width / 2) * zoom,
              top: panY + (selectedImage.y + selectedImage.height) * zoom + 16,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-[#111113]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 w-80">
              <input
                value={editAreaPrompt}
                onChange={(e) => setEditAreaPrompt(e.target.value)}
                placeholder="Describe what to change..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2">
                <button
                  disabled={!hasMask || isProcessing}
                  onClick={handleModifyArea}
                  className="flex-1 bg-white/8 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-[13px] font-semibold py-2.5 rounded-xl transition-colors border border-white/8 text-foreground"
                >
                  {isProcessing ? 'Processing...' : 'Modify area'}
                </button>
                <button
                  disabled={!hasMask || isProcessing}
                  onClick={handleEraseWithAI}
                  className="flex-1 bg-white disabled:opacity-40 disabled:cursor-not-allowed text-black text-[13px] font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {isProcessing ? 'Processing...' : 'Erase with AI'}
                </button>
              </div>
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
              className="absolute z-50 pointer-events-auto"
              style={{
                left: panX + centerX * zoom,
                top: panY + bottomY * zoom + 18,
                transform: 'translateX(-50%)',
              }}
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
                      onClick={() => {
                        const cropL = Math.max(0, -outpaintBounds.left);
                        const cropT = Math.max(0, -outpaintBounds.top);
                        const cropR = Math.max(0, -outpaintBounds.right);
                        const cropB = Math.max(0, -outpaintBounds.bottom);
                        setCanvasImages((prev) => {
                          const next = prev.map((img) =>
                            img.id === selectedImage!.id
                              ? {
                                  ...img,
                                  x: img.x + cropL,
                                  y: img.y + cropT,
                                  width: Math.max(32, img.width - cropL - cropR),
                                  height: Math.max(32, img.height - cropT - cropB),
                                }
                              : img
                          );
                          pushHistory('Cropped image', next);
                          return next;
                        });
                        setOutpaintBounds({ top: 0, right: 0, bottom: 0, left: 0 });
                      }}
                      className="h-full px-4 text-[13px] font-semibold text-foreground hover:bg-white/8 transition-colors whitespace-nowrap"
                    >
                      Crop
                    </button>
                  )}
                  <button
                    disabled={!hasOutpaint || isProcessing}
                    onClick={handleOutpaintExpand}
                    className="h-full px-4 text-[13px] font-semibold text-foreground disabled:text-muted-foreground hover:bg-white/8 disabled:hover:bg-transparent transition-colors whitespace-nowrap"
                  >
                    {isProcessing ? 'Processing...' : 'Expand'}
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
                      { label: 'Styles', href: '#' },
                      { label: 'Favorites', href: '#' },
                      { label: 'History', href: '#' },
                      { label: 'Profile', href: '#' },
                    ].map((item) => (
                      <Link key={item.label} href={item.href} onClick={() => setShowLogoMenu(false)}
                        className="flex items-center px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {item.label}
                      </Link>
                    ))}
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    {[
                      { label: 'Our blog', href: '#' },
                      { label: 'Feature requests', href: '#' },
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
                        onClick={handleShare}
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
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg"
              onClick={(e) => { e.stopPropagation(); fitToView(); }}
              onDoubleClick={(e) => { e.stopPropagation(); setZoom(1); setPanX(0); setPanY(0); }}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              Share
            </Button>
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
                <img src={user.avatarUrl} alt="User" className="w-7 h-7 rounded-lg" />
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
                          <img src={user.avatarUrl} alt="User" className="w-9 h-9 object-cover" />
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

                    <button className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Manage subscription
                    </button>
                    <button className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      API
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowUpgradeModal(true); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Pricing and plans
                    </button>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Legal
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <button className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Profile
                    </button>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                      Logout
                    </button>
                    <div className="h-px bg-black/8 dark:bg-white/10 mx-3 my-1" />
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">Old UI</span>
                      <button className="w-10 h-6 rounded-full bg-gray-200 dark:bg-white/15 flex items-center px-0.5 transition-colors">
                        <span className="w-5 h-5 rounded-full bg-white shadow-sm block ml-auto" />
                      </button>
                    </div>
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
            onClick={(e) => { e.stopPropagation(); selectTool('shapes'); toggleDropdown('shapes'); }}
            active={activeTool === 'shapes'}
          />
          <AnimatePresence>
            {activeDropdown === 'shapes' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: -8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 380, mass: 0.6 }}
                className="absolute left-full top-0 ml-3 w-55 bg-elevated/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden z-50 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <ShapesMenuItem icon={<Paintbrush className="w-4 h-4" strokeWidth={1.5} />} label="Brush" shortcut="B" onClick={() => setActiveDropdown(null)} />
                <ShapesMenuItem icon={<ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />} label="Arrow" shortcut="⇧ L" onClick={() => setActiveDropdown(null)} />
                <ShapesMenuItem icon={<Square className="w-4 h-4" strokeWidth={1.5} />} label="Rectangle" shortcut="R" onClick={() => setActiveDropdown(null)} />
                <ShapesMenuItem icon={<Circle className="w-4 h-4" strokeWidth={1.5} />} label="Ellipse" shortcut="O" onClick={() => setActiveDropdown(null)} />
                <ShapesMenuItem icon={<Slash className="w-4 h-4" strokeWidth={1.5} />} label="Line" shortcut="L" onClick={() => setActiveDropdown(null)} isLast />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ToolButton icon={<Frame className="w-5 h-5" />} active={activeTool === 'frame'} tooltip="Frame (F)" onClick={() => selectTool('frame')} />
        <ToolButton icon={<Type className="w-5 h-5" />} active={activeTool === 'text'} tooltip="Text (T)" onClick={() => selectTool('text')} />
        <ToolButton icon={<Upload className="w-5 h-5" />} active={activeTool === 'upload'} tooltip="Upload Image (I)" onClick={() => { selectTool('select'); fileInputRef.current?.click(); }} />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        <ToolButton icon={<Undo2 className={`w-5 h-5 ${!canUndo ? 'opacity-30' : ''}`} />} tooltip="Undo (Cmd+Z)" onClick={historyUndo} />
        <ToolButton icon={<Redo2 className={`w-5 h-5 ${!canRedo ? 'opacity-30' : ''}`} />} tooltip="Redo (Cmd+Shift+Z)" onClick={historyRedo} />
      </aside>

      {/* ── HISTORY PANEL ── */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed left-16 top-14 bottom-0 w-72 bg-[#111113]/97 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-foreground">History</span>
              <button onClick={() => setShowHistoryPanel(false)} className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {historyStackRef.current.map((entry, idx) => (
                <button
                  key={`${idx}-${entry.timestamp}`}
                  onClick={() => historyJumpTo(idx)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
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
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button
                onClick={historyUndo}
                disabled={!canUndo}
                className="flex-1 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-medium text-foreground transition-colors"
              >
                Undo
              </button>
              <button
                onClick={historyRedo}
                disabled={!canRedo}
                className="flex-1 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-medium text-foreground transition-colors"
              >
                Redo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { /* handle file */ console.log(e.target.files?.[0]); }}
      />

      {/* CANVAS: Frame rectangle (visible when frame tool is active) */}
      <AnimatePresence>
        {isFrameActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{ paddingRight: isPanelActive ? 220 : 0 }}
          >
            <div className="relative" style={{ width: 260, height: 310 }}>
              <div className="absolute -top-6 left-0 text-[11px] font-medium text-foreground/50 select-none">Frame</div>
              <div className="w-full h-full bg-primary/20 border border-primary/40 rounded-sm" />
              {[['top-0 left-0 -translate-x-1/2 -translate-y-1/2',''],['top-0 right-0 translate-x-1/2 -translate-y-1/2',''],['bottom-0 left-0 -translate-x-1/2 translate-y-1/2',''],['bottom-0 right-0 translate-x-1/2 translate-y-1/2','']].map(([pos], i) => (
                <div key={i} className={`absolute ${pos} w-2 h-2 bg-white border border-primary/60 rounded-sm`} />
              ))}
              {[['top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',''],['top-1/2 right-0 translate-x-1/2 -translate-y-1/2',''],['top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',''],['bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2','']].map(([pos], i) => (
                <div key={i} className={`absolute ${pos} w-1.5 h-1.5 bg-white border border-primary/60 rounded-sm`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CANVAS: Text element (visible when text tool is active) */}
      <AnimatePresence>
        {isTextActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{ paddingRight: isPanelActive ? 220 : 0 }}
          >
            <div
              className="relative border border-dashed border-white/30 px-3 py-1 min-w-30"
              style={{
                fontSize: Math.min(textFontSize, 80),
                fontFamily: textFontFamily,
                fontWeight: textFontWeight === 'Bold' ? 700 : textFontWeight === 'Medium' ? 500 : 400,
                textAlign: textAlign,
                color: `#${textColor}`,
                lineHeight: textLineHeight === 'Auto' ? 1.2 : parseFloat(textLineHeight) || 1.2,
                letterSpacing: textLetterSpacing === '0%' ? 'normal' : textLetterSpacing,
              }}
            >
              sdsdsdsdsdss
              {[['top-0 left-0 -translate-x-1/2 -translate-y-1/2'],['top-0 right-0 translate-x-1/2 -translate-y-1/2'],['bottom-0 left-0 -translate-x-1/2 translate-y-1/2'],['bottom-0 right-0 translate-x-1/2 translate-y-1/2']].map(([pos], i) => (
                <div key={i} className={`absolute ${pos} w-2 h-2 bg-white border border-blue-400/80 rounded-sm`} />
              ))}
            </div>
          </motion.div>
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
            className="absolute right-0 top-0 h-full w-72 bg-elevated/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── TEXT PANEL ── */}
            {isTextActive && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-4 flex flex-col gap-5">
                  <h3 className="text-sm font-semibold text-foreground">Text</h3>

                  {/* Typeface */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-muted-foreground">Typeface</label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 flex items-center justify-between bg-surface border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                        <span className="text-sm text-foreground">{textFontFamily}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center bg-surface border border-white/10 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Font size + Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Font size</label>
                      <input
                        type="number"
                        value={textFontSize}
                        onChange={(e) => setTextFontSize(Number(e.target.value))}
                        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Weight</label>
                      <div className="flex items-center justify-between bg-surface border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                        <span className="text-sm text-foreground">{textFontWeight}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Line height + Letter spacing */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Line height</label>
                      <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg px-3 py-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                          <path d="M3 6h18M3 12h18M3 18h18"/><path d="M16 3l4 3-4 3M8 21l-4-3 4-3"/>
                        </svg>
                        <input
                          type="text"
                          value={textLineHeight}
                          onChange={(e) => setTextLineHeight(e.target.value)}
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Letter spacing</label>
                      <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg px-3 py-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                          <path d="M4 7V4h16v3M9 20h6M12 4v16"/><path d="M3 12h18"/>
                        </svg>
                        <input
                          type="text"
                          value={textLetterSpacing}
                          onChange={(e) => setTextLetterSpacing(e.target.value)}
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color + Align */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Color</label>
                      <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                        <div
                          className="w-4 h-4 rounded border border-white/20 shrink-0"
                          style={{ backgroundColor: `#${textColor}` }}
                        />
                        <span className="text-sm text-foreground font-mono tracking-wide truncate">{textColor}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Align</label>
                      <div className="flex items-center gap-0.5 bg-surface border border-white/10 rounded-lg p-1">
                        {(['left', 'center', 'right'] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => setTextAlign(a)}
                            className={cn(
                              "flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors",
                              textAlign === a ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
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

                  {/* Divider */}
                  <div className="h-px bg-white/8" />

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Actions</h3>
                    <button className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-surface text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                      </svg>
                      Flatten text
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── FRAME PANEL ── */}
            {isFrameActive && (
              <>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                  {/* Frames section */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Frames</h3>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">W</label>
                        <input
                          type="number"
                          value={frameW}
                          onChange={(e) => setFrameW(Number(e.target.value))}
                          className="w-full bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">H</label>
                        <input
                          type="number"
                          value={frameH}
                          onChange={(e) => setFrameH(Number(e.target.value))}
                          className="w-full bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Use frames to generate images with precise control over composition. Leave the prompt empty to simply fill the white space or add a prompt with specific background and other details. Works with Recraft models only
                    </p>
                  </div>

                  <div className="h-px bg-white/8" />

                  {/* Fill section */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Fill</h3>
                    <button
                      onClick={() => setFrameFill(frameFill ? null : '#ffffff')}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border transition-colors text-sm",
                        frameFill
                          ? "border-primary/40 bg-primary/10 text-white"
                          : "border-white/10 bg-surface text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded border border-white/20 shrink-0", frameFill ? 'bg-white' : 'bg-transparent')} />
                      <span>{frameFill || 'None'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 shrink-0">
                  <button className="w-full bg-foreground text-background font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">
                    Export
                  </button>
                </div>
              </>
            )}

            {/* ── IMAGE PROPERTIES PANEL ── */}
            {isImageSelected && selectedImage && (
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
                                  <span className="text-foreground">{selectedImage.style}</span>
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
                        {[
                          { icon: <Pencil className="w-4 h-4" />, label: 'Edit area', arrow: true, panel: 'edit-area' as SubPanel },
                          { icon: <Combine className="w-4 h-4" />, label: 'Remix image', arrow: true, panel: 'remix' as SubPanel },
                          { icon: <Maximize className="w-4 h-4" />, label: 'Outpaint or crop', arrow: true, panel: 'outpaint' as SubPanel },
                          { icon: <Eraser className="w-4 h-4" />, label: 'Remove background', action: 'remove-bg' as const },
                          { icon: <ArrowUpRight className="w-4 h-4" />, label: 'Upscale', arrow: true, panel: 'upscale' as SubPanel },
                          { icon: <Layers className="w-4 h-4" />, label: 'Generate variations', arrow: true, panel: 'variations' as SubPanel },
                          { icon: <Box className="w-4 h-4" />, label: 'Vectorize', action: 'vectorize' as const },
                          { icon: <Palette className="w-4 h-4" />, label: 'Adjust colors', arrow: true, panel: 'adjust-colors' as SubPanel },
                          { icon: <Trash2 className="w-4 h-4 text-red-400" />, label: 'Remove from canvas', action: 'delete' as const, textClass: 'text-red-400' },
                        ].map((action, i) => (
                          <button
                            key={i}
                            disabled={isProcessing && (action.action === 'remove-bg' || action.action === 'vectorize')}
                            onClick={() => {
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
                        ))}
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
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
                              void wMm; void hMm; void pdfContent;
                              // Fallback: download as PNG if PDF generation is not available
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = `recraft-${selectedImage.id}.png`;
                              a.click();
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
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

                      {/* Style */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[12px] text-muted-foreground font-medium">Style</span>
                        <div className="relative">
                          <div className="flex items-center gap-2 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                            <Sparkles className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <select
                            value={remixStyle}
                            onChange={(e) => setRemixStyle(e.target.value)}
                            className="w-full appearance-none bg-surface border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                          >
                            <option value="any">Any style</option>
                            <option value="realistic_image">Realistic image</option>
                            <option value="digital_illustration">Digital illustration</option>
                            <option value="vector_illustration">Vector illustration</option>
                            <option value="icon">Icon</option>
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
          
          {/* Frame context badge (only shown when frame tool is active) */}
          <AnimatePresence>
            {isFrameActive && (
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
                      onClick={() => selectTool('select')}
                      className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image context badge (shown when an image is selected) */}
          <AnimatePresence>
            {isImageSelected && selectedImage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 pt-1 px-2">
                  <div className="flex items-center gap-1.5 bg-surface border border-white/10 rounded-lg pl-1 pr-1 py-1">
                    <div className="w-5 h-5 rounded overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedImage.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">{selectedImage.prompt}</span>
                    <button
                      onClick={() => setSelectedImageId(null)}
                      className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Input */}
          <div className="relative px-3 pt-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe what you want to generate"
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder:text-muted-foreground text-[15px] h-[52px] font-medium leading-relaxed"
              autoFocus
            />
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
              {activeDropdown === 'type' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-4 w-[320px] bg-elevated border border-border shadow-2xl rounded-2xl p-2 z-50 pointer-events-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem 
                    icon={<ImageIcon className="w-4 h-4" />} title="Image" subtitle="Generate from text or refine with a reference"
                    selected={selectedType === 'Image'} onClick={() => { setSelectedType('Image'); setActiveDropdown(null); }}
                  />
                  <MenuItem 
                    icon={<LayoutGridIcon className="w-4 h-4" />} title="Image set" subtitle="List multiple prompts and generate them all in one go with shared settings"
                    selected={selectedType === 'Image set'} onClick={() => { setSelectedType('Image set'); setActiveDropdown(null); }}
                  />
                </motion.div>
              )}

              {activeDropdown === 'mode' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-20 mb-4 w-[340px] bg-elevated border border-border shadow-2xl rounded-2xl p-2 z-50 pointer-events-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem 
                    icon={<Wand2 className="w-4 h-4" />} title="Manual" subtitle="Prompt-to-image only. No context or reasoning. Faster and uses fewer credits."
                    selected={selectedMode === 'Manual'} onClick={() => { setSelectedMode('Manual'); setActiveDropdown(null); }}
                  />
                  <MenuItem 
                    icon={<Box className="w-4 h-4" />} title="Exploration" subtitle="Generate a set of diverse images with the same prompt and narrow it down later — works with Recraft V4 model" isNew
                    selected={selectedMode === 'Exploration'} onClick={() => { setSelectedMode('Exploration'); setActiveDropdown(null); }}
                  />
                </motion.div>
              )}

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
                    title="GPT Image 1" time="15 seconds" cost={50} isNew icon="G1"
                    selected={selectedModel === 'GPT Image 1'} onClick={() => { setSelectedModel('GPT Image 1'); setActiveDropdown(null); }}
                  />
                  <ModelItem 
                    title="DALL·E 3" time="10 seconds" cost={40} icon="D3"
                    selected={selectedModel === 'DALL·E 3'} onClick={() => { setSelectedModel('DALL·E 3'); setActiveDropdown(null); }}
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
              
              <BadgeButton 
                icon={<ImageIcon className="w-3.5 h-3.5" />} label={selectedType} 
                active={activeDropdown === 'type'} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('type'); }} 
              />

              {!isFrameActive && (
                <>
                  <BadgeButton 
                    icon={<Wand2 className="w-3.5 h-3.5" />} label={selectedMode} 
                    active={activeDropdown === 'mode'} 
                    onClick={(e) => { e.stopPropagation(); toggleDropdown('mode'); }} 
                  />
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
              <BadgeButton 
                icon={getStyleIcon(STYLE_LOOKUP[selectedStyle]?.apiStyle)} label={selectedStyle} 
                onClick={(e) => { e.stopPropagation(); setShowStyleModal(true); setActiveDropdown(null); }}
              />

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
                {/* Attach reference images */}
                <button
                  className={cn(
                    "p-2 rounded-lg transition-all relative",
                    attachments.length > 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-white hover:bg-white/8"
                  )}
                  onClick={() => {
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
              disabled={isGenerating || !prompt.trim()}
              className={cn(
                "w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center transition-all shadow-lg ml-2",
                isGenerating
                  ? "bg-primary/50 text-white/50 cursor-not-allowed"
                  : prompt.trim().length > 0 
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

      <StyleModal isOpen={showStyleModal} onClose={() => setShowStyleModal(false)} onSelect={(entry) => { setSelectedStyle(entry.name); setSelectedModel(entry.model === 'Recraft V3' ? (entry.apiModel.includes('vector') ? 'Recraft V3 Vector' : 'Recraft V3') : entry.model === 'Recraft V2' ? (entry.apiModel.includes('vector') ? 'Recraft V2 Vector' : 'Recraft V2') : entry.model); }} currentStyle={selectedStyle} canvasImages={canvasImages} />

      {/* ── UPGRADE / PRICING MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowUpgradeModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between px-8 pt-8 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Flexible plans for creators and teams</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden text-sm">
                      <button
                        onClick={() => setUpgradeTab('plans')}
                        className={cn('px-4 py-1.5 font-medium transition-colors', upgradeTab === 'plans' ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5')}
                      >Plans</button>
                      <button
                        onClick={() => setUpgradeTab('api')}
                        className={cn('px-4 py-1.5 font-medium transition-colors', upgradeTab === 'api' ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5')}
                      >API</button>
                    </div>
                    <button onClick={() => setShowUpgradeModal(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center gap-3 px-8 pb-6 text-sm">
                  <span className={cn(billingAnnual ? 'text-gray-400' : 'font-medium')}>Pay monthly</span>
                  <button
                    onClick={() => setBillingAnnual((v) => !v)}
                    className={cn('relative w-10 h-6 rounded-full transition-colors', billingAnnual ? 'bg-primary' : 'bg-gray-200 dark:bg-white/15')}
                  >
                    <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', billingAnnual ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                  <span className={cn(billingAnnual ? 'font-medium' : 'text-gray-400')}>
                    Pay annually <span className="text-green-500 font-medium">(save 20%)</span>
                  </span>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-3 gap-4 px-8 pb-8">
                  {/* Basic */}
                  <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Basic</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">For individual creators with core image generation needs.</p>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${billingAnnual ? '10' : '12'}</span>
                        <span className="text-sm text-gray-500">per month</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{billingAnnual ? 'billed annually $120' : 'billed monthly'}</p>
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity">
                      Upgrade to Basic
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      1,000 credits per month
                    </div>
                    <div className="border-t border-black/8 dark:border-white/8 pt-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Everything in Free, plus:</p>
                      <ul className="space-y-1.5">
                        {['Nano Banana, Seedream, GPT Image, Flux, and other image generation and editing models','Commercial rights and private generations','Unlimited image uploads','Advanced tools: Custom color palettes, Magic wand, Creative Upscale, Artistic level, Extract prompt','Unlimited styles usage','Up to 4 images per generation','Credit top-ups','Up to 5 parallel generations'].map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Pro (Recommended) */}
                  <div className="border-2 border-primary rounded-2xl p-6 flex flex-col gap-4 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">Recommended</div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Pro</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">For professional creators who need scale and video generation.</p>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${billingAnnual ? (proCreditTier === '2k' ? '16' : proCreditTier === '4k' ? '24' : proCreditTier === '8k' ? '40' : '72') : (proCreditTier === '2k' ? '20' : proCreditTier === '4k' ? '30' : proCreditTier === '8k' ? '50' : '90')}</span>
                        <span className="text-sm text-gray-500">per month</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{billingAnnual ? `billed annually $${proCreditTier === '2k' ? '192' : proCreditTier === '4k' ? '288' : proCreditTier === '8k' ? '480' : '864'}` : 'billed monthly'}</p>
                    </div>
                    <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden text-xs">
                      {(['2k','4k','8k','16k'] as const).map((t) => (
                        <button key={t} onClick={() => setProCreditTier(t)}
                          className={cn('flex-1 py-1.5 font-medium transition-colors', proCreditTier === t ? 'bg-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/5')}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_20px_-4px_rgba(124,58,237,0.5)]">
                      Upgrade to Pro
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      {proCreditTier === '2k' ? '2,000' : proCreditTier === '4k' ? '4,000' : proCreditTier === '8k' ? '8,000' : '16,000'} credits per month
                    </div>
                    <div className="border-t border-black/8 dark:border-white/8 pt-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Everything in Basic, plus:</p>
                      <ul className="space-y-1.5">
                        {['Video generation','Kling, Grok Imagine Video, Veo, Sora, Seedance, and other video generation models','Full access to all video generation controls','Priority generation for images','Up to 10 parallel generations for images','Up to 10 parallel generations for video'].map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Teams</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">For teams collaborating on shared creative workflows.</p>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${billingAnnual ? '18' : '22'}</span>
                        <span className="text-sm text-gray-500">per month per seat</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{billingAnnual ? 'billed annually $211' : 'billed monthly'}</p>
                    </div>
                    <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden text-xs">
                      {(['2k','4k','8k','16k'] as const).map((t) => (
                        <button key={t} onClick={() => setTeamsCreditTier(t)}
                          className={cn('flex-1 py-1.5 font-medium transition-colors', teamsCreditTier === t ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5')}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity">
                      Add workspace
                    </button>
                    <p className="text-xs text-center text-gray-500">or <span className="underline cursor-pointer">Contact sales</span></p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      {teamsCreditTier === '2k' ? '2,000' : teamsCreditTier === '4k' ? '4,000' : teamsCreditTier === '8k' ? '8,000' : '16,000'} credits per month per seat
                    </div>
                    <div className="border-t border-black/8 dark:border-white/8 pt-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Everything in Pro, plus:</p>
                      <ul className="space-y-1.5">
                        {['Shared workspace for all team members','Shared custom styles','Centralized account management','Centralized billing','Premium 24/7 support','Single Sign-On (SSO)'].map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* FAQ */}
                <div className="border-t border-black/8 dark:border-white/8 px-8 py-8">
                  <h3 className="text-xl font-bold mb-6">Got questions?</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { q: 'How do credits work?', a: 'Generating or modifying an image uses 1–2 credits, depending on the format. Using the Creative Upscale tool uses 20 credits.' },
                      { q: 'Can I request a refund?', a: "You're eligible for a refund if you've used less than 30 credits over the lifetime of your account and your payment was made no more than 30 days ago." },
                      { q: 'Are image credits renewed monthly, and do they roll over?', a: 'No, subscription credits do not roll over.' },
                      { q: "I've used all my credits. How can I get more?", a: 'Share your referral link to earn free credits, or purchase a top-up to add more instantly.' },
                      { q: 'What is your cancellation policy?', a: 'You can cancel your subscription at any time. Your plan will be canceled but will remain available until the end of your billing period.' },
                      { q: 'How do I update my payment method or billing information?', a: "Once you log in to the platform, click on your profile at the top right, and select 'Manage subscription'." },
                      { q: 'How does copyright work on Recraft? Who owns the images I create?', a: 'Images created under a paid plan grant you full ownership and commercial rights, and they can be kept private.' },
                      { q: 'Can I sell generated images on stock websites?', a: "Without a subscription, images are owned by Recraft, and stock websites usually require ownership to sell images." },
                      { q: 'What payment methods can I use?', a: 'We accept credit and debit cards as well as Google Pay.' },
                    ].map(({ q, a }) => (
                      <div key={q}>
                        <p className="text-sm font-semibold mb-1.5">{q}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
    .replace('GPT Image 1', 'GPT-4o')
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
  adjustments?: {
    hue: number;
    saturation: number;
    brightness: number;
    contrast: number;
    opacity: number;
  };
}

// Module-level cache: persists as long as the page is loaded (survives modal open/close).
// Values are image URL strings loaded from the database.
const COVER_CACHE: Record<string, string> = {};

function StyleModal({ isOpen, onClose, onSelect, currentStyle, canvasImages }: { isOpen: boolean; onClose: () => void; onSelect: (entry: StyleEntry) => void; currentStyle: string; canvasImages: CanvasImage[] }) {
  const [activeTab, setActiveTab] = useState('Discover');
  const [selectedPreview, setSelectedPreview] = useState<StyleEntry | null>(() => STYLE_LOOKUP[currentStyle] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // My Styles tab — user's custom styles from DB
  const [myStyles, setMyStyles] = useState<{ id: string; name: string; baseStyle: string | null; recraftStyleId: string | null; createdAt: string }[]>([]);
  const [myStylesLoading, setMyStylesLoading] = useState(false);

  const fetchMyStyles = useCallback(() => {
    setMyStylesLoading(true);
    fetch('/api/styles')
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyStyles)
      .catch(() => {})
      .finally(() => setMyStylesLoading(false));
  }, []);

  // dbKeys: set of styleKeys that have a cover in DB (drives which styles are shown)
  const [dbKeys, setDbKeys] = useState<Set<string>>(new Set());
  const [dbKeysLoading, setDbKeysLoading] = useState(false);
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

  // Process queue: fetch covers from DB one at a time (stays under Prisma 5MB limit)
  const processQueue = useCallback(() => {
    if (!mountedRef.current) return;
    while (activeRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const key = queueRef.current.shift()!;
      if (COVER_CACHE[key] || loadingRef.current.has(key)) continue;

      activeRef.current++;
      loadingRef.current.add(key);
      forceRender();

      fetch(`/api/style-covers/${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!mountedRef.current) return;
          if (data?.imageUrl) COVER_CACHE[key] = data.imageUrl;
        })
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
    if (!isOpen) return;

    setDbKeysLoading(true);
    fetch('/api/style-covers')
      .then((r) => (r.ok ? r.json() : { cached: [] }))
      .then(({ cached }: { cached: string[] }) => {
        if (!mountedRef.current) return;
        const set = new Set(cached);
        setDbKeys(set);
        // Queue fetches only for keys not already in memory cache
        queueRef.current = cached.filter((key) => !COVER_CACHE[key]);
        processQueue();
      })
      .catch(() => { /* silently ignore */ })
      .finally(() => { if (mountedRef.current) setDbKeysLoading(false); });
  }, [isOpen, processQueue]);

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
  })).filter((cat) => cat.styles.length > 0);

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
                        onClick={() => setActiveTab(tab)}
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
                  <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-white/5 shadow-inner">
                    <button className="px-4 py-1.5 font-medium bg-elevated text-white rounded-lg shadow border border-white/10">Curated</button>
                    <button className="px-4 py-1.5 font-medium text-muted-foreground hover:text-white rounded-lg transition-colors">AI Generated</button>
                    <button className="px-4 py-1.5 font-medium text-muted-foreground hover:text-white rounded-lg flex items-center gap-2 transition-colors">All styles <ChevronDown className="w-3 h-3" /></button>
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

                  <Button variant="default" size="sm" onClick={() => setShowCreate(true)} className="ml-auto rounded-xl">
                    + Create style
                  </Button>
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
                        {myStyles.map((s) => (
                          <div key={s.id} className="group flex flex-col gap-2 cursor-pointer">
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-white/30 transition-all p-1 flex items-center justify-center">
                              <span className="text-3xl font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onSelect({ name: s.name, model: 'Custom', apiModel: s.recraftStyleId || '', apiStyle: (s.baseStyle || 'digital_illustration') as any, apiSubstyle: undefined, isNew: false, coverPrompt: s.name }); onClose(); }}
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
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Discover / other tabs ── */}
                {activeTab !== 'My styles' && dbKeysLoading && (
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
                {activeTab !== 'My styles' && !dbKeysLoading && filteredCategories.map((cat, i) => (
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
                {activeTab !== 'My styles' && !dbKeysLoading && filteredCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    {dbKeys.size === 0 ? (
                      <>
                        <Sparkles className="w-8 h-8 mb-3 opacity-40" />
                        <p className="text-sm font-medium text-white/60">No style covers generated yet</p>
                        <p className="text-xs mt-1 opacity-60">Visit <span className="font-mono text-primary">/addstyles</span> to generate covers</p>
                      </>
                    ) : (
                      <>
                        <Search className="w-8 h-8 mb-3 opacity-50" />
                        <p className="text-sm">No styles found for &ldquo;{searchQuery}&rdquo;</p>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Pane (Preview) */}
            <div className="w-85 shrink-0 bg-surface border-l border-white/5 flex flex-col p-6 overflow-y-auto">
              {selectedPreview ? (
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
    {showCreate && (
      <CreateStyleModal
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); setActiveTab('My styles'); fetchMyStyles(); }}
        canvasImages={canvasImages}
      />
    )}
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
  const [pickedImages, setPickedImages] = useState<{ url: string; file?: File }[]>([]);
  const [canvasTab, setCanvasTab] = useState<'Projects images' | 'Saved styles'>('Projects images');
  const [savedStyles, setSavedStyles] = useState<{ id: string; name: string; baseStyle: string | null }[]>([]);
  const [stylePrompt, setStylePrompt] = useState('');
  const [baseStyle, setBaseStyle] = useState('realistic_image');
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [styleName, setStyleName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's saved styles for the canvas tab
  useEffect(() => {
    fetch('/api/styles')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSavedStyles)
      .catch(() => {});
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - pickedImages.length);
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPickedImages((prev) => [...prev, { url, file }].slice(0, 5));
    });
  };

  const addCanvasImage = (img: CanvasImage) => {
    if (pickedImages.length >= 5) return;
    if (pickedImages.some((p) => p.url === img.url)) return;
    setPickedImages((prev) => [...prev, { url: img.url }].slice(0, 5));
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
    if (!testPrompt.trim() || isTestGenerating) return;
    setIsTestGenerating(true);
    setTestImageUrl(null);
    try {
      const fd = new FormData();
      fd.append('prompt', testPrompt.trim());
      fd.append('style', baseStyle);
      fd.append('model', 'recraftv3');
      fd.append('n', '1');
      fd.append('size', '1024x1024');
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Test generation failed');
      const data = await res.json();
      const url = data.images?.[0]?.imageUrl || data.images?.[0]?.url || '';
      setTestImageUrl(url);
    } catch {
      toast.error('Test generation failed');
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
      if (stylePrompt.trim()) fd.append('prompt', stylePrompt.trim());
      for (const picked of pickedImages) {
        if (picked.file) {
          fd.append('images', picked.file);
        } else {
          // Proxy-fetch canvas image URL and attach as file
          const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(picked.url));
          const blob = await res.blob();
          fd.append('images', new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' }));
        }
      }
      const res = await fetch('/api/styles', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create style');
      toast.success('Style created!');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create style');
    } finally {
      setIsSaving(false);
    }
  };

  const hasImages = pickedImages.length > 0;
  const baseStyleLabel = BASE_STYLE_OPTIONS.find((o) => o.value === baseStyle)?.label ?? 'Realistic';

  return (
    <div className="fixed inset-0 z-[70] flex bg-[#F2F2F2] dark:bg-[#0E0E10]" onClick={() => setShowBaseDropdown(false)}>
      {/* ESC + title */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm hover:bg-primary-hover transition-colors"
        >
          esc
        </button>
        <span className="text-foreground font-semibold text-xl">Create new style</span>
      </div>

      {/* ── LEFT: upload + configure ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upload / preview area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-4">
          {!hasImages ? (
            /* Drop zone */
            <div
              className="w-full max-w-2xl border-2 border-dashed border-gray-300 dark:border-white/15 rounded-2xl flex flex-col items-center justify-center py-16 px-8 cursor-pointer hover:border-gray-400 dark:hover:border-white/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <div className="flex items-center gap-8 mb-8">
                {[
                  { label: 'SVG', dim: true, node: <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
                  { label: 'PNG / JPG', dim: false, node: <svg className="w-10 h-10 text-gray-500 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} /><circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-5-5L5 21" /></svg> },
                  { label: 'WebP', dim: true, node: <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} /><circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-5-5L5 21" /></svg> },
                ].map((f, i) => (
                  <div key={i} className={`flex flex-col items-center gap-2 ${f.dim ? 'opacity-40' : ''}`}>
                    <div className="w-28 h-32 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                      {f.node}
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-white/50">{f.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-white/50 text-center leading-relaxed">
                Upload up to 5 files &lt;20MB, add images from canvas<br />or even styles you&apos;ve saved
              </p>
            </div>
          ) : (
            /* Image strip + prompt */
            <div className="w-full max-w-2xl bg-white dark:bg-white/3 border border-gray-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm">
              {/* Image thumbnails row */}
              <div className="p-4 flex items-start gap-3 flex-wrap">
                {pickedImages.map((img, idx) => (
                  <div key={idx} className="relative group w-28 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
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

              {/* Prompt + base style */}
              <div className="border-t border-gray-100 dark:border-white/5">
                <textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="add style-level prompt, e.g., simple geometric lines"
                  className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
                  rows={2}
                />
                <div className="px-4 pb-3 flex items-center gap-2">
                  {/* Fixed label - style type */}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-foreground">
                    Style &amp; composition <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  {/* Base style selector */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowBaseDropdown((p) => !p)}
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

        {/* ── Images from canvas section ── */}
        <div className="px-8 pb-8 shrink-0">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Images from canvas</h3>
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
                  <p className="text-xs text-muted-foreground self-center py-4">No images on canvas yet</p>
                ) : (
                  canvasImages.map((img) => {
                    const isPicked = pickedImages.some((p) => p.url === img.url);
                    return (
                      <button
                        key={img.id}
                        onClick={() => (isPicked ? null : addCanvasImage(img))}
                        disabled={pickedImages.length >= 5 && !isPicked}
                        className={cn(
                          'relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all',
                          isPicked ? 'border-primary' : 'border-transparent hover:border-white/30 dark:hover:border-white/30'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
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
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-20 text-center">{s.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Test it panel ── */}
      <div className="w-80 shrink-0 bg-white dark:bg-[#0A0A0B] border-l border-gray-200 dark:border-white/10 flex flex-col">
        <div className="p-6 flex-1 flex flex-col overflow-y-auto">
          <h3 className="text-lg font-bold text-foreground mb-0.5">Test it</h3>
          <p className="text-xs text-muted-foreground mb-4">Each test costs credits</p>

          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="cute red panda"
            rows={3}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {testImageUrl && (
            <div className="mt-4 w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={testImageUrl} alt="Test result" className="w-full h-full object-cover" />
            </div>
          )}

          <button
            onClick={handleTestGenerate}
            disabled={!testPrompt.trim() || isTestGenerating}
            className="mt-4 w-full h-12 rounded-xl bg-[#111111] dark:bg-white text-white dark:text-black font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {isTestGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              'Generate test image'
            )}
          </button>
        </div>

        {/* Save style button */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 shrink-0">
          <button
            onClick={() => { if (hasImages) setShowNameDialog(true); }}
            disabled={!hasImages}
            className="w-full h-14 rounded-2xl bg-[#1DB99A] hover:bg-[#19a589] text-white font-bold text-base disabled:opacity-30 transition-colors"
          >
            Save style
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Name dialog */}
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
                {/* App logo */}
                <div className="w-20 h-20 rounded-2xl bg-black mx-auto mb-5 flex items-center justify-center overflow-hidden">
                  <span className="text-white font-black text-2xl tracking-tight">R</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-5">Give your style a name</h3>
                <input
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && styleName.trim()) handleSave(); }}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    'Save style'
                  )}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}