"use client";

import React, { useEffect, useRef, useState } from 'react';
import { TOOLS } from '@/config/tools.config';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'sonner';
import { Loader2, Download, ImageIcon, ChevronDown, ChevronUp, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STYLE_CATEGORIES, type StyleEntry } from '@/lib/styles-data';

const RESULTS_STORAGE_KEY = 'generate-tool-results-v1';

// ─── Model data ─────────────────────────────────────────────────────────────

const MODEL_FAMILIES = [
  {
    id: 'v4',
    label: 'V4',
    badge: 'Latest',
    variants: [
      { value: 'recraftv4', label: 'Standard', description: 'Best quality raster' },
      { value: 'recraftv4_vector', label: 'Vector', description: 'Scalable SVG output' },
      { value: 'recraftv4_pro', label: 'Pro', description: 'Enhanced detail' },
      { value: 'recraftv4_pro_vector', label: 'Pro Vector', description: 'Pro SVG output' },
    ],
  },
  {
    id: 'v3',
    label: 'V3',
    badge: null,
    variants: [
      { value: 'recraftv3', label: 'Standard', description: 'Full style API' },
      { value: 'recraftv3_vector', label: 'Vector', description: 'Vector with styles' },
    ],
  },
  {
    id: 'v2',
    label: 'V2',
    badge: null,
    variants: [
      { value: 'recraftv2', label: 'Standard', description: 'Classic raster' },
      { value: 'recraftv2_vector', label: 'Vector', description: 'Classic vector' },
    ],
  },
];

