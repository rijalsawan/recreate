'use client';

import React, { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type PromptPoint = {
  id: string;
  x: string; // % from left, e.g. "30%"
  y: string; // % from top, e.g. "22%"
  label: string;
  prompt: string;
  highlights: string[]; // phrases to bold within the prompt
};

type PromptRevealConfig = {
  points: PromptPoint[];
};

// ── Defaults (used until backend config is loaded) ─────────────────────────────

const DEFAULT_POINTS: PromptPoint[] = [
  {
    id: 'p1',
    x: '30%',
    y: '22%',
    label: 'Editorial mood',
    prompt:
      'Editorial group shoot, teal winter outerwear with mint accents, volcanic landscape backdrop, diverse models with expressive energy.',
    highlights: ['teal winter outerwear', 'volcanic landscape backdrop'],
  },
  {
    id: 'p2',
    x: '53%',
    y: '42%',
    label: 'Lifestyle portrait',
    prompt:
      'a red-haired boy waves his arms, wearing a black puffer with mint accents, the rocks in a light mint puffer jacket and beanie.',
    highlights: ['red-haired boy waves his arms', 'black puffer with mint accents'],
  },
  {
    id: 'p3',
    x: '78%',
    y: '26%',
    label: 'Streetwear lookbook',
    prompt:
      'Winter streetwear lookbook, white cat-eye sunglasses, oversized gray hoodie, hands raised in motion.',
    highlights: ['white cat-eye sunglasses', 'hands raised in motion'],
  },
];

// ── Highlighted text renderer ─────────────────────────────────────────────────

type TextPart = { text: string; bold: boolean };

function renderHighlighted(prompt: string, highlights: string[]): React.ReactNode {
  if (!highlights.length) return <span className="text-black/75">{prompt}</span>;

  let parts: TextPart[] = [{ text: prompt, bold: false }];

  for (const phrase of highlights) {
    if (!phrase.trim()) continue;
    const newParts: TextPart[] = [];
    for (const part of parts) {
      if (part.bold) {
        newParts.push(part);
        continue;
      }
      const idx = part.text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) {
        newParts.push(part);
        continue;
      }
      if (idx > 0) newParts.push({ text: part.text.slice(0, idx), bold: false });
      newParts.push({ text: part.text.slice(idx, idx + phrase.length), bold: true });
      if (idx + phrase.length < part.text.length) {
        newParts.push({ text: part.text.slice(idx + phrase.length), bold: false });
      }
    }
    parts = newParts;
  }

  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-bold text-black">
            {p.text}
          </strong>
        ) : (
          <span key={i} className="text-black/70">
            {p.text}
          </span>
        ),
      )}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PromptRevealProps {
  image: string | null;
}

export default function PromptReveal({ image }: PromptRevealProps) {
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [points, setPoints] = useState<PromptPoint[]>(DEFAULT_POINTS);

  // Fetch admin-configured hover points from the backend
  useEffect(() => {
    fetch('/api/landing-config?key=prompt-reveal-points')
      .then((r) => r.json())
      .then((data: { value?: PromptRevealConfig }) => {
        if (data?.value?.points && Array.isArray(data.value.points) && data.value.points.length > 0) {
          setPoints(data.value.points);
        }
      })
      .catch(() => {
        // silently fall back to defaults
      });
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16/9', maxHeight: '92vh' }}>
      {/* Background image */}
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="AI-generated editorial scene"
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0f1923 0%, #080810 60%, #1a1230 100%)' }}
        >
          <p className="text-white/15 text-sm select-none">
            Editorial scene — add an image via Image Director
          </p>
        </div>
      )}

      {/* Bottom vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* ── Hover points ──────────────────────────────────────── */}
      {points.map((point) => {
        const isActive = activePoint === point.id;
        const xVal = parseFloat(point.x);
        // Flip tooltip to the left when the point is in the right 40% of the image
        const flipLeft = xVal > 60;

        return (
          <div
            key={point.id}
            className="absolute"
            style={{ left: point.x, top: point.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}
            onMouseEnter={() => setActivePoint(point.id)}
            onMouseLeave={() => setActivePoint(null)}
          >
            {/* Pulse ring — stops pinging when active */}
            {!isActive && (
              <div className="absolute -inset-3 rounded-full border border-white/35 animate-ping" />
            )}
            <div className="absolute -inset-3 rounded-full border border-white/15" />

            {/* Indicator dot */}
            <div
              className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                isActive ? 'border-white bg-white scale-125' : 'border-white/70 bg-white/20 scale-100'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-black' : 'bg-white'}`}
              />
            </div>

            {/* Tooltip bubble */}
            <div
              className={`absolute w-64 rounded-2xl border border-white/10 shadow-2xl transition-all duration-200 origin-bottom pointer-events-none ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              } ${
                flipLeft
                  ? 'right-full mr-5 top-1/2 -translate-y-1/2 origin-right'
                  : 'bottom-full mb-5 left-1/2 -translate-x-1/2 origin-bottom'
              }`}
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}
            >
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-black/40 mb-2 font-medium">
                  {point.label}
                </p>
                <p className="text-[13px] leading-relaxed">
                  {renderHighlighted(point.prompt, point.highlights)}
                </p>
              </div>
              {/* Caret for bottom-positioned tooltip */}
              {!flipLeft && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid rgba(255,255,255,0.97)',
                  }}
                />
              )}
              {/* Caret for right-positioned tooltip */}
              {flipLeft && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{
                    borderTop: '7px solid transparent',
                    borderBottom: '7px solid transparent',
                    borderLeft: '7px solid rgba(255,255,255,0.97)',
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
