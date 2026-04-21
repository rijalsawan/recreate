'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Image as ImageIcon, Loader2, RefreshCcw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STYLE_CATEGORIES, styleKey, type StyleEntry } from '@/lib/styles-data';

const MODEL_OPTIONS = [
  { label: 'Recraft V4', value: 'recraftv4' },
  { label: 'Recraft V4 Vector', value: 'recraftv4_vector' },
  { label: 'Recraft V3', value: 'recraftv3' },
  { label: 'Recraft V3 Vector', value: 'recraftv3_vector' },
  { label: 'Recraft V2', value: 'recraftv2' },
  { label: 'Recraft V2 Vector', value: 'recraftv2_vector' },
  { label: 'GPT Image 1', value: 'gpt-image-1' },
  { label: 'DALL-E 3', value: 'dall-e-3' },
];

const PROMPT_TEMPLATES = [
  'Create a highly detailed {category} visual for {style}, with cinematic composition, nuanced materials, dramatic but controlled lighting, and premium art direction.',
  'Generate a production-ready {category} hero image in the {style} language, with clean focal hierarchy, rich texture fidelity, and editorial-grade clarity.',
  'Craft an expressive {category} scene for {style}, featuring layered depth, intentional color harmony, and polished details suitable for a high-end campaign.',
  'Design a modern {category} artwork around {style}, balancing bold silhouette readability, realistic micro-details, and tasteful atmospheric contrast.',
  'Produce a premium {category} concept for {style}, with sophisticated framing, consistent visual style, and high-fidelity rendering quality.',
  'Render an advanced {category} composition for {style}, with refined storytelling cues, subtle depth-of-field, and flawless material definition.',
];

const SIMPLE_PROMPT_TEMPLATES = [
  'Create a clean {category} visual in {style} style.',
  'Generate a polished {category} image inspired by {style}.',
  'Design a clear {category} artwork in {style} style.',
];

const COMPLEXITY_MIN = 1;
const COMPLEXITY_MAX = 5;
const COMPLEXITY_LABELS: Record<number, string> = {
  1: 'Brief',
  2: 'Simple',
  3: 'Balanced',
  4: 'Detailed',
  5: 'Cinematic',
};

type StyleRowState = {
  generating: boolean;
  coverUrl: string | null;
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
  apiModel?: string;
  apiStyle?: string;
  apiSubstyle?: string;
};

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function isRecraftModel(model: string): boolean {
  return model.startsWith('recraft');
}

function toPromptCategory(categoryLabel: string): string {
  return categoryLabel.trim() ? categoryLabel.toLowerCase() : 'style';
}

function randomPromptForSelection(categoryLabel: string, styleName: string, complexity: number): string {
  const categoryText = categoryLabel.trim() ? categoryLabel.toLowerCase() : 'style';
  const resolvedStyleName = styleName.trim() || 'selected style';
  const normalizedComplexity = Math.max(COMPLEXITY_MIN, Math.min(COMPLEXITY_MAX, complexity));

  const baseTemplate = normalizedComplexity <= 2
    ? pickRandom(SIMPLE_PROMPT_TEMPLATES)
    : pickRandom(PROMPT_TEMPLATES);

  let prompt = baseTemplate
    .replace('{category}', categoryText)
    .replace('{style}', resolvedStyleName);

  if (normalizedComplexity === 2) {
    prompt += ' Keep composition clear and visually coherent.';
  }

  if (normalizedComplexity >= 4) {
    prompt += ' Add richer scene storytelling, layered composition, and stronger focal hierarchy.';
  }

  if (normalizedComplexity >= 5) {
    prompt += ' Include realistic material behavior, nuanced lighting transitions, subtle atmospheric depth, and premium finishing detail.';
  }

  return prompt;
}

function resolvePromptForEntry(basePrompt: string, entry: StyleEntry, categoryLabel: string): string {
  const source = basePrompt.trim();
  if (!source) return randomPromptForSelection(categoryLabel, entry.name, 3);

  const withTokensResolved = source
    .replaceAll('{category}', toPromptCategory(categoryLabel))
    .replaceAll('{style}', entry.name);

  return withTokensResolved;
}

