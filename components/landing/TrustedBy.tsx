import React from 'react';

const COMPANIES = [
  'Acme Studio',
  'Pixel Co',
  'Brand Labs',
  'Creative OS',
  'Forma',
  'Artboard',
  'Visually',
  'Craft',
];

// Duplicate for seamless CSS marquee loop
const ITEMS = [...COMPANIES, ...COMPANIES];

export default function TrustedBy() {
  return (
    <section className="py-16 bg-[#080810] border-y border-white/[0.04]">
      <p className="text-center text-xs uppercase tracking-widest text-white/30 font-mono font-medium mb-10">
        Trusted by teams at
      </p>

      <div
        className="relative overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          maskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div
          className="inline-flex items-center whitespace-nowrap"
          style={{ animation: 'marquee 25s linear infinite', willChange: 'transform' }}
          aria-hidden="true"
        >
          {ITEMS.map((name, i) => (
            <React.Fragment key={i}>
              <span className="text-white/30 font-medium text-sm px-8">
                {name}
              </span>
              <span className="text-white/10 text-xs select-none">·</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
