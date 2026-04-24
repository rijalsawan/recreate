'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Heart,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STYLE_CATEGORIES, STYLE_LOOKUP, styleKey, type StyleEntry } from '@/lib/styles-data';
import { WorkspaceSidebarShell } from '@/components/layout/WorkspaceSidebarShell';

const DEFAULT_FETCH_TIMEOUT_MS = 15000;
const COVER_FETCH_TIMEOUT_MS = 12000;
const IMAGE_LIBRARY_LIMIT = 60;
const PENDING_STYLE_SESSION_KEY = 'pendingStyleApply';

type CoverSource = 'curated' | 'ai';

type PendingStylePayload = {
  name: string;
  apiStyle: string;
  apiSubstyle?: string;
  apiModel?: string;
  styleId?: string;
  preferredModel?: string;
  contextImageUrls?: string[];
};

type StyleSourceImageItem = {
  url?: string;
  sourceType?: string;
  styleHint?: string;
  modelHint?: string;
  promptHint?: string;
};

async function fetchJsonWithTimeout<T>(
  input: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
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

interface CanvasImage {
  id: string;
  url: string;
  width?: number;
  height?: number;
  prompt?: string;
  model?: string;
  style?: string;
  ratio?: string;
  x?: number;
  y?: number;
}

const COVER_CACHE: Record<string, string> = {};

function getSourceCacheKey(source: CoverSource, key: string): string {
  return `${source}:${key}`;
}

function getCoverApiBase(source: CoverSource): string {
  return source === 'ai' ? '/api/ai-style-covers' : '/api/style-covers';
}

function getApplyEntryKey(entry: StyleEntry): string {
  return `${entry.name}__${entry.apiModel || entry.model}`;
}

function toPendingStylePayload(entry: StyleEntry): PendingStylePayload {
  const isCustom = entry.model === 'Custom';
  return {
    name: entry.name,
    apiStyle: entry.apiStyle,
    apiSubstyle: entry.apiSubstyle,
    apiModel: isCustom ? undefined : entry.apiModel,
    styleId: isCustom ? (entry.apiModel || undefined) : undefined,
  };
}

function toPendingStylePayloadFromAiItem(item: AiFeedItem): PendingStylePayload {
  const fallback = STYLE_LOOKUP[item.styleName];

  return {
    name: item.styleName,
    apiStyle: item.apiStyle || fallback?.apiStyle || 'any',
    apiSubstyle: item.apiSubstyle ?? fallback?.apiSubstyle,
    apiModel: item.apiModel || fallback?.apiModel || item.model,
    preferredModel: item.model,
    contextImageUrls: item.imageUrl ? [item.imageUrl] : undefined,
  };
}

function readStyleSourceImageItems(value: unknown): StyleSourceImageItem[] {
  if (!value) return [];

  const sourceItems: unknown[] = Array.isArray(value)
    ? value
    : (typeof value === 'object' && value !== null && Array.isArray((value as Record<string, unknown>).items)
      ? ((value as Record<string, unknown>).items as unknown[])
      : []);

  const items: StyleSourceImageItem[] = [];

  for (const item of sourceItems) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    items.push({
      url: typeof entry.url === 'string' ? entry.url : undefined,
      sourceType: typeof entry.sourceType === 'string' ? entry.sourceType : undefined,
      styleHint: typeof entry.styleHint === 'string' ? entry.styleHint : undefined,
      modelHint: typeof entry.modelHint === 'string' ? entry.modelHint : undefined,
      promptHint: typeof entry.promptHint === 'string' ? entry.promptHint : undefined,
    });
  }

  return items;
}

function readStyleSourceThumbnailUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const rawThumbnail = typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl.trim() : '';
  if (rawThumbnail) return rawThumbnail;

  const firstItemUrl = readStyleSourceImageItems(value)
    .map((item) => item.url?.trim() || '')
    .find((url) => url.length > 0);

  return firstItemUrl || null;
}

type UserStyle = {
  id: string;
  name: string;
  baseStyle: string | null;
  recraftStyleId: string | null;
  sourceImages?: unknown;
  thumbnailUrl?: string | null;
  createdAt: string;
};

type AiFeedItem = {
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

type AiDetailResponse = {
  detail: AiFeedItem;
  sameStyle: AiFeedItem[];
  sameCategory: AiFeedItem[];
};

type AiFeedCachePayload = {
  items: AiFeedItem[];
  categories: string[];
};

type AiStyleCard = {
  styleId: string;
  styleName: string;
  category: string;
  model: string;
  count: number;
  cover: AiFeedItem;
  newestAt: string;
  isSaved: boolean;
};

function getAiStyleId(item: AiFeedItem): string {
  const key = item.styleKey?.trim();
  if (key) return key;
  const styleName = item.styleName?.trim() || 'Untitled style';
  const category = item.category?.trim() || 'General';
  return `${styleName}::${category}`;
}

function toUnixTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAiDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently generated';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildAiStyleCards(items: AiFeedItem[]): AiStyleCard[] {
  const byStyle = new Map<string, AiStyleCard>();

  for (const item of items) {
    const styleId = getAiStyleId(item);
    const existing = byStyle.get(styleId);

    if (!existing) {
      byStyle.set(styleId, {
        styleId,
        styleName: item.styleName,
        category: item.category,
        model: item.model,
        count: 1,
        cover: item,
        newestAt: item.createdAt,
        isSaved: item.isSaved === true,
      });
      continue;
    }

    existing.count += 1;
    existing.isSaved = existing.isSaved || item.isSaved === true;

    if (toUnixTime(item.createdAt) > toUnixTime(existing.newestAt)) {
      existing.newestAt = item.createdAt;
      existing.cover = item;
      existing.model = item.model;
      existing.category = item.category;
    }
  }

  return Array.from(byStyle.values()).sort((a, b) => toUnixTime(b.newestAt) - toUnixTime(a.newestAt));
}

const STYLE_PAGE_SESSION_CACHE: {
  curatedKeys: string[] | null;
  aiFeed: AiFeedCachePayload | null;
  savedAiFeed: AiFeedItem[] | null;
  myStyles: UserStyle[] | null;
  aiDetails: Map<string, AiDetailResponse>;
} = {
  curatedKeys: null,
  aiFeed: null,
  savedAiFeed: null,
  myStyles: null,
  aiDetails: new Map<string, AiDetailResponse>(),
};

const STYLE_PAGE_INFLIGHT: {
  curatedKeys: Promise<string[] | null> | null;
  aiFeed: Promise<AiFeedCachePayload | null> | null;
  savedAiFeed: Promise<AiFeedItem[] | null> | null;
  myStyles: Promise<UserStyle[] | null> | null;
  aiDetails: Map<string, Promise<AiDetailResponse | null>>;
} = {
  curatedKeys: null,
  aiFeed: null,
  savedAiFeed: null,
  myStyles: null,
  aiDetails: new Map<string, Promise<AiDetailResponse | null>>(),
};

async function loadStylePageCuratedKeys(force = false): Promise<string[] | null> {
  if (!force && Array.isArray(STYLE_PAGE_SESSION_CACHE.curatedKeys)) {
    return STYLE_PAGE_SESSION_CACHE.curatedKeys;
  }

  if (!force && STYLE_PAGE_INFLIGHT.curatedKeys) {
    return STYLE_PAGE_INFLIGHT.curatedKeys;
  }

  STYLE_PAGE_INFLIGHT.curatedKeys = (async () => {
    const data = await fetchJsonWithTimeout<{ cached?: string[] }>('/api/style-covers');
    if (!data) return null;

    const cached = Array.isArray(data.cached) ? data.cached : [];
    STYLE_PAGE_SESSION_CACHE.curatedKeys = cached;
    return cached;
  })().finally(() => {
    STYLE_PAGE_INFLIGHT.curatedKeys = null;
  });

  return STYLE_PAGE_INFLIGHT.curatedKeys;
}

