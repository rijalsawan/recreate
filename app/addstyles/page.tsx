'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { STYLE_CATEGORIES, styleKey, type StyleEntry } from '@/lib/styles-data';
import { Loader2, Sparkles, Check, Image as ImageIcon, ChevronDown, ChevronRight, Cpu, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const RECRAFT_MODELS = [
  { label: 'Style default', value: '' },
  { label: 'Recraft V4', value: 'recraftv4' },
  { label: 'Recraft V4 Vector', value: 'recraftv4_vector' },
  { label: 'Recraft V3', value: 'recraftv3' },
  { label: 'Recraft V3 Vector', value: 'recraftv3_vector' },
  { label: 'Recraft V2', value: 'recraftv2' },
  { label: 'Recraft V2 Vector', value: 'recraftv2_vector' },
];

interface StyleRowState {
  prompt: string;
  generating: boolean;
  coverUrl: string | null;
  saved: boolean;
}

export default function AddStylesPage() {
  // State: keyed by styleKey
  const [rows, setRows] = useState<Record<string, StyleRowState>>({});
  const [dbKeys, setDbKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [collapsedCats, setCollapsedCats] = useState<Set<number>>(new Set());
  const [overrideModel, setOverrideModel] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Initialize rows from style data + fetch DB state
  useEffect(() => {
    const initial: Record<string, StyleRowState> = {};
    for (const cat of STYLE_CATEGORIES) {
      for (const entry of cat.styles) {
        const key = styleKey(entry.name, entry.apiModel);
        initial[key] = {
          prompt: entry.coverPrompt,
          generating: false,
          coverUrl: null,
          saved: false,
        };
      }
    }

    // Fetch which covers exist in DB
    fetch('/api/style-covers')
      .then((r) => r.ok ? r.json() : { cached: [] })
      .then(({ cached }: { cached: string[] }) => {
        if (!mountedRef.current) return;
        const set = new Set(cached);
        setDbKeys(set);

        // For ones that exist in DB, mark as saved and fetch their images
        for (const key of cached) {
          if (initial[key]) {
            initial[key].saved = true;
          }
        }
        setRows(initial);
        setLoading(false);

        // Fetch cover images for ones in DB (batch with concurrency limit)
        fetchExistingCovers(cached, initial);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setRows(initial);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExistingCovers = useCallback(async (keys: string[], initial: Record<string, StyleRowState>) => {
    const BATCH = 5;
    for (let i = 0; i < keys.length; i += BATCH) {
      const batch = keys.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((key) =>
          fetch(`/api/style-covers/${encodeURIComponent(key)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => ({ key, imageUrl: data?.imageUrl || null }))
        )
      );
      if (!mountedRef.current) return;
      setRows((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.imageUrl) {
            next[r.value.key] = { ...next[r.value.key], coverUrl: r.value.imageUrl, saved: true };
          }
        }
        return next;
      });
    }
  }, []);

  const updatePrompt = useCallback((key: string, prompt: string) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], prompt } }));
  }, []);

  const generateImage = useCallback(async (entry: StyleEntry) => {
    const key = styleKey(entry.name, entry.apiModel);
    const row = rows[key];
    if (!row || row.generating) return;

    setRows((prev) => ({ ...prev, [key]: { ...prev[key], generating: true } }));

    // Use override model if set, otherwise use the style's native model
    const modelToUse = overrideModel || entry.apiModel;

    try {
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: row.prompt,
          model: modelToUse,
          style: entry.apiStyle,
          substyle: entry.apiSubstyle,
          size: '1024x1024',
          n: 1,
        }),
      });

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const data = await genRes.json();
      const imageUrl = data.images?.[0]?.imageUrl;
      if (!imageUrl) throw new Error('No image returned');

      // Save to DB
      const saveRes = await fetch('/api/style-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleKey: key, imageUrl }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save to database');
      }

      if (!mountedRef.current) return;
      setRows((prev) => ({
        ...prev,
        [key]: { ...prev[key], coverUrl: imageUrl, generating: false, saved: true },
      }));
      setDbKeys((prev) => new Set(prev).add(key));
      toast.success(`Generated & saved: ${entry.name}`);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setRows((prev) => ({ ...prev, [key]: { ...prev[key], generating: false } }));
      toast.error(`Failed: ${entry.name} — ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [rows, overrideModel]);

  const clearAllCovers = useCallback(async () => {
    if (!confirm('This will permanently delete all saved style covers from the database. Continue?')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/style-covers', { method: 'DELETE' });
      if (!res.ok) throw new Error('Server error');
      // Reset all rows to unsaved + clear cover previews
      setRows((prev) => {
        const next: typeof prev = {};
        for (const key of Object.keys(prev)) {
          next[key] = { ...prev[key], coverUrl: null, saved: false };
        }
        return next;
      });
      setDbKeys(new Set());
      toast.success('All style covers cleared.');
    } catch {
      toast.error('Failed to clear covers.');
    } finally {
      setIsClearing(false);
    }
  }, []);

  const toggleCategory = useCallback((idx: number) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Stats
  const totalStyles = STYLE_CATEGORIES.reduce((sum, cat) => sum + cat.styles.length, 0);
  const savedCount = Object.values(rows).filter((r) => r.saved).length;
  const generatingCount = Object.values(rows).filter((r) => r.generating).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading styles…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Style Cover Manager</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate and save cover images for each style. These persist in the database.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Model override selector */}
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={overrideModel}
                onChange={(e) => setOverrideModel(e.target.value)}
                className="bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {RECRAFT_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={clearAllCovers}
              disabled={isClearing || savedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear all
            </button>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">{savedCount} saved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-muted-foreground">{generatingCount} generating</span>
              </div>
              <div className="text-muted-foreground">
                {totalStyles} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {STYLE_CATEGORIES.map((cat, catIdx) => {
          const isCollapsed = collapsedCats.has(catIdx);
          const catSaved = cat.styles.filter((e) => rows[styleKey(e.name, e.apiModel)]?.saved).length;

          return (
            <div key={catIdx} className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catIdx)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-elevated/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed
                    ? <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    : <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  }
                  <h2 className="text-lg font-bold font-display text-white">{cat.title}</h2>
                  {cat.subtitle && <span className="text-xs text-muted-foreground">{cat.subtitle}</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-success font-medium">{catSaved}</span>
                  <span>/</span>
                  <span>{cat.styles.length}</span>
                </div>
              </button>

              {/* Style Rows */}
              {!isCollapsed && (
                <div className="border-t border-border divide-y divide-border">
                  {cat.styles.map((entry, si) => {
                    const key = styleKey(entry.name, entry.apiModel);
                    const row = rows[key];
                    if (!row) return null;
                    const effectiveModel = overrideModel || entry.apiModel;
                    const isOverridden = !!overrideModel && overrideModel !== entry.apiModel;

                    return (
                      <div key={si} className="flex items-start gap-4 px-6 py-4 hover:bg-elevated/30 transition-colors">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-elevated border border-border shrink-0 flex items-center justify-center">
                          {row.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.coverUrl} alt={entry.name} className="w-full h-full object-cover" />
                          ) : row.generating ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm truncate">{entry.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${isOverridden ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-elevated border-border text-muted-foreground'}`}>
                              {effectiveModel}
                              {isOverridden && <span className="ml-1 opacity-60 line-through">{entry.apiModel}</span>}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border text-muted-foreground">
                              {entry.apiStyle}
                            </span>
                            {entry.apiSubstyle && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border text-muted-foreground">
                                {entry.apiSubstyle}
                              </span>
                            )}
                            {row.saved && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/10 border border-success/20 text-success font-medium">
                                <Check className="w-3 h-3" /> Saved
                              </span>
                            )}
                          </div>

                          {/* Editable Prompt */}
                          <textarea
                            value={row.prompt}
                            onChange={(e) => updatePrompt(key, e.target.value)}
                            rows={2}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
                            placeholder="Enter cover prompt…"
                          />
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                          <button
                            onClick={() => generateImage(entry)}
                            disabled={row.generating}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-hover text-white shadow-sm"
                          >
                            {row.generating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating…
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                {row.saved ? 'Regenerate' : 'Generate'}
                              </>
                            )}
                          </button>
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]" title={key}>
                            {key}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