export default function AddAIGeneratedPage() {
  const [rows, setRows] = useState<Record<string, StyleRowState>>({});
  const [loading, setLoading] = useState(true);
  const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);
  const [generatedFeedItems, setGeneratedFeedItems] = useState<AiFeedItem[]>([]);
  const [galleryQuery, setGalleryQuery] = useState('');
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('All categories');
  const [galleryStyleFilter, setGalleryStyleFilter] = useState('All styles');
  const [selectedImageItem, setSelectedImageItem] = useState<AiFeedItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  const [selectedModel, setSelectedModel] = useState('recraftv4');
  const [selectedCategory, setSelectedCategory] = useState(() => STYLE_CATEGORIES[0]?.title ?? '');
  const [selectedStyleKey, setSelectedStyleKey] = useState('');
  const [promptComplexity, setPromptComplexity] = useState(3);
  const [globalPrompt, setGlobalPrompt] = useState('');

  const mountedRef = useRef(true);

  const stylesInSelectedCategory = useMemo(
    () => STYLE_CATEGORIES.find((category) => category.title === selectedCategory)?.styles ?? [],
    [selectedCategory],
  );

  const selectedStyle = useMemo(
    () => stylesInSelectedCategory.find((entry) => styleKey(entry.name, entry.apiModel) === selectedStyleKey) ?? null,
    [selectedStyleKey, stylesInSelectedCategory],
  );

  useEffect(() => {
    if (stylesInSelectedCategory.length === 0) {
      setSelectedStyleKey('');
      return;
    }

    setSelectedStyleKey((prev) => {
      const exists = stylesInSelectedCategory.some((entry) => styleKey(entry.name, entry.apiModel) === prev);
      if (exists) return prev;
      const first = stylesInSelectedCategory[0];
      return styleKey(first.name, first.apiModel);
    });
  }, [stylesInSelectedCategory]);

  useEffect(() => {
    if (!selectedStyle) return;
    setGlobalPrompt(randomPromptForSelection(selectedCategory, selectedStyle.name, promptComplexity));
  }, [selectedCategory, selectedStyle?.name, promptComplexity]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const initial: Record<string, StyleRowState> = {};

    for (const category of STYLE_CATEGORIES) {
      for (const entry of category.styles) {
        const key = styleKey(entry.name, entry.apiModel);
        initial[key] = {
          generating: false,
          coverUrl: null,
        };
      }
    }

    setRows(initial);
    setLoading(false);
  }, []);

  const fetchGeneratedFeed = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setIsFeedLoading(true);
    } else {
      setIsFeedRefreshing(true);
    }

    try {
      const res = await fetch('/api/ai-style-images?limit=240', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Unable to fetch generated images');
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      if (!mountedRef.current) return;
      setGeneratedFeedItems(items);
    } catch {
      if (!mountedRef.current) return;
      setGeneratedFeedItems([]);
    } finally {
      if (!mountedRef.current) return;
      setIsFeedLoading(false);
      setIsFeedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchGeneratedFeed('initial');
  }, [fetchGeneratedFeed]);

  useEffect(() => {
    const handleFocus = () => {
      void fetchGeneratedFeed('refresh');
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchGeneratedFeed]);

  const randomizeGlobalPrompt = useCallback(() => {
    if (!selectedStyle) return;
    setGlobalPrompt(randomPromptForSelection(selectedCategory, selectedStyle.name, promptComplexity));
  }, [promptComplexity, selectedCategory, selectedStyle]);

  const increasePromptComplexity = useCallback(() => {
    setPromptComplexity((prev) => Math.min(COMPLEXITY_MAX, prev + 1));
  }, []);

  const decreasePromptComplexity = useCallback(() => {
    setPromptComplexity((prev) => Math.max(COMPLEXITY_MIN, prev - 1));
  }, []);

  const generateImage = useCallback(async (entry: StyleEntry) => {
    const key = styleKey(entry.name, entry.apiModel);
    const row = rows[key];
    if (!row || row.generating) return;

    const finalPrompt = resolvePromptForEntry(globalPrompt, entry, selectedCategory);
    if (!finalPrompt.trim()) {
      toast.error('Prompt is required');
      return;
    }

    setRows((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        generating: true,
      },
    }));
    setIsGeneratingModalOpen(true);

    try {
      const body: Record<string, unknown> = {
        prompt: finalPrompt,
        model: selectedModel,
        size: '1024x1024',
        n: 1,
        styleName: entry.name,
        aiFeedSource: 'ai-generated-style-feed',
        aiCategory: selectedCategory,
        aiStyleKey: key,
        aiStyleName: entry.name,
        aiApiModel: entry.apiModel,
        aiApiStyle: entry.apiStyle,
      };

      if (entry.apiSubstyle) {
        body.aiApiSubstyle = entry.apiSubstyle;
      }

      if (isRecraftModel(selectedModel)) {
        body.style = entry.apiStyle;
        if (entry.apiSubstyle) body.substyle = entry.apiSubstyle;
      } else {
        body.style = 'any';
      }

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!generateRes.ok) {
        const err = await generateRes.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const generatedData = await generateRes.json();
      const imageUrl = generatedData.images?.[0]?.imageUrl || generatedData.images?.[0]?.url;
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('No image returned');
      }

      if (!mountedRef.current) return;

      setRows((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          coverUrl: imageUrl,
          generating: false,
        },
      }));

      await fetchGeneratedFeed('refresh');

      toast.success(`Generated preview: ${entry.name}`);
    } catch (error: unknown) {
      if (!mountedRef.current) return;

      setRows((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          generating: false,
        },
      }));

      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed: ${entry.name} - ${message}`);
    } finally {
      if (!mountedRef.current) return;
      setIsGeneratingModalOpen(false);
    }
  }, [fetchGeneratedFeed, globalPrompt, rows, selectedCategory, selectedModel]);

  const totalStyles = useMemo(
    () => STYLE_CATEGORIES.reduce((sum, category) => sum + category.styles.length, 0),
    [],
  );
  const generatingCount = Object.values(rows).filter((row) => row.generating).length;
  const galleryCategoryOptions = useMemo(
    () => Array.from(new Set(generatedFeedItems.map((item) => item.category))).sort((a, b) => a.localeCompare(b)),
    [generatedFeedItems],
  );
  const galleryStyleOptions = useMemo(
    () => Array.from(new Set(generatedFeedItems.map((item) => item.styleName))).sort((a, b) => a.localeCompare(b)),
    [generatedFeedItems],
  );
  const filteredGeneratedItems = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase();

    return generatedFeedItems.filter((item) => {
      if (galleryCategoryFilter !== 'All categories' && item.category !== galleryCategoryFilter) return false;
      if (galleryStyleFilter !== 'All styles' && item.styleName !== galleryStyleFilter) return false;
      if (!q) return true;

      const haystack = `${item.styleName} ${item.category} ${item.prompt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [galleryCategoryFilter, galleryQuery, galleryStyleFilter, generatedFeedItems]);

  useEffect(() => {
    if (galleryCategoryFilter === 'All categories') return;
    if (galleryCategoryOptions.includes(galleryCategoryFilter)) return;
    setGalleryCategoryFilter('All categories');
  }, [galleryCategoryFilter, galleryCategoryOptions]);

  useEffect(() => {
    if (galleryStyleFilter === 'All styles') return;
    if (galleryStyleOptions.includes(galleryStyleFilter)) return;
    setGalleryStyleFilter('All styles');
  }, [galleryStyleFilter, galleryStyleOptions]);

  const selectedImageCreatedAt = useMemo(() => {
    if (!selectedImageItem?.createdAt) return 'Unknown';
    const parsed = new Date(selectedImageItem.createdAt);
    if (Number.isNaN(parsed.getTime())) return selectedImageItem.createdAt;
    return parsed.toLocaleString();
  }, [selectedImageItem?.createdAt]);

  const handleDeleteSelectedImage = useCallback(async () => {
    if (!selectedImageItem || isDeletingImage) return;

    setIsDeletingImage(true);

    try {
      const res = await fetch(`/api/images/${encodeURIComponent(selectedImageItem.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete image');
      }

      if (!mountedRef.current) return;

      setGeneratedFeedItems((prev) => prev.filter((item) => item.id !== selectedImageItem.id));
      setShowDeleteConfirm(false);
      setSelectedImageItem(null);
      toast.success('Image deleted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete image';
      toast.error(message);
    } finally {
      if (!mountedRef.current) return;
      setIsDeletingImage(false);
    }
  }, [isDeletingImage, selectedImageItem]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading AI style rows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">AI Generated Styles Preview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate previews only here. Use /addcuratedstyles to create and save curated styles.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cpu className="w-4 h-4" />
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model.value} value={model.value}>{model.label}</option>
              ))}
            </select>

            <label className="text-sm text-muted-foreground ml-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {STYLE_CATEGORIES.map((category) => (
                <option key={category.title} value={category.title}>{category.title}</option>
              ))}
            </select>

            <label className="text-sm text-muted-foreground ml-2">Style</label>
            <select
              value={selectedStyleKey}
              onChange={(e) => setSelectedStyleKey(e.target.value)}
              className="bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-w-56"
            >
              {stylesInSelectedCategory.map((entry) => {
                const key = styleKey(entry.name, entry.apiModel);
                return (
                  <option key={key} value={key}>{entry.name}</option>
                );
              })}
            </select>

            <button
              onClick={randomizeGlobalPrompt}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Random prompt
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-background/50">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Complexity</span>
              <button
                type="button"
                onClick={decreasePromptComplexity}
                disabled={promptComplexity <= COMPLEXITY_MIN}
                className="w-6 h-6 rounded-md border border-border text-sm text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-xs text-white min-w-20 text-center">{COMPLEXITY_LABELS[promptComplexity]}</span>
              <button
                type="button"
                onClick={increasePromptComplexity}
                disabled={promptComplexity >= COMPLEXITY_MAX}
                className="w-6 h-6 rounded-md border border-border text-sm text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-44 pb-14 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Prompt auto-adjusts to the selected style/category. You can still edit it."
            />

            <button
              onClick={() => {
                if (!selectedStyle) {
                  toast.error('Select a style first');
                  return;
                }
                void generateImage(selectedStyle);
              }}
              disabled={!selectedStyle || !globalPrompt.trim() || isGeneratingModalOpen}
              className={cn(
                'absolute right-3 bottom-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                'bg-primary hover:bg-primary-hover text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isGeneratingModalOpen ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
            <span>{generatingCount} generating</span>
            <span>{totalStyles} total styles</span>
            <span>{generatedFeedItems.length} total generated images</span>
            {!isRecraftModel(selectedModel) && (
              <span className="text-primary">GPT models use styleName prompt injection via backend.</span>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-white">Generated images</p>
                <p className="text-xs text-muted-foreground">
                  Saved in database and fetched from backend. Filters below are independent from prompt selection.
                </p>
              </div>

              <button
                onClick={() => void fetchGeneratedFeed('refresh')}
                disabled={isFeedRefreshing || isFeedLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeedRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_220px] gap-3 mb-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={galleryQuery}
                  onChange={(e) => setGalleryQuery(e.target.value)}
                  placeholder="Search generated images"
                  className="w-full h-9 bg-background border border-border rounded-lg pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={galleryCategoryFilter}
                onChange={(e) => setGalleryCategoryFilter(e.target.value)}
                className="h-9 bg-background border border-border rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All categories">All categories</option>
                {galleryCategoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={galleryStyleFilter}
                onChange={(e) => setGalleryStyleFilter(e.target.value)}
                className="h-9 bg-background border border-border rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All styles">All styles</option>
                {galleryStyleOptions.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            {isFeedLoading ? (
              <div className="h-44 rounded-xl border border-border/60 bg-elevated/30 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredGeneratedItems.length === 0 ? (
              <div className="h-44 rounded-xl border border-border/60 bg-elevated/20 flex flex-col items-center justify-center text-center px-4">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No generated images match this filter.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try clearing search/category/style filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredGeneratedItems.slice(0, 40).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedImageItem(item);
                      setShowDeleteConfirm(false);
                    }}
                    className="rounded-xl overflow-hidden border border-border bg-elevated/20 text-left hover:border-white/30 transition-colors"
                  >
                    <div className="aspect-square bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={item.styleName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-white truncate">{item.styleName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.prompt || 'AI generated image'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedImageItem && (
        <div className="fixed inset-0 z-70 bg-black/65 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="absolute inset-0" onClick={() => {
            setSelectedImageItem(null);
            setShowDeleteConfirm(false);
          }} />

          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-card p-4 sm:p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setSelectedImageItem(null);
                setShowDeleteConfirm(false);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-muted-foreground hover:text-white hover:bg-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-4">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImageItem.imageUrl}
                  alt={selectedImageItem.styleName}
                  className="w-full h-full max-h-[70vh] object-contain"
                />
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">{selectedImageItem.styleName}</h3>

                <div className="text-sm">
                  <p className="text-muted-foreground">Model</p>
                  <p className="text-white wrap-break-word">{selectedImageItem.model}</p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Generated at</p>
                  <p className="text-white wrap-break-word">{selectedImageCreatedAt}</p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Category</p>
                  <p className="text-white wrap-break-word">{selectedImageItem.category}</p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Prompt</p>
                  <p className="text-white/90 whitespace-pre-wrap wrap-break-word">{selectedImageItem.prompt || 'No prompt stored'}</p>
                </div>

                <div className="pt-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete image
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
                <h4 className="text-base font-semibold text-white">Delete this image?</h4>
                <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingImage}
                    className="px-3 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelectedImage()}
                    disabled={isDeletingImage}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {isDeletingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isGeneratingModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 text-center shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-base font-semibold text-white">Generating image</p>
            <p className="text-sm text-muted-foreground mt-1">Please wait while we create and save it to your AI feed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