async function loadStylePageAiFeed(force = false): Promise<AiFeedCachePayload | null> {
  if (!force && STYLE_PAGE_SESSION_CACHE.aiFeed) {
    return STYLE_PAGE_SESSION_CACHE.aiFeed;
  }

  if (!force && STYLE_PAGE_INFLIGHT.aiFeed) {
    return STYLE_PAGE_INFLIGHT.aiFeed;
  }

  STYLE_PAGE_INFLIGHT.aiFeed = (async () => {
    const data = await fetchJsonWithTimeout<{ items?: AiFeedItem[]; categories?: string[] }>(
      '/api/ai-style-images?limit=240',
    );

    if (!data) return null;

    const payload: AiFeedCachePayload = {
      items: Array.isArray(data.items) ? data.items : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
    };

    STYLE_PAGE_SESSION_CACHE.aiFeed = payload;
    return payload;
  })().finally(() => {
    STYLE_PAGE_INFLIGHT.aiFeed = null;
  });

  return STYLE_PAGE_INFLIGHT.aiFeed;
}

async function loadStylePageSavedAiFeed(force = false): Promise<AiFeedItem[] | null> {
  if (!force && Array.isArray(STYLE_PAGE_SESSION_CACHE.savedAiFeed)) {
    return STYLE_PAGE_SESSION_CACHE.savedAiFeed;
  }

  if (!force && STYLE_PAGE_INFLIGHT.savedAiFeed) {
    return STYLE_PAGE_INFLIGHT.savedAiFeed;
  }

  STYLE_PAGE_INFLIGHT.savedAiFeed = (async () => {
    const data = await fetchJsonWithTimeout<{ items?: AiFeedItem[] }>(
      '/api/ai-style-images?limit=500&saved=true',
    );

    if (!data) return null;

    const items = Array.isArray(data.items) ? data.items : [];
    STYLE_PAGE_SESSION_CACHE.savedAiFeed = items;
    return items;
  })().finally(() => {
    STYLE_PAGE_INFLIGHT.savedAiFeed = null;
  });

  return STYLE_PAGE_INFLIGHT.savedAiFeed;
}

async function loadStylePageMyStyles(force = false): Promise<UserStyle[] | null> {
  if (!force && Array.isArray(STYLE_PAGE_SESSION_CACHE.myStyles)) {
    return STYLE_PAGE_SESSION_CACHE.myStyles;
  }

  if (!force && STYLE_PAGE_INFLIGHT.myStyles) {
    return STYLE_PAGE_INFLIGHT.myStyles;
  }

  STYLE_PAGE_INFLIGHT.myStyles = (async () => {
    const data = await fetchJsonWithTimeout<UserStyle[]>('/api/styles');
    if (!Array.isArray(data)) return null;

    const normalized = data.map((style) => ({
      ...style,
      thumbnailUrl: readStyleSourceThumbnailUrl(style.sourceImages),
    }));

    STYLE_PAGE_SESSION_CACHE.myStyles = normalized;
    return normalized;
  })().finally(() => {
    STYLE_PAGE_INFLIGHT.myStyles = null;
  });

  return STYLE_PAGE_INFLIGHT.myStyles;
}

function getCachedStylePageMyStyles(): UserStyle[] | null {
  return Array.isArray(STYLE_PAGE_SESSION_CACHE.myStyles)
    ? STYLE_PAGE_SESSION_CACHE.myStyles
    : null;
}

async function loadStylePageAiDetail(id: string, force = false): Promise<AiDetailResponse | null> {
  if (!id) return null;

  if (!force && STYLE_PAGE_SESSION_CACHE.aiDetails.has(id)) {
    return STYLE_PAGE_SESSION_CACHE.aiDetails.get(id) || null;
  }

  const inflight = STYLE_PAGE_INFLIGHT.aiDetails.get(id);
  if (!force && inflight) {
    return inflight;
  }

  const request = (async () => {
    const data = await fetchJsonWithTimeout<AiDetailResponse>(`/api/ai-style-images/${encodeURIComponent(id)}`);
    if (!data?.detail) return null;

    STYLE_PAGE_SESSION_CACHE.aiDetails.set(id, data);
    STYLE_PAGE_SESSION_CACHE.aiDetails.set(data.detail.id, data);
    return data;
  })().finally(() => {
    STYLE_PAGE_INFLIGHT.aiDetails.delete(id);
  });

  STYLE_PAGE_INFLIGHT.aiDetails.set(id, request);
  return request;
}

function patchStylePageSavedStateInCache(itemId: string, saved: boolean, fallback: AiFeedItem | null): void {
  const aiFeed = STYLE_PAGE_SESSION_CACHE.aiFeed;
  if (aiFeed) {
    aiFeed.items = aiFeed.items.map((entry) => entry.id === itemId ? { ...entry, isSaved: saved } : entry);
  }

  if (Array.isArray(STYLE_PAGE_SESSION_CACHE.savedAiFeed)) {
    const withoutCurrent = STYLE_PAGE_SESSION_CACHE.savedAiFeed.filter((entry) => entry.id !== itemId);
    if (saved && fallback) {
      STYLE_PAGE_SESSION_CACHE.savedAiFeed = [{ ...fallback, isSaved: true }, ...withoutCurrent];
    } else {
      STYLE_PAGE_SESSION_CACHE.savedAiFeed = withoutCurrent;
    }
  }

  STYLE_PAGE_SESSION_CACHE.aiDetails.forEach((detail, key) => {
    let changed = false;

    const patchEntry = (entry: AiFeedItem): AiFeedItem => {
      if (entry.id !== itemId) return entry;
      changed = true;
      return { ...entry, isSaved: saved };
    };

    const nextDetail = patchEntry(detail.detail);
    const nextSameStyle = detail.sameStyle.map(patchEntry);
    const nextSameCategory = detail.sameCategory.map(patchEntry);

    if (!changed) return;

    STYLE_PAGE_SESSION_CACHE.aiDetails.set(key, {
      detail: nextDetail,
      sameStyle: nextSameStyle,
      sameCategory: nextSameCategory,
    });
  });
}

function invalidateStylePageMyStylesCache(): void {
  STYLE_PAGE_SESSION_CACHE.myStyles = null;
  STYLE_PAGE_INFLIGHT.myStyles = null;
}

function createAiFeedPlaceholder(id: string): AiFeedItem {
  return {
    id,
    imageUrl: '',
    thumbnailUrl: null,
    prompt: null,
    model: 'AI',
    width: null,
    height: null,
    createdAt: '',
    category: 'AI generated',
    styleKey: '',
    styleName: 'AI style image',
    isSaved: false,
  };
}

function AnimatedSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-white/6', className)}>
      <motion.div
        aria-hidden
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/15 to-transparent"
        animate={{ x: ['0%', '300%'] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default function StylesPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('Discover');
  const [selectedPreview, setSelectedPreview] = useState<StyleEntry | null>(null);
  const [appliedStyle, setAppliedStyle] = useState<StyleEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All styles');
  const [showCreate, setShowCreate] = useState(false);
  const [coverSource, setCoverSource] = useState<CoverSource>('curated');
  const [applyingStyleKey, setApplyingStyleKey] = useState<string | null>(null);

  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const [myStyles, setMyStyles] = useState<UserStyle[]>([]);
  const [myStylesLoading, setMyStylesLoading] = useState(false);
  const [activeStyleMenuId, setActiveStyleMenuId] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<UserStyle | null>(null);
  const [editingStyleName, setEditingStyleName] = useState('');
  const [editingStyleBaseStyle, setEditingStyleBaseStyle] = useState('digital_illustration');
  const [savingStyleEdits, setSavingStyleEdits] = useState(false);
  const [deletingStyleId, setDeletingStyleId] = useState<string | null>(null);

  const [dbKeys, setDbKeys] = useState<Set<string>>(new Set());
  const [dbKeysLoading, setDbKeysLoading] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [aiFeedItems, setAiFeedItems] = useState<AiFeedItem[]>([]);
  const [aiFeedLoading, setAiFeedLoading] = useState(false);
  const [aiFeedFetchFailed, setAiFeedFetchFailed] = useState(false);
  const [savedAiFeedItems, setSavedAiFeedItems] = useState<AiFeedItem[]>([]);
  const [savedAiFeedLoading, setSavedAiFeedLoading] = useState(false);
  const [savedAiFeedFetchFailed, setSavedAiFeedFetchFailed] = useState(false);
  const [aiCategoryOptions, setAiCategoryOptions] = useState<string[]>([]);
  const [aiCategoryFilter, setAiCategoryFilter] = useState('All categories');
  const [savingAiIds, setSavingAiIds] = useState<Set<string>>(new Set());
  const [selectedAiFeedItem, setSelectedAiFeedItem] = useState<AiFeedItem | null>(null);
  const [aiDetailData, setAiDetailData] = useState<AiDetailResponse | null>(null);
  const [aiDetailLoading, setAiDetailLoading] = useState(false);
  const [aiDetailError, setAiDetailError] = useState<string | null>(null);
  const [selectedAiGalleryImage, setSelectedAiGalleryImage] = useState<AiFeedItem | null>(null);
  const [initialAiModalId, setInitialAiModalId] = useState<string | null>(null);

  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((n) => n + 1), []);

  const activeRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const loadingRef = useRef<Set<string>>(new Set());
  const queueVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const aiDetailRequestRef = useRef(0);
  const sameStyleRowRef = useRef<HTMLDivElement | null>(null);
  const similarStylesRowRef = useRef<HTMLDivElement | null>(null);
  const MAX_CONCURRENT = 6;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeStyleMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-style-menu-root="true"]')) {
        setActiveStyleMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveStyleMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStyleMenuId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    const aiImageId = searchParams.get('aiImageId');
    const createStyle = searchParams.get('createStyle');

    if (source === 'curated' || source === 'ai') {
      setCoverSource(source);
    }

    if (aiImageId && aiImageId.trim().length > 0) {
      setCoverSource('ai');
      setInitialAiModalId(aiImageId.trim());
    }

    if (!aiImageId && (createStyle === '1' || createStyle === 'true')) {
      setCoverSource('curated');
      setShowCreate(true);
    }
  }, []);

  useEffect(() => {
    // Preload all style-modal datasets once per page load so tab switches stay instant.
    void loadStylePageCuratedKeys();
    void loadStylePageAiFeed();
    void loadStylePageSavedAiFeed();
    void loadStylePageMyStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchJsonWithTimeout<{
        images?: Array<{
          id: string;
          imageUrl: string;
          width?: number | null;
          height?: number | null;
          prompt?: string | null;
          model?: string;
          style?: string | null;
        }>;
      }>(`/api/images?limit=${IMAGE_LIBRARY_LIMIT}`);

      if (cancelled) return;
      const images = Array.isArray(data?.images) ? data.images : [];

      setCanvasImages(
        images
          .filter((img) => !!img.imageUrl)
          .map((img) => ({
            id: img.id,
            url: img.imageUrl,
            width: img.width || undefined,
            height: img.height || undefined,
            prompt: img.prompt || undefined,
            model: img.model || undefined,
            style: img.style || undefined,
          }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchMyStyles = useCallback((force = false) => {
    setMyStylesLoading(true);

    void (async () => {
      const data = await loadStylePageMyStyles(force);
      if (!mountedRef.current) return;
      setMyStyles(Array.isArray(data) ? data : []);
      setMyStylesLoading(false);
    })();
  }, []);

  const processQueue = useCallback(function processQueueImpl(expectedVersion: number = queueVersionRef.current) {
    if (!mountedRef.current) return;
    if (expectedVersion !== queueVersionRef.current) return;
    const source: CoverSource = 'curated';
    const sourceApiBase = getCoverApiBase(source);

    while (activeRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const key = queueRef.current.shift();
      if (!key) continue;
      const sourceCacheKey = getSourceCacheKey(source, key);
      if (COVER_CACHE[sourceCacheKey] || loadingRef.current.has(sourceCacheKey)) continue;

      activeRef.current += 1;
      loadingRef.current.add(sourceCacheKey);
      setLoadingKeys(new Set(loadingRef.current));
      forceRender();

      void (async () => {
        const data = await fetchJsonWithTimeout<{ imageUrl?: string }>(
          `${sourceApiBase}/${encodeURIComponent(key)}`,
          undefined,
          COVER_FETCH_TIMEOUT_MS,
        );

        if (!mountedRef.current) return;
        if (data?.imageUrl) COVER_CACHE[sourceCacheKey] = data.imageUrl;
      })()
        .catch(() => {})
        .finally(() => {
          if (!mountedRef.current) return;
          if (expectedVersion !== queueVersionRef.current) return;
          activeRef.current -= 1;
          loadingRef.current.delete(sourceCacheKey);
          setLoadingKeys(new Set(loadingRef.current));
          forceRender();
          processQueueImpl(expectedVersion);
        });
    }
  }, [forceRender]);

  useEffect(() => {
    if (coverSource !== 'curated') {
      setDbKeysLoading(false);
      setDbKeys(new Set());
      setLoadingKeys(new Set());
      return;
    }

    const queueVersion = queueVersionRef.current + 1;
    queueVersionRef.current = queueVersion;
    activeRef.current = 0;
    queueRef.current = [];
    loadingRef.current.clear();
    setLoadingKeys(new Set());
    setDbKeysLoading(true);

    void (async () => {
      const cached = await loadStylePageCuratedKeys();

      if (!mountedRef.current) return;
      if (!Array.isArray(cached)) {
        setDbKeys(new Set());
        setDbKeysLoading(false);
        return;
      }

      setDbKeys(new Set(cached));
      queueRef.current = cached.filter((key) => !COVER_CACHE[getSourceCacheKey('curated', key)]);
      processQueue(queueVersion);
      setDbKeysLoading(false);
    })()
      .catch(() => {
        if (!mountedRef.current) return;
        setDbKeys(new Set());
        setDbKeysLoading(false);
      });
  }, [coverSource, processQueue]);

  const navigateToCanvasWithPayload = useCallback(async (payload: PendingStylePayload, applyKey: string) => {
    setApplyingStyleKey(applyKey);

    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(PENDING_STYLE_SESSION_KEY, JSON.stringify(payload));
      }

      const projects = await fetchJsonWithTimeout<Array<{ id: string }>>('/api/projects');
      let targetProjectId = Array.isArray(projects) && projects.length > 0 ? projects[0].id : null;

      if (!targetProjectId) {
        const created = await fetchJsonWithTimeout<{ id?: string }>(
          '/api/projects',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Untitled' }),
          },
        );
        targetProjectId = created?.id || null;
      }

      if (!targetProjectId) {
        throw new Error('Could not open a project canvas');
      }

      const params = new URLSearchParams({ styleName: payload.name });
      params.set('styleApiStyle', payload.apiStyle);
      if (payload.apiSubstyle) params.set('styleApiSubstyle', payload.apiSubstyle);
      if (payload.apiModel) params.set('styleModel', payload.apiModel);
      if (payload.styleId) params.set('styleId', payload.styleId);
      if (payload.preferredModel) params.set('generationModel', payload.preferredModel);
      payload.contextImageUrls?.forEach((url) => {
        if (typeof url === 'string' && url.trim().length > 0) {
          params.append('styleContextImage', url);
        }
      });

      router.push(`/project/${targetProjectId}?${params.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open project canvas';
      toast.error(message);
    } finally {
      if (mountedRef.current) {
        setApplyingStyleKey(null);
      }
    }
  }, [router]);

  const navigateToCanvasWithStyle = useCallback(async (entry: StyleEntry) => {
    await navigateToCanvasWithPayload(toPendingStylePayload(entry), getApplyEntryKey(entry));
  }, [navigateToCanvasWithPayload]);

  const applyStyle = useCallback((entry: StyleEntry) => {
    setSelectedPreview(entry);
    setAppliedStyle(entry);
    void navigateToCanvasWithStyle(entry);
  }, [navigateToCanvasWithStyle]);

  const applyCustomStyle = useCallback((style: UserStyle) => {
    const contextItems = readStyleSourceImageItems(style.sourceImages);
    const contextImageUrls = contextItems
      .map((item) => item.url)
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);

    const hintedModel = contextItems.find((item) => item.modelHint)?.modelHint;

    const payload: PendingStylePayload = {
      name: style.name,
      apiStyle: style.baseStyle || 'digital_illustration',
      styleId: style.recraftStyleId || undefined,
      preferredModel: hintedModel,
      contextImageUrls: contextImageUrls.length > 0 ? contextImageUrls : undefined,
    };

    setAppliedStyle({
      name: style.name,
      model: 'Custom',
      apiModel: style.recraftStyleId || '',
      apiStyle: (style.baseStyle || 'digital_illustration') as string,
      coverPrompt: style.name,
    });

    void navigateToCanvasWithPayload(payload, `custom:${style.id}`);
  }, [navigateToCanvasWithPayload]);

  const openStyleEditDialog = useCallback((style: UserStyle) => {
    setActiveStyleMenuId(null);
    setEditingStyle(style);
    setEditingStyleName(style.name);
    setEditingStyleBaseStyle(style.baseStyle || 'digital_illustration');
  }, []);

  const handleStyleEditSave = useCallback(async () => {
    if (!editingStyle || savingStyleEdits) return;

    const nextName = editingStyleName.trim();
    if (!nextName) {
      toast.error('Style name is required.');
      return;
    }

    setSavingStyleEdits(true);

    try {
      const response = await fetch(`/api/styles/${editingStyle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nextName,
          baseStyle: editingStyleBaseStyle,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to update style');
      }

      invalidateStylePageMyStylesCache();
      fetchMyStyles(true);
      setEditingStyle(null);
      toast.success('Style updated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update style';
      toast.error(message);
    } finally {
      if (mountedRef.current) {
        setSavingStyleEdits(false);
      }
    }
  }, [editingStyle, editingStyleBaseStyle, editingStyleName, fetchMyStyles, savingStyleEdits]);

  const handleStyleDelete = useCallback(async (style: UserStyle) => {
    if (deletingStyleId) return;

    const confirmed = window.confirm(`Delete style "${style.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingStyleId(style.id);
    setActiveStyleMenuId(null);

    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to delete style');
      }

      invalidateStylePageMyStylesCache();
      fetchMyStyles(true);

      if (editingStyle?.id === style.id) {
        setEditingStyle(null);
      }

      toast.success('Style deleted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete style';
      toast.error(message);
    } finally {
      if (mountedRef.current) {
        setDeletingStyleId(null);
      }
    }
  }, [deletingStyleId, editingStyle?.id, fetchMyStyles]);

  const applyAiStyle = useCallback((item: AiFeedItem) => {
    setAppliedStyle({
      name: item.styleName,
      model: item.model,
      apiModel: item.apiModel || item.model,
      apiStyle: item.apiStyle || 'any',
      apiSubstyle: item.apiSubstyle,
      coverPrompt: item.prompt || item.styleName,
    });

    void navigateToCanvasWithPayload(toPendingStylePayloadFromAiItem(item), `ai:${item.id}`);
  }, [navigateToCanvasWithPayload]);

  const syncAiModalUrl = useCallback((id: string | null) => {
    if (typeof window === 'undefined') return;

    const nextUrl = new URL(window.location.href);
    if (id) {
      nextUrl.searchParams.set('source', 'ai');
      nextUrl.searchParams.set('aiImageId', id);
    } else {
      nextUrl.searchParams.delete('aiImageId');
    }

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    window.history.replaceState(window.history.state, '', nextPath);
  }, []);

  const syncCreateModalUrl = useCallback((isOpen: boolean) => {
    if (typeof window === 'undefined') return;

    const nextUrl = new URL(window.location.href);
    if (isOpen) {
      nextUrl.searchParams.set('source', 'curated');
      nextUrl.searchParams.set('createStyle', '1');
      nextUrl.searchParams.delete('aiImageId');
    } else {
      nextUrl.searchParams.delete('createStyle');
    }

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    window.history.replaceState(window.history.state, '', nextPath);
  }, []);

  const closeAiDetailModal = useCallback(() => {
    syncAiModalUrl(null);
    setSelectedAiFeedItem(null);
    setAiDetailData(null);
    setAiDetailError(null);
    setAiDetailLoading(false);
    setSelectedAiGalleryImage(null);
  }, [syncAiModalUrl]);

  const openAiDetailModal = useCallback((item: AiFeedItem) => {
    syncAiModalUrl(item.id);
    const requestId = aiDetailRequestRef.current + 1;
    aiDetailRequestRef.current = requestId;

    setSelectedAiFeedItem(item);
    setAiDetailData(null);
    setAiDetailError(null);
    setAiDetailLoading(true);
    setSelectedAiGalleryImage(null);

    void (async () => {
      const data = await loadStylePageAiDetail(item.id);

      if (!mountedRef.current || aiDetailRequestRef.current !== requestId) return;

      if (!data?.detail) {
        setAiDetailData(null);
        setAiDetailError('Could not load image details.');
        setAiDetailLoading(false);
        return;
      }

      setAiDetailData(data);
      setAiDetailLoading(false);
    })().catch(() => {
      if (!mountedRef.current || aiDetailRequestRef.current !== requestId) return;
      setAiDetailData(null);
      setAiDetailError('Could not load image details.');
      setAiDetailLoading(false);
    });
  }, [syncAiModalUrl]);

  useEffect(() => {
    if (!initialAiModalId) return;

    const seededItem = aiFeedItems.find((entry) => entry.id === initialAiModalId)
      || createAiFeedPlaceholder(initialAiModalId);

    openAiDetailModal(seededItem);
    setInitialAiModalId(null);
  }, [aiFeedItems, initialAiModalId, openAiDetailModal]);

  const toggleAiSaved = useCallback(async (item: AiFeedItem, forceValue?: boolean) => {
    if (savingAiIds.has(item.id)) return;

    const previousValue = item.isSaved === true;
    const nextValue = typeof forceValue === 'boolean' ? forceValue : !previousValue;

    const patchLocalSavedState = (saved: boolean) => {
      const source = aiFeedItems.find((entry) => entry.id === item.id)
        || aiDetailData?.detail
        || item;

      setAiFeedItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, isSaved: saved } : entry));
      setSavedAiFeedItems((prev) => {
        const withoutCurrent = prev.filter((entry) => entry.id !== item.id);
        if (!saved) return withoutCurrent;

        return [{ ...source, isSaved: true }, ...withoutCurrent];
      });

      setSelectedAiFeedItem((prev) => {
        if (!prev || prev.id !== item.id) return prev;
        return { ...prev, isSaved: saved };
      });

      setAiDetailData((prev) => {
        if (!prev) return prev;

        const patchItem = (entry: AiFeedItem): AiFeedItem => {
          if (entry.id !== item.id) return entry;
          return { ...entry, isSaved: saved };
        };

        return {
          detail: patchItem(prev.detail),
          sameStyle: prev.sameStyle.map(patchItem),
          sameCategory: prev.sameCategory.map(patchItem),
        };
      });

      patchStylePageSavedStateInCache(item.id, saved, source);
    };

    setSavingAiIds((prev) => new Set(prev).add(item.id));
    patchLocalSavedState(nextValue);

    try {
      const response = await fetch(`/api/ai-style-images/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSaved: nextValue }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save image');
      }

      toast.success(nextValue ? 'Saved to your Saved tab' : 'Removed from Saved tab');
    } catch (error: unknown) {
      patchLocalSavedState(previousValue);
      const message = error instanceof Error ? error.message : 'Failed to update save state';
      toast.error(message);
    } finally {
      if (!mountedRef.current) return;
      setSavingAiIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [aiDetailData?.detail, aiFeedItems, savingAiIds]);

  const fetchSavedAiFeed = useCallback((force = false) => {
    let cancelled = false;
    setSavedAiFeedLoading(true);
    setSavedAiFeedFetchFailed(false);

    void (async () => {
      const data = await loadStylePageSavedAiFeed(force);

      if (cancelled || !mountedRef.current) return;

      if (!data) {
        setSavedAiFeedItems([]);
        setSavedAiFeedFetchFailed(true);
        setSavedAiFeedLoading(false);
        return;
      }

      setSavedAiFeedItems(data);
      setSavedAiFeedLoading(false);
    })().catch(() => {
      if (cancelled || !mountedRef.current) return;
      setSavedAiFeedItems([]);
      setSavedAiFeedFetchFailed(true);
      setSavedAiFeedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (coverSource !== 'ai') return;

    let cancelled = false;
    setAiFeedLoading(true);
    setAiFeedFetchFailed(false);

    void (async () => {
      const data = await loadStylePageAiFeed();

      if (cancelled || !mountedRef.current) return;

      if (!data) {
        setAiFeedItems([]);
        setAiCategoryOptions([]);
        setAiFeedFetchFailed(true);
        setAiFeedLoading(false);
        return;
      }

      setAiFeedItems(data.items);
      setAiCategoryOptions(data.categories);
      setAiFeedLoading(false);
    })().catch(() => {
      if (cancelled || !mountedRef.current) return;
      setAiFeedItems([]);
      setAiCategoryOptions([]);
      setAiFeedFetchFailed(true);
      setAiFeedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [coverSource]);

  useEffect(() => {
    if (activeTab !== 'Saved') return;
    return fetchSavedAiFeed();
  }, [activeTab, fetchSavedAiFeed]);

  useEffect(() => {
    if (!selectedAiFeedItem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedAiGalleryImage) {
          setSelectedAiGalleryImage(null);
          return;
        }
        closeAiDetailModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAiDetailModal, selectedAiFeedItem, selectedAiGalleryImage]);

  const filteredCategories = STYLE_CATEGORIES.map((cat) => ({
    ...cat,
    styles: cat.styles.filter((s) => {
      const key = styleKey(s.name, s.apiModel);
      if (!dbKeys.has(key)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.model.toLowerCase().includes(q);
    }),
  })).filter((cat) => cat.styles.length > 0 && (categoryFilter === 'All styles' || cat.title === categoryFilter));

  const filteredAiFeedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return aiFeedItems.filter((item) => {
      if (aiCategoryFilter !== 'All categories' && item.category !== aiCategoryFilter) return false;
      if (!q) return true;

      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [aiCategoryFilter, aiFeedItems, searchQuery]);

  const activeAiCategoryOptions = useMemo(() => {
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

  const filteredSavedAiFeedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return savedAiFeedItems.filter((item) => {
      if (aiCategoryFilter !== 'All categories' && item.category !== aiCategoryFilter) return false;
      if (!q) return true;

      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [aiCategoryFilter, savedAiFeedItems, searchQuery]);

  const visibleAiFeedItems = activeTab === 'Saved' ? filteredSavedAiFeedItems : filteredAiFeedItems;
  const visibleAiStyleCards = useMemo(() => buildAiStyleCards(visibleAiFeedItems), [visibleAiFeedItems]);
  const isVisibleAiFeedLoading = activeTab === 'Saved' ? savedAiFeedLoading : aiFeedLoading;
  const visibleAiFeedFetchFailed = activeTab === 'Saved' ? savedAiFeedFetchFailed : aiFeedFetchFailed;

  const aiModalDetail = aiDetailData?.detail ?? selectedAiFeedItem;
  const aiModalSameStyleItems = aiDetailData?.sameStyle ?? [];
  const aiModalSameCategoryItems = aiDetailData?.sameCategory ?? [];

  const aiModalStyleGallery = useMemo(() => {
    if (!aiModalDetail) return [];

    const byId = new Map<string, AiFeedItem>();
    byId.set(aiModalDetail.id, aiModalDetail);

    for (const item of aiModalSameStyleItems) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return Array.from(byId.values()).sort((a, b) => toUnixTime(b.createdAt) - toUnixTime(a.createdAt));
  }, [aiModalDetail, aiModalSameStyleItems]);

  const aiModalSimilarStyleCards = useMemo(() => {
    const cards = buildAiStyleCards(aiModalSameCategoryItems);
    const currentStyleId = aiModalDetail ? getAiStyleId(aiModalDetail) : null;
    return cards
      .filter((card) => !currentStyleId || card.styleId !== currentStyleId)
      .slice(0, 24);
  }, [aiModalDetail, aiModalSameCategoryItems]);

  const selectedAiGalleryIndex = useMemo(() => {
    if (!selectedAiGalleryImage) return -1;
    return aiModalStyleGallery.findIndex((entry) => entry.id === selectedAiGalleryImage.id);
  }, [aiModalStyleGallery, selectedAiGalleryImage]);

  const aiGalleryCreatedAtLabel = useMemo(() => {
    if (!selectedAiGalleryImage?.createdAt) return 'Unknown';
    const parsed = new Date(selectedAiGalleryImage.createdAt);
    if (Number.isNaN(parsed.getTime())) return selectedAiGalleryImage.createdAt;
    return parsed.toLocaleString();
  }, [selectedAiGalleryImage?.createdAt]);

  useEffect(() => {
    if (!aiModalDetail?.id) return;
    sameStyleRowRef.current?.scrollTo({ left: 0, top: 0 });
    similarStylesRowRef.current?.scrollTo({ left: 0, top: 0 });
  }, [aiModalDetail?.id]);

  const scrollStyleRow = useCallback((direction: 'left' | 'right') => {
    const row = sameStyleRowRef.current;
    if (!row) return;
    const amount = Math.max(320, Math.round(row.clientWidth * 0.82));
    row.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  const scrollSimilarRow = useCallback((direction: 'left' | 'right') => {
    const row = similarStylesRowRef.current;
    if (!row) return;
    const amount = Math.max(280, Math.round(row.clientWidth * 0.82));
    row.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  const copyAiPrompt = useCallback(async (item: AiFeedItem) => {
    const prompt = item.prompt?.trim();
    if (!prompt) {
      toast.error('No prompt text available for this image.');
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard unavailable');
      }

      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied');
    } catch {
      toast.error('Could not copy prompt');
    }
  }, []);

  const downloadAiImage = useCallback((item: AiFeedItem) => {
    if (typeof window === 'undefined') return;
    if (!item.imageUrl) {
      toast.error('Image URL unavailable');
      return;
    }

    const link = document.createElement('a');
    link.href = item.imageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = `${item.styleName || 'ai-style'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const goToAdjacentAiGalleryImage = useCallback((direction: 'prev' | 'next') => {
    if (selectedAiGalleryIndex < 0) return;
    const nextIndex = direction === 'prev' ? selectedAiGalleryIndex - 1 : selectedAiGalleryIndex + 1;
    if (nextIndex < 0 || nextIndex >= aiModalStyleGallery.length) return;
    setSelectedAiGalleryImage(aiModalStyleGallery[nextIndex]);
  }, [aiModalStyleGallery, selectedAiGalleryIndex]);

  return (
    <WorkspaceSidebarShell activeSection="styles">
      <>
      <div className="w-full h-full bg-[#0A0A0B]">
        <div className="h-full flex flex-col">
          <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 shrink-0 border-b border-white/5">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
                {['Discover', 'My styles', 'Saved', 'Shared'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === 'My styles') fetchMyStyles();
                      if (tab === 'Saved') {
                        setCoverSource('ai');
                        setAiCategoryFilter('All categories');
                        fetchSavedAiFeed();
                      }
                    }}
                    className={cn(
                      'text-xl sm:text-[28px] font-display font-bold tracking-tight whitespace-nowrap transition-colors',
                      activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-white/80'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {appliedStyle && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 shrink-0">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary truncate max-w-40">{appliedStyle.name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center gap-3 sm:gap-4 text-sm">
              {activeTab !== 'Saved' ? (
                <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-white/5 shadow-inner w-fit">
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
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/80 text-xs font-medium">
                  <Heart className="w-3.5 h-3.5 fill-current text-pink-300" />
                  Saved AI images
                </div>
              )}

              <div className="relative w-full sm:w-auto sm:min-w-44">
                <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={coverSource === 'curated' && activeTab !== 'Saved' ? categoryFilter : aiCategoryFilter}
                  onChange={(e) => {
                    if (coverSource === 'curated' && activeTab !== 'Saved') {
                      setCategoryFilter(e.target.value);
                    } else {
                      setAiCategoryFilter(e.target.value);
                    }
                  }}
                  className="w-full h-8.5 appearance-none bg-surface border border-white/5 rounded-xl pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {coverSource === 'curated' && activeTab !== 'Saved' ? (
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

              <div className="relative flex-1 sm:max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search in styles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-white/5 rounded-xl h-8.5 pl-9 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {activeTab === 'Saved' ? (
                <Button variant="default" size="sm" onClick={() => router.push('/addaigenerated')} className="rounded-xl xl:ml-auto">
                  Open AI Generator
                </Button>
              ) : coverSource === 'curated' ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    syncCreateModalUrl(true);
                    setShowCreate(true);
                  }}
                  className="rounded-xl xl:ml-auto"
                >
                  + Create new style
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => router.push('/addaigenerated')} className="rounded-xl xl:ml-auto">
                  Open AI Generator
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-10 custom-scrollbar">
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {myStyles.map((s) => {
                        const isDeleting = deletingStyleId === s.id;
                        const isMenuOpen = activeStyleMenuId === s.id;

                        return (
                          <div key={s.id} className="group flex flex-col gap-2 cursor-pointer">
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-white/30 transition-all p-1 flex items-center justify-center">
                              {s.thumbnailUrl ? (
                                <img
                                  src={s.thumbnailUrl}
                                  alt={s.name}
                                  className="w-full h-full rounded-xl object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-3xl font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                              )}

                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 pointer-events-none">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applyCustomStyle(s);
                                  }}
                                  className="pointer-events-auto bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                                >
                                  Apply
                                </button>
                              </div>

                              <div data-style-menu-root="true" className="absolute right-2 top-2 z-20">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStyleMenuId((prev) => (prev === s.id ? null : s.id));
                                  }}
                                  className="h-8 w-8 rounded-full bg-black/55 text-white border border-white/20 flex items-center justify-center hover:bg-black/75 transition-colors"
                                  aria-label={`More actions for ${s.name}`}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                  {isMenuOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                      transition={{ duration: 0.14, ease: 'easeOut' }}
                                      className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#15151B]/95 backdrop-blur-xl shadow-2xl p-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => openStyleEditDialog(s)}
                                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Edit style
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleStyleDelete(s)}
                                        disabled={isDeleting}
                                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-60"
                                      >
                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Delete style
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
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

              {activeTab !== 'My styles' && coverSource === 'curated' && dbKeysLoading && (
                <div className="flex flex-col gap-10">
                  {[16, 12, 10].map((count, gi) => (
                    <div key={gi} className="flex flex-col gap-4">
                      <div className="h-7 w-40 rounded-xl bg-white/6 animate-pulse" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
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

              {activeTab !== 'My styles' && coverSource === 'curated' && !dbKeysLoading && filteredCategories.map((cat, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold font-display text-white">
                      {cat.title}
                      {cat.subtitle && <span className="text-muted-foreground text-sm font-normal ml-3">{cat.subtitle}</span>}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {cat.styles.map((entry, si) => {
                      const key = styleKey(entry.name, entry.apiModel);
                      const coverUrl = COVER_CACHE[getSourceCacheKey('curated', key)];
                      const isLoading = loadingKeys.has(getSourceCacheKey('curated', key));
                      const isSelected = selectedPreview?.name === entry.name && selectedPreview?.apiModel === entry.apiModel;
                      const isApplied = appliedStyle?.name === entry.name && appliedStyle?.apiModel === entry.apiModel;

                      return (
                        <div key={si} onClick={() => setSelectedPreview(entry)} className="group flex flex-col gap-2 cursor-pointer">
                          <div
                            className={cn(
                              'relative w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 transition-all p-1',
                              isSelected ? 'border-primary shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]' : 'border-white/5 group-hover:border-white/20'
                            )}
                          >
                            {coverUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={coverUrl} alt={entry.name} className="w-full h-full rounded-xl object-cover" loading="lazy" />
                            )}

                            {!coverUrl && (
                              <div className="absolute inset-0 rounded-xl overflow-hidden">
                                <div className={cn('w-full h-full bg-white/6', isLoading ? 'animate-pulse' : '')} />
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyStyle(entry);
                                }}
                                className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                              >
                                Apply
                              </button>
                            </div>

                            {isApplied && (
                              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                <Check className="w-3.5 h-3.5" />
                              </span>
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

              {activeTab !== 'My styles' && coverSource === 'curated' && !dbKeysLoading && filteredCategories.length === 0 && (
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

              {activeTab !== 'My styles' && coverSource === 'ai' && isVisibleAiFeedLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="w-full aspect-square rounded-2xl bg-white/6 animate-pulse" />
                      <div className="h-3.5 w-3/4 rounded-lg bg-white/6 animate-pulse" />
                      <div className="h-3 w-1/2 rounded-lg bg-white/4 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {activeTab !== 'My styles' && coverSource === 'ai' && !isVisibleAiFeedLoading && visibleAiStyleCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {visibleAiStyleCards.map((card) => (
                    <button
                      key={card.styleId}
                      onClick={() => openAiDetailModal(card.cover)}
                      className="group text-left rounded-3xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-30px_rgba(0,0,0,0.85)] transition-all duration-300 overflow-hidden"
                    >
                      <div className="relative aspect-4/3 overflow-hidden bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.cover.thumbnailUrl || card.cover.imageUrl}
                          alt={card.styleName}
                          className="w-full h-full object-cover scale-100 group-hover:scale-[1.03] transition-transform duration-500"
                          loading="lazy"
                        />

                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

                        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/45 px-2 py-1 text-[10px] backdrop-blur-sm">
                          <span className="text-white/90 uppercase tracking-wide">
                            {card.category}
                          </span>
                          <span className="text-white/45">•</span>
                          <span className="text-white/80">
                            {card.count} image{card.count === 1 ? '' : 's'}
                          </span>
                        </div>

                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (savingAiIds.has(card.cover.id)) return;
                            void toggleAiSaved(card.cover);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            event.stopPropagation();
                            if (savingAiIds.has(card.cover.id)) return;
                            void toggleAiSaved(card.cover);
                          }}
                          className={cn(
                            'absolute top-3 right-3 z-10 w-8 h-8 rounded-lg border border-white/20 bg-black/45 text-white/80 hover:text-pink-300 hover:bg-black/60 transition-colors flex items-center justify-center',
                            savingAiIds.has(card.cover.id) ? 'opacity-50 pointer-events-none' : '',
                          )}
                        >
                          <Heart className={cn('w-4 h-4', card.isSaved ? 'fill-current text-pink-300' : '')} />
                        </span>

                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p className="text-sm font-semibold text-white truncate">{card.styleName}</p>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <p className="text-[11px] text-white/62 uppercase tracking-[0.08em] truncate">{card.model}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {card.cover.prompt || 'AI generated style collection'}
                        </p>
                        <p className="text-[11px] text-white/55">Open style collection</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab !== 'My styles' && coverSource === 'ai' && !isVisibleAiFeedLoading && visibleAiStyleCards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-sm font-medium text-white/60">
                    {activeTab === 'Saved'
                      ? (visibleAiFeedFetchFailed ? 'Could not load saved images' : 'No saved AI style images yet')
                      : visibleAiFeedFetchFailed
                        ? 'Could not load AI style feed'
                        : 'No AI style images found'}
                  </p>
                  <p className="text-xs mt-1 opacity-60">
                    {activeTab === 'Saved'
                      ? (visibleAiFeedFetchFailed
                        ? 'Try reloading this page. If it persists, check your session and backend API status.'
                        : 'Click the heart icon on any AI generated image to save it here.')
                      : visibleAiFeedFetchFailed
                        ? 'Try reloading this page. If it persists, generate a fresh image in /addaigenerated.'
                        : 'Generate images in /addaigenerated to build the feed'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      <AnimatePresence>
        {selectedAiFeedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-80 bg-black/75 backdrop-blur-sm"
              onClick={closeAiDetailModal}
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.985 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-2 sm:inset-4 z-90"
            >
              <div className="h-full w-full rounded-[26px] border border-white/12 bg-[#0D0E11] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
                <header className="h-20 sm:h-24 border-b border-white/10 bg-white/2 px-4 sm:px-6 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeAiDetailModal}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/15 bg-black/35 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {aiDetailLoading ? (
                      <div className="space-y-2">
                        <AnimatedSkeleton className="h-5 w-40 rounded-lg" />
                        <AnimatedSkeleton className="h-3 w-32 rounded-full" />
                      </div>
                    ) : aiModalDetail ? (
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={aiModalDetail.thumbnailUrl || aiModalDetail.imageUrl}
                            alt={aiModalDetail.styleName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-display font-bold text-white truncate">
                            {aiModalDetail.styleName}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {aiModalStyleGallery.length} image{aiModalStyleGallery.length === 1 ? '' : 's'} in this style
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] min-w-0">
                            <span className="px-2 py-0.5 rounded-md border border-white/12 bg-white/5 text-white/85 truncate max-w-36">
                              {aiModalDetail.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-md border border-white/12 bg-white/5 text-white/80 truncate max-w-36">
                              {aiModalDetail.model}
                            </span>
                            {aiModalDetail.isSaved && (
                              <span className="px-2 py-0.5 rounded-md border border-pink-300/40 bg-pink-300/10 text-pink-300">
                                Saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/80">AI style details</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {aiModalDetail && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void toggleAiSaved(aiModalDetail);
                          }}
                          disabled={savingAiIds.has(aiModalDetail.id)}
                          className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-white/15 bg-white/3 text-white/85 hover:text-pink-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          <Bookmark className={cn('w-4 h-4', aiModalDetail.isSaved ? 'fill-current text-pink-300' : '')} />
                          {aiModalDetail.isSaved ? 'Saved' : 'Save style'}
                        </button>

                        <button
                          type="button"
                          onClick={() => applyAiStyle(aiModalDetail)}
                          disabled={applyingStyleKey === `ai:${aiModalDetail.id}`}
                          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-60"
                        >
                          {applyingStyleKey === `ai:${aiModalDetail.id}` ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                          ) : (
                            'Apply style'
                          )}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={closeAiDetailModal}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/15 bg-black/35 text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {aiDetailLoading ? (
                    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                      <div className="space-y-3">
                        <AnimatedSkeleton className="h-7 w-52 rounded-xl" />
                        <AnimatedSkeleton className="h-4 w-72 rounded-full" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <AnimatedSkeleton key={idx} className="aspect-4/5 rounded-2xl" />
                        ))}
                      </div>

                      <div className="space-y-3">
                        <AnimatedSkeleton className="h-7 w-44 rounded-xl" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <AnimatedSkeleton key={idx} className="aspect-4/3 rounded-2xl" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : aiDetailError ? (
                    <div className="px-4 sm:px-6 lg:px-8 py-10">
                      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-sm text-white/85">{aiDetailError}</p>
                        <p className="text-xs text-white/55 mt-1">Try opening another style card from the AI feed.</p>
                      </div>
                    </div>
                  ) : aiModalDetail ? (
                    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
                      <section className="space-y-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h4 className="text-lg sm:text-2xl font-display font-bold text-white">Images in this style</h4>
                            <p className="text-xs sm:text-sm text-white/60 mt-1">
                              {aiModalStyleGallery.length} image{aiModalStyleGallery.length === 1 ? '' : 's'} in {aiModalDetail.styleName}
                            </p>
                          </div>

                          <div className="hidden sm:flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => scrollStyleRow('left')}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/12 bg-black/35 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollStyleRow('right')}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/12 bg-black/35 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {aiModalStyleGallery.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/3 p-5 text-sm text-white/70">
                            No additional images in this style yet.
                          </div>
                        ) : (
                          <div ref={sameStyleRowRef} className="overflow-x-auto no-scrollbar -mx-1 px-1">
                            <div className="flex gap-4 w-max min-w-full pb-1">
                              {aiModalStyleGallery.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setSelectedAiGalleryImage(item)}
                                  className={cn(
                                    'relative w-65 sm:w-75 lg:w-85 aspect-4/5 rounded-2xl overflow-hidden border bg-black text-left transition-all hover:-translate-y-0.5',
                                    selectedAiGalleryImage?.id === item.id
                                      ? 'border-primary/70 shadow-[0_0_0_1px_rgba(124,58,237,0.35)]'
                                      : 'border-white/10 hover:border-white/30',
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.thumbnailUrl || item.imageUrl}
                                    alt={item.styleName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />

                                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent" />

                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (savingAiIds.has(item.id)) return;
                                      void toggleAiSaved(item);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key !== 'Enter' && event.key !== ' ') return;
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (savingAiIds.has(item.id)) return;
                                      void toggleAiSaved(item);
                                    }}
                                    className={cn(
                                      'absolute top-3 right-3 z-10 w-8 h-8 rounded-lg border border-white/15 bg-black/45 text-white/80 hover:text-pink-300 hover:bg-black/60 transition-colors flex items-center justify-center',
                                      savingAiIds.has(item.id) ? 'opacity-50 pointer-events-none' : '',
                                    )}
                                  >
                                    <Heart className={cn('w-4 h-4', item.isSaved ? 'fill-current text-pink-300' : '')} />
                                  </span>

                                  <div className="absolute inset-x-0 bottom-0 p-3 space-y-1">
                                    <p className="text-xs text-white/70">{formatAiDateLabel(item.createdAt)}</p>
                                    <p className="text-sm font-medium text-white line-clamp-2">
                                      {item.prompt || 'Open image preview'}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="space-y-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h4 className="text-lg sm:text-2xl font-display font-bold text-white">Similar styles</h4>
                            <p className="text-xs sm:text-sm text-white/60 mt-1">
                              More from the {aiModalDetail.category} category
                            </p>
                          </div>

                          <div className="hidden sm:flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => scrollSimilarRow('left')}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/12 bg-black/35 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollSimilarRow('right')}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/12 bg-black/35 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {aiModalSimilarStyleCards.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/3 p-5 text-sm text-white/70">
                            No similar styles found in this category yet.
                          </div>
                        ) : (
                          <div ref={similarStylesRowRef} className="overflow-x-auto no-scrollbar -mx-1 px-1">
                            <div className="flex gap-4 w-max min-w-full pb-1">
                              {aiModalSimilarStyleCards.map((card) => (
                                <button
                                  key={card.styleId}
                                  type="button"
                                  onClick={() => openAiDetailModal(card.cover)}
                                  className="group relative w-55 sm:w-60 aspect-4/3 rounded-2xl overflow-hidden border border-white/10 bg-black text-left hover:border-white/30 transition-colors"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={card.cover.thumbnailUrl || card.cover.imageUrl}
                                    alt={card.styleName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />

                                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />

                                  <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-md border border-white/15 bg-black/45 text-white/90">
                                    {card.count} image{card.count === 1 ? '' : 's'}
                                  </div>

                                  <div className="absolute inset-x-0 bottom-0 p-3">
                                    <p className="text-sm font-semibold text-white truncate">{card.styleName}</p>
                                    <p className="text-[11px] text-white/70 truncate">{card.model}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAiGalleryImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-100 bg-black/85"
              onClick={() => setSelectedAiGalleryImage(null)}
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-2 sm:inset-4 z-110"
            >
              <div className="h-full w-full rounded-[22px] border border-white/15 bg-[#0B0C10] overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div className="relative bg-black">
                  <button
                    type="button"
                    onClick={() => setSelectedAiGalleryImage(null)}
                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-xl border border-white/15 bg-black/45 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {selectedAiGalleryIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => goToAdjacentAiGalleryImage('prev')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-xl border border-white/15 bg-black/45 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  {selectedAiGalleryIndex >= 0 && selectedAiGalleryIndex < aiModalStyleGallery.length - 1 && (
                    <button
                      type="button"
                      onClick={() => goToAdjacentAiGalleryImage('next')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-xl border border-white/15 bg-black/45 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  <div className="absolute inset-0 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedAiGalleryImage.imageUrl}
                      alt={selectedAiGalleryImage.styleName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                <aside className="border-t xl:border-t-0 xl:border-l border-white/10 bg-[#101218] p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-white/50">{selectedAiGalleryImage.category}</p>
                    <h3 className="text-xl font-display font-bold text-white leading-tight">
                      {selectedAiGalleryImage.styleName}
                    </h3>
                    <p className="text-xs text-white/60">Generated {aiGalleryCreatedAtLabel}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-lg border border-white/12 bg-white/4 text-white/90">
                      {selectedAiGalleryImage.model}
                    </span>
                    {selectedAiGalleryImage.apiStyle && (
                      <span className="px-2 py-1 rounded-lg border border-white/12 bg-white/4 text-white/90">
                        {selectedAiGalleryImage.apiStyle}
                      </span>
                    )}
                    {(selectedAiGalleryImage.width || selectedAiGalleryImage.height) && (
                      <span className="px-2 py-1 rounded-lg border border-white/12 bg-white/4 text-white/90">
                        {selectedAiGalleryImage.width || '?'} x {selectedAiGalleryImage.height || '?'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-white/50">Prompt</p>
                    <p className="text-sm text-white/90 whitespace-pre-wrap wrap-break-word">
                      {selectedAiGalleryImage.prompt || 'No prompt recorded.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void toggleAiSaved(selectedAiGalleryImage);
                      }}
                      disabled={savingAiIds.has(selectedAiGalleryImage.id)}
                      className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-white/15 bg-white/4 text-white/85 hover:text-pink-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <Heart className={cn('w-4 h-4', selectedAiGalleryImage.isSaved ? 'fill-current text-pink-300' : '')} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void copyAiPrompt(selectedAiGalleryImage);
                      }}
                      className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-white/15 bg-white/4 text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadAiImage(selectedAiGalleryImage)}
                      className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-white/15 bg-white/4 text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => applyAiStyle(selectedAiGalleryImage)}
                    disabled={applyingStyleKey === `ai:${selectedAiGalleryImage.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-60"
                  >
                    {applyingStyleKey === `ai:${selectedAiGalleryImage.id}` ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                    ) : (
                      'Apply style'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openAiDetailModal(selectedAiGalleryImage)}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-white/15 bg-white/4 text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    Open style details
                  </button>
                </aside>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {showCreate && (
          <CreateStyleModal
            onClose={() => {
              syncCreateModalUrl(false);
              setShowCreate(false);
            }}
            onSaved={() => {
              syncCreateModalUrl(false);
              setShowCreate(false);
              setActiveTab('My styles');
              fetchMyStyles(true);
            }}
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
              className="fixed inset-0 z-140 bg-black/65 backdrop-blur-sm"
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
              className="fixed inset-0 z-150 flex items-center justify-center p-4"
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
      </>
    </WorkspaceSidebarShell>
  );
}

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
  { label: 'GPT Image 1', value: 'gpt-image-1' },
] as const;

const STYLE_TEST_MODELS_WITH_ATTACHMENTS = new Set<string>([
  'recraftv4',
  'recraftv3',
  'gpt-image-2',
  'gpt-image-1',
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

function CreateStyleModal({
  onClose,
  onSaved,
  canvasImages,
}: {
  onClose: () => void;
  onSaved: () => void;
  canvasImages: CanvasImage[];
}) {
  const cachedStyles = getCachedStylePageMyStyles();
  const cachedSavedStyles = Array.isArray(cachedStyles)
    ? cachedStyles.map((style) => ({
      id: style.id,
      name: style.name,
      baseStyle: style.baseStyle,
      thumbnailUrl: style.thumbnailUrl || readStyleSourceThumbnailUrl(style.sourceImages),
    }))
    : [];

  const [pickedImages, setPickedImages] = useState<PickedStyleImage[]>([]);
  const [canvasTab, setCanvasTab] = useState<'Projects images' | 'Saved styles'>('Projects images');
  const [savedStyles, setSavedStyles] = useState<Array<{
    id: string;
    name: string;
    baseStyle: string | null;
    thumbnailUrl: string | null;
  }>>(cachedSavedStyles);
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
  const [showDeferredLibrary, setShowDeferredLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timerId: number | null = null;
    let rafId: number | null = null;

    // Let entry animation settle before mounting thumbnail-heavy library content.
    rafId = window.requestAnimationFrame(() => {
      timerId = window.setTimeout(() => {
        setShowDeferredLibrary(true);
      }, 160);
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!showDeferredLibrary) return;
    let cancelled = false;

    void (async () => {
      const data = await loadStylePageMyStyles();
      if (cancelled) return;
      setSavedStyles(Array.isArray(data)
        ? data.map((style) => ({
          id: style.id,
          name: style.name,
          baseStyle: style.baseStyle,
          thumbnailUrl: style.thumbnailUrl || readStyleSourceThumbnailUrl(style.sourceImages),
        }))
        : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [showDeferredLibrary]);

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
      invalidateStylePageMyStylesCache();
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
                    <img src={img.url || undefined} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                            onClick={() => {
                              setBaseStyle(opt.value);
                              setShowBaseDropdown(false);
                            }}
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

            {!showDeferredLibrary ? (
              <div className="min-h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 flex items-center px-3">
                <span className="text-xs text-muted-foreground">Loading library…</span>
              </div>
            ) : (
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
                          <img src={img.url || undefined} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                        <img src={s.thumbnailUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <span className="text-lg font-bold text-white/20">{s.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-20 text-center">{s.name}</span>
                  </div>
                ))
              )}
              </div>
            )}
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

          {testImageUrl && (
            <div className="mt-4 w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={testImageUrl} alt="Test result" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                    <img src={pickedImages[0].url} alt="Style thumbnail" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
