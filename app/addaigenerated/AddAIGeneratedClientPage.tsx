'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, ExternalLink, Image as ImageIcon, Loader2, MapPin, Plus, RefreshCcw, Search, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STYLE_CATEGORIES, styleKey, type StyleEntry } from '@/lib/styles-data';

// ─── Landing Page Slots ─────────────────────────────────────────────────────

type LandingSlot =
  | 'hero-1' | 'hero-2' | 'hero-3'
  | 'prompt-reveal'
  | 'gallery-1' | 'gallery-2' | 'gallery-3'
  | 'vector-1' | 'vector-2' | 'vector-3';

type LandingSlotDef = {
  slot: LandingSlot;
  label: string;
  description: string;
  size: string;
};

const LANDING_SLOTS: LandingSlotDef[] = [
  { slot: 'hero-1',       label: 'Hero — Slide 1',       description: 'First hero carousel image — full-bleed, portrait or landscape', size: '1365x768' },
  { slot: 'hero-2',       label: 'Hero — Slide 2',       description: 'Second hero carousel image', size: '1365x768' },
  { slot: 'hero-3',       label: 'Hero — Slide 3',       description: 'Third hero carousel image', size: '1365x768' },
  { slot: 'prompt-reveal', label: 'Prompt Reveal',       description: 'Full-width editorial image with interactive hover annotations', size: '1920x1080' },
  { slot: 'gallery-1',   label: 'Design Assets — Slide 1', description: 'First image in the Design Assets carousel', size: '1365x1024' },
  { slot: 'gallery-2',   label: 'Design Assets — Slide 2', description: 'Second image in the Design Assets carousel', size: '1365x1024' },
  { slot: 'gallery-3',   label: 'Design Assets — Slide 3', description: 'Third image in the Design Assets carousel', size: '1365x1024' },
  { slot: 'vector-1',    label: 'Vector Gen — Slide 1',  description: 'First image in the Vector Generation carousel', size: '1365x1024' },
  { slot: 'vector-2',    label: 'Vector Gen — Slide 2',  description: 'Second image in the Vector Generation carousel', size: '1365x1024' },
  { slot: 'vector-3',    label: 'Vector Gen — Slide 3',  description: 'Third image in the Vector Generation carousel', size: '1365x1024' },
];

const MODEL_OPTIONS = [
  { label: 'Recraft V4', value: 'recraftv4' },
  { label: 'Recraft V4 Vector', value: 'recraftv4_vector' },
  { label: 'Recraft V3', value: 'recraftv3' },
  { label: 'Recraft V3 Vector', value: 'recraftv3_vector' },
  { label: 'Recraft V2', value: 'recraftv2' },
  { label: 'Recraft V2 Vector', value: 'recraftv2_vector' },
  { label: 'GPT Image 2', value: 'gpt-image-2' },
  { label: 'GPT Image 1.5', value: 'gpt-image-1.5' },
  { label: 'GPT Image 1', value: 'gpt-image-1' },
  { label: 'DALL-E 3', value: 'dall-e-3' },
];

// ─── Landing page generation workflow ───────────────────────────────────────

const LANDING_GENERATION_MODELS = [
  { label: 'Recraft V4',        value: 'recraftv4' },
  { label: 'Recraft V4 Vector', value: 'recraftv4_vector' },
  { label: 'Recraft V3',        value: 'recraftv3' },
  { label: 'Recraft V3 Vector', value: 'recraftv3_vector' },
  { label: 'GPT Image 2',       value: 'gpt-image-2' },
  { label: 'GPT Image 1.5',     value: 'gpt-image-1.5' },
];

const DEFAULT_LANDING_MODEL = 'recraftv4';

