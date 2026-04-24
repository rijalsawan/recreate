import React from 'react';
import Link from 'next/link';
import { X, Code2, Link2 } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center group">
              <span className="font-display font-black uppercase tracking-[0.16em] text-lg text-white group-hover:text-white/85 transition-colors">RECREATE</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6">
              The creative suite built for designers. Generate, edit, vectorize, and upscale AI images with 15 professional tools.
            </p>
            <div className="flex gap-4">
              <Link href="#" aria-label="X / Twitter" className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </Link>
              <Link href="#" aria-label="GitHub" className="text-muted-foreground hover:text-white transition-colors">
                <Code2 className="w-5 h-5" />
              </Link>
              <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-white transition-colors">
                <Link2 className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-heading font-semibold text-white mb-4 tracking-wide">Product</h4>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#tools" className="hover:text-white transition-colors">All 15 Tools</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white mb-4 tracking-wide">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white mb-4 tracking-wide">Legal</h4>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Acceptable Use</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} RECREATE Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success"></div> Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
