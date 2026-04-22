'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Loader2, RefreshCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STYLE_CATEGORIES, styleKey, type StyleEntry } from '@/lib/styles-data';

const COMPLEXITY_MIN = 1;
const COMPLEXITY_MAX = 5;
const COMPLEXITY_LABELS: Record<number, string> = {
  1: 'Brief',
  2: 'Simple',
  3: 'Balanced',
  4: 'Detailed',
  5: 'Cinematic',
};

const PROMPT_TEMPLATES = [
  'Create a premium {category} image in {style} style, with clear focal hierarchy and strong visual storytelling.',
  'Design a polished {category} composition inspired by {style}, with refined details and campaign-grade art direction.',
  'Generate a high-quality {category} artwork in {style} style, with balanced lighting, depth, and clean composition.',
  'Craft an editorial-level {category} scene in {style} style, with rich textures and intentional framing.',
];

const SIMPLE_PROMPT_TEMPLATES = [
  'Create a clean {category} image in {style} style.',
  'Generate a polished {category} visual inspired by {style}.',
  'Design a clear {category} composition in {style} style.',
];

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function modelLabel(model: string): string {
  if (model === 'recraftv3') return 'Recraft V3';
  if (model === 'recraftv3_vector') return 'Recraft V3 Vector';
  if (model === 'recraftv2') return 'Recraft V2';
  if (model === 'recraftv2_vector') return 'Recraft V2 Vector';
  return model;
}

function randomPromptForEntry(categoryLabel: string, entry: StyleEntry, complexity: number): string {
  const categoryText = categoryLabel.trim() ? categoryLabel.toLowerCase() : 'style';
  const styleName = entry.name.trim() || 'selected style';
  const clamped = Math.max(COMPLEXITY_MIN, Math.min(COMPLEXITY_MAX, complexity));

  const template = clamped <= 2 ? pickRandom(SIMPLE_PROMPT_TEMPLATES) : pickRandom(PROMPT_TEMPLATES);
  let prompt = template.replace('{category}', categoryText).replace('{style}', styleName);

  if (clamped === 2) {
    prompt += ' Keep it concise and visually clear.';
  }

  if (clamped >= 4) {
    prompt += ' Add richer depth cues, stronger composition rhythm, and higher detail density.';
  }

  if (clamped >= 5) {
    prompt += ' Include nuanced lighting transitions, premium finishing details, and cinematic atmosphere.';
  }

  return prompt;
}

