'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Plus, Trash2, X, Search, Check, Type } from 'lucide-react';
import { toast } from 'sonner';

interface FontEntry {
  id: string;
  family: string;
  category: string;
  variants: number[];
}

// Popular Google Fonts suggestions for quick-add
const SUGGESTIONS = [
  'Pacifico', 'Lobster', 'Dancing Script', 'Caveat', 'Permanent Marker',
  'Satisfy', 'Great Vibes', 'Indie Flower', 'Amatic SC', 'Shadows Into Light',
  'Righteous', 'Bangers', 'Fredoka One', 'Bungee', 'Press Start 2P',
  'Sacramento', 'Architects Daughter', 'Kalam', 'Patrick Hand', 'Rock Salt',
  'Abril Fatface', 'Playfair Display', 'Bebas Neue', 'Oswald', 'Raleway',
  'Montserrat', 'Poppins', 'Roboto Mono', 'Space Grotesk', 'DM Serif Display',
  'Comfortaa', 'Quicksand', 'Nunito', 'Karla', 'Bitter',
  'Merriweather', 'Lora', 'Crimson Text', 'Source Serif Pro', 'Cormorant Garamond',
  'Fira Code', 'JetBrains Mono', 'IBM Plex Mono', 'Source Code Pro', 'Inconsolata',
  'Anton', 'Rubik', 'Work Sans', 'Inter', 'Syne',
];

function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export default function AddFontsPage() {
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load existing fonts
  useEffect(() => {
    fetch('/api/fonts')
      .then((r) => r.ok ? r.json() : { fonts: [] })
      .then(({ fonts: f }: { fonts: FontEntry[] }) => {
        if (!mountedRef.current) return;
        setFonts(f);
        // Load all font stylesheets
        for (const font of f) loadGoogleFont(font.family);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setLoading(false);
      });
  }, []);

  const addedFamilies = new Set(fonts.map((f) => f.family));

  const addFont = useCallback(async (family: string) => {
    if (adding) return;
    const trimmed = family.trim();
    if (!trimmed) return;
    if (addedFamilies.has(trimmed)) {
      toast.error(`"${trimmed}" is already added`);
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family: trimmed }),
      });

      if (res.status === 409) {
        toast.error(`"${trimmed}" is already added`);
        return;
      }
      if (res.status === 404) {
        toast.error(`"${trimmed}" not found on Google Fonts`);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add font');
      }

      const { font } = await res.json();
      if (!mountedRef.current) return;
      setFonts((prev) => [...prev, font]);
      loadGoogleFont(font.family);
      setSearch('');
      toast.success(`Added "${font.family}"`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add font');
    } finally {
      if (mountedRef.current) setAdding(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adding, addedFamilies]);

  const removeFont = useCallback(async (id: string, family: string) => {
    try {
      const res = await fetch(`/api/fonts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      setFonts((prev) => prev.filter((f) => f.id !== id));
      toast.success(`Removed "${family}"`);
    } catch {
      toast.error('Failed to remove font');
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!confirm('Remove all saved fonts? This cannot be undone.')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/fonts', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setFonts([]);
      toast.success('All fonts cleared');
    } catch {
      toast.error('Failed to clear fonts');
    } finally {
      setIsClearing(false);
    }
  }, []);

  const filteredSuggestions = SUGGESTIONS.filter(
    (s) => !addedFamilies.has(s) && s.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading fonts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
              <Type className="w-6 h-6 text-primary" />
              Font Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add Google Fonts to make them available in the canvas text tool.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={clearAll}
              disabled={isClearing || fonts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear all
            </button>
            <div className="text-sm text-muted-foreground">
              <span className="text-white font-semibold">{fonts.length}</span> fonts added
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Add Font Input */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-white mb-3">Add a Google Font</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) addFont(search); }}
                placeholder="Type a Google Font name, e.g. Pacifico"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => addFont(search)}
              disabled={adding || !search.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Font
            </button>
          </div>

          {/* Quick suggestions */}
          {search && filteredSuggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredSuggestions.slice(0, 12).map((s) => (
                <button
                  key={s}
                  onClick={() => addFont(s)}
                  disabled={adding}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated border border-border text-muted-foreground hover:text-white hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {!search && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Popular suggestions — click to add:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.filter((s) => !addedFamilies.has(s)).slice(0, 20).map((s) => (
                  <button
                    key={s}
                    onClick={() => addFont(s)}
                    disabled={adding}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated border border-border text-muted-foreground hover:text-white hover:border-primary/30 transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Added Fonts Grid */}
        {fonts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-4">Added Fonts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fonts.map((font) => (
                <div
                  key={font.id}
                  className="group relative rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors overflow-hidden"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeFont(font.id, font.family)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-elevated/80 border border-border flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Font Preview */}
                  <div
                    className="text-2xl text-white mb-3 truncate"
                    style={{ fontFamily: `'${font.family}', sans-serif` }}
                  >
                    {font.family}
                  </div>
                  <div
                    className="text-sm text-muted-foreground mb-3 line-clamp-2"
                    style={{ fontFamily: `'${font.family}', sans-serif` }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border text-muted-foreground">
                      {font.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border text-muted-foreground">
                      {font.variants.length} weight{font.variants.length !== 1 ? 's' : ''}
                    </span>
                    <Check className="w-3 h-3 text-success ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fonts.length === 0 && (
          <div className="text-center py-16">
            <Type className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No fonts added yet. Add some above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