const DEFAULT_LANDING_PROMPTS: Record<LandingSlot, string> = {
  'hero-1': 'Premium fashion editorial hero, cinematic full-bleed photography, model in striking designer outfit with dramatic studio lighting, dark moody atmosphere, bold composition, high-end campaign quality, no text, no watermark.',
  'hero-2': 'Artistic lifestyle photography hero, person in modern creative environment, warm and cool light contrast, professional editorial composition, no text, no watermark.',
  'hero-3': 'Vibrant creative concept hero, bold color palette with deep shadows, dynamic commercial-grade composition, editorial energy, fashion or product photography style, no text, no watermark.',
  'prompt-reveal': 'Fashion editorial group campaign, winter collection outerwear, diverse models in coordinated teal and mint puffer jackets, dramatic volcanic landscape, energetic dynamic poses, cinematic wide-angle, commercial photography quality.',
  'gallery-1': 'Fashion editorial campaign, two female models in matching black outfits, white seamless backdrop, dynamic movement with flowing natural hair, production-ready commercial photography, high contrast black and white finish.',
  'gallery-2': 'Outdoor lifestyle brand shoot, golden hour lighting, model in athletic wear, natural rocky environment, brand campaign quality, warm cinematic tones, editorial composition.',
  'gallery-3': 'Fine dining food photography, artistic plating on a blue ceramic dish with microgreens and radish, overhead 45-degree angle, commercial restaurant quality, clean minimal styling on red background.',
  'vector-1': 'Colorful cartoon character face illustration, flat design vector style, bold black outlines, expressive exaggerated emotion, folk art-inspired festive hat, bright saturated colors, sticker-ready clean white background.',
  'vector-2': 'Bold typographic poster design, vintage editorial style, red and cream color palette, large serif display letterforms DEF, clean vector illustration aesthetic, minimal geometric composition.',
  'vector-3': 'Cute cartoon mascot sticker characters, coffee cup and rabbit with legs and shoes, flat illustration style, skateboard motion, pastel blue and white tones, clean vector style, sticker-ready transparent background.',
};

type LandingDraftItem = {
  imageUrl: string;
  prompt: string;
  model: string;
  generatedAt: string;
  saved: boolean;
  dbId: string | null;
};

// ─── Prompt Reveal hover point types ────────────────────────────────────────

type PromptPointDraft = {
  id: string;
  x: string;        // percentage string, e.g. "30"
  y: string;        // percentage string, e.g. "22"
  label: string;
  prompt: string;
  highlights: string; // comma-separated phrases in the UI
};

const DEFAULT_PROMPT_REVEAL_POINTS: PromptPointDraft[] = [
  { id: 'p1', x: '30', y: '22', label: 'Editorial mood', prompt: 'Editorial group shoot, teal winter outerwear with mint accents, volcanic landscape backdrop, diverse models with expressive energy.', highlights: 'teal winter outerwear, volcanic landscape backdrop' },
  { id: 'p2', x: '53', y: '42', label: 'Lifestyle portrait', prompt: 'a red-haired boy waves his arms, wearing a black puffer with mint accents, the rocks in a light mint puffer jacket and beanie.', highlights: 'red-haired boy waves his arms, black puffer with mint accents' },
  { id: 'p3', x: '78', y: '26', label: 'Streetwear lookbook', prompt: 'Winter streetwear lookbook, white cat-eye sunglasses, oversized gray hoodie, hands raised in motion.', highlights: 'white cat-eye sunglasses, hands raised in motion' },
];