export default function AddCuratedStylesPage() {
  const [selectedCategory, setSelectedCategory] = useState(() => STYLE_CATEGORIES[0]?.title ?? '');
  const [selectedStyleKey, setSelectedStyleKey] = useState('');
  const [promptComplexity, setPromptComplexity] = useState(3);
  const [prompt, setPrompt] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set());
  const [styleQuery, setStyleQuery] = useState('');

  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const stylesInCategory = useMemo(
    () => STYLE_CATEGORIES.find((category) => category.title === selectedCategory)?.styles ?? [],
    [selectedCategory],
  );

  const filteredStyles = useMemo(() => {
    const query = styleQuery.trim().toLowerCase();
    if (!query) return stylesInCategory;

    return stylesInCategory.filter((entry) => {
      const label = `${entry.name} ${modelLabel(entry.apiModel)} ${entry.apiStyle} ${entry.apiSubstyle || ''}`.toLowerCase();
      return label.includes(query);
    });
  }, [styleQuery, stylesInCategory]);

  const selectedStyle = useMemo(
    () => stylesInCategory.find((entry) => styleKey(entry.name, entry.apiModel) === selectedStyleKey) ?? null,
    [selectedStyleKey, stylesInCategory],
  );

  const selectedKey = useMemo(
    () => (selectedStyle ? styleKey(selectedStyle.name, selectedStyle.apiModel) : ''),
    [selectedStyle],
  );

  const totalStyles = useMemo(
    () => STYLE_CATEGORIES.reduce((sum, category) => sum + category.styles.length, 0),
    [],
  );

  const coveredCount = useMemo(() => cachedKeys.size, [cachedKeys]);

  useEffect(() => {
    if (stylesInCategory.length === 0) {
      setSelectedStyleKey('');
      return;
    }

    setSelectedStyleKey((prev) => {
      const exists = stylesInCategory.some((entry) => styleKey(entry.name, entry.apiModel) === prev);
      if (exists) return prev;
      const first = stylesInCategory[0];
      return styleKey(first.name, first.apiModel);
    });
  }, [stylesInCategory]);

  const refreshCachedKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/style-covers', { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as { cached?: string[] };
      if (!res.ok) throw new Error('Failed to load curated cover keys');

      const keys = Array.isArray(data.cached) ? data.cached : [];
      setCachedKeys(new Set(keys));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load style covers';
      toast.error(message);
      setCachedKeys(new Set());
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  const refreshExistingCover = useCallback(async () => {
    if (!selectedStyle || !selectedKey || !cachedKeys.has(selectedKey)) {
      setExistingCoverUrl(null);
      return;
    }

    setIsLoadingExisting(true);
    try {
      const res = await fetch(`/api/style-covers/${encodeURIComponent(selectedKey)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load existing cover');

      const data = (await res.json().catch(() => ({}))) as { imageUrl?: string };
      setExistingCoverUrl(typeof data.imageUrl === 'string' ? data.imageUrl : null);
    } catch {
      setExistingCoverUrl(null);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [cachedKeys, selectedKey, selectedStyle]);

  useEffect(() => {
    void refreshCachedKeys();
  }, [refreshCachedKeys]);

  useEffect(() => {
    if (!selectedStyle) {
      setPrompt('');
      return;
    }

    setPrompt(randomPromptForEntry(selectedCategory, selectedStyle, promptComplexity));
  }, [promptComplexity, selectedCategory, selectedStyle?.name]);

  useEffect(() => {
    setPreviewUrl(null);
    void refreshExistingCover();
  }, [refreshExistingCover, selectedKey]);

  const generatePreview = useCallback(async () => {
    if (!selectedStyle) return;

    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      toast.error('Prompt is required');
      return;
    }

    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        prompt: finalPrompt,
        model: selectedStyle.apiModel,
        styleModel: selectedStyle.apiModel,
        style: selectedStyle.apiStyle,
        substyle: selectedStyle.apiSubstyle,
        styleName: selectedStyle.name,
        size: '1024x1024',
        n: 1,
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; images?: Array<{ imageUrl?: string; url?: string }> };
      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      const imageUrl = data.images?.[0]?.imageUrl || data.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image returned');

      setPreviewUrl(imageUrl);
      toast.success(`Preview generated for ${selectedStyle.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedStyle]);

  const savePreviewAsCover = useCallback(async () => {
    if (!selectedStyle || !selectedKey || !previewUrl) {
      toast.error('Generate a preview first');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/style-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleKey: selectedKey, imageUrl: previewUrl }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save cover');

      setCachedKeys((prev) => {
        const next = new Set(prev);
        next.add(selectedKey);
        return next;
      });
      setExistingCoverUrl(previewUrl);
      toast.success(`Saved curated cover for ${selectedStyle.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save cover';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [previewUrl, selectedKey, selectedStyle]);

  const generateAndSave = useCallback(async () => {
    if (!selectedStyle) return;

    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      toast.error('Prompt is required');
      return;
    }

    setIsGenerating(true);
    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        prompt: finalPrompt,
        model: selectedStyle.apiModel,
        styleModel: selectedStyle.apiModel,
        style: selectedStyle.apiStyle,
        substyle: selectedStyle.apiSubstyle,
        styleName: selectedStyle.name,
        size: '1024x1024',
        n: 1,
      };

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const generateData = (await generateRes.json().catch(() => ({}))) as { error?: string; images?: Array<{ imageUrl?: string; url?: string }> };
      if (!generateRes.ok) throw new Error(generateData.error || 'Generation failed');

      const imageUrl = generateData.images?.[0]?.imageUrl || generateData.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image returned');

      setPreviewUrl(imageUrl);

      const saveRes = await fetch('/api/style-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleKey: selectedKey, imageUrl }),
      });

      const saveData = (await saveRes.json().catch(() => ({}))) as { error?: string };
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save cover');

      setCachedKeys((prev) => {
        const next = new Set(prev);
        if (selectedKey) next.add(selectedKey);
        return next;
      });
      setExistingCoverUrl(imageUrl);
      toast.success(`Generated and saved curated cover for ${selectedStyle.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Generate and save failed';
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  }, [prompt, selectedKey, selectedStyle]);

  const clearAllCovers = useCallback(async () => {
    const confirmed = window.confirm('Clear all curated style covers? This cannot be undone.');
    if (!confirmed) return;

    setIsClearingAll(true);
    try {
      const res = await fetch('/api/style-covers', { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to clear covers');

      setCachedKeys(new Set());
      setExistingCoverUrl(null);
      toast.success('All curated style covers cleared');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to clear covers';
      toast.error(message);
    } finally {
      setIsClearingAll(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Curated Styles Admin</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate and save shared curated style covers used in the curated styles picker.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void refreshCachedKeys()}
              disabled={isLoadingKeys}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-50"
            >
              {isLoadingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Refresh keys
            </button>

            <button
              type="button"
              onClick={() => void clearAllCovers()}
              disabled={isClearingAll}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {isClearingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear all curated covers
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Covered styles</p>
            <p className="mt-1 text-2xl font-semibold text-white">{coveredCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total styles</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totalStyles}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current category</p>
            <p className="mt-1 text-base font-semibold text-white truncate">{selectedCategory}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setStyleQuery('');
                }}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {STYLE_CATEGORIES.map((category) => (
                  <option key={category.title} value={category.title}>{category.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Find style</label>
              <input
                value={styleQuery}
                onChange={(e) => setStyleQuery(e.target.value)}
                placeholder="Search style name or model"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="rounded-xl border border-border/70 bg-background/30 p-2 max-h-[62vh] overflow-auto space-y-1">
              {filteredStyles.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">No styles match this search.</p>
              )}

              {filteredStyles.map((entry) => {
                const key = styleKey(entry.name, entry.apiModel);
                const isSelected = key === selectedStyleKey;
                const hasCover = cachedKeys.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStyleKey(key)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:border-white/15 hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                      {hasCover ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          covered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          missing
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {modelLabel(entry.apiModel)} • {entry.apiStyle}
                      {entry.apiSubstyle ? ` / ${entry.apiSubstyle}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            {!selectedStyle ? (
              <div className="h-52 rounded-xl border border-border/70 bg-background/30 flex items-center justify-center text-sm text-muted-foreground">
                Select a style to continue.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedStyle.name}</h2>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/50 px-2 py-1">
                        <Cpu className="w-3 h-3" />
                        {modelLabel(selectedStyle.apiModel)}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-background/50 px-2 py-1">
                        style: {selectedStyle.apiStyle}
                      </span>
                      {selectedStyle.apiSubstyle && (
                        <span className="inline-flex rounded-full border border-white/10 bg-background/50 px-2 py-1">
                          substyle: {selectedStyle.apiSubstyle}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPrompt(randomPromptForEntry(selectedCategory, selectedStyle, promptComplexity))}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Random prompt
                  </button>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/40 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Complexity</span>
                    <button
                      type="button"
                      onClick={() => setPromptComplexity((prev) => Math.max(COMPLEXITY_MIN, prev - 1))}
                      disabled={promptComplexity <= COMPLEXITY_MIN}
                      className="h-6 w-6 rounded-md border border-border text-sm text-white disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="text-xs text-white min-w-20 text-center">{COMPLEXITY_LABELS[promptComplexity]}</span>
                    <button
                      type="button"
                      onClick={() => setPromptComplexity((prev) => Math.min(COMPLEXITY_MAX, prev + 1))}
                      disabled={promptComplexity >= COMPLEXITY_MAX}
                      className="h-6 w-6 rounded-md border border-border text-sm text-white disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Prompt used to generate this curated style cover"
                  />

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => void generatePreview()}
                      disabled={isGenerating || isSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate preview
                    </button>

                    <button
                      type="button"
                      onClick={() => void savePreviewAsCover()}
                      disabled={!previewUrl || isGenerating || isSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save preview
                    </button>

                    <button
                      type="button"
                      onClick={() => void generateAndSave()}
                      disabled={isGenerating || isSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {(isGenerating || isSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate + save
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Generated preview</p>
                    <div className="aspect-square rounded-lg border border-border bg-black/30 overflow-hidden">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="Generated preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No preview yet
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Existing curated cover</p>
                    <div className="aspect-square rounded-lg border border-border bg-black/30 overflow-hidden">
                      {isLoadingExisting ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : existingCoverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={existingCoverUrl} alt="Existing curated cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No saved cover for this style
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}