"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { useAuthModal } from '@/stores/useAuthModal';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { openModal } = useAuthModal();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
      scrolled ? "bg-background/80 backdrop-blur-md border-border/50 py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold tracking-tight text-xl text-white">Recraft SaaS</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#tools" className="hover:text-white transition-colors">Tools</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => openModal('login')} className="text-sm font-medium text-white hover:text-primary transition-colors hidden sm:block">
            Sign In
          </button>
          <Button onClick={() => openModal('signup')} className="rounded-full font-bold px-6 shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
            Start for Free
          </Button>
        </div>
      </div>
    </nav>
  );
};