const MAX_PROMPT_POINTS = 5;

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

  // Landing Page Slots
  const [landingImages, setLandingImages] = useState<Partial<Record<LandingSlot, string>>>({});
  const [landingDrafts, setLandingDrafts] = useState<Partial<Record<LandingSlot, LandingDraftItem>>>({});
  const [landingSelectedSlot, setLandingSelectedSlot] = useState<LandingSlot>('hero-1');
  const [landingSelectedModel, setLandingSelectedModel] = useState(DEFAULT_LANDING_MODEL);
  const [landingGeneratingSlot, setLandingGeneratingSlot] = useState<LandingSlot | null>(null);
  const [landingSaving, setLandingSaving] = useState<Partial<Record<LandingSlot, boolean>>>({});
  const [landingPrompts, setLandingPrompts] = useState<Record<LandingSlot, string>>(
    () => ({ ...DEFAULT_LANDING_PROMPTS }),
  );
  const [landingCategory, setLandingCategory] = useState(() => STYLE_CATEGORIES[0]?.title ?? '');
  const [landingStyleKey, setLandingStyleKey] = useState('');
  const [landingComplexity, setLandingComplexity] = useState(3);
  const [isFetchingLandingImages, setIsFetchingLandingImages] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);
  const [generatedFeedItems, setGeneratedFeedItems] = useState<AiFeedItem[]>([]);
  const [galleryQuery, setGalleryQuery] = useState('');
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('All categories');
  const [galleryStyleFilter, setGalleryStyleFilter] = useState('All styles');
  const [selectedImageItem, setSelectedImageItem] = useState<AiFeedItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  // ── Prompt Reveal Director ──────────────────────────────────────────────────
  const [promptRevealPoints, setPromptRevealPoints] = useState<PromptPointDraft[]>(DEFAULT_PROMPT_REVEAL_POINTS);
  const [isSavingPromptReveal, setIsSavingPromptReveal] = useState(false);
  const [isFetchingPromptReveal, setIsFetchingPromptReveal] = useState(true);

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

  const activeLandingSlot = useMemo(
    () => LANDING_SLOTS.find((slot) => slot.slot === landingSelectedSlot) ?? LANDING_SLOTS[0],
    [landingSelectedSlot],
  );

  const landingStylesInCategory = useMemo(
    () => STYLE_CATEGORIES.find((c) => c.title === landingCategory)?.styles ?? [],
    [landingCategory],
  );

  const landingSelectedStyleEntry = useMemo(
    () => landingStylesInCategory.find((e) => styleKey(e.name, e.apiModel) === landingStyleKey) ?? null,
    [landingStyleKey, landingStylesInCategory],
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

  // Sync landing style key when landing category changes
  useEffect(() => {
    if (landingStylesInCategory.length === 0) {
      setLandingStyleKey('');
      return;
    }
    setLandingStyleKey((prev) => {
      const exists = landingStylesInCategory.some((e) => styleKey(e.name, e.apiModel) === prev);
      if (exists) return prev;
      const first = landingStylesInCategory[0];
      return styleKey(first.name, first.apiModel);
    });
  }, [landingStylesInCategory]);

  // Auto-fill prompt from style when landing category/style/complexity changes
  useEffect(() => {
    if (!landingSelectedStyleEntry) return;
    setLandingPrompts((prev) => ({
      ...prev,
      [landingSelectedSlot]: randomPromptForSelection(landingCategory, landingSelectedStyleEntry.name, landingComplexity),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingCategory, landingSelectedStyleEntry?.name, landingComplexity]);

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

  const fetchLandingImages = useCallback(async () => {
    setIsFetchingLandingImages(true);
    try {
      const res = await fetch('/api/landing-images', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as Partial<Record<LandingSlot, string | null>>;
      if (!mountedRef.current) return;
      const normalized: Partial<Record<LandingSlot, string>> = {};
      for (const [slot, url] of Object.entries(data)) {
        if (url) normalized[slot as LandingSlot] = url;
      }
      setLandingImages(normalized);
    } catch {
      // silently ignore — UI shows placeholders
    } finally {
      if (mountedRef.current) setIsFetchingLandingImages(false);
    }
  }, []);

  useEffect(() => {
    void fetchLandingImages();
  }, [fetchLandingImages]);

  // ── Prompt Reveal Director: fetch + save ──────────────────────────────────

  const fetchPromptRevealConfig = useCallback(async () => {
    setIsFetchingPromptReveal(true);
    try {
      const res = await fetch('/api/landing-config?key=prompt-reveal-points', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as { value?: { points?: Array<{ id: string; x: string; y: string; label: string; prompt: string; highlights: string[] }> } | null };
      if (!mountedRef.current) return;
      if (data?.value?.points && Array.isArray(data.value.points) && data.value.points.length > 0) {
        setPromptRevealPoints(
          data.value.points.map((p) => ({
            id: p.id,
            x: parseFloat(p.x).toString(),
            y: parseFloat(p.y).toString(),
            label: p.label,
            prompt: p.prompt,
            highlights: Array.isArray(p.highlights) ? p.highlights.join(', ') : '',
          })),
        );
      }
    } catch {
      // fall back to defaults
    } finally {
      if (mountedRef.current) setIsFetchingPromptReveal(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromptRevealConfig();
  }, [fetchPromptRevealConfig]);

  const savePromptRevealConfig = useCallback(async () => {
    if (isSavingPromptReveal) return;
    setIsSavingPromptReveal(true);
    try {
      const points = promptRevealPoints.map((p) => ({
        id: p.id,
        x: `${Math.max(0, Math.min(100, parseFloat(p.x) || 0))}%`,
        y: `${Math.max(0, Math.min(100, parseFloat(p.y) || 0))}%`,
        label: p.label.trim(),
        prompt: p.prompt.trim(),
        highlights: p.highlights.split(',').map((h) => h.trim()).filter(Boolean),
      }));

      const res = await fetch('/api/landing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'prompt-reveal-points', value: { points } }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Failed to save');
      }

      toast.success('Prompt Reveal config saved and live on landing.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save config';
      toast.error(message);
    } finally {
      if (mountedRef.current) setIsSavingPromptReveal(false);
    }
  }, [isSavingPromptReveal, promptRevealPoints]);

  useEffect(() => {
    setLandingDrafts((prev) => {
      let changed = false;
      const next: Partial<Record<LandingSlot, LandingDraftItem>> = { ...prev };

      for (const slot of LANDING_SLOTS) {
        const draft = next[slot.slot];
        const liveImage = landingImages[slot.slot];
        if (!draft || !liveImage) continue;
        if (draft.imageUrl === liveImage && !draft.saved) {
          next[slot.slot] = { ...draft, saved: true };
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [landingImages]);

  const generateLandingSlotImage = useCallback(async () => {
    const slotDef = activeLandingSlot;
    if (landingGeneratingSlot) return;
    const basePrompt = landingPrompts[slotDef.slot]?.trim();
    if (!basePrompt) {
      toast.error('Prompt is required');
      return;
    }

    const styleEntry = landingSelectedStyleEntry;
    const resolvedPrompt = styleEntry
      ? resolvePromptForEntry(basePrompt, styleEntry, landingCategory)
      : basePrompt;

    const body: Record<string, unknown> = {
      prompt: resolvedPrompt,
      model: landingSelectedModel,
      size: slotDef.size,
      n: 1,
      saveToDatabase: false,
      styleName: styleEntry?.name,
      aiApiModel: styleEntry?.apiModel,
      aiApiStyle: styleEntry?.apiStyle,
      aiApiSubstyle: styleEntry?.apiSubstyle,
    };

    if (isRecraftModel(landingSelectedModel) && styleEntry) {
      body.style = styleEntry.apiStyle;
      if (styleEntry.apiSubstyle) body.substyle = styleEntry.apiSubstyle;
    } else {
      body.style = 'any';
    }

    setLandingGeneratingSlot(slotDef.slot);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Generation failed');
      }

      const data = await res.json() as { images?: Array<{ imageUrl?: string; url?: string }>; data?: Array<{ url?: string }> };
      const imageUrl =
        data.images?.[0]?.imageUrl ??
        data.images?.[0]?.url ??
        data.data?.[0]?.url;
      if (!imageUrl) throw new Error('No image returned');

      if (!mountedRef.current) return;

      setLandingDrafts((prev) => ({
        ...prev,
        [slotDef.slot]: {
          imageUrl,
          prompt: basePrompt,
          model: landingSelectedModel,
          generatedAt: new Date().toISOString(),
          saved: false,
          dbId: null,
        },
      }));
      toast.success(`${slotDef.label} generated. Click Save to publish.`);
    } catch (error) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${slotDef.label} failed: ${message}`);
    } finally {
      if (mountedRef.current) {
        setLandingGeneratingSlot(null);
      }
    }
  }, [activeLandingSlot, landingCategory, landingGeneratingSlot, landingPrompts, landingSelectedModel, landingSelectedStyleEntry]);

  const saveLandingSlotImage = useCallback(async (slot: LandingSlot) => {
    const slotDef = LANDING_SLOTS.find((item) => item.slot === slot);
    if (!slotDef) return;

    const draft = landingDrafts[slot];
    if (!draft?.imageUrl) {
      toast.error('Generate an image first before saving.');
      return;
    }
    if (landingSaving[slot]) return;

    setLandingSaving((prev) => ({ ...prev, [slot]: true }));

    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: draft.imageUrl,
          prompt: draft.prompt,
          model: draft.model,
          size: slotDef.size,
          style: 'any',
          aiFeedSource: 'landing-page',
          landingSlot: slot,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Failed to save landing image');
      }

      const saved = await res.json() as { id?: string; imageUrl?: string };
      if (!saved.id) {
        throw new Error('Save endpoint returned no id');
      }

      if (!mountedRef.current) return;

      setLandingDrafts((prev) => {
        const current = prev[slot];
        if (!current) return prev;
        return {
          ...prev,
          [slot]: {
            ...current,
            saved: true,
            dbId: saved.id,
          },
        };
      });

      setLandingImages((prev) => ({
        ...prev,
        [slot]: saved.imageUrl ?? draft.imageUrl,
      }));

      await fetchLandingImages();
      toast.success(`${slotDef.label} saved and live on landing.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save landing image';
      toast.error(message);
    } finally {
      if (mountedRef.current) {
        setLandingSaving((prev) => ({ ...prev, [slot]: false }));
      }
    }
  }, [fetchLandingImages, landingDrafts, landingSaving]);

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

        {/* ── Landing Page Image Director ───────────────────────────────────── */}
        <div className="rounded-[28px] border border-emerald-400/30 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),rgba(3,7,18,0.75)_45%)] p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-300" />
              <h2 className="text-base font-semibold text-white">Landing Image Director</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] border border-emerald-300/35 bg-emerald-300/10 text-emerald-200 rounded-full px-2.5 py-0.5">
                generate then save
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchLandingImages()}
                disabled={isFetchingLandingImages}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isFetchingLandingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                Refresh live
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open landing
              </a>
            </div>
          </div>

          <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Landing section</label>
                <select
                  value={landingSelectedSlot}
                  onChange={(e) => setLandingSelectedSlot(e.target.value as LandingSlot)}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {LANDING_SLOTS.map((slot) => (
                    <option key={slot.slot} value={slot.slot}>{slot.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">{activeLandingSlot.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Model family</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {LANDING_GENERATION_MODELS.map((model) => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => setLandingSelectedModel(model.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm border transition-colors text-left',
                        landingSelectedModel === model.value
                          ? 'bg-emerald-400/15 border-emerald-300/55 text-emerald-100'
                          : 'bg-elevated border-border text-muted-foreground hover:text-white hover:border-border-hover',
                      )}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Category</label>
                <select
                  value={landingCategory}
                  onChange={(e) => setLandingCategory(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {STYLE_CATEGORIES.map((cat) => (
                    <option key={cat.title} value={cat.title}>{cat.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Style</label>
                <select
                  value={landingStyleKey}
                  onChange={(e) => setLandingStyleKey(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {landingStylesInCategory.map((entry) => {
                    const k = styleKey(entry.name, entry.apiModel);
                    return <option key={k} value={k}>{entry.name}</option>;
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Complexity</label>
                  <span className="text-xs text-white">{COMPLEXITY_LABELS[landingComplexity]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLandingComplexity((p) => Math.max(COMPLEXITY_MIN, p - 1))}
                    disabled={landingComplexity <= COMPLEXITY_MIN}
                    className="w-7 h-7 flex-shrink-0 rounded-md border border-border text-sm font-medium text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
                  >−</button>
                  <div className="flex-1 flex gap-1 items-center">
                    {Array.from({ length: COMPLEXITY_MAX - COMPLEXITY_MIN + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < landingComplexity ? 'bg-emerald-400' : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLandingComplexity((p) => Math.min(COMPLEXITY_MAX, p + 1))}
                    disabled={landingComplexity >= COMPLEXITY_MAX}
                    className="w-7 h-7 flex-shrink-0 rounded-md border border-border text-sm font-medium text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
                  >+</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-white/55">Detailed prompt</label>
                <textarea
                  value={landingPrompts[activeLandingSlot.slot]}
                  onChange={(e) =>
                    setLandingPrompts((prev) => ({
                      ...prev,
                      [activeLandingSlot.slot]: e.target.value,
                    }))
                  }
                  rows={6}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  placeholder="Detailed visual prompt for this section"
                />
                <p className="text-[11px] text-muted-foreground">Hero section is pre-seeded with a production-quality prompt template.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLandingPrompts((prev) => ({
                      ...prev,
                      [activeLandingSlot.slot]: DEFAULT_LANDING_PROMPTS[activeLandingSlot.slot],
                    }))
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                  Reset prompt
                </button>
                <button
                  type="button"
                  onClick={() => void generateLandingSlotImage()}
                  disabled={!!landingGeneratingSlot || !landingPrompts[activeLandingSlot.slot]?.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {landingGeneratingSlot === activeLandingSlot.slot ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate draft
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {LANDING_SLOTS.map((slotDef) => {
                const liveImage = landingImages[slotDef.slot];
                const draft = landingDrafts[slotDef.slot];
                const previewImage = draft?.imageUrl ?? liveImage;
                const isGenerating = landingGeneratingSlot === slotDef.slot;
                const isSaving = landingSaving[slotDef.slot] === true;

                return (
                  <div key={slotDef.slot} className="rounded-xl border border-white/10 bg-card p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{slotDef.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{slotDef.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {liveImage && (
                          <span className="text-[10px] uppercase tracking-[0.12em] border border-emerald-400/35 bg-emerald-400/10 text-emerald-300 rounded-full px-2 py-0.5">
                            Live
                          </span>
                        )}
                        {draft && !draft.saved && (
                          <span className="text-[10px] uppercase tracking-[0.12em] border border-amber-300/35 bg-amber-300/10 text-amber-200 rounded-full px-2 py-0.5">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-40 rounded-lg overflow-hidden border border-white/10 bg-black/35 flex items-center justify-center">
                      {isFetchingLandingImages && !previewImage ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
                      ) : previewImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewImage} alt={slotDef.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-center px-4">
                          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                          <p className="text-[11px] text-muted-foreground/60">No saved image for this section</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLandingSelectedSlot(slotDef.slot)}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                          landingSelectedSlot === slotDef.slot
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-white hover:bg-white/5',
                        )}
                      >
                        Edit prompt
                      </button>

                      <button
                        type="button"
                        onClick={() => void saveLandingSlotImage(slotDef.slot)}
                        disabled={!draft || isSaving || !!draft.saved || isGenerating}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Saving
                          </>
                        ) : draft?.saved ? (
                          'Saved'
                        ) : (
                          'Save to landing'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Prompt Reveal Director ──────────────────────────────────────── */}
        <div className="rounded-[28px] border border-violet-400/30 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),rgba(3,7,18,0.75)_45%)] p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-violet-300" />
              <h2 className="text-base font-semibold text-white">Prompt Reveal Director</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] border border-violet-300/35 bg-violet-300/10 text-violet-200 rounded-full px-2.5 py-0.5">
                up to {MAX_PROMPT_POINTS} points
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchPromptRevealConfig()}
                disabled={isFetchingPromptReveal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isFetchingPromptReveal ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                Reload
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Image preview */}
            {landingImages['prompt-reveal'] && (
              <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: '16/7', maxHeight: 240 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={landingImages['prompt-reveal']} alt="Prompt reveal image" className="w-full h-full object-cover" />
                {/* Point overlays (visual only) */}
                {promptRevealPoints.map((p) => {
                  const xNum = parseFloat(p.x);
                  const yNum = parseFloat(p.y);
                  if (Number.isNaN(xNum) || Number.isNaN(yNum)) return null;
                  return (
                    <div
                      key={p.id}
                      className="absolute w-4 h-4 rounded-full border-2 border-white bg-violet-500/80 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${xNum}%`, top: `${yNum}%` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Point list */}
            {isFetchingPromptReveal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
              </div>
            ) : (
              <>
                {promptRevealPoints.map((point, idx) => (
                  <div key={point.id} className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-violet-500/60 border border-violet-300/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                        </div>
                        <span className="text-xs font-medium text-white/70">Point {idx + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPromptRevealPoints((prev) => prev.filter((_, i) => i !== idx))}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="text-[10px] uppercase tracking-[0.14em] text-white/45 block mb-1">Label</label>
                        <input
                          type="text"
                          value={point.label}
                          onChange={(e) => setPromptRevealPoints((prev) => prev.map((p, i) => i === idx ? { ...p, label: e.target.value } : p))}
                          className="w-full bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                          placeholder="e.g. Editorial mood"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.14em] text-white/45 block mb-1">X %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={point.x}
                          onChange={(e) => setPromptRevealPoints((prev) => prev.map((p, i) => i === idx ? { ...p, x: e.target.value } : p))}
                          className="w-full bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.14em] text-white/45 block mb-1">Y %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={point.y}
                          onChange={(e) => setPromptRevealPoints((prev) => prev.map((p, i) => i === idx ? { ...p, y: e.target.value } : p))}
                          className="w-full bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-[0.14em] text-white/45 block mb-1">Prompt text</label>
                      <textarea
                        value={point.prompt}
                        rows={2}
                        onChange={(e) => setPromptRevealPoints((prev) => prev.map((p, i) => i === idx ? { ...p, prompt: e.target.value } : p))}
                        className="w-full bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-400 resize-y"
                        placeholder="Full prompt text shown in the tooltip"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-[0.14em] text-white/45 block mb-1">
                        Highlighted phrases <span className="normal-case text-white/30">(comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        value={point.highlights}
                        onChange={(e) => setPromptRevealPoints((prev) => prev.map((p, i) => i === idx ? { ...p, highlights: e.target.value } : p))}
                        className="w-full bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                        placeholder="e.g. teal winter outerwear, volcanic landscape"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={promptRevealPoints.length >= MAX_PROMPT_POINTS}
                    onClick={() =>
                      setPromptRevealPoints((prev) => [
                        ...prev,
                        { id: `p${Date.now()}`, x: '50', y: '50', label: '', prompt: '', highlights: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add point
                  </button>
                  <button
                    type="button"
                    onClick={() => void savePromptRevealConfig()}
                    disabled={isSavingPromptReveal}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingPromptReveal ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
                    ) : (
                      'Save &amp; publish'
                    )}
                  </button>
                </div>
              </>
            )}
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