const ASPECT_RATIOS = [
  { value: '1024x1024', label: '1:1', desc: 'Square' },
  { value: '1365x1024', label: '4:3', desc: 'Landscape' },
  { value: '1024x1365', label: '3:4', desc: 'Portrait' },
  { value: '1820x1024', label: '16:9', desc: 'Cinema' },
  { value: '1024x1820', label: '9:16', desc: 'Story' },
  { value: '1536x1024', label: '3:2', desc: 'Wide' },
  { value: '1024x1536', label: '2:3', desc: 'Tall' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function ModelSelector({
  selectedModel,
  onChange,
}: {
  selectedModel: string;
  onChange: (v: string) => void;
}) {
  const activeFamily =
    MODEL_FAMILIES.find((f) => f.variants.some((v) => v.value === selectedModel)) ??
    MODEL_FAMILIES[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Family tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {MODEL_FAMILIES.map((family) => {
          const isActive = family.id === activeFamily.id;
          return (
            <button
              key={family.id}
              type="button"
              onClick={() => onChange(family.variants[0].value)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-elevated border border-border text-muted-foreground hover:text-foreground hover:border-border-hover',
              )}
            >
              {family.label}
              {family.badge && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary',
                  )}
                >
                  {family.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Variant pills */}
      <div className="flex gap-1.5 flex-wrap">
        {activeFamily.variants.map((v) => {
          const isActive = v.value === selectedModel;
          return (
            <button
              key={v.value}
              type="button"
              onClick={() => onChange(v.value)}
              title={v.description}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                isActive
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-elevated border-border text-muted-foreground hover:text-foreground hover:border-border-hover',
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StyleSelector({
  selectedStyle,
  onChange,
}: {
  selectedStyle: StyleEntry | null;
  onChange: (s: StyleEntry | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel>Style</SectionLabel>
        {selectedStyle && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Current selection preview / toggle */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2.5 rounded-lg border text-sm transition-all text-left',
          selectedStyle
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-elevated border-border text-muted-foreground hover:border-border-hover hover:text-foreground',
        )}
      >
        <span className="truncate">
          {selectedStyle ? `${selectedStyle.name} · ${selectedStyle.model}` : 'None — let the model decide'}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 shrink-0 ml-2" />}
      </button>

      {/* Style browser */}
      {expanded && (
        <div className="rounded-xl border border-border bg-elevated overflow-hidden">
          <div className="max-h-64 overflow-y-auto scrollbar-hide p-2 flex flex-col gap-1">
            {/* None option */}
            <button
              type="button"
              onClick={() => { onChange(null); setExpanded(false); }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                !selectedStyle
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              None — let the model decide
            </button>

            {/* Categories */}
            {STYLE_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <button
                  type="button"
                  onClick={() => setOpenCategory(openCategory === cat.title ? null : cat.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  {cat.title}
                  {openCategory === cat.title
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />}
                </button>

                {openCategory === cat.title && (
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {cat.styles.map((s, idx) => {
                      const isActive =
                        selectedStyle?.name === s.name && selectedStyle?.apiModel === s.apiModel;
                      return (
                        <button
                          key={`${s.name}-${s.apiModel}-${idx}`}
                          type="button"
                          onClick={() => { onChange(s); setExpanded(false); }}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-border-hover',
                          )}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AspectRatioSelector({
  selectedSize,
  onChange,
}: {
  selectedSize: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {ASPECT_RATIOS.map((r) => (
        <button
          key={r.value}
          type="button"
          title={r.desc}
          onClick={() => onChange(r.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            selectedSize === r.value
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-elevated border-border text-muted-foreground hover:text-foreground hover:border-border-hover',
          )}
        >
          {r.label}
          <span className="ml-1 opacity-60">{r.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────

type ResultItem = {
  id: string;           // local id for React key
  dbId: string | null;  // DB record id (null if save failed)
  url: string;
  prompt: string;
  model: string;
  size: string;
  style: string;
  savedToDb: boolean;
};

function toStoredResultItems(value: unknown): ResultItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const candidate = raw as Record<string, unknown>;

    if (typeof candidate.url !== 'string' || !candidate.url.trim()) return [];

    return [{
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `${Date.now()}-${Math.random()}`,
      dbId: typeof candidate.dbId === 'string' && candidate.dbId ? candidate.dbId : null,
      url: candidate.url,
      prompt: typeof candidate.prompt === 'string' ? candidate.prompt : '',
      model: typeof candidate.model === 'string' ? candidate.model : 'unknown',
      size: typeof candidate.size === 'string' ? candidate.size : '1024x1024',
      style: typeof candidate.style === 'string' ? candidate.style : 'None',
      savedToDb: candidate.savedToDb === true,
    }];
  });
}

function ResultCard({
  item,
  onSave,
}: {
  item: ResultItem;
  onSave: (item: ResultItem) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = 'generated.png';
    a.target = '_blank';
    a.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group relative rounded-xl overflow-hidden border border-border bg-black aspect-square transition-all duration-300 hover:ring-2 hover:ring-primary/40 shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <div className="flex gap-2 justify-end">
          {/* Save to DB button — shown always; green check when saved */}
          <Button
            size="icon"
            variant="secondary"
            className={cn(
              'h-8 w-8 rounded-lg transition-colors',
              item.savedToDb ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : '',
            )}
            title={item.savedToDb ? 'Saved to library' : 'Save to library'}
            type="button"
            onClick={handleSave}
            disabled={saving || item.savedToDb}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : item.savedToDb ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg"
            title="Download"
            type="button"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const GenerateTool = () => {
  const tool = TOOLS['generate'];
  const { deductCredits, user } = useUserStore();

  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('recraftv4');
  const [selectedStyle, setSelectedStyle] = useState<StyleEntry | null>(null);
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      const restored = toStoredResultItems(parsed);
      if (restored.length > 0) {
        setResults(restored);
      }
    } catch {
      sessionStorage.removeItem(RESULTS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      if (results.length === 0) {
        sessionStorage.removeItem(RESULTS_STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
    } catch {
      // Ignore storage write failures.
    }
  }, [results]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 3) {
      toast.error('Prompt too short', { description: 'Enter at least 3 characters.' });
      promptRef.current?.focus();
      return;
    }
    if ((user?.credits ?? 0) < tool.creditsPerGeneration) {
      toast.error('Insufficient credits', {
        description: `You need ${tool.creditsPerGeneration} credits to generate.`,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        prompt: trimmedPrompt,
        model: selectedModel,
        size: selectedSize,
        n: 1,
        saveToDatabase: false,
      };
      if (selectedStyle) {
        body.style = selectedStyle.apiStyle;
        if (selectedStyle.apiSubstyle) body.substyle = selectedStyle.apiSubstyle;
        body.styleName = selectedStyle.name;
        body.styleModel = selectedStyle.apiModel;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const data = await res.json() as {
        images?: Array<{ id: string | null; imageUrl?: string; savedToDb?: boolean }>;
        creditsUsed?: number;
      };

      const newItems: ResultItem[] = (data.images ?? []).flatMap((d) => {
        const url = d.imageUrl ?? '';
        if (!url) return [];
        return [{
          id: `${Date.now()}-${Math.random()}`,
          dbId: d.id ?? null,
          url,
          prompt: trimmedPrompt,
          model: selectedModel,
          size: selectedSize,
          style: selectedStyle?.name ?? 'None',
          savedToDb: d.savedToDb ?? !!d.id,
        }];
      });

      if (newItems.length === 0) throw new Error('No images returned');

      setResults((prev) => [...newItems, ...prev]);
      deductCredits(tool.creditsPerGeneration * newItems.length);
      toast.success('Image generated!', {
        description: newItems.some((i) => !i.savedToDb)
          ? 'Click Save to add it to your library.'
          : undefined,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Please try again.';
      toast.error('Generation failed', { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (item: ResultItem) => {
    if (item.savedToDb) return;
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.url,
          prompt: item.prompt,
          model: item.model,
          size: item.size,
          style: item.style,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Save failed');
      }
      const saved = await res.json() as { id?: string };
      const savedId = saved.id;
      if (!savedId) {
        throw new Error('Save endpoint did not return an image id');
      }
      setResults((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, dbId: savedId, savedToDb: true }
            : r
        )
      );
      toast.success('Saved to library');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      toast.error('Save failed', { description: message });
    }
  };

  const LeftPanel = (
    <div className="flex flex-col gap-6 h-full pb-4">
      {/* Prompt */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Prompt</SectionLabel>
          <span className="text-[10px] text-muted-foreground">{prompt.length}/1000</span>
        </div>
        <Textarea
          ref={promptRef}
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
          placeholder="Describe the image you want to create…"
          className="bg-elevated border-border focus-visible:ring-primary resize-none"
        />
      </div>

      {/* Model */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Model</SectionLabel>
        <ModelSelector selectedModel={selectedModel} onChange={setSelectedModel} />
      </div>

      {/* Style */}
      <StyleSelector selectedStyle={selectedStyle} onChange={setSelectedStyle} />

      {/* Aspect Ratio */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Aspect Ratio</SectionLabel>
        <AspectRatioSelector selectedSize={selectedSize} onChange={setSelectedSize} />
      </div>

      {/* Generate */}
      <div className="flex flex-col gap-2 mt-auto pt-4">
        <p className="text-xs text-center text-muted-foreground">
          Uses{' '}
          <span className="font-bold text-foreground">{tool.creditsPerGeneration} credits</span>
          {' '}· You have{' '}
          <span className="font-bold text-foreground">{user?.credits ?? 0}</span>
        </p>
        <Button
          size="lg"
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-base font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating…
            </>
          ) : (
            'Generate Image'
          )}
        </Button>
      </div>
    </div>
  );

  const RightPanel = (
    <div className="flex flex-col gap-6 h-full">
      {results.length === 0 && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
          <div className="w-24 h-24 mb-4 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-heading mb-2">No Images Yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Configure your prompt and settings on the left, then hit Generate.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-4 border-muted border-t-primary animate-spin" />
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground animate-pulse">
              Running {selectedModel}
            </p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full auto-rows-max">
          {results.map((item) => (
            <ResultCard key={item.id} item={item} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );

  return <ToolLayout tool={tool} leftPanel={LeftPanel} rightPanel={RightPanel} />;
};

export default GenerateTool;
