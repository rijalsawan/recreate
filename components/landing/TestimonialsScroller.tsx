'use client';

import React, { useEffect, useState } from 'react';

type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Jordan Kim',
    role: 'CREATIVE DIRECTOR',
    quote: 'It can generate images directly in vector format. Other AI tools don\'t offer this option.',
  },
  {
    id: 't2',
    name: 'Sebastien T.',
    role: 'GRAPHIC DESIGNER',
    quote: 'What Recreate was able to generate, I said, \'Wow\' — I think it\'s one of the reasons I decided to subscribe.',
  },
  {
    id: 't3',
    name: 'Ivan Korzun',
    role: 'DESIGN DIRECTOR AT PLAYGAMA',
    quote: 'Unlike some other image generators like Midjourney, Recreate is highly customizable.',
  },
  {
    id: 't4',
    name: 'Marcus Webb',
    role: 'FOUNDER, VISUALLY STUDIO',
    quote: 'We use Recreate for every client deliverable now. The style consistency across a batch of 40+ images is something I couldn\'t achieve manually.',
  },
  {
    id: 't5',
    name: 'Priya Nair',
    role: 'PRODUCT DESIGNER',
    quote: 'The inpainting is the best I\'ve used anywhere. It feels like Photoshop if Photoshop didn\'t hate you.',
  },
];

export default function TestimonialsScroller() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    fetch('/api/landing-config?key=landing-testimonials')
      .then((r) => r.json())
      .then((data: { value?: { items?: Testimonial[] } | null }) => {
        if (data?.value?.items && Array.isArray(data.value.items) && data.value.items.length > 0) {
          setTestimonials(data.value.items);
        }
      })
      .catch(() => {});
  }, []);

  // Duplicate for seamless loop
  const strip = [...testimonials, ...testimonials];

  return (
    <section className="bg-black py-20 overflow-hidden">
      <div className="text-center mb-12 px-6">
        <h2
          className="font-display font-black uppercase italic text-white leading-[0.88]"
          style={{ fontSize: 'clamp(1.7rem, 6vw, 5.5rem)' }}
        >
          LOVED BY
          <br />
          <span className="not-italic font-bold">CREATORS</span>
        </h2>
      </div>

      {/* Scrolling strip */}
      <div className="relative w-full">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
             style={{ background: 'linear-gradient(to right, #000, transparent)' }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
             style={{ background: 'linear-gradient(to left, #000, transparent)' }} />

        <div className="flex gap-4 animate-testimonials-scroll" style={{ width: 'max-content' }}>
          {strip.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className="flex-shrink-0 rounded-2xl p-6 flex flex-col justify-between"
              style={{
                width: 'clamp(260px, 22vw, 340px)',
                minHeight: '180px',
                background: '#e8e8e8',
              }}
            >
              <p className="text-black/75 text-[15px] leading-relaxed mb-4">{t.quote}</p>
              <div>
                <p className="font-black text-black text-lg leading-none">{t.name}</p>
                <p className="text-black/50 text-[11px] uppercase tracking-[0.14em] mt-1">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
