import React from 'react';
import Link from 'next/link';

const FEATURES = [
  'AI Image Generator', 'AI Image Vectorizer', 'AI Vector Generator',
  'AI Photo Editor', 'Mockup Generator', 'Image Upscaler',
  'Background Remover', 'AI Eraser',
];

const USE_CASES = [
  'Logos', 'Icons', 'Ads', 'Characters', 'Stock Images', 'Explore all',
];

const RESOURCES = [
  'Gallery', 'News', 'Pricing', 'Feature Requests', 'Subprocessors', 'Status',
];

const SOCIAL = [
  'Instagram', 'YouTube', 'X', 'Discord', 'LinkedIn',
];

const HOW_TO = [
  'How to create AI vector images for your website',
  'How to create branded AI images for social media',
  'How to generate AI images in specific colors',
];

const COMPANY = [
  'About', 'Press releases', 'Terms & Conditions', 'Privacy Policy',
  'Contact Us', 'Blog', 'Careers',
];

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-white/55 text-xs font-medium mb-3 tracking-wide">{children}</h4>
  );
}

function FooterLink({ href = '#', children }: { href?: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-white/80 text-sm hover:text-white transition-colors leading-relaxed">
        {children}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="bg-black pt-16 pb-0 overflow-hidden">
      {/* ── Link grid ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Features */}
          <div>
            <ColHeader>Features</ColHeader>
            <ul className="space-y-2">
              {FEATURES.map((item) => <FooterLink key={item}>{item}</FooterLink>)}
            </ul>
          </div>

          {/* Use cases */}
          <div>
            <ColHeader>Use cases</ColHeader>
            <ul className="space-y-2">
              {USE_CASES.map((item) => (
                <li key={item}>
                  <Link href="#"
                    className={`text-sm transition-colors leading-relaxed ${item === 'Explore all' ? 'text-violet-400 hover:text-violet-300' : 'text-white/80 hover:text-white'}`}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <ColHeader>Resources</ColHeader>
            <ul className="space-y-2">
              {RESOURCES.map((item) => <FooterLink key={item}>{item}</FooterLink>)}
            </ul>
          </div>

          {/* Follow us */}
          <div>
            <ColHeader>Follow us</ColHeader>
            <ul className="space-y-2">
              {SOCIAL.map((item) => <FooterLink key={item}>{item}</FooterLink>)}
            </ul>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-14 border-t border-white/[0.07] pt-10">
          {/* How to */}
          <div>
            <ColHeader>How to</ColHeader>
            <ul className="space-y-2.5">
              {HOW_TO.map((item) => <FooterLink key={item}>{item}</FooterLink>)}
            </ul>
            <div className="mt-3">
              <Link href="#" className="text-sm text-white/80 hover:text-white transition-colors">
                See all posts →
              </Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <ColHeader>Company</ColHeader>
            <ul className="space-y-2">
              {COMPANY.map((item) => <FooterLink key={item}>{item}</FooterLink>)}
            </ul>
          </div>

          {/* App store badges */}
          <div className="flex flex-col gap-3">
            <a href="#"
               className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors"
               style={{ background: 'rgba(255,255,255,0.05)' }}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <p className="text-white/50 text-[9px] uppercase tracking-widest">Download on the</p>
                <p className="text-white font-semibold text-sm leading-none mt-0.5">App Store</p>
              </div>
            </a>
            <a href="#"
               className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors"
               style={{ background: 'rgba(255,255,255,0.05)' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M3.18 23.76c.37.2.8.22 1.2 0l11.05-6.35L12 14l-8.82 9.76Z" fill="#EA4335"/>
                <path d="m17.35 9.07-3.12-3.12L3.18.22C2.78 0 2.35.02 1.98.22L13.18 11.42l4.17-2.35Z" fill="#FBBC04"/>
                <path d="M20.6 10.35c.56.33.88.88.88 1.65s-.32 1.32-.88 1.65l-3.25 1.87L14 12l3.35-3.35 3.25 1.7Z" fill="#4285F4"/>
                <path d="m3.18.22 10.05 11.2L1.98 22.6c-.37-.2-.6-.56-.6-1.1V2.5c0-.54.23-.9.6-1.1l1.2-1.18Z" fill="#34A853"/>
              </svg>
              <div className="text-left">
                <p className="text-white/50 text-[9px] uppercase tracking-widest">Get it on</p>
                <p className="text-white font-semibold text-sm leading-none mt-0.5">Google Play</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ── Giant wordmark ────────────────────────────────────────── */}
      <div className="overflow-hidden leading-none select-none" aria-hidden="true">
        <p
          className="font-display max-sm:text-[2rem] sm:text-[2rem]  font-black uppercase text-white text-center"
          style={{
            lineHeight: 0.82,
            letterSpacing: '-0.02em',
          }}
        >
          RECREATE
        </p>
      </div>
    </footer>
  );
}
